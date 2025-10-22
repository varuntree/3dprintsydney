import { formatCurrency } from "@/lib/currency";
import { escapeHtml, formatMultiline } from "@/server/pdf/templates/shared/utils";
import type { QuoteDetailDTO } from "@/lib/types/quotes";
import type { InvoiceDetailDTO } from "@/lib/types/invoices";

type BusinessInfo = {
  logoDataUrl?: string;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  abn?: string;
  bankDetails?: string;
};

type TemplateOptions = BusinessInfo & { currency?: string };

type LineItem = {
  id: number;
  name: string;
  description?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  total: number;
};

type InvoiceWithPayment = InvoiceDetailDTO & {
  stripeCheckoutUrl?: string | null;
};

const FONT_STACK = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const COLORS = {
  text: "#0f172a",
  muted: "#475569",
  subtle: "#64748b",
  border: "#e2e8f0",
  highlight: "#111827",
  highlightText: "#f8fafc",
  panel: "#f8fafc",
};

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "long",
  year: "numeric",
};

function formatDate(value: Date | null): string {
  if (!value) {
    return "—";
  }
  return value.toLocaleDateString("en-AU", DATE_FORMAT);
}

function toCurrency(value: number, currency = "AUD") {
  return formatCurrency(value, currency);
}

function resolveTaxLabel(rate?: number | null): string | undefined {
  if (rate === undefined || rate === null) {
    return undefined;
  }
  const numeric = Number(rate);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return undefined;
  }
  const display = Number.isInteger(numeric)
    ? numeric.toString()
    : numeric.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `Tax (${display}%)`;
}

function sanitize(text: string | null | undefined): string {
  if (!text) return "";
  const trimmed = text.trim();
  return escapeHtml(trimmed);
}

