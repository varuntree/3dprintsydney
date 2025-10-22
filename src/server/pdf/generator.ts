import { existsSync, readFileSync } from "fs";
import { join, extname } from "path";
import { ensurePdfCache, cachePdf, resolvePdfPath } from "@/server/files/storage";
import { getQuoteDetail } from "@/server/services/quotes";
import { getInvoiceDetail } from "@/server/services/invoices";
import { getSettings } from "@/server/services/settings";
import { createStripeCheckoutSession } from "@/server/services/stripe";
import { renderProductionQuoteHtml, renderProductionInvoiceHtml } from "@/server/pdf/templates/production";
import { logger } from "@/lib/logger";
import { uploadPdf } from "@/server/storage/supabase";
import type { Browser } from "puppeteer-core";

// Production template - single high-quality template
const getQuoteTemplate = () => renderProductionQuoteHtml;

const getInvoiceTemplate = () => renderProductionInvoiceHtml;

async function launchPdfBrowser(): Promise<Browser> {
  try {
    const [{ default: chromium }, { default: puppeteerCore }] = await Promise.all([
      import("@sparticuz/chromium"),
      import("puppeteer-core"),
    ]);

    const executablePath = await chromium.executablePath();
    const browser = await puppeteerCore.launch({
      args: [...chromium.args, "--font-render-hinting=none"],
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });
    return browser;
  } catch (error) {
    logger.warn({
      scope: "pdf.browser",
      message: "Falling back to bundled Puppeteer",
      error,
    });
    const { default: puppeteer } = await import("puppeteer");
    return puppeteer.launch({
      headless: true,
      args: ["--font-render-hinting=none"],
    });
  }
}

async function renderPdf(html: string, filename: string) {
  await ensurePdfCache();

  let browser: Browser | null = null;

  try {
    browser = await launchPdfBrowser();
  } catch (error) {
    logger.error({ scope: "pdf.browser", message: "Failed to launch browser", error });
    throw error;
  }

  let pdfBuffer: Buffer;

  try {
    const page = await browser.newPage();

  // Enhanced viewport configuration for PDF generation
  await page.setViewport({
    width: 1200,
    height: 1600,
    deviceScaleFactor: 2, // Higher DPI for better quality
    hasTouch: false,
    isMobile: false,
  });

  // Set optimal page settings for PDF generation
  await page.emulateMediaType('print');

  // Additional performance optimizations
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    // Block unnecessary resources to speed up rendering
    if (req.resourceType() === 'image' && !req.url().includes('data:')) {
      // Allow data URLs (base64 images) but block external images
      req.abort();
    } else if (['stylesheet', 'font'].includes(req.resourceType()) || req.resourceType() === 'document') {
      req.continue();
    } else if (req.resourceType() === 'script') {
      // Allow scripts (needed for our measurement script)
      req.continue();
    } else {
      // Block other resources (media, xhr, fetch, etc.)
      req.abort();
    }
  });

  // Set content with enhanced loading strategy
  await page.setContent(html, {
    waitUntil: ["networkidle0", "domcontentloaded"],
    timeout: 30000
  });

  // Wait for fonts and dynamic content measurement to complete
  await page.evaluateHandle('document.fonts.ready');

  // Give the dynamic pagination script time to run
  await new Promise(resolve => setTimeout(resolve, 500));

  // Enhanced PDF generation with quality optimizations
    const pdfData = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    displayHeaderFooter: false,
    margin: {
      top: "20mm",
      bottom: "20mm",
      left: "16mm",
      right: "16mm",
    },
    // Quality and accessibility improvements
    tagged: true,
    outline: false,
    // Font and rendering improvements
    scale: 1.0,
    width: '210mm', // A4 width
    height: '297mm', // A4 height
    });

    pdfBuffer = Buffer.from(pdfData);
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }

  let storageKey: string | null = null;
  try {
    storageKey = await uploadPdf(filename, pdfBuffer);
  } catch (error) {
    logger.warn({
      scope: "pdf.storage.upload",
      message: "Failed to upload PDF to Supabase storage",
      error,
      data: { filename },
    });
  }

  try {
    await cachePdf(filename, pdfBuffer);
  } catch (error) {
    logger.warn({
      scope: "pdf.storage.cache",
      message: "Failed to cache PDF locally",
      error,
      data: { filename },
    });
  }

  return { buffer: pdfBuffer, filename, storageKey, path: resolvePdfPath(filename) };
}

