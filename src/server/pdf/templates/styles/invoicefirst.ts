import type { QuoteDetail } from "@/server/services/quotes";
import type { InvoiceDetail } from "@/server/services/invoices";
import { generateEnhancedPDFHtml } from "@/server/pdf/templates/shared/styles";
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

function renderInvoiceFirstHeader(businessInfo: BusinessInfo, documentMeta: DocumentMeta): string {
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return `
    <div class="invoice-first-header">
      <!-- Prominent Document Info -->
      <div class="document-hero">
        <div class="document-type">${documentMeta.type}</div>
        <div class="document-number">${documentMeta.number}</div>
        <div class="document-amount">$${documentMeta.total.toFixed(2)}</div>
        <div class="document-status">
          ${documentMeta.type === 'INVOICE' && documentMeta.dueDate
            ? `Due: ${formatDate(documentMeta.dueDate)}`
            : `Issued: ${formatDate(documentMeta.issueDate)}`}
        </div>
      </div>

      <!-- Business and Client Info -->
      <div class="header-details">
        <div class="business-info">
          <div class="info-label">FROM:</div>
          <div class="business-name">${businessInfo.businessName || 'Business Name'}</div>
          ${businessInfo.businessAddress ? `<div class="business-address">${formatMultiline(businessInfo.businessAddress)}</div>` : ''}
          <div class="business-contact">
            ${businessInfo.businessPhone ? businessInfo.businessPhone : ''}
            ${businessInfo.businessPhone && businessInfo.businessEmail ? ' • ' : ''}
            ${businessInfo.businessEmail ? businessInfo.businessEmail : ''}
          </div>
          ${businessInfo.abn ? `<div class="business-abn">ABN: ${businessInfo.abn}</div>` : ''}
        </div>
      </div>
    </div>

    <style>
      .invoice-first-header {
        margin-bottom: 30px;
      }

      .document-hero {
        text-align: center;
        padding: 30px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 12px;
        margin-bottom: 30px;
        position: relative;
        overflow: hidden;
      }

      .document-hero::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.1) 0%, transparent 50%);
      }

      .document-type {
        font-size: 16px;
        font-weight: 300;
        letter-spacing: 3px;
        text-transform: uppercase;
        margin-bottom: 8px;
        opacity: 0.9;
        position: relative;
      }

      .document-number {
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 16px;
        position: relative;
        text-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }

      .document-amount {
        font-size: 36px;
        font-weight: 800;
        margin-bottom: 12px;
        position: relative;
        text-shadow: 0 2px 6px rgba(0,0,0,0.3);
        color: #fff;
      }

      .document-status {
        font-size: 12px;
        font-weight: 500;
        opacity: 0.9;
        position: relative;
        letter-spacing: 1px;
      }

      .header-details {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }

      .info-label {
        font-size: 10px;
        font-weight: 700;
        color: #4a5568;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 8px;
      }

      .business-name {
        font-size: 16px;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 6px;
      }

      .business-address, .business-contact, .business-abn {
        font-size: 11px;
        color: #718096;
        line-height: 1.4;
        margin-bottom: 2px;
      }

      .business-contact {
        margin-top: 4px;
      }
    </style>
  `;
}

function renderInvoiceFirstClient(client: any): string {
  return `
    <div class="invoice-first-client">
      <div class="client-card">
        <div class="info-label">BILL TO:</div>
        <div class="client-name">${client.name}</div>
        ${client.email ? `<div class="client-email">${client.email}</div>` : ''}
      </div>
    </div>

    <style>
      .invoice-first-client {
        margin-bottom: 30px;
      }

      .client-card {
        background: #f8fafc;
        border-left: 4px solid #667eea;
        padding: 20px;
        border-radius: 0 8px 8px 0;
      }

      .client-name {
        font-size: 18px;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 4px;
      }

      .client-email {
        font-size: 12px;
        color: #4a5568;
      }
    </style>
  `;
}

