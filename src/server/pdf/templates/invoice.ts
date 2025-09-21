import type { InvoiceDetail } from "@/server/services/invoices";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";

export function renderInvoiceHtml(invoice: InvoiceDetail) {
  const issued = formatDate(invoice.issueDate.toISOString());
  const due = invoice.dueDate ? formatDate(invoice.dueDate.toISOString()) : "—";

  const rows = invoice.lines
    .map(
      (line) => `
        <tr>
          <td>${line.name}</td>
          <td>${line.description ?? ""}</td>
          <td class="numeric">${line.quantity.toFixed(2)}</td>
          <td>${line.unit ?? ""}</td>
          <td class="numeric">${formatCurrency(line.unitPrice)}</td>
          <td class="numeric">${line.discountType.toLowerCase()}</td>
          <td class="numeric">${formatCurrency(line.discountValue ?? 0)}</td>
          <td class="numeric">${formatCurrency(line.total)}</td>
        </tr>
      `,
    )
    .join("");

  const payments = invoice.payments
    .map(
      (payment) => `
        <tr>
          <td>${formatDate(payment.paidAt.toISOString())}</td>
          <td>${payment.method.toLowerCase()}</td>
          <td>${payment.reference || "—"}</td>
          <td class="numeric">${formatCurrency(payment.amount)}</td>
        </tr>
      `,
    )
    .join("");

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body {
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          margin: 0;
          padding: 32px;
          color: #111827;
        }
        header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 32px;
        }
        h1 {
          font-size: 28px;
          margin: 0;
          letter-spacing: 2px;
        }
        .meta {
          margin-top: 12px;
          font-size: 12px;
          color: #6b7280;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          text-align: left;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-bottom: 1px solid #e5e7eb;
          padding: 8px;
        }
        td {
          font-size: 12px;
          padding: 8px;
          border-bottom: 1px solid #f3f4f6;
        }
        .numeric {
          text-align: right;
          white-space: nowrap;
        }
        .summary {
          margin-top: 24px;
          width: 280px;
          margin-left: auto;
          font-size: 12px;
        }
        .summary div {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
        }
        .summary div.total {
          font-weight: 600;
          font-size: 14px;
          border-top: 1px solid #e5e7eb;
          margin-top: 8px;
        }
      </style>
    </head>
    <body>
      <header>
        <div>
          <h1>INVOICE</h1>
          <div class="meta">
            <div>Invoice #: ${invoice.number}</div>
            <div>Issued: ${issued}</div>
            <div>Due: ${due}</div>
          </div>
        </div>
        <div class="meta">
          <div><strong>Client</strong></div>
          <div>${invoice.client.name}</div>
        </div>
      </header>
      <section>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Notes</th>
              <th class="numeric">Qty</th>
              <th>Unit</th>
              <th class="numeric">Unit Price</th>
              <th class="numeric">Discount</th>
              <th class="numeric">Less</th>
              <th class="numeric">Line Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </section>
      <section class="summary">
        <div><span>Subtotal</span><span>${formatCurrency(invoice.subtotal)}</span></div>
        <div><span>Shipping</span><span>${formatCurrency(invoice.shippingCost)}</span></div>
        <div><span>Tax</span><span>${formatCurrency(invoice.taxTotal)}</span></div>
        <div class="total"><span>Total</span><span>${formatCurrency(invoice.total)}</span></div>
        <div><span>Balance due</span><span>${formatCurrency(invoice.balanceDue)}</span></div>
      </section>
      ${
        payments
          ? `<section style="margin-top:24px;">
        <h2 style="font-size:12px; text-transform:uppercase; letter-spacing:2px;">Payments</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Method</th>
              <th>Reference</th>
              <th class="numeric">Amount</th>
            </tr>
          </thead>
          <tbody>${payments}</tbody>
        </table>
      </section>`
          : ""
      }
      <section class="meta" style="margin-top:24px;">
        ${invoice.terms ? `<div><strong>Terms</strong>: ${invoice.terms}</div>` : ""}
        ${invoice.notes ? `<div><strong>Notes</strong>: ${invoice.notes}</div>` : ""}
      </section>
    </body>
  </html>
  `;
}
