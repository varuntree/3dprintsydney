import type { QuoteDetail } from "@/server/services/quotes";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import { baseStyles } from "@/server/pdf/templates/shared/styles";
import { escapeHtml, formatMultiline, discountLabel } from "@/server/pdf/templates/shared/utils";

type QuoteTemplateOptions = {
  logoDataUrl?: string;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  abn?: string;
  bankDetails?: string;
};

function formatPaymentTerms(quote: QuoteDetail) {
  if (!quote.paymentTerms) return "Payment terms unavailable";
  if (quote.paymentTerms.days === 0) {
    return `${quote.paymentTerms.label} — due on acceptance`;
  }
  return `${quote.paymentTerms.label} — ${quote.paymentTerms.days}-day terms`;
}

function bankDetailsLines(raw?: string) {
  if (!raw) return [] as string[];
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}


export function renderQuoteHtml(quote: QuoteDetail, options?: QuoteTemplateOptions) {
  const issued = formatDate(quote.issueDate.toISOString());
  const expires = quote.expiryDate ? formatDate(quote.expiryDate.toISOString()) : "—";
  const paymentTermsLine = formatPaymentTerms(quote);
  const notes = escapeHtml(quote.notes ?? "").replace(/\n/g, "<br />");
  const terms = escapeHtml(quote.terms ?? "").replace(/\n/g, "<br />");
  const bankLines = bankDetailsLines(options?.bankDetails).map(escapeHtml);

  const rows = quote.lines
    .map((line) => {
      const quantity = Number.isInteger(line.quantity)
        ? line.quantity
        : Number(line.quantity).toFixed(2);
      const description = escapeHtml(line.description ?? "").replace(/\n/g, "<br />");
      return `
        <tr>
          <td class="item-name">${escapeHtml(line.name)}</td>
          <td class="item-description">${description || "&nbsp;"}</td>
          <td class="numeric">${quantity}</td>
          <td class="unit">${escapeHtml(line.unit ?? "")}</td>
          <td class="numeric">${formatCurrency(line.unitPrice)}</td>
          <td class="numeric">${discountLabel(line.discountType, line.discountValue)}</td>
          <td class="numeric">${formatCurrency(line.total)}</td>
        </tr>
      `;
    })
    .join("");

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>${baseStyles}</style>
    </head>
    <body>
      <main class="document">
        <header class="header avoid-break">
          <div class="identity">
            ${options?.logoDataUrl ? `<img class="logo" src="${options.logoDataUrl}" alt="Business logo" />` : ""}
            <div class="details">
              <strong>${escapeHtml(options?.businessName ?? "3D Print Sydney")}</strong><br />
              ${options?.abn ? `ABN: ${escapeHtml(options.abn)}<br />` : ""}
              ${formatMultiline(options?.businessAddress)}
              ${options?.businessPhone ? `<br />Phone: ${escapeHtml(options.businessPhone)}` : ""}
              ${options?.businessEmail ? `<br />Email: ${escapeHtml(options.businessEmail)}` : ""}
            </div>
          </div>
          <div class="meta">
            <span class="doc-chip">Quote</span>
            <h1>Quote</h1>
            <table>
              <tr><td class="key">Quote #</td><td>${escapeHtml(quote.number)}</td></tr>
              <tr><td class="key">Issued</td><td>${issued}</td></tr>
              <tr><td class="key">Valid until</td><td>${expires}</td></tr>
              <tr><td class="key">Payment terms</td><td>${escapeHtml(paymentTermsLine)}</td></tr>
              <tr><td class="key">Total</td><td>${formatCurrency(quote.total)}</td></tr>
            </table>
          </div>
        </header>

        <section class="overview section avoid-break">
          <div class="card">
            <h2>Prepared for</h2>
            <div class="metric"><strong>${escapeHtml(quote.client.name)}</strong></div>
            <div class="metric muted">Items: ${quote.lines.length}</div>
            <div class="metric muted">Total on approval: ${formatCurrency(quote.total)}</div>
          </div>
          <div class="card">
            <h2>Summary</h2>
            <div>${escapeHtml(paymentTermsLine)}</div>
            <div>Quote valid until ${expires}</div>
          </div>
        </section>

        <section class="section">
          <table class="items">
            <colgroup>
              <col class="col-name" />
              <col class="col-desc" />
              <col class="col-qty" />
              <col class="col-unit" />
              <col class="col-uprice" />
              <col class="col-disc" />
              <col class="col-total" />
            </colgroup>
            <thead class="items-head">
              <tr>
                <th>Item</th>
                <th>Description</th>
                <th class="numeric">Qty</th>
                <th>Unit</th>
                <th class="numeric">Unit price</th>
                <th class="numeric">Discount</th>
                <th class="numeric">Line total</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
            <tfoot class="items-foot"><tr><td colspan="7"></td></tr></tfoot>
          </table>
        </section>

        <section class="totals-grid section">
          <div></div>
          <div>
            <div class="totals card">
              <table>
                <tbody>
                  <tr><td>Subtotal</td><td class="numeric">${formatCurrency(quote.subtotal)}</td></tr>
                  <tr><td>Shipping</td><td class="numeric">${formatCurrency(quote.shippingCost)}</td></tr>
                  <tr><td>Tax</td><td class="numeric">${formatCurrency(quote.taxTotal)}</td></tr>
                  <tr><td>Total</td><td class="numeric">${formatCurrency(quote.total)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section class="section card next avoid-break">
          <h2>Next steps</h2>
          <p>Review this quote. When you’re ready to proceed, approve it so we can issue the invoice and begin production.</p>
          ${bankLines.length ? `<ul>${bankLines.map((line) => `<li>${line}</li>`).join("")}</ul>` : ""}
        </section>

        ${
          quote.notes || quote.terms
            ? `<section class="notes-grid section">
                ${quote.notes ? `<div class="card"><h2>Notes</h2><p>${notes || "—"}</p></div>` : ""}
                ${quote.terms ? `<div class="card"><h2>Terms</h2><p>${terms || "—"}</p></div>` : ""}
              </section>`
            : ""
        }

        <footer class="section">
          <strong>Terms &amp; Conditions</strong><br />
          Quote valid until the listed expiry date. Prices include GST.<br />
          Production commences after acceptance and payment. Ensure supplied files are production ready.<br />
          Tolerances and finishes may vary depending on material and printer selection.
        </footer>
      </main>
    </body>
  </html>
  `;
}
