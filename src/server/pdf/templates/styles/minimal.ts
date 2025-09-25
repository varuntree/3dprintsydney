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

function renderMinimalHeader(businessInfo: BusinessInfo, documentMeta: DocumentMeta): string {
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return `
    <div class="minimal-header">
      <div class="business-section">
        <h1 class="business-name">${businessInfo.businessName || 'Business Name'}</h1>
        <div class="business-details">
          ${businessInfo.businessAddress ? `<div>${formatMultiline(businessInfo.businessAddress)}</div>` : ''}
          ${businessInfo.businessPhone ? `<div>${businessInfo.businessPhone}</div>` : ''}
          ${businessInfo.businessEmail ? `<div>${businessInfo.businessEmail}</div>` : ''}
        </div>
      </div>

      <div class="document-section">
        <h2 class="document-title">${documentMeta.type}</h2>
        <div class="document-details">
          <div class="document-number">${documentMeta.number}</div>
          <div class="document-date">${formatDate(documentMeta.issueDate)}</div>
        </div>
      </div>
    </div>

    <style>
      .minimal-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 60px;
        padding-bottom: 20px;
      }

      .business-name {
        font-size: 24px;
        font-weight: 300;
        margin: 0 0 12px 0;
        color: #2d3748;
        letter-spacing: 0.5px;
      }

      .business-details {
        font-size: 11px;
        color: #718096;
        line-height: 1.5;
      }

      .document-section {
        text-align: right;
      }

      .document-title {
        font-size: 16px;
        font-weight: 300;
        margin: 0 0 8px 0;
        color: #4a5568;
        letter-spacing: 2px;
        text-transform: uppercase;
      }

      .document-number {
        font-size: 13px;
        font-weight: 500;
        color: #2d3748;
        margin-bottom: 4px;
      }

      .document-date {
        font-size: 11px;
        color: #718096;
      }
    </style>
  `;
}

function renderMinimalClientInfo(client: any, documentMeta: DocumentMeta): string {
  return `
    <div class="minimal-client-section">
      <div class="client-info">
        <h3 class="section-label">To</h3>
        <div class="client-name">${client.name}</div>
        ${client.email ? `<div class="client-email">${client.email}</div>` : ''}
      </div>
    </div>

    <style>
      .minimal-client-section {
        margin-bottom: 40px;
      }

      .section-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #a0aec0;
        margin: 0 0 8px 0;
        font-weight: 500;
      }

      .client-name {
        font-size: 15px;
        font-weight: 500;
        color: #2d3748;
        margin-bottom: 4px;
      }

      .client-email {
        font-size: 11px;
        color: #718096;
      }
    </style>
  `;
}

function renderMinimalLineItems(lineItems: LineItem[]): string {
  return `
    <div class="minimal-line-items">
      <h3 class="section-label">Items</h3>
      <div class="items-list">
        ${lineItems.map(item => `
          <div class="line-item">
            <div class="item-main">
              <div class="item-name">${item.name}</div>
              ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
            </div>
            <div class="item-qty">${item.quantity}</div>
            <div class="item-price">$${item.unitPrice.toFixed(2)}</div>
            <div class="item-total">$${item.total.toFixed(2)}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <style>
      .minimal-line-items {
        margin-bottom: 40px;
      }

      .items-list {
        margin-top: 16px;
      }

      .line-item {
        display: flex;
        align-items: flex-start;
        padding: 16px 0;
        border-bottom: 1px solid #f7fafc;
      }

      .line-item:last-child {
        border-bottom: none;
      }

      .item-main {
        flex: 1;
        margin-right: 20px;
      }

      .item-name {
        font-size: 12px;
        font-weight: 500;
        color: #2d3748;
        margin-bottom: 2px;
      }

      .item-description {
        font-size: 10px;
        color: #718096;
        line-height: 1.4;
      }

      .item-qty, .item-price, .item-total {
        font-size: 11px;
        color: #4a5568;
        text-align: right;
        min-width: 60px;
        margin-left: 16px;
      }

      .item-total {
        font-weight: 500;
        color: #2d3748;
      }
    </style>
  `;
}

function renderMinimalSummary(financial: any): string {
  return `
    <div class="minimal-summary">
      <div class="summary-rows">
        <div class="summary-row">
          <span class="summary-label">Subtotal</span>
          <span class="summary-value">$${financial.subtotal.toFixed(2)}</span>
        </div>
        ${financial.tax > 0 ? `
          <div class="summary-row">
            <span class="summary-label">Tax</span>
            <span class="summary-value">$${financial.tax.toFixed(2)}</span>
          </div>
        ` : ''}
        <div class="summary-row total-row">
          <span class="summary-label">Total</span>
          <span class="summary-value">$${financial.total.toFixed(2)}</span>
        </div>
      </div>
    </div>

    <style>
      .minimal-summary {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 40px;
      }

      .summary-rows {
        min-width: 240px;
      }

      .summary-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
      }

      .total-row {
        border-top: 1px solid #e2e8f0;
        padding-top: 12px;
        margin-top: 4px;
      }

      .summary-label {
        font-size: 11px;
        color: #718096;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .summary-value {
        font-size: 11px;
        color: #2d3748;
        font-weight: 500;
      }

      .total-row .summary-label,
      .total-row .summary-value {
        font-size: 13px;
        font-weight: 600;
        color: #2d3748;
      }
    </style>
  `;
}

export function renderMinimalQuoteHtml(quote: QuoteDetail, options?: TemplateOptions) {
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
    ${renderMinimalHeader(businessInfo, documentMeta)}
    ${renderMinimalClientInfo(quote.client, documentMeta)}
    ${renderMinimalLineItems(lineItems)}
    ${renderMinimalSummary({
      subtotal: quote.subtotal,
      tax: quote.taxTotal,
      total: quote.total
    })}
    ${quote.notes ? `
      <div class="minimal-notes">
        <h3 class="section-label">Notes</h3>
        <div class="notes-content">${formatMultiline(quote.notes)}</div>
      </div>
      <style>
        .minimal-notes {
          margin-bottom: 30px;
        }
        .notes-content {
          font-size: 11px;
          line-height: 1.5;
          color: #718096;
          margin-top: 8px;
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
        padding: 40px;
        background: white;
      }
      * {
        box-sizing: border-box;
      }
    </style>
  `;

  return generateEnhancedPDFHtml(`${pageStyles}${content}`, `Quote ${quote.number} - ${quote.client.name}`);
}

export function renderMinimalInvoiceHtml(invoice: InvoiceDetail, options?: TemplateOptions) {
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
    ${renderMinimalHeader(businessInfo, documentMeta)}
    ${renderMinimalClientInfo(invoice.client, documentMeta)}
    ${renderMinimalLineItems(lineItems)}
    ${renderMinimalSummary({
      subtotal: invoice.subtotal,
      tax: invoice.taxTotal,
      total: invoice.total
    })}
    ${invoice.notes ? `
      <div class="minimal-notes">
        <h3 class="section-label">Notes</h3>
        <div class="notes-content">${formatMultiline(invoice.notes)}</div>
      </div>
      <style>
        .minimal-notes {
          margin-bottom: 30px;
        }
        .notes-content {
          font-size: 11px;
          line-height: 1.5;
          color: #718096;
          margin-top: 8px;
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
        padding: 40px;
        background: white;
      }
      * {
        box-sizing: border-box;
      }
    </style>
  `;

  return generateEnhancedPDFHtml(`${pageStyles}${content}`, `Invoice ${invoice.number} - ${invoice.client.name}`);
}