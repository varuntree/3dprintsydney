import { formatMultiline } from "@/server/pdf/templates/shared/utils";
import type { QuoteDetail } from "@/server/services/quotes";
import type { InvoiceDetail } from "@/server/services/invoices";

const PDF_THEME = {
  text: '#0f172a',
  textMuted: '#475569',
  textSubtle: '#64748b',
  accent: '#111827',
  border: '#e2e8f0',
  surface: '#f8fafc',
  surfaceStrong: '#f1f5f9',
  badgeBg: '#0f172a',
  badgeText: '#f8fafc',
  statusBorder: '#cbd5f5',
  statusBackground: '#f8fafc'
};

type BusinessInfo = {
  logoDataUrl?: string;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  abn?: string;
  bankDetails?: string;
};

type DocumentMeta = {
  number: string;
  type: string;
  issueDate: Date;
  dueDate?: Date | null;
  expiryDate?: Date | null;
  status: string;
  total: number;
  poNumber?: string | null;
};

type LineItem = {
  id: number;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  discountType?: string;
  discountValue?: number;
};

type TemplateOptions = {
  logoDataUrl?: string;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  abn?: string;
  bankDetails?: string;
};

type InvoiceWithPayment = InvoiceDetail & {
  stripeCheckoutUrl?: string | null;
  qrCodeSvg?: string | null;
};

