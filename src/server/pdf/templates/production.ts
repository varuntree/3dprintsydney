import { formatCurrency } from "@/lib/currency";
import { escapeHtml, formatMultiline } from "@/server/pdf/templates/shared/utils";

export type PdfBusinessInfo = {
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  abn?: string;
  bankDetails?: string;
  logoDataUrl?: string;
};

export type PdfClientInfo = {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

export type PdfLineItem = {
  title: string;
  description?: string;
  detailLines: string[];
  quantityDisplay: string;
  originalUnitPrice: number;
  discountedUnitPrice: number;
  total: number;
  discountDisplay?: string;
  discountNote?: string;
};

export type PdfTotals = {
  subtotal: number;
  discount?: {
    label: string;
    amount: number;
    subtotalAfter: number;
  };
  shipping?: {
    label: string;
    amount: number;
  };
  tax?: {
    label: string;
    amount: number;
  };
  total: number;
  amountDue: {
    label: string;
    amount: number;
    displayOverride?: string;
  };
};

export type PdfPaymentSection = {
  bankDetails?: string;
  stripeUrl?: string;
  amountDue: number;
  reference: string;
};

export type PdfPaymentConfirmation = {
  method?: string;
  paidDate?: Date | null;
  reference?: string;
  amount?: number;
};

export type PdfDocumentInfo = {
  number: string;
  issueDate: Date;
  columns: [
    { label: string; value: string },
    { label: string; value: string },
    { label: string; value: string },
  ];
};

export type QuotePdfTemplate = {
  currency: string;
  business: PdfBusinessInfo;
  client: PdfClientInfo;
  logoDataUrl?: string;
  document: PdfDocumentInfo & {
    validUntilLabel: string;
    footerText: string;
    largeAmountText: string;
  };
  lines: PdfLineItem[];
  totals: PdfTotals;
  notes?: string;
  termsConditions: string;
  footerReference: string;
};

export type InvoicePdfTemplate = {
  currency: string;
  business: PdfBusinessInfo;
  client: PdfClientInfo;
  logoDataUrl?: string;
  document: PdfDocumentInfo & {
    footerText: string;
    largeAmountText: string;
    isPaid: boolean;
    paidIndicator: boolean;
  };
  lines: PdfLineItem[];
  totals: PdfTotals;
  notes?: string;
  termsConditions: string;
  footerReference: string;
  reviewHtml?: string;
  thankYouText?: string;
  paymentSection?: PdfPaymentSection;
  paymentConfirmation?: PdfPaymentConfirmation;
};

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

function formatDate(value: Date | null | undefined): string {
  if (!value) return "N/A";
  return value.toLocaleDateString("en-US", DATE_FORMAT);
}

function sanitizeLines(lines: string[]): string {
  return lines
    .filter((line) => line.trim().length > 0)
    .map((line) => escapeHtml(line.trim()))
    .join("<br/>");
}

function sanitizeDetails(lines: string[]): string {
  return lines
    .filter((line) => line.trim().length > 0)
    .map((line) => `• ${escapeHtml(line.trim())}`)
    .join("<br/>");
}

function wrapDocument(title: string, content: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <style>
      * {
        box-sizing: border-box;
      }

      @page {
        size: A4 portrait;
        margin: 12mm 12mm 18mm 12mm;
      }

      html, body {
        margin: 0;
        padding: 0;
        font-family: Helvetica, Arial, sans-serif;
        color: ${COLORS.darkText};
        background: #fff;
        font-size: 11pt;
        line-height: 1.5;
        min-height: 100%;
      }

      body {
        min-height: 100%;
        display: flex;
        flex-direction: column;
      }

      .page-shell {
        display: flex;
        flex-direction: column;
        min-height: 100%;
      }

      main.page-content {
        width: 100%;
        flex: 1 0 auto;
        padding-bottom: 12mm;
      }

      .section {
        page-break-inside: avoid;
      }

      .block-avoid {
        page-break-inside: avoid;
        break-inside: avoid;
      }

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
      }

      .logo-cell {
        text-align: right;
      }

      .brand-logo {
        width: 40mm;
        height: 14.4mm;
        object-fit: contain;
      }

      .paid-indicator {
        text-align: center;
        font-size: 14pt;
        font-weight: bold;
        color: ${COLORS.paidGreen};
        margin: 8mm 0;
      }

      .doc-info-table {
        width: 100%;
        margin-bottom: 4mm;
        border-collapse: collapse;
      }

      .doc-info-table td {
        vertical-align: top;
        width: 33.33%;
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

      .info-table {
        width: 100%;
        margin-bottom: 15mm;
        border-collapse: collapse;
      }

      .info-table td {
        vertical-align: top;
        width: 50%;
        padding-right: 4mm;
      }

      .info-block {
        font-size: 11pt;
        color: ${COLORS.mediumText};
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .info-block strong {
        color: ${COLORS.darkText};
      }

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

      table.items-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 8mm;
        font-size: 9pt;
        page-break-inside: auto;
      }

      table.items-table thead th {
        background-color: ${COLORS.lightGray};
        color: ${COLORS.mediumText};
        font-weight: bold;
        text-align: center;
        padding: 6mm 3mm;
        border: 0.5pt solid ${COLORS.borderGray};
      }

      table.items-table thead {
        display: table-header-group;
      }

      table.items-table tbody {
        display: table-row-group;
      }

      table.items-table tr {
        page-break-inside: avoid;
        break-inside: avoid;
      }

      table.items-table tbody td {
        padding: 4mm 3mm;
        border: 0.5pt solid ${COLORS.borderGray};
        color: ${COLORS.darkText};
        vertical-align: top;
      }

      table.items-table tbody td:first-child {
        text-align: left;
      }

      table.items-table tbody td:not(:first-child) {
        text-align: right;
      }

      .item-title {
        font-weight: bold;
        color: ${COLORS.darkText};
        margin-bottom: 1mm;
      }

      .item-description {
        color: ${COLORS.mediumText};
        line-height: 1.4;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .totals-wrapper {
        width: 100%;
        margin-bottom: 20mm;
        display: flex;
        justify-content: flex-end;
      }

      .totals-table {
        width: 70mm;
      }

      .totals-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1mm;
        line-height: 1.4;
      }

      .totals-label {
        font-size: 11pt;
        color: ${COLORS.mediumText};
      }

      .totals-value {
        font-size: 11pt;
        color: ${COLORS.mediumText};
        text-align: right;
      }

      .totals-row.bold .totals-label,
      .totals-row.bold .totals-value {
        font-weight: bold;
        color: ${COLORS.darkText};
      }

      .payment-confirmation {
        text-align: center;
        margin-bottom: 20mm;
        page-break-inside: avoid;
        break-inside: avoid;
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

      .payment-section {
        margin-bottom: 20mm;
        page-break-inside: avoid;
        break-inside: avoid;
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
        padding: 0 2mm;
        word-break: break-word;
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
        white-space: pre-wrap;
        word-break: break-word;
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

      .notes-section {
        margin-bottom: 8mm;
        page-break-inside: avoid;
        break-inside: avoid;
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
        white-space: pre-wrap;
        word-break: break-word;
      }

      footer {
        font-size: 7pt;
        color: ${COLORS.footerGray};
        line-height: 1.4;
        margin-top: auto;
        padding-top: 4mm;
      }

      .footer-reference {
        font-size: 9pt;
        color: ${COLORS.lightText};
        text-align: center;
        margin-top: 3mm;
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

function renderHeader(title: string, logoDataUrl?: string) {
  const logo = logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo" class="brand-logo" />` : "";
  return `<table class="header-table section">
    <tr>
      <td>
        <div class="doc-title">${escapeHtml(title)}</div>
      </td>
      <td class="logo-cell">${logo}</td>
    </tr>
  </table>`;
}

function renderDocumentInfo(doc: PdfDocumentInfo) {
  const columns = doc.columns
    .map(({ label, value }) => `
      <td>
        <div class="doc-info-label"><strong>${escapeHtml(label)}</strong></div>
        <div class="doc-info-value">${escapeHtml(value)}</div>
      </td>
    `)
    .join("");
  return `<table class="doc-info-table section">
    <tr>
      ${columns}
    </tr>
  </table>`;
}

function renderBusinessAndClientInfo(business: PdfBusinessInfo, client: PdfClientInfo) {
  const businessLines: string[] = [];
  if (business.name) businessLines.push(`<strong>${escapeHtml(business.name)}</strong>`);
  if (business.address) businessLines.push(escapeHtml(business.address));
  if (business.email) businessLines.push(escapeHtml(business.email));
  if (business.phone) businessLines.push(escapeHtml(business.phone));
  if (business.abn) businessLines.push(`ABN: ${escapeHtml(business.abn)}`);

  const clientLines: string[] = [];
  clientLines.push(`<strong>Bill to</strong>`);
  clientLines.push(escapeHtml(client.name));
  if (client.company) clientLines.push(escapeHtml(client.company));
  if (client.email) clientLines.push(escapeHtml(client.email));
  if (client.phone) clientLines.push(escapeHtml(client.phone));
  if (client.address) clientLines.push(escapeHtml(client.address));

  return `<table class="info-table section">
    <tr>
      <td>
        <div class="info-block">${businessLines.join("<br/>")}</div>
      </td>
      <td>
        <div class="info-block">${clientLines.join("<br/>")}</div>
      </td>
    </tr>
  </table>`;
}

function renderLargeAmount(text: string) {
  return `<div class="large-amount section">${escapeHtml(text)}</div>`;
}

function renderReviewHtml(html?: string) {
  if (!html) return "";
  return `<div class="review-text section">${html}</div>`;
}

function renderThankYou(text?: string) {
  if (!text) return "";
  return `<div class="thank-you-text section">${escapeHtml(text)}</div>`;
}

function renderLineItems(lines: PdfLineItem[], currency: string) {
  if (lines.length === 0) return "";
  const hasDiscount = lines.some((line) => Boolean(line.discountDisplay));
  const colGroup = hasDiscount
    ? `<col style="width:85mm" />
       <col style="width:15mm" />
       <col style="width:25mm" />
       <col style="width:20mm" />
       <col style="width:25mm" />
       <col style="width:16mm" />`
    : `<col style="width:120mm" />
       <col style="width:20mm" />
       <col style="width:25mm" />
       <col style="width:21mm" />`;

  const headerRow = hasDiscount
    ? `
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th>Orig. Price</th>
          <th>Discount</th>
          <th>Disc. Price</th>
          <th>Total</th>
        </tr>
      `
    : `
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Total</th>
        </tr>
      `;

  const rows = lines
    .map((line) => {
      const title = `<div class="item-title">${escapeHtml(line.title)}</div>`;
      const description = line.description ? sanitizeLines([line.description]) : "";
      const details = line.detailLines.length > 0 ? sanitizeDetails(line.detailLines) : "";
      const descriptionBlock = [description, details].filter(Boolean).join("<br/>");
      const descriptionCell = `${title}${descriptionBlock ? `<div class="item-description">${descriptionBlock}</div>` : ""}`;

      if (hasDiscount) {
        const discount = line.discountDisplay
          ? line.discountNote
            ? `${escapeHtml(line.discountDisplay)}<br/><span style="font-size:8pt;color:#d32f2f"><i>${escapeHtml(line.discountNote)}</i></span>`
            : escapeHtml(line.discountDisplay)
          : "-";

        return `<tr>
          <td>${descriptionCell}</td>
          <td>${escapeHtml(line.quantityDisplay)}</td>
          <td>${escapeHtml(formatCurrency(line.originalUnitPrice, currency))}</td>
          <td>${discount}</td>
          <td>${escapeHtml(formatCurrency(line.discountedUnitPrice, currency))}</td>
          <td>${escapeHtml(formatCurrency(line.total, currency))}</td>
        </tr>`;
      }

      return `<tr>
        <td>${descriptionCell}</td>
        <td>${escapeHtml(line.quantityDisplay)}</td>
        <td>${escapeHtml(formatCurrency(line.originalUnitPrice, currency))}</td>
        <td>${escapeHtml(formatCurrency(line.total, currency))}</td>
      </tr>`;
    })
    .join("");

  return `<table class="items-table section">
    <colgroup>
      ${colGroup}
    </colgroup>
    <thead>${headerRow}</thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderTotals(totals: PdfTotals, currency: string) {
  const rows: string[] = [];
  rows.push(`<div class="totals-row"><span class="totals-label">Subtotal</span><span class="totals-value">${escapeHtml(formatCurrency(totals.subtotal, currency))}</span></div>`);

  if (totals.discount && totals.discount.amount > 0) {
    rows.push(`<div class="totals-row"><span class="totals-label">${escapeHtml(totals.discount.label)}</span><span class="totals-value">−${escapeHtml(formatCurrency(totals.discount.amount, currency))}</span></div>`);
    rows.push(`<div class="totals-row"><span class="totals-label">Subtotal after discount</span><span class="totals-value">${escapeHtml(formatCurrency(totals.discount.subtotalAfter, currency))}</span></div>`);
  }

  if (totals.shipping && totals.shipping.amount > 0) {
    rows.push(`<div class="totals-row"><span class="totals-label">${escapeHtml(totals.shipping.label)}</span><span class="totals-value">${escapeHtml(formatCurrency(totals.shipping.amount, currency))}</span></div>`);
  }

  if (totals.tax && totals.tax.amount > 0) {
    rows.push(`<div class="totals-row"><span class="totals-label">${escapeHtml(totals.tax.label)}</span><span class="totals-value">${escapeHtml(formatCurrency(totals.tax.amount, currency))}</span></div>`);
  }

  rows.push(`<div class="totals-row bold"><span class="totals-label">Total</span><span class="totals-value">${escapeHtml(formatCurrency(totals.total, currency))}</span></div>`);

  const amountDueValue = totals.amountDue.displayOverride
    ? escapeHtml(totals.amountDue.displayOverride)
    : escapeHtml(formatCurrency(totals.amountDue.amount, currency));

  rows.push(`<div class="totals-row bold"><span class="totals-label">${escapeHtml(totals.amountDue.label)}</span><span class="totals-value">${amountDueValue}</span></div>`);

  return `<div class="totals-wrapper block-avoid"><div class="totals-table">${rows.join("")}</div></div>`;
}

function renderPaymentSection(section: PdfPaymentSection | undefined, currency: string) {
  if (!section) return "";
  const hasStripe = Boolean(section.stripeUrl);
  const hasBank = Boolean(section.bankDetails);
  if (!hasStripe && !hasBank) return "";

  if (hasStripe && hasBank) {
    return `<div class="payment-section block-avoid">
      <div class="payment-section-title">MAKE PAYMENT</div>
      <table class="payment-methods-table">
        <tr>
          <td>
            <div class="payment-method-title">Pay with bank transfer</div>
            <div class="payment-method-content">
              Please transfer payment to:<br/><br/>
              ${formatMultiline(section.bankDetails!)}
              <br/><strong>Reference</strong> — ${escapeHtml(section.reference)}
              <br/><br/>
              <span class="payment-important">IMPORTANT: You MUST include the invoice number as the payment reference.</span>
            </div>
          </td>
          <td>
            <div class="stripe-box">
              <div class="payment-method-title">Pay online with card</div>
              <div class="payment-method-content">
                Click the link below to pay securely with your credit or debit card:
                <br/><br/>
                <a href="${escapeHtml(section.stripeUrl!)}" class="stripe-link">Pay ${escapeHtml(formatCurrency(section.amountDue, currency))} Online</a>
                <br/><br/>
                <div class="stripe-note">Secure payment powered by Stripe</div>
              </div>
            </div>
          </td>
        </tr>
      </table>
    </div>`;
  }

  if (hasBank) {
    return `<div class="payment-section block-avoid">
      <div class="payment-section-title">MAKE PAYMENT</div>
      <div class="payment-method-title">Pay with bank transfer</div>
      <div class="payment-method-content">
        Please transfer payment to the following account:<br/><br/>
        ${formatMultiline(section.bankDetails!)}
        <br/><strong>Reference</strong> — ${escapeHtml(section.reference)}
        <br/><br/>
        <span class="payment-important">IMPORTANT: You MUST include the invoice number as the payment reference.</span>
      </div>
    </div>`;
  }

  return `<div class="payment-section block-avoid">
    <div class="payment-section-title">MAKE PAYMENT</div>
    <div class="stripe-box">
      <div class="payment-method-title">Pay online with card</div>
      <div class="payment-method-content">
        Click the link below to pay securely with your credit or debit card:
        <br/><br/>
        <a href="${escapeHtml(section.stripeUrl!)}" class="stripe-link">Pay ${escapeHtml(formatCurrency(section.amountDue, currency))} Online</a>
        <br/><br/>
        <div class="stripe-note">Secure payment powered by Stripe</div>
      </div>
    </div>
  </div>`;
}

function renderPaymentConfirmation(conf?: PdfPaymentConfirmation, currency?: string) {
  if (!conf) return "";
  const rows: string[] = [];
  if (conf.method) rows.push(`<tr><td>Payment Method</td><td>${escapeHtml(conf.method)}</td></tr>`);
  if (conf.paidDate) rows.push(`<tr><td>Date Paid</td><td>${escapeHtml(formatDate(conf.paidDate))}</td></tr>`);
  if (conf.reference) rows.push(`<tr><td>Reference</td><td>${escapeHtml(conf.reference)}</td></tr>`);
  if (conf.amount !== undefined && currency) rows.push(`<tr><td>Amount</td><td>${escapeHtml(formatCurrency(conf.amount, currency))}</td></tr>`);
  if (rows.length === 0) return "";
  return `<div class="payment-confirmation block-avoid">
    <div class="payment-confirmation-title">✓ PAYMENT RECEIVED</div>
    <table class="payment-details-table">${rows.join("")}</table>
  </div>`;
}

function renderNotes(notes?: string) {
  if (!notes || !notes.trim()) return "";
  return `<div class="notes-section block-avoid">
    <div class="notes-title">Notes</div>
    <div class="notes-content">${formatMultiline(notes)}</div>
  </div>`;
}

function renderFooter(termsConditions: string, referenceText: string) {
  const termsHtml = formatMultiline(termsConditions);
  return `<footer>
    <div>${termsHtml}</div>
    <div class="footer-reference">${escapeHtml(referenceText)}</div>
  </footer>`;
}

export function renderProductionQuoteHtml(data: QuotePdfTemplate): string {
  const docTitle = "Quote";
  const sections = [
    renderHeader(docTitle, data.logoDataUrl || data.business.logoDataUrl),
    renderDocumentInfo(data.document),
    renderBusinessAndClientInfo(data.business, data.client),
    renderLargeAmount(data.document.largeAmountText),
    renderLineItems(data.lines, data.currency),
    renderTotals(data.totals, data.currency),
    renderNotes(data.notes),
  ].join("");

  const content = `<div class="page-shell"><main class="page-content">${sections}</main>${renderFooter(data.termsConditions, data.footerReference)}</div>`;
  return wrapDocument(`${docTitle} ${data.document.number}`, content);
}

export function renderProductionInvoiceHtml(data: InvoicePdfTemplate): string {
  const docTitle = "Invoice";
  const sections = [
    renderHeader(docTitle, data.logoDataUrl || data.business.logoDataUrl),
    data.document.paidIndicator ? '<div class="paid-indicator">✓ PAID</div>' : '<div style="margin-bottom: 8mm;"></div>',
    renderDocumentInfo(data.document),
    renderBusinessAndClientInfo(data.business, data.client),
    renderLargeAmount(data.document.largeAmountText),
    data.document.isPaid ? renderThankYou(data.thankYouText) : renderReviewHtml(data.reviewHtml),
    renderLineItems(data.lines, data.currency),
    renderTotals(data.totals, data.currency),
    data.document.isPaid ? renderPaymentConfirmation(data.paymentConfirmation, data.currency) : renderPaymentSection(data.paymentSection, data.currency),
    renderNotes(data.notes),
  ].join("");

  const content = `<div class="page-shell"><main class="page-content">${sections}</main>${renderFooter(data.termsConditions, data.footerReference)}</div>`;
  return wrapDocument(`${docTitle} ${data.document.number}`, content);
}