function wrapDocument(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: only light;
      }

      * {
        box-sizing: border-box;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      @page {
        size: A4 portrait;
        margin: 22mm 18mm;
      }

      html, body {
        margin: 0;
        padding: 0;
        font-family: ${FONT_STACK};
        color: ${COLORS.text};
        background: #fff;
        font-size: 12px;
        line-height: 1.6;
      }

      body {
        padding: 0;
      }

      .document {
        display: flex;
        flex-direction: column;
        gap: 28px;
      }

      .doc-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 32px;
        padding-bottom: 20px;
        border-bottom: 1px solid ${COLORS.border};
      }

      .brand-block {
        display: flex;
        gap: 20px;
        align-items: flex-start;
      }

      .brand-logo {
        width: 72px;
        height: 72px;
        border-radius: 10px;
        border: 1px solid ${COLORS.border};
        background: #fff;
        object-fit: contain;
      }

      .brand-placeholder {
        width: 72px;
        height: 72px;
        border-radius: 10px;
        border: 1px dashed ${COLORS.border};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        color: ${COLORS.subtle};
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }

      .brand-meta {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .doc-title {
        margin: 0;
        font-size: 28px;
        letter-spacing: 0.28em;
        text-transform: uppercase;
        font-weight: 600;
      }

      .business-lines {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 12px;
        color: ${COLORS.muted};
        line-height: 1.45;
      }

      .header-info {
        display: grid;
        row-gap: 10px;
        min-width: 200px;
      }

      .header-info dt {
        font-size: 10px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: ${COLORS.subtle};
        margin: 0 0 4px;
      }

      .header-info dd {
        margin: 0;
        font-weight: 600;
        font-size: 14px;
        letter-spacing: -0.01em;
      }

      .summary {
        display: flex;
        gap: 24px;
        align-items: stretch;
        flex-wrap: wrap;
      }

      .card {
        background: ${COLORS.panel};
        border: 1px solid ${COLORS.border};
        border-radius: 18px;
        padding: 20px 24px;
        flex: 1 1 240px;
        page-break-inside: avoid;
      }

      .card-title {
        font-size: 11px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        font-weight: 600;
        color: ${COLORS.subtle};
        margin-bottom: 10px;
      }

      .card p {
        margin: 0 0 6px;
        font-size: 13px;
        color: ${COLORS.muted};
      }

      .card strong {
        color: ${COLORS.text};
      }

      .highlight-card {
        background: ${COLORS.highlight};
        color: ${COLORS.highlightText};
        border: none;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .highlight-value {
        font-size: 28px;
        font-weight: 600;
        letter-spacing: -0.02em;
        margin: 0 0 6px;
      }

      .highlight-hint {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.8);
        margin: 0;
      }

      .section-title {
        font-size: 11px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        font-weight: 600;
        color: ${COLORS.subtle};
        margin-bottom: 12px;
      }

      table.items-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }

      table.items-table thead th {
        text-align: left;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 10px;
        padding: 12px 14px;
        color: ${COLORS.subtle};
        border-bottom: 1px solid ${COLORS.border};
        background: ${COLORS.panel};
      }

      table.items-table tbody td {
        padding: 16px 14px;
        border-bottom: 1px solid ${COLORS.border};
        vertical-align: top;
      }

      .col-qty,
      .col-rate,
      .col-total {
        text-align: right;
        font-weight: 600;
      }

      .item-name {
        font-weight: 600;
        color: ${COLORS.text};
        margin-bottom: 6px;
        letter-spacing: -0.01em;
      }

      .item-detail {
        font-size: 12px;
        color: ${COLORS.muted};
        line-height: 1.45;
      }

      .totals {
        display: flex;
        justify-content: flex-end;
      }

      .totals-table {
        width: 280px;
        border: 1px solid ${COLORS.border};
        border-radius: 16px;
        padding: 18px 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .totals-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: ${COLORS.muted};
        font-size: 13px;
      }

      .totals-label {
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-size: 10px;
      }

      .totals-value {
        font-weight: 600;
        color: ${COLORS.text};
      }

      .totals-row.total .totals-value {
        font-size: 16px;
      }

      .totals-row.accent .totals-value {
        color: ${COLORS.text};
      }

      .text-block {
        line-height: 1.65;
        font-size: 12px;
        color: ${COLORS.muted};
      }

      .text-block p {
        margin: 0 0 8px;
      }

      .text-block pre {
        margin: 12px 0 0;
        font-family: ${FONT_STACK};
        white-space: pre-line;
        font-size: 12px;
        color: ${COLORS.text};
      }

      .payment-section {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }

      .payment-grid {
        display: flex;
        gap: 18px;
        flex-wrap: wrap;
      }

      .payment-card {
        flex: 1 1 260px;
        background: ${COLORS.panel};
        border: 1px solid ${COLORS.border};
        border-radius: 18px;
        padding: 18px 22px;
        page-break-inside: avoid;
      }

      .payment-card h4 {
        margin: 0 0 8px;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }

      .payment-card p {
        margin: 0 0 10px;
        font-size: 12px;
        color: ${COLORS.muted};
      }

      .payment-info {
        margin: 0;
        font-size: 13px;
        color: ${COLORS.text};
        white-space: pre-line;
      }

      .pay-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 10px 18px;
        background: ${COLORS.highlight};
        color: ${COLORS.highlightText};
        border-radius: 999px;
        text-decoration: none;
        font-weight: 600;
        letter-spacing: 0.06em;
        margin-top: 6px;
      }

      .footer {
        margin-top: 12px;
        padding-top: 14px;
        border-top: 1px solid ${COLORS.border};
        font-size: 11px;
        color: ${COLORS.subtle};
        text-align: center;
        letter-spacing: 0.08em;
      }

      .no-break {
        page-break-inside: avoid;
      }

      @media print {
        .document {
          gap: 24px;
        }
        .card,
        .payment-card {
          break-inside: avoid;
        }
      }
    </style>
  </head>
  <body>
    <div class="document">
      ${content}
    </div>
  </body>
