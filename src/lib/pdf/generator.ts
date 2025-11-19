import type { InvoicePdfDocument, QuotePdfDocument } from "./types";
import { renderInvoiceHtml, renderQuoteHtml } from "./templates/html-renderer";

/**
 * Generate and download an invoice PDF
 */
export async function generateInvoicePdf(
  doc: InvoicePdfDocument,
  filename: string
): Promise<void> {
  // Dynamic imports for client-side only
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  // Render HTML template
  const htmlContent = await renderInvoiceHtml(doc);

  // Create temporary container - must be visible for proper layout calculation
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.top = "0";
  container.style.left = "0";
  container.style.width = "793px"; // A4 width (210mm at 96dpi)
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  // Wait for browser to complete layout calculation and image loading
  await new Promise(resolve => setTimeout(resolve, 200));

  try {
    // Render to canvas with html2canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      width: 793,
      height: container.scrollHeight,
      windowWidth: 793,
      windowHeight: container.scrollHeight,
    });

    // Convert canvas to PDF
    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const pdf = new jsPDF({
      unit: "px",
      format: [793, container.scrollHeight],
      orientation: container.scrollHeight > 793 ? "portrait" : "landscape",
    });

    pdf.addImage(imgData, "JPEG", 0, 0, 793, container.scrollHeight);
    pdf.save(filename);
  } finally {
    // Cleanup
    document.body.removeChild(container);
  }
}

/**
 * Generate and download a quote PDF
 */
export async function generateQuotePdf(
  doc: QuotePdfDocument,
  filename: string
): Promise<void> {
  // Dynamic imports for client-side only
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  // Render HTML template
  const htmlContent = await renderQuoteHtml(doc);

  // Create temporary container - must be visible for proper layout calculation
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.top = "0";
  container.style.left = "0";
  container.style.width = "793px"; // A4 width (210mm at 96dpi)
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  // Wait for browser to complete layout calculation and image loading
  await new Promise(resolve => setTimeout(resolve, 200));

  try {
    // Render to canvas with html2canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      width: 793,
      height: container.scrollHeight,
      windowWidth: 793,
      windowHeight: container.scrollHeight,
    });

    // Convert canvas to PDF
    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const pdf = new jsPDF({
      unit: "px",
      format: [793, container.scrollHeight],
      orientation: container.scrollHeight > 793 ? "portrait" : "landscape",
    });

    pdf.addImage(imgData, "JPEG", 0, 0, 793, container.scrollHeight);
    pdf.save(filename);
  } finally {
    // Cleanup
    document.body.removeChild(container);
  }
}
