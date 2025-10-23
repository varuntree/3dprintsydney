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

type InvoiceWithPayment = InvoiceDetailDTO & {
  stripeCheckoutUrl?: string | null;
};

type ClientInfo = {
  id: number;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

// Exact colors from old Flask PDF
const COLORS = {
  darkText: "#1a1a1a",
  mediumText: "#4a4a4a",
  lightText: "#666666",
  accentBlue: "#6366f1",
  lightGray: "#f8f9fa",
  borderGray: "#e5e7eb",
  footerGray: "#999999",
  paidGreen: "#059669",
};

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "long",
  year: "numeric",
};

function formatDate(value: Date | null): string {
  if (!value) {
    return "N/A";
  }
  return value.toLocaleDateString("en-US", DATE_FORMAT);
}

function toCurrency(value: number, currency = "AUD") {
  return formatCurrency(value, currency);
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
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      @page {
        size: A4 portrait;
        margin: 12mm 12mm 32mm 12mm;
      }

      html, body {
        margin: 0;
        padding: 0;
        font-family: Helvetica, Arial, sans-serif;
        color: ${COLORS.darkText};
        background: #fff;
        font-size: 11pt;
        line-height: 1.4;
      }

      body {
        padding: 0;
      }

      .page-content {
        width: 100%;
      }

      /* Header with title and logo */
      .header-table {
        width: 100%;
        margin-bottom: 8mm;
      }

      .header-table td {
        vertical-align: top;
      }

      .doc-title {
        font-size: 32pt;
        font-weight: bold;
        color: ${COLORS.darkText};
        font-family: Helvetica, Arial, sans-serif;
      }

      .logo-cell {
        text-align: right;
      }

      .brand-logo {
        width: 40mm;
        height: 14.4mm;
        object-fit: contain;
      }

      /* PAID indicator */
      .paid-indicator {
        text-align: center;
        font-size: 14pt;
        font-weight: bold;
        color: ${COLORS.paidGreen};
        margin: 8mm 0;
      }

      /* Document info table (3 columns) */
      .doc-info-table {
        width: 100%;
        margin-bottom: 4mm;
        border-collapse: collapse;
      }

      .doc-info-table td {
        vertical-align: top;
        padding-bottom: 3mm;
      }

      .doc-info-label {
        font-size: 11pt;
        font-weight: bold;
        color: ${COLORS.mediumText};
        margin-bottom: 2mm;
      }

      .doc-info-value {
        font-size: 10pt;
        color: ${COLORS.lightText};
      }

      /* Business and client info side by side */
      .info-table {
        width: 100%;
        margin-bottom: 15mm;
        border-collapse: collapse;
      }

      .info-table td {
        vertical-align: top;
        width: 50%;
      }

      .info-block {
        font-size: 11pt;
        color: ${COLORS.mediumText};
        line-height: 1.5;
      }

      .info-block strong {
        color: ${COLORS.darkText};
        font-weight: bold;
      }

      /* Large amount display */
      .large-amount {
        font-size: 24pt;
        font-weight: bold;
        color: ${COLORS.darkText};
        margin-bottom: 8mm;
      }

      .review-text {
        font-size: 10pt;
        color: ${COLORS.lightText};
        margin-bottom: 6mm;
        line-height: 1.5;
      }

      .review-text a {
        color: ${COLORS.lightText};
        text-decoration: underline;
      }

      .thank-you-text {
        text-align: center;
        font-size: 10pt;
        font-weight: bold;
        color: ${COLORS.paidGreen};
        margin-bottom: 6mm;
      }

      /* Line items table */
      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 8mm;
        font-size: 9pt;
      }

      .items-table thead th {
        background-color: ${COLORS.lightGray};
        color: ${COLORS.mediumText};
        font-weight: bold;
        text-align: center;
        padding: 6mm 3mm;
        border: 0.5pt solid ${COLORS.borderGray};
      }

      .items-table tbody td {
        padding: 4mm 3mm;
        border: 0.5pt solid ${COLORS.borderGray};
        vertical-align: top;
        color: ${COLORS.darkText};
      }

      .items-table tbody td:first-child {
        text-align: left;
      }

      .items-table tbody td:not(:first-child) {
        text-align: right;
      }

      .item-description {
        font-size: 9pt;
        color: ${COLORS.mediumText};
        line-height: 1.4;
      }

      /* Totals section - right aligned */
      .totals-wrapper {
        width: 100%;
        margin-bottom: 20mm;
      }

      .totals-table {
        float: right;
        width: 70mm;
      }

      .totals-row {
        margin-bottom: 1mm;
        line-height: 1.5;
      }

      .totals-row::after {
        content: "";
        display: table;
        clear: both;
      }

      .totals-label {
        float: left;
        font-size: 11pt;
        color: ${COLORS.mediumText};
        text-align: right;
      }

      .totals-value {
        float: right;
        font-size: 11pt;
        color: ${COLORS.mediumText};
        text-align: right;
      }

      .totals-row.bold .totals-label,
      .totals-row.bold .totals-value {
        font-weight: bold;
        color: ${COLORS.darkText};
      }

      /* Payment confirmation section */
      .payment-confirmation {
        text-align: center;
        margin-bottom: 20mm;
      }

      .payment-confirmation-title {
        font-size: 12pt;
        font-weight: bold;
        color: ${COLORS.paidGreen};
        margin-bottom: 4mm;
      }

      .payment-details-table {
        margin: 0 auto;
        width: 120mm;
        border-collapse: collapse;
        background-color: ${COLORS.lightGray};
        border: 0.5pt solid ${COLORS.borderGray};
      }

      .payment-details-table td {
        padding: 3mm;
        font-size: 10pt;
        color: ${COLORS.mediumText};
      }

      .payment-details-table td:first-child {
        text-align: left;
      }

      .payment-details-table td:last-child {
        text-align: right;
      }

      /* Payment section */
      .payment-section {
        margin-bottom: 20mm;
      }

      .payment-section-title {
        font-size: 12pt;
        font-weight: bold;
        color: ${COLORS.darkText};
        text-align: center;
        margin-bottom: 4mm;
      }

      .payment-methods-table {
        width: 100%;
        border-collapse: collapse;
      }

      .payment-methods-table td {
        vertical-align: top;
        width: 50%;
      }

      .payment-method-title {
        font-size: 12pt;
        font-weight: bold;
        color: ${COLORS.darkText};
        margin-bottom: 2mm;
      }

      .payment-method-content {
        font-size: 11pt;
        color: ${COLORS.mediumText};
        line-height: 1.5;
      }

      .payment-method-content strong {
        color: ${COLORS.darkText};
      }

      .stripe-box {
        border: 0.5pt solid ${COLORS.borderGray};
        background-color: ${COLORS.lightGray};
        padding: 3mm;
        text-align: center;
      }

      .stripe-link {
        font-size: 12pt;
        font-weight: bold;
        color: ${COLORS.accentBlue};
        text-decoration: none;
      }

      .stripe-note {
        font-size: 10pt;
        color: ${COLORS.lightText};
        margin-top: 2mm;
      }

      .payment-important {
        font-size: 9pt;
        font-weight: bold;
        color: ${COLORS.darkText};
        margin-top: 2mm;
      }

      /* Notes section */
      .notes-section {
        margin-bottom: 8mm;
      }

      .notes-title {
        font-size: 12pt;
        font-weight: bold;
        color: ${COLORS.darkText};
        margin-bottom: 4mm;
      }

      .notes-content {
        font-size: 11pt;
        color: ${COLORS.mediumText};
        line-height: 1.5;
      }

      /* Footer */
      .footer {
        position: fixed;
        bottom: 0;
        left: 12mm;
        right: 12mm;
        font-size: 7pt;
        color: ${COLORS.footerGray};
        line-height: 1.4;
        page-break-inside: avoid;
      }

      .footer-terms {
        margin-bottom: 3mm;
      }

      .footer-reference {
        font-size: 9pt;
        color: ${COLORS.lightText};
        text-align: center;
      }

      .clearfix::after {
        content: "";
        display: table;
        clear: both;
      }
    </style>
  </head>
  <body>
    ${content}
  </body>