</html>`;
}

function renderBusinessBlock(info: BusinessInfo): string {
  const lines: string[] = [];
  if (info.businessName) {
    lines.push(`<strong>${sanitize(info.businessName)}</strong>`);
  }
  if (info.businessAddress) {
    lines.push(`<span>${formatMultiline(info.businessAddress)}</span>`);
  }
  if (info.businessEmail) {
    lines.push(`<span>${sanitize(info.businessEmail)}</span>`);
  }
  if (info.businessPhone) {
    lines.push(`<span>${sanitize(info.businessPhone)}</span>`);
  }
  if (info.abn) {
    lines.push(`<span>ABN: ${sanitize(info.abn)}</span>`);
  }
  if (!lines.length) {
    return "";
  }
  return `<div class="business-lines">${lines.join("")}</div>`;
}

function renderHeader(
  title: string,
  headlineEntries: Array<{ label: string; value: string }>,
  info: BusinessInfo,
): string {
  const brand = info.logoDataUrl
    ? `<img src="${info.logoDataUrl}" alt="Logo" class="brand-logo" />`
    : `<div class="brand-placeholder">Logo</div>`;
  const meta = headlineEntries
    .map(
      (entry) => `<div>
          <dt>${escapeHtml(entry.label)}</dt>
          <dd>${escapeHtml(entry.value)}</dd>
        </div>`,
    )
    .join("");
  return `<header class="doc-header">
      <div class="brand-block">
        ${brand}
        <div class="brand-meta">
          <h1 class="doc-title">${escapeHtml(title)}</h1>
          ${renderBusinessBlock(info)}
        </div>
      </div>
      <dl class="header-info">${meta}</dl>
    </header>`;
}

function renderBillTo(client: QuoteDetailDTO["client"] | InvoiceDetailDTO["client"]): string {
  const detailLines: string[] = [];
  if (client.company) {
    detailLines.push(`<p>${sanitize(client.company)}</p>`);
  }
  if (client.address) {
    detailLines.push(`<p>${formatMultiline(client.address)}</p>`);
  }
  if (client.email) {
    detailLines.push(`<p>${sanitize(client.email)}</p>`);
  }
  if (client.phone) {
    detailLines.push(`<p>${sanitize(client.phone)}</p>`);
  }
  return `<div class="card">
      <div class="card-title">Bill to</div>
      <p><strong>${sanitize(client.name)}</strong></p>
      ${detailLines.join("")}
    </div>`;
}

function renderLineItems(items: LineItem[], currency: string): string {
  const rows = items
    .map((item) => {
      const details = (item.description ?? "")
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => `<div class="item-detail">• ${escapeHtml(entry)}</div>`)
        .join("");

      return `<tr>
          <td>
            <div class="item-name">${escapeHtml(item.name)}</div>
            ${details}
          </td>
          <td class="col-qty">${escapeHtml(
            `${item.quantity}${item.unit ? ` ${item.unit}` : ""}`,
          )}</td>
          <td class="col-rate">${escapeHtml(toCurrency(item.unitPrice, currency))}</td>
          <td class="col-total">${escapeHtml(toCurrency(item.total, currency))}</td>
        </tr>`;
    })
    .join("");

  return `<section>
      <div class="section-title">Items</div>
      <table class="items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th class="col-qty">Qty</th>
            <th class="col-rate">Unit Price</th>
            <th class="col-total">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}