export async function generateQuotePdf(id: number) {
  const quote = await getQuoteDetail(id);
  const settings = await getSettings().catch(() => null);
  const logoFile = join(process.cwd(), "public", "logo.png");
  let logoDataUrl: string | undefined;
  if (existsSync(logoFile)) {
    try {
      const fileBuffer = readFileSync(logoFile);
      const extension = extname(logoFile).toLowerCase();
      const mimeType =
        extension === ".svg"
          ? "image/svg+xml"
          : extension === ".jpg" || extension === ".jpeg"
            ? "image/jpeg"
            : "image/png";
      logoDataUrl = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
    } catch (error) {
      logger.warn({
        scope: "pdf.logo",
        message: "Unable to read logo asset",
        error,
      });
    }
  }

  const templateData = {
    logoDataUrl,
    businessName: settings?.businessName ?? "3D Print Sydney",
    businessAddress: settings?.businessAddress ?? "",
    businessPhone: settings?.businessPhone ?? "",
    businessEmail: settings?.businessEmail ?? "",
    abn: settings?.abn ?? "",
    bankDetails: settings?.bankDetails ?? "",
    currency: settings?.defaultCurrency ?? "AUD",
  };

  // Route to appropriate template based on style
  const html = getQuoteTemplate()(quote, templateData);
  const filename = `quote-${quote.number}.pdf`;
  const { buffer, path, storageKey } = await renderPdf(html, filename);
  return { buffer, filename, path, storageKey };
}

export async function generateInvoicePdf(id: number) {
  let invoice = await getInvoiceDetail(id);
  const settings = await getSettings().catch(() => null);

  if (invoice.balanceDue > 0) {
    try {
      const session = await createStripeCheckoutSession(id);
      if (session.url) {
        invoice = { ...invoice, stripeCheckoutUrl: session.url };
      }
    } catch (error) {
      if (
        !(
          error instanceof Error &&
          (error.message === "Stripe is not configured" ||
            error.message === "Invoice is already paid")
        )
      ) {
        logger.warn({
          scope: "pdf.invoice.stripe",
          error,
          data: { invoiceId: id },
        });
      }
    }
  }

  const logoFile = join(process.cwd(), "public", "logo.png");
  let logoDataUrl: string | undefined;
  if (existsSync(logoFile)) {
    try {
      const fileBuffer = readFileSync(logoFile);
      const extension = extname(logoFile).toLowerCase();
      const mimeType =
        extension === ".svg"
          ? "image/svg+xml"
          : extension === ".jpg" || extension === ".jpeg"
            ? "image/jpeg"
            : "image/png";
      logoDataUrl = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
    } catch (error) {
      logger.warn({
        scope: "pdf.logo",
        message: "Unable to read logo asset",
        error,
      });
    }
  }

  const templateData = {
    logoDataUrl,
    businessName: settings?.businessName ?? "3D Print Sydney",
    businessAddress: settings?.businessAddress ?? "",
    businessPhone: settings?.businessPhone ?? "",
    businessEmail: settings?.businessEmail ?? "",
    abn: settings?.abn ?? "",
    bankDetails: settings?.bankDetails ?? "",
    currency: settings?.defaultCurrency ?? "AUD",
  };

  // Route to appropriate template based on style
  const invoiceForTemplate = {
    ...invoice,
    stripeCheckoutUrl: invoice.stripeCheckoutUrl ?? null,
  };

  const html = getInvoiceTemplate()(invoiceForTemplate, templateData);
  const filename = `invoice-${invoice.number}.pdf`;
  const { buffer, path, storageKey } = await renderPdf(html, filename);
  return { buffer, filename, path, storageKey };
}