// Enhanced header with proper logo placement and professional hierarchy
function renderProductionHeader(businessInfo: BusinessInfo, documentMeta: DocumentMeta): string {
  const formatDate = (date: string | Date) =>
    new Date(date).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const getStatusBadge = (status: string): string => {
    const label = status.toLowerCase();
    return `
      <div class="status-badge" data-status="${label}">
        ${label}
      </div>
    `;
  };

  return `
    <header class="production-header">
      <div class="header-main">
        <div class="brand-section">
          ${businessInfo.logoDataUrl ? `
            <div class="logo-container">
              <img src="${businessInfo.logoDataUrl}" alt="Logo" class="company-logo" />
            </div>
          ` : ''}
          <div class="business-info">
            <h1 class="business-name">${businessInfo.businessName || 'Business Name'}</h1>
            <div class="business-contact">
              ${businessInfo.businessAddress ? `<div class="address-line">${formatMultiline(businessInfo.businessAddress)}</div>` : ''}
              <div class="contact-line">
                ${businessInfo.businessEmail ? `<span class="email">${businessInfo.businessEmail}</span>` : ''}
                ${businessInfo.businessEmail && businessInfo.businessPhone ? ' • ' : ''}
                ${businessInfo.businessPhone ? `<span class="phone">${businessInfo.businessPhone}</span>` : ''}
              </div>
              ${businessInfo.abn ? `<div class="abn">ABN: ${businessInfo.abn}</div>` : ''}
            </div>
          </div>
        </div>

        <div class="document-section">
          <div class="document-header">
            <h2 class="document-type">${documentMeta.type}</h2>
            ${getStatusBadge(documentMeta.status)}
          </div>
          <div class="document-number">${documentMeta.number}</div>
          ${documentMeta.poNumber ? `
            <div class="po-number">
              <span class="po-label">PO Number</span>
              <span class="po-value">${documentMeta.poNumber}</span>
            </div>
          ` : ''}
          <div class="document-dates">
            <div class="date-item">
              <span class="date-label">Issue Date</span>
              <span class="date-value">${formatDate(documentMeta.issueDate)}</span>
            </div>
            ${documentMeta.dueDate ? `
              <div class="date-item">
                <span class="date-label">Due Date</span>
                <span class="date-value">${formatDate(documentMeta.dueDate)}</span>
              </div>
            ` : ''}
            ${documentMeta.expiryDate ? `
              <div class="date-item">
                <span class="date-label">Expires</span>
                <span class="date-value">${formatDate(documentMeta.expiryDate)}</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    </header>

    <style>
      .production-header {
        margin-bottom: 48px;
        border-bottom: 2px solid ${PDF_THEME.border};
        padding-bottom: 32px;
      }

      .header-main {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 40px;
      }

      .brand-section {
        display: flex;
        align-items: flex-start;
        gap: 20px;
        flex: 1;
      }

      .logo-container {
        flex-shrink: 0;
      }

      .company-logo {
        width: 72px;
        height: 72px;
        object-fit: contain;
        border-radius: 8px;
        border: 1px solid ${PDF_THEME.border};
        background: #fff;
      }

      .business-name {
        font-size: 24px;
        font-weight: 400;
        color: ${PDF_THEME.text};
        margin: 0 0 8px 0;
        letter-spacing: -0.02em;
        line-height: 1.2;
      }

      .business-contact {
        font-size: 13px;
        color: ${PDF_THEME.textMuted};
        line-height: 1.5;
      }

      .address-line {
        margin-bottom: 6px;
        white-space: pre-line;
      }

      .contact-line {
        margin-bottom: 6px;
      }

      .email,
      .phone {
        color: ${PDF_THEME.text};
      }

      .abn {
        font-size: 12px;
        color: ${PDF_THEME.textSubtle};
        margin-top: 8px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .document-section {
        text-align: right;
        flex-shrink: 0;
      }

      .document-header {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        margin-bottom: 8px;
      }

      .document-type {
        font-size: 14px;
        font-weight: 500;
        color: ${PDF_THEME.textSubtle};
        margin: 0;
        letter-spacing: 0.3em;
        text-transform: uppercase;
      }

      .status-badge {
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        border: 1px solid ${PDF_THEME.statusBorder};
        background: ${PDF_THEME.surface};
        color: ${PDF_THEME.text};
      }

      .document-number {
        font-size: 28px;
        font-weight: 500;
        color: ${PDF_THEME.text};
        margin-bottom: 12px;
        letter-spacing: -0.02em;
      }

      .po-number {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin-bottom: 16px;
      }

      .po-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        font-weight: 600;
        color: ${PDF_THEME.textSubtle};
      }

      .po-value {
        font-size: 14px;
        font-weight: 500;
        color: ${PDF_THEME.text};
        letter-spacing: 0.05em;
      }

      .document-dates {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .date-item {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        min-width: 180px;
      }

      .date-label {
        font-size: 11px;
        color: ${PDF_THEME.textSubtle};
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .date-value {
        font-size: 11px;
        color: ${PDF_THEME.text};
        font-weight: 500;
      }
    </style>
  `;
}

// Enhanced client info with better layout
function renderProductionTermsInfo(label: string): string {
  return `
    <div class="terms-card no-break">
      <div class="terms-title">Payment Terms</div>
      <p class="terms-copy">${label}</p>
    </div>

    <style>
      .terms-card {
        border: 1px solid ${PDF_THEME.border};
        border-radius: 16px;
        padding: 18px;
        margin-bottom: 30px;
        background: #fff;
        max-width: 320px;
      }
      .terms-title {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: ${PDF_THEME.textSubtle};
        margin-bottom: 6px;
      }
      .terms-copy {
        font-size: 13px;
        color: ${PDF_THEME.textMuted};
        margin: 0;
      }
    </style>
  `;
}

function renderProductionClientInfo(client: {
  name: string;
  company?: string;
  address?: string;
  email?: string;
  phone?: string;
}): string {
  return `
    <div class="production-client-info">
      <div class="client-section">
        <h3 class="section-title">Bill To</h3>
        <div class="client-details">
          <div class="client-name">${client.name}</div>
          ${client.company ? `<div class="client-company">${client.company}</div>` : ''}
          ${client.address ? `<div class="client-address">${formatMultiline(client.address)}</div>` : ''}
          <div class="client-contact">
            ${client.email ? `<div class="contact-item">${client.email}</div>` : ''}
            ${client.phone ? `<div class="contact-item">${client.phone}</div>` : ''}
          </div>
        </div>
      </div>
    </div>

    <style>
      .production-client-info {
        margin-bottom: 36px;
      }

      .section-title {
        font-size: 11px;
        font-weight: 600;
        color: ${PDF_THEME.textSubtle};
        text-transform: uppercase;
        letter-spacing: 0.12em;
        margin: 0 0 12px 0;
      }

      .client-details {
        line-height: 1.55;
        font-size: 13px;
        color: ${PDF_THEME.textMuted};
      }

      .client-name {
        font-size: 16px;
        font-weight: 600;
        color: ${PDF_THEME.text};
        margin-bottom: 4px;
      }

      .client-company {
        font-size: 13px;
        color: ${PDF_THEME.textMuted};
        margin-bottom: 6px;
      }

      .client-address {
        font-size: 13px;
        color: ${PDF_THEME.textMuted};
        margin-bottom: 6px;
        white-space: pre-line;
      }

      .client-contact {
        font-size: 13px;
        color: ${PDF_THEME.textMuted};
      }

      .contact-item {
        margin-bottom: 2px;
      }
    </style>
  `;
}

// Professional line items table with dynamic pagination support
function renderProductionLineItems(lineItems: LineItem[]): string {
  return `
    <div class="production-line-items">
      <h3 class="section-title">Items & Services</h3>
      <div class="items-table-wrapper">
        <table class="items-table">
          <thead>
            <tr>
              <th class="col-description">Description</th>
              <th class="col-qty">Qty</th>
              <th class="col-rate">Rate</th>
              <th class="col-amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${lineItems.map(item => `
              <tr class="item-row">
                <td class="item-description">
                  <div class="item-name">${item.name}</div>
                  ${item.description ? `<div class="item-detail">${item.description}</div>` : ''}
                  ${item.discountType && item.discountType !== 'NONE' ? `<div class="item-detail">Discount: ${item.discountType === 'PERCENT' ? `${item.discountValue ?? 0}%` : `$${(item.discountValue ?? 0).toFixed(2)}`}</div>` : ''}
                </td>
                <td class="item-qty">${item.quantity}${item.unit ? ` ${item.unit}` : ''}</td>
                <td class="item-rate">$${item.unitPrice.toFixed(2)}</td>
                <td class="item-amount">$${item.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <style>
      .production-line-items {
        margin-bottom: 36px;
      }

      .items-table-wrapper {
        margin-top: 14px;
      }

      .items-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
        color: ${PDF_THEME.text};
      }

      .items-table th {
        background: ${PDF_THEME.surface};
        border: 1px solid ${PDF_THEME.border};
        padding: 10px 12px;
        text-align: left;
        font-weight: 600;
        font-size: 11px;
        color: ${PDF_THEME.textSubtle};
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .col-description {
        width: 52%;
      }

      .col-qty {
        width: 12%;
        text-align: right;
      }

      .col-rate,
      .col-amount {
        width: 18%;
        text-align: right;
      }

      .item-row {
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .items-table td {
        border: 1px solid ${PDF_THEME.border};
        padding: 14px 12px;
        vertical-align: top;
        background: #fff;
      }

      .item-name {
        font-weight: 600;
        color: ${PDF_THEME.text};
        margin-bottom: 4px;
      }

      .item-detail {
        font-size: 12px;
        color: ${PDF_THEME.textSubtle};
        line-height: 1.4;
      }

      .item-qty {
        text-align: right;
        color: ${PDF_THEME.textMuted};
      }

      .item-rate,
      .item-amount {
        text-align: right;
        font-weight: 600;
        color: ${PDF_THEME.text};
      }

      .items-table thead {
        display: table-header-group;
      }

      .items-table tbody {
        display: table-row-group;
      }
    </style>
  `;
}

// Professional financial summary
function renderProductionSummary(financial: {
  subtotal: number;
  tax: number;
  total: number;
  discountTotal?: number;
}, balanceDue?: number): string {
  return `
    <div class="production-summary">
      <div class="summary-table">
        <div class="summary-row">
          <span class="summary-label">Subtotal</span>
          <span class="summary-value">$${financial.subtotal.toFixed(2)}</span>
        </div>
        ${financial.discountTotal && financial.discountTotal > 0 ? `
          <div class="summary-row">
            <span class="summary-label">Discount</span>
            <span class="summary-value discount">-$${financial.discountTotal.toFixed(2)}</span>
          </div>
        ` : ''}
        ${financial.tax > 0 ? `
          <div class="summary-row">
            <span class="summary-label">GST (10%)</span>
            <span class="summary-value">$${financial.tax.toFixed(2)}</span>
          </div>
        ` : ''}
        <div class="summary-row total-row">
          <span class="summary-label">Total</span>
          <span class="summary-value total">$${financial.total.toFixed(2)}</span>
        </div>
        ${balanceDue !== undefined && balanceDue !== financial.total ? `
          <div class="summary-row balance-row">
            <span class="summary-label">Balance Due</span>
            <span class="summary-value balance-due">$${balanceDue.toFixed(2)}</span>
          </div>
        ` : ''}
      </div>
    </div>

    <style>
      .production-summary {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 32px;
      }

      .summary-table {
        width: 280px;
        border: 1px solid ${PDF_THEME.border};
        border-radius: 16px;
        padding: 18px 20px;
        background: #fff;
      }

      .summary-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
        color: ${PDF_THEME.textMuted};
        padding: 6px 0;
      }

      .summary-row + .summary-row {
        border-top: 1px solid ${PDF_THEME.border};
      }

      .summary-label {
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 11px;
      }

      .summary-value {
        font-weight: 600;
        color: ${PDF_THEME.text};
      }

      .summary-value.discount {
        color: ${PDF_THEME.textSubtle};
      }

      .total-row {
        font-size: 14px;
      }

      .total-row .summary-value.total {
        font-size: 16px;
      }

      .balance-row .summary-value.balance-due {
        color: ${PDF_THEME.text};
      }
    </style>
  `;
}


function renderProductionPaymentSection(invoice: InvoiceWithPayment, businessInfo: BusinessInfo): string {
  if (invoice.status === 'PAID') {
    return `
      <div class="payment-section no-break">
        <div class="payment-card paid">
          <div class="paid-status">
            <div class="paid-icon">✓</div>
            <div>
              <div class="paid-title">Payment received</div>
              <div class="paid-subtitle">Thank you — this invoice is fully settled.</div>
            </div>
          </div>
        </div>
      </div>

      <style>
        .payment-card.paid {
          border: 1px solid ${PDF_THEME.border};
          border-radius: 16px;
          padding: 20px;
          background: ${PDF_THEME.surface};
          display: flex;
          justify-content: center;
        }
        .paid-status {
          display: flex;
          align-items: center;
          gap: 16px;
          color: ${PDF_THEME.text};
        }
        .paid-icon {
          width: 40px;
          height: 40px;
          border-radius: 20px;
          border: 1px solid ${PDF_THEME.border};
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }
        .paid-title {
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .paid-subtitle {
          font-size: 12px;
          color: ${PDF_THEME.textSubtle};
        }
      </style>
    `;
  }

  const showStripe = Boolean(invoice.stripeCheckoutUrl);

  return `
    <div class="payment-section no-break">
      <h3 class="section-title">Payment Options</h3>
      <div class="payment-methods">
        ${showStripe ? `
          <div class="payment-card">
            <div class="payment-card-header">
              <div class="payment-card-title">Secure Online Payment</div>
              <div class="payment-card-subtitle">Pay instantly via Stripe checkout</div>
            </div>
            <div class="payment-card-body">
              <div class="payment-card-qr">
                <div class="qr-code" style="background-image: url('data:image/svg+xml;utf8,${encodeURIComponent(
                  invoice.qrCodeSvg?.replace(/\n/g, ' ') ??
                    `<svg width="120" height="120" xmlns="http://www.w3.org/2000/svg">
                      <rect width="120" height="120" fill="${PDF_THEME.surfaceStrong}" stroke="${PDF_THEME.border}" stroke-width="2"/>
                      <text x="60" y="60" text-anchor="middle" fill="${PDF_THEME.textMuted}" font-size="12" font-family="Arial">QR Code</text>
                    </svg>`
                )}');"></div>
                <p class="qr-caption">Scan with your phone</p>
              </div>
              <div class="payment-card-actions">
                <a href="${invoice.stripeCheckoutUrl}" class="pay-button">
                  Pay $${invoice.balanceDue.toFixed(2)} online
                </a>
                <div class="payment-url">
                  <span class="url-label">Or visit</span>
                  <span class="url-text">${invoice.stripeCheckoutUrl}</span>
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        ${businessInfo.bankDetails ? `
          <div class="payment-card">
            <div class="payment-card-header">
              <div class="payment-card-title">Bank Transfer</div>
              <div class="payment-card-subtitle">Use the details below to pay by EFT</div>
            </div>
            <div class="payment-card-body bank">
              <div class="bank-details">${formatMultiline(businessInfo.bankDetails)}</div>
              <div class="payment-reference"><strong>Reference:</strong> ${invoice.number}</div>
            </div>
          </div>
        ` : ''}

        <div class="payment-terms">
          <div class="payment-card-title">Payment Terms</div>
          <ul>
            <li>Payment due ${invoice.dueDate ? 'by ' + new Date(invoice.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'on receipt'}.</li>
            <li>Please include the invoice number with your payment.</li>
            <li>Questions? Contact ${businessInfo.businessEmail || 'our team'}.</li>
          </ul>
        </div>
      </div>
    </div>

    <style>
      .payment-section {
        margin-bottom: 36px;
        color: ${PDF_THEME.text};
      }
      .payment-methods {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .payment-card {
        border: 1px solid ${PDF_THEME.border};
        border-radius: 16px;
        padding: 20px;
        background: #fff;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .payment-card-header {
        margin-bottom: 14px;
      }
      .payment-card-title {
        font-size: 13px;
        font-weight: 600;
        color: ${PDF_THEME.text};
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 4px;
      }
      .payment-card-subtitle {
        font-size: 12px;
        color: ${PDF_THEME.textSubtle};
      }
      .payment-card-body {
        display: flex;
        align-items: center;
        gap: 24px;
      }
      .payment-card-body.bank {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
      .payment-card-qr {
        text-align: center;
        flex-shrink: 0;
      }
      .qr-code {
        width: 120px;
        height: 120px;
        border-radius: 12px;
        border: 1px solid ${PDF_THEME.border};
        background-color: ${PDF_THEME.surface};
        background-size: contain;
        background-position: center;
        background-repeat: no-repeat;
        margin-bottom: 8px;
      }
      .qr-caption {
        font-size: 11px;
        color: ${PDF_THEME.textSubtle};
      }
      .payment-card-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .pay-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 10px 16px;
        border-radius: 999px;
        background: ${PDF_THEME.accent};
        color: ${PDF_THEME.badgeText};
        font-weight: 600;
        font-size: 13px;
        text-decoration: none;
        letter-spacing: 0.04em;
      }
      .payment-url {
        font-size: 11px;
        color: ${PDF_THEME.textSubtle};
        word-break: break-word;
      }
      .url-label {
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-right: 4px;
      }
      .bank-details {
        font-size: 13px;
        color: ${PDF_THEME.text};
        white-space: pre-line;
      }
      .payment-reference {
        font-size: 12px;
        color: ${PDF_THEME.textMuted};
      }
      .payment-terms {
        font-size: 12px;
        color: ${PDF_THEME.textSubtle};
      }
      .payment-terms ul {
        padding-left: 18px;
        margin: 8px 0 0 0;
      }
      .payment-terms li {
        margin-bottom: 4px;
      }
    </style>
  `;
}


// Production-ready base template
function generateProductionHTML(content: string, title: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        /* Production PDF Base Styles */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        @page {
          size: A4 portrait;
          margin: 20mm 16mm;
          orphans: 3;
          widows: 3;
        }

        html {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: ${PDF_THEME.text};
          background: white;
          padding: 0;
          margin: 0;
        }

        .page-container {
          max-width: 100%;
          margin: 0;
          background: white;
        }

        /* Enhanced print styles */
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body {
            font-size: 12px !important;
          }

          .page-break {
            page-break-before: always;
          }

          .no-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }

        /* Accessibility improvements */
        @media screen and (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="page-container">
        ${content}
      </div>

      <script>
        // Enhanced pagination and content measurement
        (function() {
          'use strict';

          const AVAILABLE_HEIGHT = 740; // A4 height minus margins
          const MIN_ROWS_BEFORE_BREAK = 3;

          function measureElement(element) {
            if (!element) return 0;
            const rect = element.getBoundingClientRect();
            const styles = window.getComputedStyle(element);
            const marginTop = parseFloat(styles.marginTop) || 0;
            const marginBottom = parseFloat(styles.marginBottom) || 0;
            return Math.ceil(rect.height + marginTop + marginBottom);
          }

          function optimizeTablePagination() {
            const tables = document.querySelectorAll('.items-table');

            tables.forEach(table => {
              const rows = Array.from(table.querySelectorAll('tbody tr'));
              if (rows.length <= MIN_ROWS_BEFORE_BREAK) return;

              let currentPageHeight = measureElement(document.querySelector('.production-header'));
              currentPageHeight += measureElement(document.querySelector('.production-client-info'));
              currentPageHeight += measureElement(table.querySelector('thead'));

              rows.forEach((row, index) => {
                const rowHeight = measureElement(row);

                // Check if we need to break before this row
                if (currentPageHeight + rowHeight > AVAILABLE_HEIGHT && index >= MIN_ROWS_BEFORE_BREAK) {
                  const pageBreak = document.createElement('div');
                  pageBreak.className = 'page-break';
                  pageBreak.style.cssText = 'page-break-before: always; height: 0; margin: 0;';

                  // Insert before the row's parent table
                  const tableClone = table.cloneNode(true);
                  const newTbody = tableClone.querySelector('tbody');
                  newTbody.innerHTML = '';

                  // Move remaining rows to new table
                  for (let i = index; i < rows.length; i++) {
                    newTbody.appendChild(rows[i].cloneNode(true));
                    rows[i].remove();
                  }

                  table.parentNode.insertBefore(pageBreak, table.nextSibling);
                  table.parentNode.insertBefore(tableClone, pageBreak.nextSibling);

                  return;
                }

                currentPageHeight += rowHeight;
              });
            });
          }

          function ensureMinimumFooterSpace() {
            const summary = document.querySelector('.production-summary');
            const payment = document.querySelector('.payment-section');

            if (summary || payment) {
              const totalFooterHeight = (summary ? measureElement(summary) : 0) +
                                     (payment ? measureElement(payment) : 0);

              if (totalFooterHeight > 200) { // If footer content is substantial
                const spacer = document.createElement('div');
                spacer.style.cssText = 'page-break-before: always; height: 0;';

                if (summary) {
                  summary.parentNode.insertBefore(spacer, summary);
                } else if (payment) {
                  payment.parentNode.insertBefore(spacer, payment);
                }
              }
            }
          }

          // Run optimizations after content loads
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
              setTimeout(() => {
                optimizeTablePagination();
                ensureMinimumFooterSpace();
              }, 100);
            });
          } else {
            setTimeout(() => {
              optimizeTablePagination();
              ensureMinimumFooterSpace();
            }, 100);
          }
        })();
      </script>
    </body>
    </html>
  `;
}

export function renderProductionQuoteHtml(quote: QuoteDetail, options: TemplateOptions = {}): string {
  const businessInfo: BusinessInfo = {
    logoDataUrl: options.logoDataUrl,
    businessName: options.businessName,
    businessAddress: options.businessAddress,
    businessPhone: options.businessPhone,
    businessEmail: options.businessEmail,
    abn: options.abn,
    bankDetails: options.bankDetails
  };

  const documentMeta: DocumentMeta = {
    number: quote.number,
    type: 'QUOTE',
    issueDate: new Date(quote.issueDate),
    expiryDate: quote.expiryDate ? new Date(quote.expiryDate) : null,
    status: quote.status,
    total: quote.total,
  };

  const paymentTermsLabel = quote.paymentTerms
    ? `${quote.paymentTerms.label}${quote.paymentTerms.days === 0 ? ' • Due on acceptance' : ` • ${quote.paymentTerms.days}-day terms`}`
    : 'Due on acceptance';

  const lineItems: LineItem[] = quote.lines.map((line) => ({
    id: line.id,
    name: line.name,
    description: line.description || "",
    quantity: line.quantity,
    unit: line.unit || "",
    unitPrice: line.unitPrice,
    total: line.total,
    discountType: line.discountType,
    discountValue: line.discountValue
  }));

  const content = `
    ${renderProductionHeader(businessInfo, documentMeta)}
    ${renderProductionClientInfo(quote.client)}
    ${renderProductionLineItems(lineItems)}
    ${renderProductionSummary({
      subtotal: quote.subtotal,
      tax: quote.taxTotal,
      total: quote.total,
      discountTotal: (quote as QuoteDetail & { discountTotal?: number }).discountTotal ?? 0
    })}
    ${renderProductionTermsInfo(paymentTermsLabel)}
    ${quote.notes ? `
      <div class="production-notes no-break">
        <h3 class="section-title">Notes</h3>
        <div class="notes-content">${formatMultiline(quote.notes)}</div>
      </div>
      <style>
        .production-notes {
          margin-bottom: 30px;
          padding: 18px;
          border: 1px solid ${PDF_THEME.border};
          border-radius: 16px;
          background: #fff;
        }
        .notes-content {
          font-size: 13px;
          line-height: 1.6;
          color: ${PDF_THEME.textMuted};
          margin-top: 6px;
          white-space: pre-line;
        }
      </style>
    ` : ''}
  `;

  return generateProductionHTML(content, `Quote ${quote.number} - ${quote.client.name}`);
}

export function renderProductionInvoiceHtml(invoice: InvoiceWithPayment, options: TemplateOptions = {}): string {
  const businessInfo: BusinessInfo = {
    logoDataUrl: options.logoDataUrl,
    businessName: options.businessName,
    businessAddress: options.businessAddress,
    businessPhone: options.businessPhone,
    businessEmail: options.businessEmail,
    abn: options.abn,
    bankDetails: options.bankDetails
  };

  const documentMeta: DocumentMeta = {
    number: invoice.number,
    type: 'INVOICE',
    issueDate: new Date(invoice.issueDate),
    dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
    status: invoice.status,
    total: invoice.total,
    poNumber: invoice.poNumber ?? null
  };

  const lineItems: LineItem[] = invoice.lines.map((line) => ({
    id: line.id,
    name: line.name,
    description: line.description || "",
    quantity: line.quantity,
    unit: line.unit || "",
    unitPrice: line.unitPrice,
    total: line.total,
    discountType: line.discountType,
    discountValue: line.discountValue
  }));

  const content = `
    ${renderProductionHeader(businessInfo, documentMeta)}
    ${renderProductionClientInfo(invoice.client)}
    ${renderProductionLineItems(lineItems)}
    ${renderProductionSummary({
      subtotal: invoice.subtotal,
      tax: invoice.taxTotal,
      total: invoice.total,
      discountTotal: (invoice as InvoiceWithPayment & { discountTotal?: number }).discountTotal ?? 0
    }, invoice.balanceDue)}
    ${renderProductionPaymentSection(invoice, businessInfo)}
    ${invoice.notes ? `
      <div class="production-notes no-break">
        <h3 class="section-title">Notes</h3>
        <div class="notes-content">${formatMultiline(invoice.notes)}</div>
      </div>
      <style>
        .production-notes {
          margin-bottom: 30px;
          padding: 18px;
          border: 1px solid ${PDF_THEME.border};
          border-radius: 16px;
          background: #fff;
        }
        .notes-content {
          font-size: 13px;
          line-height: 1.6;
          color: ${PDF_THEME.textMuted};
          margin-top: 6px;
          white-space: pre-line;
        }
      </style>
    ` : ''}
  `;

  return generateProductionHTML(content, `Invoice ${invoice.number} - ${invoice.client.name}`);
}
