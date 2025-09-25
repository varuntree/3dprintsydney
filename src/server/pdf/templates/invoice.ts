import type { InvoiceDetail } from "@/server/services/invoices";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import { baseStyles } from "@/server/pdf/templates/shared/styles";
import { escapeHtml, formatMultiline, discountLabel } from "@/server/pdf/templates/shared/utils";

type InvoiceTemplateOptions = {
  logoDataUrl?: string;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  abn?: string;
  bankDetails?: string;
};

const formatStatus = (status: string) =>
  status
    .toLowerCase()
    .replace(/(^|[_\-])(\w)/g, (_, __, letter: string) => letter.toUpperCase())
    .replace(/_/g, " ");

function bankDetailsLines(raw?: string) {
  if (!raw) return [] as string[];
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function paymentTermsLine(invoice: InvoiceDetail) {
  if (!invoice.paymentTerms) return "Payment terms unavailable";
  if (invoice.paymentTerms.days === 0) {
    return `${invoice.paymentTerms.label} — due immediately`;
  }
  return `${invoice.paymentTerms.label} — ${invoice.paymentTerms.days}-day terms`;
}

function footerText(invoice: InvoiceDetail, formattedTotal: string) {
  if (invoice.status === "PAID") {
    return `${invoice.number} • ${formattedTotal} paid`;
  }
  const descriptor =
    invoice.paymentTerms?.days === 0
      ? "due immediately"
      : invoice.paymentTerms
      ? `due in ${invoice.paymentTerms.days} days`
      : "payment required before production";
  return `${invoice.number} • ${formattedTotal} ${descriptor}`;
}


export function renderInvoiceHtml(
  invoice: InvoiceDetail,
  options?: InvoiceTemplateOptions,
) {
  const issued = formatDate(invoice.issueDate.toISOString());
  const dueDisplay = invoice.dueDate ? formatDate(invoice.dueDate.toISOString()) : "—";
  const paymentTerms = paymentTermsLine(invoice);
  const notes = escapeHtml(invoice.notes ?? "").replace(/\n/g, "<br />");
  const terms = escapeHtml(invoice.terms ?? "").replace(/\n/g, "<br />");
  const formattedTotal = formatCurrency(invoice.total);
  const formattedBalance = formatCurrency(invoice.balanceDue);
  const summaryFooterText = footerText(invoice, formattedTotal);

  const bankLines = bankDetailsLines(options?.bankDetails);
  const safeBankLines = bankLines.length
    ? bankLines.map(escapeHtml)
    : [
        "Bank name — Commonwealth Bank",
        "BSB — 067-873",
        "Account number — 1772 6784",
        "Account name — Huxley Studios",
        `Reference — ${escapeHtml(invoice.number)}`,
      ];

  const lineRows = invoice.lines
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
            ${
              options?.logoDataUrl
                ? `<img class="logo" src="${options.logoDataUrl}" alt="Business logo" />`
                : ""
            }
            <div class="details">
              <strong>${escapeHtml(options?.businessName ?? "3D Print Sydney")}</strong><br />
              ${options?.abn ? `ABN: ${escapeHtml(options.abn)}<br />` : ""}
              ${formatMultiline(options?.businessAddress)}
              ${
                options?.businessPhone
                  ? `<br />Phone: ${escapeHtml(options.businessPhone)}`
                  : ""
              }
              ${
                options?.businessEmail
                  ? `<br />Email: ${escapeHtml(options.businessEmail)}`
                  : ""
              }
            </div>
          </div>
          <div class="meta">
            <span class="doc-chip">Invoice</span>
            <h1>Invoice</h1>
            <table>
              <tr><td class="key">Invoice #</td><td>${escapeHtml(invoice.number)}</td></tr>
              <tr><td class="key">Issued</td><td>${issued}</td></tr>
              <tr><td class="key">Due</td><td>${dueDisplay}</td></tr>
              <tr><td class="key">Payment terms</td><td>${escapeHtml(paymentTerms)}</td></tr>
              <tr><td class="key">Balance due</td><td>${formattedBalance}</td></tr>
            </table>
            <span class="status-badge">${escapeHtml(formatStatus(invoice.status))}</span>
          </div>
        </header>

        <section class="overview section avoid-break">
          <div class="card">
            <h2>Bill to</h2>
            <div class="metric"><strong>${escapeHtml(invoice.client.name)}</strong></div>
            <div class="metric muted">Invoice total: ${formattedTotal}</div>
            <div class="metric muted">Status: ${escapeHtml(formatStatus(invoice.status))}</div>
            <span class="badge">Due ${formattedBalance}</span>
          </div>
          <div class="card">
            <h2>Summary</h2>
            <div>${escapeHtml(summaryFooterText)}</div>
          </div>
          <div class="card">
            <h2>Key dates</h2>
            <div class="metric">Issued: ${issued}</div>
            <div class="metric">Due: ${dueDisplay}</div>
            <div class="metric">${escapeHtml(paymentTerms)}</div>
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
              ${lineRows}
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
                  <tr><td>Subtotal</td><td class="numeric">${formatCurrency(invoice.subtotal)}</td></tr>
                  <tr><td>Shipping</td><td class="numeric">${formatCurrency(invoice.shippingCost)}</td></tr>
                  <tr><td>Tax</td><td class="numeric">${formatCurrency(invoice.taxTotal)}</td></tr>
                  <tr><td>Total</td><td class="numeric">${formattedTotal}</td></tr>
                  <tr><td>Balance due</td><td class="numeric">${formattedBalance}</td></tr>
                </tbody>
              </table>
            </div>
            <div class="payment">
              <div class="card">
                <h2>Bank transfer</h2>
                <ul>
                  ${safeBankLines.map((line) => `<li>${line}</li>`).join("")}
                </ul>
                <div class="muted" style="margin-top:6px;"><strong>Important:</strong> include the invoice number as the payment reference.</div>
              </div>
              ${
                invoice.balanceDue > 0 && invoice.stripeCheckoutUrl
                  ? `<div class="card" style="text-align:center;">
                      <h2>Pay online</h2>
                      <div class="muted">Secure card payment via Stripe.</div>
                      <a class="btn" href="${invoice.stripeCheckoutUrl}">Pay ${formattedBalance}</a>
                    </div>`
                  : ""
              }
            </div>
          </div>
        </section>

        ${
          invoice.notes || invoice.terms
            ? `<section class="notes-grid section">
                ${invoice.notes ? `<div class="card"><h2>Notes</h2><p>${notes || "—"}</p></div>` : ""}
                ${invoice.terms ? `<div class="card"><h2>Terms</h2><p>${terms || "—"}</p></div>` : ""}
              </section>`
            : ""
        }

        <footer class="section">
          <strong>Terms &amp; Conditions</strong><br />
          Payment is required before production unless otherwise agreed in writing.<br />
          We manufacture from supplied files; ensure models are production ready for their intended purpose.<br />
          Tolerances, finishes, and colours may vary depending on material and printer selection.
        </footer>
      </main>
    </body>
  </html>
  `;
}
