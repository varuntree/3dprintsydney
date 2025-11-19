"use client";

import { useState } from "react";
import type { InvoiceViewModel } from "@/components/invoices/invoice-view";
import type { QuoteViewModel } from "@/components/quotes/quote-view";

const testInvoice: InvoiceViewModel = {
  id: 1,
  number: "INV-001",
  status: "PENDING",
  issueDate: "2024-11-19",
  dueDate: "2024-12-19",
  paidAt: null,
  clientName: "Test Client Pty Ltd",
  businessName: "3D Print Sydney",
  businessEmail: "hello@3dprintsydney.com.au",
  businessPhone: "+61 2 1234 5678",
  businessAddress: "123 Test Street\nSydney NSW 2000\nAustralia",
  abn: "12345678901",
  paymentTerms: { label: "Net 30", days: 30 },
  subtotal: 100,
  discountType: "none",
  discountValue: 0,
  shippingCost: 10,
  taxTotal: 11,
  total: 121,
  balanceDue: 121,
  poNumber: null,
  notes: "Test invoice for PDF generation.\nThank you for your business!",
  terms: "Payment due within 30 days.\nLate fees may apply.",
  currency: "AUD",
  stripeCheckoutUrl: "https://checkout.stripe.com/test",
  bankDetails: "BSB: 123-456\nAccount: 12345678\nAccount Name: 3D Print Sydney",
  lines: [
    {
      id: 1,
      name: "3D Printed Part - Large",
      description: "material: PLA\nquality: Standard\nlayer_height_mm: 0.2\ninfill_percent: 20\nprint_time_hours: 5.5\nfilament_used_g: 150",
      quantity: 2,
      unit: "ea",
      unitPrice: 50,
      discountType: "none",
      discountValue: null,
      total: 100,
      orderIndex: 0,
      calculatorBreakdown: null,
      lineType: "PRINT",
    },
  ],
};

const testQuote: QuoteViewModel = {
  id: 1,
  number: "QUO-001",
  status: "PENDING",
  issueDate: "2024-11-19",
  expiryDate: "2024-12-19",
  client: { name: "Test Client Pty Ltd" },
  businessName: "3D Print Sydney",
  businessEmail: "hello@3dprintsydney.com.au",
  businessPhone: "+61 2 1234 5678",
  businessAddress: "123 Test Street\nSydney NSW 2000\nAustralia",
  abn: "12345678901",
  paymentTerms: { label: "Due on acceptance", days: 0 },
  subtotal: 200,
  discountType: "percentage",
  discountValue: 10,
  shippingCost: 15,
  taxTotal: 21.5,
  total: 215.5,
  poNumber: null,
  notes: "Quote valid for 30 days.\nPrices include GST.",
  terms: "Payment required before production begins.",
  currency: "AUD",
  lines: [
    {
      id: 1,
      name: "Custom 3D Model",
      description: "material: PETG\nquality: High\nlayer_height_mm: 0.1\ninfill_percent: 40\nprint_time_hours: 12\nfilament_used_g: 300",
      quantity: 1,
      unit: "ea",
      unitPrice: 200,
      discountType: "percentage",
      discountValue: 10,
      total: 180,
      orderIndex: 0,
      calculatorBreakdown: null,
      lineType: "PRINT",
    },
  ],
};

export default function TestPdfPage() {
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function testInvoicePdf() {
    setLoading(true);
    setStatus("Generating invoice PDF...");
    try {
      // Dynamic imports to avoid SSR issues
      const { generateInvoicePdf } = await import("@/lib/pdf/generator");
      const { buildInvoicePdfDocument } = await import("@/lib/pdf/data");

      const pdfDoc = buildInvoicePdfDocument(testInvoice);

      // Debug: Log the PDF document data
      console.log("PDF Document:", pdfDoc);

      await generateInvoicePdf(pdfDoc, "test-invoice.pdf");
      setStatus("✅ Invoice PDF generated successfully!");
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      console.error("Invoice PDF generation failed:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "");
    } finally {
      setLoading(false);
    }
  }

  async function debugHtml() {
    try {
      const { renderInvoiceHtml } = await import("@/lib/pdf/templates/html-renderer");
      const pdfDoc = buildInvoicePdfDocument(testInvoice);
      const html = await renderInvoiceHtml(pdfDoc);
      console.log("Generated HTML length:", html.length);
      console.log("HTML Preview:", html.substring(0, 1000));
      setStatus(`✅ HTML generated: ${html.length} characters. Check console for preview.`);
    } catch (error) {
      console.error("HTML generation failed:", error);
      setStatus(`❌ HTML Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function testQuotePdf() {
    setLoading(true);
    setStatus("Generating quote PDF...");
    try {
      // Dynamic imports to avoid SSR issues
      const { generateQuotePdf } = await import("@/lib/pdf/generator");
      const { buildQuotePdfDocument } = await import("@/lib/pdf/data");

      const pdfDoc = buildQuotePdfDocument(testQuote);
      await generateQuotePdf(pdfDoc, "test-quote.pdf");
      setStatus("✅ Quote PDF generated successfully!");
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      console.error("Quote PDF generation failed:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto", fontFamily: "system-ui" }}>
      <h1 style={{ marginBottom: "30px" }}>PDF Generation Test</h1>

      <div style={{ marginBottom: "40px", padding: "20px", background: "#f5f5f5", borderRadius: "8px" }}>
        <h2 style={{ marginTop: 0 }}>Test Invoice PDF</h2>
        <p>Invoice #: {testInvoice.number}</p>
        <p>Client: {testInvoice.clientName}</p>
        <p>Total: ${testInvoice.total.toFixed(2)}</p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={testInvoicePdf}
            disabled={loading}
            style={{
              padding: "12px 24px",
              fontSize: "16px",
              background: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Generating..." : "Generate Invoice PDF"}
          </button>
          <button
            onClick={debugHtml}
            style={{
              padding: "12px 24px",
              fontSize: "16px",
              background: "#666",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Debug HTML
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "40px", padding: "20px", background: "#f5f5f5", borderRadius: "8px" }}>
        <h2 style={{ marginTop: 0 }}>Test Quote PDF</h2>
        <p>Quote #: {testQuote.number}</p>
        <p>Client: {testQuote.client.name}</p>
        <p>Total: ${testQuote.total.toFixed(2)}</p>
        <button
          onClick={testQuotePdf}
          disabled={loading}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            background: "#10b981",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Generating..." : "Generate Quote PDF"}
        </button>
      </div>

      {status && (
        <div
          style={{
            padding: "20px",
            background: status.includes("✅") ? "#d1fae5" : status.includes("❌") ? "#fee2e2" : "#fef3c7",
            borderRadius: "8px",
            marginTop: "20px",
          }}
        >
          <strong>{status}</strong>
        </div>
      )}

      <div style={{ marginTop: "40px", padding: "20px", background: "#f0f9ff", borderRadius: "8px" }}>
        <h3>Instructions:</h3>
        <ol>
          <li>Click "Generate Invoice PDF" or "Generate Quote PDF"</li>
          <li>PDF should download automatically</li>
          <li>Open the PDF and verify:
            <ul>
              <li>✓ Logo appears in header</li>
              <li>✓ Document info (number, dates)</li>
              <li>✓ Business and client details</li>
              <li>✓ Line items table with calculator breakdown</li>
              <li>✓ Totals section</li>
              <li>✓ Payment section (invoice) or notes (quote)</li>
              <li>✓ Footer with terms</li>
              <li>✓ Proper formatting and layout</li>
            </ul>
          </li>
        </ol>
      </div>
    </div>
  );
}