</html>`;
}

function renderHeader(title: string, logoDataUrl?: string): string {
  const logoHtml = logoDataUrl
    ? `<img src="${logoDataUrl}" alt="Logo" class="brand-logo" />`
    : "";

  return `<table class="header-table">
      <tr>
        <td>
          <div class="doc-title">${escapeHtml(title)}</div>
        </td>
        <td class="logo-cell">
          ${logoHtml}
        </td>
      </tr>
    </table>`;
}

function renderDocInfo(
  docType: string,
  number: string,
  date: string,
  thirdColumn: { label: string; value: string },
): string {
  return `<table class="doc-info-table">
      <tr>
        <td style="width: 33.33%;">
          <div class="doc-info-label"><strong>${docType} number</strong></div>
          <div class="doc-info-value">${escapeHtml(number)}</div>
        </td>
        <td style="width: 33.33%;">
          <div class="doc-info-label"><strong>${docType === "Quote" ? "Valid until" : "Date issued"}</strong></div>
          <div class="doc-info-value">${escapeHtml(date)}</div>
        </td>
        <td style="width: 33.33%;">
          <div class="doc-info-label"><strong>${escapeHtml(thirdColumn.label)}</strong></div>
          <div class="doc-info-value">${escapeHtml(thirdColumn.value)}</div>
        </td>
      </tr>
    </table>`;
}

function renderBusinessAndClientInfo(businessInfo: BusinessInfo, client: ClientInfo): string {
  const businessLines: string[] = [];
  if (businessInfo.businessName) {
    businessLines.push(`<strong>${sanitize(businessInfo.businessName)}</strong>`);
  }
  if (businessInfo.businessAddress) {
    businessLines.push(sanitize(businessInfo.businessAddress));
  }
  if (businessInfo.businessEmail) {
    businessLines.push(sanitize(businessInfo.businessEmail));
  }
  if (businessInfo.businessPhone) {
    businessLines.push(sanitize(businessInfo.businessPhone));
  }
  if (businessInfo.abn) {
    businessLines.push(`ABN: ${sanitize(businessInfo.abn)}`);
  }

  const clientLines: string[] = [];
  clientLines.push(`<strong>Bill to</strong>`);
  clientLines.push(`${sanitize(client.name)}`);
  if (client.email) {
    clientLines.push(sanitize(client.email));
  }
  if (client.phone) {
    clientLines.push(sanitize(client.phone));
  }
  if (client.address) {
    clientLines.push(sanitize(client.address));
  }

  return `<table class="info-table">
      <tr>
        <td>
          <div class="info-block">
            ${businessLines.join("<br/>")}
          </div>
        </td>
        <td>
          <div class="info-block">
            ${clientLines.join("<br/>")}
          </div>
        </td>
      </tr>
    </table>`;
}

function renderLineItemsTable(
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    total: number;
  }>,
  currency: string,
): string {
  const rows = items
    .map((item) => {
      const descParts: string[] = [];
      if (item.description) {
        const lines = item.description.split("\n").filter((l) => l.trim());
        lines.forEach((line) => {
          descParts.push(`• ${escapeHtml(line.trim())}`);
        });
      }

      const descHtml = descParts.length
        ? `<div class="item-description">${descParts.join("<br/>")}</div>`
        : "";

      const fullDesc = `${escapeHtml(item.name)}${descHtml ? `<br/>${descHtml}` : ""}`;

      const qtyDisplay =
        item.quantity === Math.floor(item.quantity)
          ? item.quantity.toString()
          : item.quantity.toFixed(1);

      return `<tr>
          <td>${fullDesc}</td>
          <td>${escapeHtml(qtyDisplay)}</td>
          <td>${escapeHtml(toCurrency(item.unitPrice, currency))}</td>
          <td>${escapeHtml(toCurrency(item.total, currency))}</td>
        </tr>`;
    })
    .join("");

  return `<table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`;
}

function renderTotals(
  subtotal: number,
  taxRate: number | null,
  taxTotal: number,
  total: number,
  globalDiscount: number,
  amountDueLabel: string,
  amountDueValue: number,
  currency: string,
): string {
  const rows: string[] = [];

  if (globalDiscount > 0) {
    rows.push(`<div class="totals-row">
        <span class="totals-label">Subtotal</span>
        <span class="totals-value">${escapeHtml(toCurrency(subtotal, currency))}</span>
      </div>`);
    rows.push(`<div class="totals-row">
        <span class="totals-label">Discount</span>
        <span class="totals-value">−${escapeHtml(toCurrency(globalDiscount, currency))}</span>
      </div>`);
    rows.push(`<div class="totals-row">
        <span class="totals-label">Subtotal after discount</span>
        <span class="totals-value">${escapeHtml(toCurrency(subtotal - globalDiscount, currency))}</span>
      </div>`);
  } else {
    rows.push(`<div class="totals-row">
        <span class="totals-label">Subtotal</span>
        <span class="totals-value">${escapeHtml(toCurrency(subtotal, currency))}</span>
      </div>`);
  }

  if (taxTotal > 0) {
    const taxLabel = taxRate ? `Tax (${taxRate.toFixed(0)}%)` : "Tax";
    rows.push(`<div class="totals-row">
        <span class="totals-label">${escapeHtml(taxLabel)}</span>
        <span class="totals-value">${escapeHtml(toCurrency(taxTotal, currency))}</span>
      </div>`);
  }

  rows.push(`<div class="totals-row bold">
      <span class="totals-label">Total</span>
      <span class="totals-value">${escapeHtml(toCurrency(total, currency))}</span>
    </div>`);

  rows.push(`<div class="totals-row bold">
      <span class="totals-label">${escapeHtml(amountDueLabel)}</span>
      <span class="totals-value">${escapeHtml(toCurrency(amountDueValue, currency))}</span>
    </div>`);

  return `<div class="totals-wrapper clearfix">
      <div class="totals-table">
        ${rows.join("")}
      </div>
    </div>`;
}

function renderPaymentSection(
  invoice: InvoiceWithPayment,
  businessInfo: BusinessInfo,
  currency: string,
): string {
  const bankDetails = businessInfo.bankDetails;
  const stripeUrl = invoice.stripeCheckoutUrl;

  if (!bankDetails && !stripeUrl) {
    return "";
  }

  if (stripeUrl && bankDetails) {
    // Two payment options side by side
    return `<div class="payment-section">
        <div class="payment-section-title">MAKE PAYMENT</div>
        <table class="payment-methods-table">
          <tr>
            <td style="padding-right: 2mm;">
              <div class="payment-method-title">Pay with bank transfer</div>
              <div class="payment-method-content">
                Please transfer payment to:<br/><br/>
                ${sanitize(bankDetails).replace(/\n/g, "<br/>")}
                <br/><strong>Reference</strong> — ${escapeHtml(invoice.number)}
                <br/><br/>
                <span class="payment-important">IMPORTANT: You MUST include the invoice number as the payment reference.</span>
              </div>
            </td>
            <td style="padding-left: 2mm;">
              <div class="stripe-box">
                <div class="payment-method-title">Pay online with card</div>
                <div class="payment-method-content">
                  Click the link below to pay securely with your credit or debit card:
                  <br/><br/>
                  <a href="${stripeUrl}" class="stripe-link">Pay ${escapeHtml(toCurrency(invoice.balanceDue, currency))} Online</a>
                  <br/><br/>
                  <div class="stripe-note">Secure payment powered by Stripe</div>
                </div>
              </div>
            </td>
          </tr>
        </table>
      </div>`;
  } else if (bankDetails) {
    // Bank transfer only
    return `<div class="payment-section">
        <div class="payment-method-title">Pay with bank transfer</div>
        <div class="payment-method-content">
          Please transfer payment to the following account:<br/><br/>
          ${sanitize(bankDetails).replace(/\n/g, "<br/>")}
          <br/><strong>Reference</strong> — ${escapeHtml(invoice.number)}
          <br/><br/>
          <span class="payment-important">IMPORTANT: You MUST include the invoice number as the payment reference.</span>
        </div>
      </div>`;
  }

  return "";
}

function renderNotes(notes: string | null): string {
  if (!notes || !notes.trim()) {
    return "";
  }

  return `<div class="notes-section">
      <div class="notes-title">Notes</div>
      <div class="notes-content">${formatMultiline(notes)}</div>
    </div>`;
}

function renderFooter(
  termsConditions: string | null,
  referenceText: string,
): string {
  const terms = termsConditions
    ? sanitize(termsConditions).replace(/\n/g, "<br/>")
    : `Terms & Conditions: Payment must be made before work commences unless otherwise agreed in writing.<br/>
       We take no responsibility if 3D models are not fit for purpose - we print what you request.<br/>
       No refunds will be given if printed items do not work for your intended application.`;

  return `<div class="footer">
      <div class="footer-terms">${terms}</div>
      <div class="footer-reference">${escapeHtml(referenceText)}</div>
    </div>`;
}

export function renderProductionQuoteHtml(
  quote: QuoteDetailDTO,
  options: TemplateOptions = {},
): string {
  const { currency = "AUD", ...businessInfo } = options;

  const expiryDateStr = quote.expiryDate ? formatDate(quote.expiryDate) : formatDate(quote.issueDate);
  const paymentTermsDisplay = quote.paymentTerms ? quote.paymentTerms.label : "Quote Terms";

  const lineItems = quote.lines.map((line) => ({
    name: line.name,
    description: line.description ?? "",
    quantity: line.quantity,
    unit: line.unit ?? "",
    unitPrice: line.unitPrice,
    total: line.total,
  }));

  const summaryText = quote.expiryDate
    ? `valid until ${formatDate(quote.expiryDate)}`
    : "";
  const footerText = quote.expiryDate
    ? `quote expires ${formatDate(quote.expiryDate)}`
    : "";

  const referenceText = `${quote.number} • ${toCurrency(quote.total, currency)} ${footerText}`;

  const termsConditions = quote.terms || `Terms & Conditions: Quote valid until expiry date. Prices include GST.