function renderInvoiceFirstItems(lineItems: LineItem[]): string {
  return `
    <div class="invoice-first-items">
      <div class="items-header">
        <h3 class="section-title">Items & Services</h3>
      </div>

      <div class="items-grid">
        ${lineItems.map(item => `
          <div class="item-card">
            <div class="item-header">
              <div class="item-name">${item.name}</div>
              <div class="item-total">$${item.total.toFixed(2)}</div>
            </div>
            ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
            <div class="item-details">
              <span class="item-qty">Qty: ${item.quantity}</span>
              <span class="item-rate">@ $${item.unitPrice.toFixed(2)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <style>
      .invoice-first-items {
        margin-bottom: 30px;
      }

      .section-title {
        font-size: 14px;
        font-weight: 600;
        color: #2d3748;
        margin: 0 0 20px 0;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .items-grid {
        display: grid;
        gap: 16px;
      }

      .item-card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        transition: all 0.2s ease;
      }

      .item-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 8px;
      }

      .item-name {
        font-size: 14px;
        font-weight: 600;
        color: #2d3748;
        flex: 1;
        margin-right: 16px;
      }

      .item-total {
        font-size: 16px;
        font-weight: 700;
        color: #667eea;
      }

      .item-description {
        font-size: 11px;
        color: #718096;
        line-height: 1.4;
        margin-bottom: 8px;
      }

      .item-details {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        color: #a0aec0;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    </style>
  `;
}

function renderInvoiceFirstSummary(financial: any): string {
  return `
    <div class="invoice-first-summary">
      <div class="summary-card">
        <div class="summary-rows">
          <div class="summary-row">
            <span class="label">Subtotal</span>
            <span class="value">$${financial.subtotal.toFixed(2)}</span>
          </div>
          ${financial.tax > 0 ? `
            <div class="summary-row">
              <span class="label">Tax</span>
              <span class="value">$${financial.tax.toFixed(2)}</span>
            </div>
          ` : ''}
        </div>
        <div class="total-section">
          <div class="total-label">AMOUNT DUE</div>
          <div class="total-amount">$${financial.total.toFixed(2)}</div>
        </div>
      </div>
    </div>

    <style>
      .invoice-first-summary {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 30px;
      }

      .summary-card {
        width: 300px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        overflow: hidden;
      }

      .summary-rows {
        padding: 20px;
        border-bottom: 1px solid #e2e8f0;
      }

      .summary-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 12px;
        font-size: 12px;
      }

      .summary-row:last-child {
        margin-bottom: 0;
      }

      .label {
        color: #718096;
        font-weight: 500;
      }

      .value {
        color: #2d3748;
        font-weight: 600;
      }

      .total-section {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 20px;
        text-align: center;
        color: white;
      }

      .total-label {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 2px;
        opacity: 0.9;
        margin-bottom: 8px;
      }

      .total-amount {
        font-size: 24px;
        font-weight: 800;
        text-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
    </style>
  `;
}

export function renderInvoiceFirstQuoteHtml(quote: QuoteDetail, options?: TemplateOptions) {
  const businessInfo: BusinessInfo = {
    logoDataUrl: options?.logoDataUrl,
    businessName: options?.businessName,
    businessAddress: options?.businessAddress,
    businessPhone: options?.businessPhone,
    businessEmail: options?.businessEmail,
    abn: options?.abn,
    bankDetails: options?.bankDetails
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
    ${renderInvoiceFirstHeader(businessInfo, documentMeta)}
    ${renderInvoiceFirstClient(quote.client)}
    ${renderInvoiceFirstItems(lineItems)}
    ${renderInvoiceFirstSummary({
      subtotal: quote.subtotal,
      tax: quote.taxTotal,
      total: quote.total
    })}
  `;

  const pageStyles = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #2d3748;
        line-height: 1.4;
        margin: 0;
        padding: 30px;
        background: #f8fafc;
      }
      * {
        box-sizing: border-box;
      }
    </style>
  `;

  return generateEnhancedPDFHtml(`${pageStyles}${content}`, `Quote ${quote.number} - ${quote.client.name}`);
}

export function renderInvoiceFirstInvoiceHtml(invoice: InvoiceDetail, options?: TemplateOptions) {
  const businessInfo: BusinessInfo = {
    logoDataUrl: options?.logoDataUrl,
    businessName: options?.businessName,
    businessAddress: options?.businessAddress,
    businessPhone: options?.businessPhone,
    businessEmail: options?.businessEmail,
    abn: options?.abn,
    bankDetails: options?.bankDetails
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
    ${renderInvoiceFirstHeader(businessInfo, documentMeta)}
    ${renderInvoiceFirstClient(invoice.client)}
    ${renderInvoiceFirstItems(lineItems)}
    ${renderInvoiceFirstSummary({
      subtotal: invoice.subtotal,
      tax: invoice.taxTotal,
      total: invoice.total
    })}
    ${options?.bankDetails ? `
      <div class="payment-info">
        <div class="payment-card">
          <h3 class="section-title">Payment Information</h3>
          <div class="payment-details">${formatMultiline(options.bankDetails)}</div>
        </div>
      </div>
      <style>
        .payment-info {
          margin-bottom: 30px;
        }
        .payment-card {
          background: #f8fafc;
          border-left: 4px solid #667eea;
          padding: 20px;
          border-radius: 0 8px 8px 0;
        }
        .payment-details {
          font-size: 11px;
          line-height: 1.5;
          color: #4a5568;
        }
      </style>
    ` : ''}
  `;

  const pageStyles = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #2d3748;
        line-height: 1.4;
        margin: 0;
        padding: 30px;
        background: #f8fafc;
      }
      * {
        box-sizing: border-box;
      }
    </style>
  `;

  return generateEnhancedPDFHtml(`${pageStyles}${content}`, `Invoice ${invoice.number} - ${invoice.client.name}`);
}