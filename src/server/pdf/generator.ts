import puppeteer from "puppeteer";
import { existsSync, readFileSync } from "fs";
import { join, extname } from "path";
import { ensureStorage, savePdf, resolvePdfPath } from "@/server/files/storage";
import { getQuoteDetail } from "@/server/services/quotes";
import { getInvoiceDetail } from "@/server/services/invoices";
import { getSettings } from "@/server/services/settings";
import { createStripeCheckoutSession } from "@/server/services/stripe";
import { renderProductionQuoteHtml, renderProductionInvoiceHtml } from "@/server/pdf/templates/production";
import { logger } from "@/lib/logger";

// Production template - single high-quality template
const getQuoteTemplate = () => renderProductionQuoteHtml;

const getInvoiceTemplate = () => renderProductionInvoiceHtml;

async function renderPdf(html: string, filename: string) {
  await ensureStorage();

  // Enhanced Puppeteer configuration for better PDF rendering
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-web-security",
      "--disable-features=VizDisplayCompositor",
      // Enhanced rendering flags
      "--disable-extensions",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-ipc-flooding-protection",
      "--enable-font-antialiasing",
      "--force-color-profile=sRGB",
      // Memory and performance optimizations
      "--memory-pressure-off",
      "--max_old_space_size=4096",
      // PDF-specific optimizations
      "--run-all-compositor-stages-before-draw",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding"
    ],
    // Increased timeout and memory
    timeout: 60000,
  });

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

  await browser.close();
  const buffer = Buffer.from(pdfData);
  await savePdf(filename, buffer);
  return { buffer, path: resolvePdfPath(filename) };
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
  };

  // Route to appropriate template based on style
  const html = getQuoteTemplate()(quote, templateData);
  const { buffer, path } = await renderPdf(html, `quote-${quote.number}.pdf`);
  return { buffer, filename: `quote-${quote.number}.pdf`, path };
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
  };

  // Route to appropriate template based on style
  const invoiceForTemplate = {
    ...invoice,
    stripeCheckoutUrl: invoice.stripeCheckoutUrl ?? null,
  };

  const html = getInvoiceTemplate()(invoiceForTemplate, templateData);
  const { buffer, path } = await renderPdf(html, `invoice-${invoice.number}.pdf`);
  return { buffer, filename: `invoice-${invoice.number}.pdf`, path };
}
