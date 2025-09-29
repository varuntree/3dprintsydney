import type { QuoteDetail } from "@/server/services/quotes";
import type { InvoiceDetail } from "@/server/services/invoices";
import { formatMultiline } from "@/server/pdf/templates/shared/utils";
import {
  type BusinessInfo,
  type DocumentMeta,
  type LineItem
} from "@/server/pdf/templates/shared/components";

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
  stripeCheckoutUrl?: string;
};

// Enhanced header with proper logo placement and professional hierarchy
function renderProductionHeader(businessInfo: BusinessInfo, documentMeta: DocumentMeta): string {
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string): string => {
    const statusColors = {
      'DRAFT': 'background: #fef3c7; color: #92400e; border: 1px solid #fde68a;',
      'PENDING': 'background: #fef3c7; color: #92400e; border: 1px solid #fde68a;',
      'ACCEPTED': 'background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0;',
      'PAID': 'background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0;',
      'OVERDUE': 'background: #fecaca; color: #991b1b; border: 1px solid #fca5a5;',
      'DECLINED': 'background: #fecaca; color: #991b1b; border: 1px solid #fca5a5;',
      'CONVERTED': 'background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd;'
    };

    const style = statusColors[status as keyof typeof statusColors] || statusColors['PENDING'];

    return `
      <div class="status-badge" style="${style}">
        ${status.toLowerCase()}
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
        border-bottom: 2px solid #f8fafc;
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
        width: 80px;
        height: 80px;
        object-fit: contain;
        border-radius: 8px;
      }

      .business-name {
        font-size: 24px;
        font-weight: 300;
        color: #1a365d;
        margin: 0 0 8px 0;
        letter-spacing: -0.025em;
        line-height: 1.2;
      }

      .business-contact {
        font-size: 14px;
        color: #4a5568;
        line-height: 1.5;
      }

      .address-line {
        margin-bottom: 4px;
      }

      .contact-line {
        margin-bottom: 4px;
      }

      .email, .phone {
        color: #2d3748;
      }

      .abn {
        font-size: 12px;
        color: #718096;
        margin-top: 8px;
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
        font-size: 16px;
        font-weight: 300;
        color: #4a5568;
        margin: 0;
        letter-spacing: 2px;
        text-transform: uppercase;
      }

      .status-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.025em;
      }

      .document-number {
        font-size: 32px;
        font-weight: 300;
        color: #1a365d;
        margin-bottom: 16px;
        letter-spacing: -0.025em;
      }

      .document-dates {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .date-item {
        display: flex;
        justify-content: space-between;
        min-width: 160px;
      }

      .date-label {
        font-size: 11px;
        color: #718096;
        text-transform: uppercase;
        letter-spacing: 0.025em;
      }

      .date-value {
        font-size: 11px;
        color: #2d3748;
        font-weight: 500;
      }
    </style>
  `;
}