Payment required in full before production begins.
We take no responsibility if 3D models are not fit for purpose - we print what you request.`;

  const content = `
    <div class="page-content">
      ${renderHeader("Quote", businessInfo.logoDataUrl)}
      ${renderDocInfo("Quote", quote.number, expiryDateStr, {
        label: "Quote terms",
        value: paymentTermsDisplay,
      })}
      ${renderBusinessAndClientInfo(businessInfo, quote.client)}
      <div class="large-amount">${escapeHtml(toCurrency(quote.total, currency))} ${summaryText}</div>
      ${renderLineItemsTable(lineItems, currency)}
      ${renderTotals(
        quote.subtotal,
        quote.taxRate ?? null,
        quote.taxTotal,
        quote.total,
        0,
        "Amount due",
        quote.total,
        currency,
      )}
      ${renderNotes(quote.notes)}
      ${renderFooter(termsConditions, referenceText)}
    </div>
  `;

  return wrapDocument(`Quote ${quote.number}`, content);
}

export function renderProductionInvoiceHtml(
  invoice: InvoiceWithPayment,
  options: TemplateOptions = {},
): string {
  const { currency = "AUD", ...businessInfo } = options;

  const isPaid = invoice.balanceDue <= 0;
  const dateIssued = formatDate(invoice.issueDate);

  let thirdColumnLabel = "Payment terms";
  let thirdColumnValue = invoice.paymentTerms ? invoice.paymentTerms.label : "COD";

  if (isPaid) {
    thirdColumnLabel = "Paid on";
    thirdColumnValue = "PAID";
    // Try to find actual paid date if available
    // The invoice might have a paidAt field or similar
    // For now, we'll use the placeholder
  }

  const lineItems = invoice.lines.map((line) => ({
    name: line.name,
    description: line.description ?? "",
    quantity: line.quantity,
    unit: line.unit ?? "",
    unitPrice: line.unitPrice,
    total: line.total,
  }));

  let amountText = "";
  let reviewOrThankYouHtml = "";

  if (isPaid) {
    amountText = `${toCurrency(invoice.total, currency)} PAID`;
    reviewOrThankYouHtml = `<div class="thank-you-text">Thank you for your payment!</div>`;
  } else {
    const dueText = invoice.dueDate ? `due ${formatDate(invoice.dueDate)}` : "due immediately";
    amountText = `${toCurrency(invoice.total, currency)} ${dueText}`;
    reviewOrThankYouHtml = `<div class="review-text">
      Loved our service? A <a href="https://g.page/r/CdO3kF8ywZAKEAE/review">Google Review</a> would really help other customers discover us, and you'll receive <strong>30% off the first $100 of an order of your choice</strong> as our way of saying thanks!
    </div>`;
  }

  const footerDueText = isPaid ? "PAID" : (invoice.dueDate ? `due ${formatDate(invoice.dueDate)}` : "due immediately");
  const referenceText = `${invoice.number} • ${toCurrency(invoice.total, currency)} ${footerDueText}`;

  const termsConditions = invoice.terms || (isPaid
    ? `Terms & Conditions: This invoice has been paid in full.
