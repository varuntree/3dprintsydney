import puppeteer from "puppeteer";
import { existsSync, readFileSync } from "fs";
import { join, extname } from "path";
import { ensureStorage, savePdf, resolvePdfPath } from "@/server/files/storage";
import { getQuoteDetail } from "@/server/services/quotes";
import { getInvoiceDetail } from "@/server/services/invoices";
import { getSettings } from "@/server/services/settings";
import { createStripeCheckoutSession } from "@/server/services/stripe";
import { renderQuoteHtml } from "@/server/pdf/templates/quote";
import { renderInvoiceHtml } from "@/server/pdf/templates/invoice";
import { logger } from "@/lib/logger";

async function renderPdf(html: string, filename: string) {
  await ensureStorage();
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const pdfData = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "20mm",
      bottom: "20mm",
      left: "16mm",
      right: "16mm",
    },
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
  const html = renderQuoteHtml(quote, {
    logoDataUrl,
    businessName: settings?.businessName ?? "3D Print Sydney",
    businessAddress: settings?.businessAddress ?? "",
    businessPhone: settings?.businessPhone ?? "",
    businessEmail: settings?.businessEmail ?? "",
    abn: settings?.abn ?? "",
    bankDetails: settings?.bankDetails ?? "",
  });
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

  const html = renderInvoiceHtml(invoice, {
    logoDataUrl,
    businessName: settings?.businessName ?? "3D Print Sydney",
    businessAddress: settings?.businessAddress ?? "",
    businessPhone: settings?.businessPhone ?? "",
    businessEmail: settings?.businessEmail ?? "",
    abn: settings?.abn ?? "",
    bankDetails: settings?.bankDetails ?? "",
  });
  const { buffer, path } = await renderPdf(
    html,
    `invoice-${invoice.number}.pdf`,
  );
  return { buffer, filename: `invoice-${invoice.number}.pdf`, path };
}
