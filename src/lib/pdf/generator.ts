import jsPDF from "jspdf";
import type { InvoicePdfDocument, QuotePdfDocument } from "./types";
import { renderInvoiceTemplate } from "./templates/invoice";
import { renderQuoteTemplate } from "./templates/quote";

/**
 * Generate and download an invoice PDF
 */
export function generateInvoicePdf(
  doc: InvoicePdfDocument,
  filename: string
): void {
  // Initialize jsPDF with A4 portrait settings
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Render the invoice template
  renderInvoiceTemplate(pdf, doc);

  // Trigger download
  pdf.save(filename);
}

/**
 * Generate and download a quote PDF
 */
export function generateQuotePdf(
  doc: QuotePdfDocument,
  filename: string
): void {
  // Initialize jsPDF with A4 portrait settings
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Render the quote template
  renderQuoteTemplate(pdf, doc);

  // Trigger download
  pdf.save(filename);
}