We take no responsibility if 3D models are not fit for purpose - we print what you request.
No refunds will be given if printed items do not work for your intended application.`
    : `Terms & Conditions: Payment must be made before work commences unless otherwise agreed in writing.
We take no responsibility if 3D models are not fit for purpose - we print what you request.
No refunds will be given if printed items do not work for your intended application.`);

  const paidIndicator = isPaid ? `<div class="paid-indicator">✓ PAID</div>` : `<div style="margin-bottom: 8mm;"></div>`;

  // Payment confirmation or payment section
  let paymentHtml = "";
  if (isPaid) {
    // For paid invoices, show payment confirmation if we have payment method
    // Since we don't have paymentMethod in the DTO, we'll skip it for now
    // paymentHtml = renderPaymentConfirmation(invoice.paymentMethod, invoice.paidAt);
  } else {
    // For unpaid invoices, show payment options
    paymentHtml = renderPaymentSection(invoice, businessInfo, currency);
  }

  const content = `
    <div class="page-content">
      ${renderHeader("Invoice", businessInfo.logoDataUrl)}
      ${paidIndicator}
      ${renderDocInfo("Invoice", invoice.number, dateIssued, {
        label: thirdColumnLabel,
        value: thirdColumnValue,
      })}
      ${renderBusinessAndClientInfo(businessInfo, invoice.client)}
      <div class="large-amount">${amountText}</div>
      ${reviewOrThankYouHtml}
      ${renderLineItemsTable(lineItems, currency)}
      ${renderTotals(
        invoice.subtotal,
        invoice.taxRate ?? null,
        invoice.taxTotal,
        invoice.total,
        0,
        isPaid ? "Status" : "Amount due",
        isPaid ? 0 : invoice.balanceDue,
        currency,
      )}
      ${paymentHtml}
      ${renderNotes(invoice.notes)}
      ${renderFooter(termsConditions, referenceText)}
    </div>
  `;

  return wrapDocument(`Invoice ${invoice.number}`, content);
}