// Enhanced client info with better layout
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
        margin-bottom: 40px;
      }

      .section-title {
        font-size: 12px;
        font-weight: 500;
        color: #718096;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 0 0 12px 0;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 4px;
      }

      .client-details {
        line-height: 1.5;
      }

      .client-name {
        font-size: 16px;
        font-weight: 500;
        color: #1a365d;
        margin-bottom: 4px;
      }

      .client-company {
        font-size: 14px;
        color: #4a5568;
        margin-bottom: 8px;
      }

      .client-address {
        font-size: 14px;
        color: #4a5568;
        margin-bottom: 8px;
        white-space: pre-line;
      }

      .client-contact {
        font-size: 14px;
        color: #4a5568;
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
        margin-bottom: 40px;
      }

      .items-table-wrapper {
        margin-top: 16px;
      }

      .items-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
      }

      .items-table th {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        padding: 12px;
        text-align: left;
        font-weight: 500;
        font-size: 12px;
        color: #4a5568;
        text-transform: uppercase;
        letter-spacing: 0.025em;
        border-bottom: 2px solid #cbd5e0;
      }

      .col-description {
        width: 50%;
      }

      .col-qty {
        width: 12%;
        text-align: center;
      }

      .col-rate {
        width: 19%;
        text-align: right;
      }

      .col-amount {
        width: 19%;
        text-align: right;
      }

      .items-table th.col-qty,
      .items-table th.col-rate,
      .items-table th.col-amount {
        text-align: right;
      }

      .item-row {
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .items-table td {
        border: 1px solid #e2e8f0;
        padding: 16px 12px;
        vertical-align: top;
      }

      .items-table tbody tr:nth-child(even) {
        background: #fafbfc;
      }

      .items-table tbody tr:hover {
        background: #f1f5f9;
      }

      .item-name {
        font-weight: 500;
        color: #1a365d;
        margin-bottom: 4px;
      }

      .item-detail {
        font-size: 12px;
        color: #718096;
        line-height: 1.4;
      }

      .item-qty {
        text-align: center;
        color: #4a5568;
      }

      .item-rate, .item-amount {
        text-align: right;
        font-weight: 500;
        color: #2d3748;
      }

      /* Prevent table breaks */
      .items-table {
        page-break-inside: auto;
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
      <div class="summary-container">
        <div class="summary-table">
          <div class="summary-row">
            <span class="summary-label">Subtotal</span>
            <span class="summary-value">$${financial.subtotal.toFixed(2)}</span>
          </div>
          ${financial.discountTotal > 0 ? `
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
    </div>

    <style>
      .production-summary {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 40px;
      }

      .summary-container {
        min-width: 300px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 24px;
      }

      .summary-table {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .summary-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .summary-label {
        font-size: 14px;
        color: #4a5568;
        font-weight: 400;
      }

      .summary-value {
        font-size: 14px;
        color: #1a365d;
        font-weight: 500;
      }

      .summary-value.discount {
        color: #059669;
      }

      .total-row {
        border-top: 2px solid #cbd5e0;
        padding-top: 16px;
        margin-top: 8px;
      }

      .total-row .summary-label,
      .total-row .summary-value {
        font-size: 18px;
        font-weight: 600;
        color: #1a365d;
      }

      .balance-row {
        background: #fef3c7;
        border: 1px solid #fde68a;
        border-radius: 6px;
        padding: 12px;
        margin: 8px -12px -12px -12px;
      }

      .balance-row .summary-label,
      .balance-row .summary-value {
        font-size: 16px;
        font-weight: 600;
        color: #92400e;
      }
    </style>
  `;
}

// Enhanced payment section with Stripe integration and QR codes
function renderProductionPaymentSection(invoice: InvoiceWithPayment, businessInfo: BusinessInfo): string {
  if (invoice.status === 'PAID' || invoice.balanceDue <= 0) {
    return `
      <div class="payment-section paid">
        <div class="payment-status">
          <div class="status-icon">✓</div>
          <div class="status-text">
            <h3>Payment Received</h3>
            <p>This invoice has been paid in full.</p>
          </div>
        </div>
      </div>

      <style>
        .payment-section.paid {
          background: #d1fae5;
          border: 2px solid #10b981;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 40px;
          text-align: center;
        }

        .payment-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .status-icon {
          width: 48px;
          height: 48px;
          background: #10b981;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: bold;
        }

        .status-text h3 {
          font-size: 18px;
          color: #065f46;
          margin: 0 0 4px 0;
        }

        .status-text p {
          font-size: 14px;
          color: #047857;
          margin: 0;
        }
      </style>
    `;
  }

  return `
    <div class="payment-section">
      <h3 class="section-title">Payment Information</h3>
      <div class="payment-methods">
        ${invoice.stripeCheckoutUrl ? `
          <div class="payment-method primary">
            <div class="payment-header">
              <div class="payment-icon">💳</div>
              <div class="payment-title">
                <h4>Pay Online</h4>
                <p>Secure payment via credit card or bank transfer</p>
              </div>
            </div>
            <div class="payment-content">
              <div class="qr-section">
                <div class="qr-code" style="background: url('data:image/svg+xml;base64,${btoa(`
                  <svg width="120" height="120" xmlns="http://www.w3.org/2000/svg">
                    <rect width="120" height="120" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
                    <text x="60" y="60" text-anchor="middle" fill="#4a5568" font-size="12" font-family="Arial">QR Code</text>
                  </svg>
                `)}') center/contain no-repeat;"></div>
                <p class="qr-instructions">Scan with your phone to pay</p>
              </div>
              <div class="payment-link">
                <a href="${invoice.stripeCheckoutUrl}" class="pay-button">
                  Pay $${invoice.balanceDue.toFixed(2)} Now
                </a>
                <div class="payment-url">
                  <span class="url-label">Or visit:</span>
                  <span class="url-text">${invoice.stripeCheckoutUrl}</span>
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        ${businessInfo.bankDetails ? `
          <div class="payment-method secondary">
            <div class="payment-header">
              <div class="payment-icon">🏦</div>
              <div class="payment-title">
                <h4>Bank Transfer</h4>
                <p>Direct deposit to our business account</p>
              </div>
            </div>
            <div class="payment-content">
              <div class="bank-details">
                ${formatMultiline(businessInfo.bankDetails)}
              </div>
              <div class="payment-reference">
                <strong>Reference:</strong> ${invoice.number}
              </div>
            </div>
          </div>
        ` : ''}

        <div class="payment-terms">
          <h4>Payment Terms</h4>
          <ul>
            <li>Payment is due within ${invoice.dueDate ? Math.ceil((new Date(invoice.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 30} days</li>
            <li>Late payments may incur additional fees</li>
            <li>For questions, contact ${businessInfo.businessEmail || 'our billing department'}</li>
          </ul>
        </div>
      </div>
    </div>

    <style>
      .payment-section {
        margin-bottom: 40px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 32px;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .payment-methods {
        display: flex;
        flex-direction: column;
        gap: 24px;
        margin-top: 20px;
      }

      .payment-method {
        background: white;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        padding: 24px;
      }

      .payment-method.primary {
        border-color: #3182ce;
        background: linear-gradient(135deg, #ffffff 0%, #f7fafc 100%);
      }

      .payment-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 20px;
      }

      .payment-icon {
        font-size: 32px;
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f1f5f9;
        border-radius: 12px;
      }

      .payment-title h4 {
        font-size: 18px;
        color: #1a365d;
        margin: 0 0 4px 0;
        font-weight: 600;
      }

      .payment-title p {
        font-size: 14px;
        color: #4a5568;
        margin: 0;
      }

      .payment-content {
        display: flex;
        align-items: center;
        gap: 32px;
      }

      .qr-section {
        text-align: center;
        flex-shrink: 0;
      }

      .qr-code {
        width: 120px;
        height: 120px;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        margin-bottom: 8px;
      }

      .qr-instructions {
        font-size: 12px;
        color: #718096;
        margin: 0;
      }

      .payment-link {
        flex: 1;
      }

      .pay-button {
        display: inline-block;
        background: #3182ce;
        color: white;
        padding: 16px 32px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        text-decoration: none;
        margin-bottom: 16px;
        transition: background-color 0.2s;
      }

      .pay-button:hover {
        background: #2c5aa0;
      }

      .payment-url {
        background: #f1f5f9;
        border: 1px solid #cbd5e0;
        border-radius: 6px;
        padding: 12px;
      }

      .url-label {
        font-size: 12px;
        color: #718096;
        display: block;
        margin-bottom: 4px;
      }

      .url-text {
        font-size: 11px;
        color: #2d3748;
        word-break: break-all;
        font-family: monospace;
      }

      .bank-details {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 16px;
        font-size: 14px;
        color: #2d3748;
        white-space: pre-line;
        margin-bottom: 12px;
      }

      .payment-reference {
        font-size: 14px;
        color: #4a5568;
        background: #fff5f5;
        border: 1px solid #fecaca;
        border-radius: 6px;
        padding: 12px;
      }

      .payment-terms {
        border-top: 1px solid #e2e8f0;
        padding-top: 20px;
        margin-top: 20px;
      }

      .payment-terms h4 {
        font-size: 14px;
        color: #4a5568;
        margin: 0 0 12px 0;
        font-weight: 600;
      }

      .payment-terms ul {
        margin: 0;
        padding-left: 20px;
        color: #718096;
        font-size: 12px;
        line-height: 1.6;
      }

      .payment-terms li {
        margin-bottom: 6px;
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
          color: #2d3748;
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
    total: quote.total
  };

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
      discountTotal: quote.discountTotal || 0
    })}
    ${quote.notes ? `
      <div class="production-notes no-break">
        <h3 class="section-title">Notes & Terms</h3>
        <div class="notes-content">${formatMultiline(quote.notes)}</div>
      </div>
      <style>
        .production-notes {
          margin-bottom: 30px;
          padding: 20px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }
        .notes-content {
          font-size: 14px;
          line-height: 1.6;
          color: #4a5568;
          margin-top: 8px;
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
    total: invoice.total
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
      discountTotal: invoice.discountTotal || 0
    }, invoice.balanceDue)}
    ${renderProductionPaymentSection(invoice, businessInfo)}
    ${invoice.notes ? `
      <div class="production-notes no-break">
        <h3 class="section-title">Notes & Terms</h3>
        <div class="notes-content">${formatMultiline(invoice.notes)}</div>
      </div>
      <style>
        .production-notes {
          margin-bottom: 30px;
          padding: 20px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }
        .notes-content {
          font-size: 14px;
          line-height: 1.6;
          color: #4a5568;
          margin-top: 8px;
          white-space: pre-line;
        }
      </style>
    ` : ''}
  `;

  return generateProductionHTML(content, `Invoice ${invoice.number} - ${invoice.client.name}`);
}