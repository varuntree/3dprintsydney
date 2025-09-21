import puppeteer from "puppeteer";
import { ensureStorage, savePdf, resolvePdfPath } from "@/server/files/storage";
import { getQuoteDetail } from "@/server/services/quotes";
import { getInvoiceDetail } from "@/server/services/invoices";
import { renderQuoteHtml } from "@/server/pdf/templates/quote";
import { renderInvoiceHtml } from "@/server/pdf/templates/invoice";

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
  const html = renderQuoteHtml(quote);
  const { buffer, path } = await renderPdf(html, `quote-${quote.number}.pdf`);
  return { buffer, filename: `quote-${quote.number}.pdf`, path };
}

export async function generateInvoicePdf(id: number) {
  const invoice = await getInvoiceDetail(id);
  const html = renderInvoiceHtml(invoice);
  const { buffer, path } = await renderPdf(
    html,
    `invoice-${invoice.number}.pdf`,
  );
  return { buffer, filename: `invoice-${invoice.number}.pdf`, path };
}