function renderTotalsSummary(
  values: {
    subtotal: number;
    tax: number;
    total: number;
    discount?: number;
    taxLabel?: string;
    balanceLabel?: string;
    balanceValue?: number;
  },
  currency?: string,
): string {
  const resolvedCurrency = currency ?? "AUD";
  const rows: string[] = [];
  rows.push(`<div class="totals-row">
      <span class="totals-label">Subtotal</span>
      <span class="totals-value">${escapeHtml(toCurrency(values.subtotal, resolvedCurrency))}</span>
    </div>`);

  if (values.discount && values.discount > 0) {
    rows.push(`<div class="totals-row">
        <span class="totals-label">Discount</span>
        <span class="totals-value">-${escapeHtml(toCurrency(values.discount, resolvedCurrency))}</span>
      </div>`);
  }

  if (values.tax > 0) {
    const label = values.taxLabel ? values.taxLabel : "Tax";
    rows.push(`<div class="totals-row">
        <span class="totals-label">${escapeHtml(label)}</span>
        <span class="totals-value">${escapeHtml(toCurrency(values.tax, resolvedCurrency))}</span>
      </div>`);
  }

  rows.push(`<div class="totals-row total">
      <span class="totals-label">Total</span>
      <span class="totals-value">${escapeHtml(toCurrency(values.total, resolvedCurrency))}</span>
    </div>`);

  if (values.balanceLabel && values.balanceValue !== undefined) {
    rows.push(`<div class="totals-row accent">
        <span class="totals-label">${escapeHtml(values.balanceLabel)}</span>
        <span class="totals-value">${escapeHtml(toCurrency(values.balanceValue, resolvedCurrency))}</span>
      </div>`);
  }

  return `<div class="totals">
      <div class="totals-table">
        ${rows.join("")}
      </div>
    </div>`;
}

function renderInformationalParagraph(value: string | null | undefined): string {
  if (!value || value.trim().length === 0) {
    return "";
  }
  return `<section class="text-block">
      <p>${formatMultiline(value)}</p>
    </section>`;
}

function renderLegalText(label: string, value: string | null | undefined): string {
  if (!value || value.trim().length === 0) {
    return "";
  }
  return `<section class="text-block">
      <p><strong>${escapeHtml(label)}:</strong> ${formatMultiline(value)}</p>
    </section>`;
}

function renderFooterLine(reference: string): string {
  return `<footer class="footer">${escapeHtml(reference)}</footer>`;
}

export function renderProductionQuoteHtml(quote: QuoteDetailDTO, options: TemplateOptions = {}): string {
  const { currency = "AUD", ...businessRest } = options;
  const businessInfo: BusinessInfo = { ...businessRest };
  const headline = [
    { label: "Quote number", value: quote.number },
    { label: "Valid until", value: formatDate(quote.expiryDate ?? null) },
    {
      label: "Quote terms",
      value: quote.paymentTerms ? quote.paymentTerms.label : "—",
    },
  ];

  const summaryText = quote.expiryDate
    ? `valid until ${formatDate(quote.expiryDate)}`
    : `issued ${formatDate(quote.issueDate)}`;

  const lineItems: LineItem[] = quote.lines.map((line) => ({
    id: line.id,
    name: line.name,
    description: line.description ?? "",
    quantity: line.quantity,
    unit: line.unit ?? "",
    unitPrice: line.unitPrice,
    total: line.total,
  }));

  const referenceLine = `${quote.number} • ${toCurrency(quote.total, currency)} quote ${
    quote.expiryDate ? `expires ${formatDate(quote.expiryDate)}` : "issued"
  }`;

  const content = `
    ${renderHeader("Quote", headline, businessInfo)}
    <section class="summary">
      ${renderBillTo(quote.client)}
      <div class="card highlight-card">
        <p class="highlight-value">${escapeHtml(toCurrency(quote.total, currency))}</p>
        <p class="highlight-hint">${escapeHtml(summaryText)}</p>
      </div>
    </section>
    ${renderLineItems(lineItems, currency)}
    ${renderTotalsSummary({
      subtotal: quote.subtotal,
      tax: quote.taxTotal,
      total: quote.total,
      taxLabel: resolveTaxLabel(quote.taxRate),
      balanceLabel: "Amount due",
      balanceValue: quote.total,
    }, currency)}
    ${renderInformationalParagraph(quote.notes)}
    ${renderLegalText("Terms & Conditions", quote.terms)}
    ${renderFooterLine(referenceLine)}
  `;

  return wrapDocument(`Quote ${quote.number}`, content);
}

