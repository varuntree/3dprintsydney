import type { QuoteDetail } from "@/server/services/quotes";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";

export function renderQuoteHtml(quote: QuoteDetail) {
  const issued = formatDate(quote.issueDate.toISOString());
  const expires = quote.expiryDate
    ? formatDate(quote.expiryDate.toISOString())
    : "—";

  const rows = quote.lines
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
          <h1>QUOTE</h1>
          <div class="meta">
            <div>Quote #: ${quote.number}</div>
            <div>Issued: ${issued}</div>
            <div>Expires: ${expires}</div>
          </div>
        </div>
        <div class="meta">
          <div><strong>Client</strong></div>
          <div>${quote.client.name}</div>
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
        <div><span>Subtotal</span><span>${formatCurrency(quote.subtotal)}</span></div>
        <div><span>Shipping</span><span>${formatCurrency(quote.shippingCost)}</span></div>
        <div><span>Tax</span><span>${formatCurrency(quote.taxTotal)}</span></div>
        <div class="total"><span>Total</span><span>${formatCurrency(quote.total)}</span></div>
      </section>
      <section class="meta" style="margin-top:24px;">
        ${quote.terms ? `<div><strong>Terms</strong>: ${quote.terms}</div>` : ""}
        ${quote.notes ? `<div><strong>Notes</strong>: ${quote.notes}</div>` : ""}
      </section>
    </body>
  </html>
  `;
}