function resolveInvoiceDueLabel(invoice: InvoiceWithPayment): { label: string; value: string } {
  if (invoice.balanceDue <= 0) {
    return { label: "status", value: "Paid in full" };
  }
  if (invoice.dueDate) {
    return { label: "due date", value: `due by ${formatDate(invoice.dueDate)}` };
  }
  return { label: "due", value: "due immediately" };
}

function renderStripeCard(invoice: InvoiceWithPayment, currency: string): string {
  if (!invoice.stripeCheckoutUrl) {
    return "";
  }
  return `<div class="payment-card">
      <h4>Pay online with card</h4>
      <p>Click the button below to pay securely with your credit or debit card.</p>
      <a href="${invoice.stripeCheckoutUrl}" class="pay-button">Pay ${escapeHtml(
        toCurrency(invoice.balanceDue, currency),
      )} Online</a>
      <p style="margin-top: 8px; font-size: 11px; color: ${COLORS.subtle};">Secure payment powered by Stripe</p>
    </div>`;
}

function renderBankCard(info: BusinessInfo, invoice: InvoiceWithPayment): string {
  if (!info.bankDetails) {
    return "";
  }
  return `<div class="payment-card">
      <h4>Pay with bank transfer</h4>
      <p>Please transfer payment to:</p>
      <p class="payment-info">${formatMultiline(info.bankDetails)}</p>
      <p><strong>Reference — ${escapeHtml(invoice.number)}</strong></p>
      <p style="font-size: 11px; color: ${COLORS.subtle};">Important: Include the invoice number as the payment reference.</p>
    </div>`;
}

export function renderProductionInvoiceHtml(invoice: InvoiceWithPayment, options: TemplateOptions = {}): string {
  const { currency = "AUD", ...businessRest } = options;
  const businessInfo: BusinessInfo = { ...businessRest };
  const headline = [
    { label: "Invoice number", value: invoice.number },
    { label: "Date issued", value: formatDate(invoice.issueDate) },
    {
      label: "Payment terms",
      value: invoice.paymentTerms ? invoice.paymentTerms.label : "—",
    },
  ];

  const dueCopy = resolveInvoiceDueLabel(invoice);

  const lineItems: LineItem[] = invoice.lines.map((line) => ({
    id: line.id,
    name: line.name,
    description: line.description ?? "",
    quantity: line.quantity,
    unit: line.unit ?? "",
    unitPrice: line.unitPrice,
    total: line.total,
  }));

  const referenceLine = `${invoice.number} • ${toCurrency(invoice.total, currency)} ${dueCopy.value}`;

  const paymentCards = [renderStripeCard(invoice, currency), renderBankCard(businessInfo, invoice)]
    .filter(Boolean)
    .join("");

  const content = `
    ${renderHeader("Invoice", headline, businessInfo)}
    <section class="summary">
      ${renderBillTo(invoice.client)}
      <div class="card highlight-card">
        <div>
          <p class="card-title">Amount due</p>
          <p class="highlight-value">${escapeHtml(toCurrency(invoice.balanceDue, currency))}</p>
        </div>
        <p class="highlight-hint">${escapeHtml(dueCopy.value)}</p>
      </div>
    </section>
    ${renderInformationalParagraph(invoice.notes)}
    ${renderLineItems(lineItems, currency)}
    ${renderTotalsSummary(
      {
        subtotal: invoice.subtotal,
        tax: invoice.taxTotal,
        total: invoice.total,
        taxLabel: resolveTaxLabel(invoice.taxRate),
        balanceLabel: "Amount due",
        balanceValue: invoice.balanceDue,
      },
      currency,
    )}
    ${paymentCards ? `<section class="payment-section">
        <div class="section-title">Make payment</div>
        <div class="payment-grid">${paymentCards}</div>
      </section>` : ""}
    ${renderLegalText("Terms & Conditions", invoice.terms)}
    ${renderFooterLine(referenceLine)}
  `;

  return wrapDocument(`Invoice ${invoice.number}`, content);
}
