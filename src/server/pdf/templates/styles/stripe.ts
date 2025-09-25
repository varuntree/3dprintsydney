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

function renderStripeHeader(businessInfo: BusinessInfo, documentMeta: DocumentMeta): string {
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return `
    <div class="stripe-header">
      <div class="header-top">
        <div class="business-info">
          <h1 class="business-name">${businessInfo.businessName || 'Business Name'}</h1>
          <div class="business-details">
            ${businessInfo.businessEmail ? businessInfo.businessEmail : ''}
            ${businessInfo.businessEmail && businessInfo.businessPhone ? ' • ' : ''}
            ${businessInfo.businessPhone ? businessInfo.businessPhone : ''}
          </div>
        </div>

        <div class="document-info">
          <div class="document-number">${documentMeta.number}</div>
        </div>
      </div>

      <div class="document-meta">
        <div class="meta-row">
          <div class="meta-item">
            <span class="meta-label">${documentMeta.type.toLowerCase()}</span>
            <span class="meta-value">${documentMeta.number}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Date</span>
            <span class="meta-value">${formatDate(documentMeta.issueDate)}</span>
          </div>
          ${documentMeta.dueDate ? `
            <div class="meta-item">
              <span class="meta-label">Due</span>
              <span class="meta-value">${formatDate(documentMeta.dueDate)}</span>
            </div>
          ` : ''}
        </div>
      </div>
    </div>

    <style>
      .stripe-header {
        margin-bottom: 48px;
      }

      .header-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 32px;
      }

      .business-name {
        font-size: 20px;
        font-weight: 600;
        color: #0a2540;
        margin: 0 0 6px 0;
        line-height: 1.2;
      }

      .business-details {
        font-size: 14px;
        color: #425466;
        line-height: 1.4;
      }

      .document-number {
        font-size: 24px;
        font-weight: 600;
        color: #0a2540;
        text-align: right;
      }

      .document-meta {
        border-top: 1px solid #e3e8ee;
        padding-top: 24px;
      }

      .meta-row {
        display: flex;
        gap: 48px;
      }

      .meta-item {
        display: flex;
        flex-direction: column;
      }

      .meta-label {
        font-size: 12px;
        color: #8792a2;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 500;
        margin-bottom: 2px;
      }

      .meta-value {
        font-size: 14px;
        color: #0a2540;
        font-weight: 500;
      }
    </style>
  `;
}

function renderStripeClient(client: any): string {
  return `
    <div class="stripe-client">
      <div class="client-label">Bill to</div>
      <div class="client-name">${client.name}</div>
      ${client.email ? `<div class="client-email">${client.email}</div>` : ''}
    </div>

    <style>
      .stripe-client {
        margin-bottom: 40px;
      }

      .client-label {
        font-size: 12px;
        color: #8792a2;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 500;
        margin-bottom: 8px;
      }

      .client-name {
        font-size: 16px;
        font-weight: 500;
        color: #0a2540;
        margin-bottom: 4px;
      }

      .client-email {
        font-size: 14px;
        color: #425466;
      }
    </style>
  `;
}

function renderStripeItems(lineItems: LineItem[]): string {
  return `
    <div class="stripe-items">
      <div class="items-table">
        <div class="table-header">
          <div class="col-description">Description</div>
          <div class="col-quantity">Qty</div>
          <div class="col-rate">Unit price</div>
          <div class="col-amount">Amount</div>
        </div>

        <div class="table-body">
          ${lineItems.map(item => `
            <div class="table-row">
              <div class="col-description">
                <div class="item-name">${item.name}</div>
                ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
              </div>
              <div class="col-quantity">${item.quantity}</div>
              <div class="col-rate">$${item.unitPrice.toFixed(2)}</div>
              <div class="col-amount">$${item.total.toFixed(2)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <style>
      .stripe-items {
        margin-bottom: 40px;
      }

      .items-table {
        width: 100%;
      }

      .table-header {
        display: flex;
        padding: 12px 0;
        border-bottom: 1px solid #e3e8ee;
        margin-bottom: 16px;
      }

      .table-header > div {
        font-size: 12px;
        color: #8792a2;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 500;
      }

      .table-row {
        display: flex;
        padding: 16px 0;
        border-bottom: 1px solid #f6f9fc;
        align-items: flex-start;
      }

      .table-row:last-child {
        border-bottom: none;
      }

      .col-description {
        flex: 1;
        margin-right: 24px;
      }

      .col-quantity, .col-rate, .col-amount {
        width: 100px;
        text-align: right;
        font-size: 14px;
        color: #0a2540;
      }

      .item-name {
        font-size: 14px;
        font-weight: 500;
        color: #0a2540;
        margin-bottom: 4px;
      }

      .item-description {
        font-size: 13px;
        color: #425466;
        line-height: 1.4;
      }
    </style>
  `;
}

function renderStripeSummary(financial: any): string {
  return `
    <div class="stripe-summary">
      <div class="summary-section">
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
    </div>

    <style>
      .stripe-summary {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 48px;
      }

      .summary-section {
        width: 280px;
      }

      .summary-rows {
        border-top: 1px solid #e3e8ee;
        padding-top: 16px;
      }

      .summary-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        font-size: 14px;
      }

      .total-row {
        border-top: 1px solid #e3e8ee;
        margin-top: 8px;
        padding-top: 16px;
        font-size: 16px;
        font-weight: 600;
      }

      .summary-label {
        color: #425466;
      }

      .summary-value {
        color: #0a2540;
        font-weight: 500;
      }

      .total-row .summary-label,
      .total-row .summary-value {
        color: #0a2540;
        font-weight: 600;
      }
    </style>
  `;
}

export function renderStripeQuoteHtml(quote: QuoteDetail, options?: TemplateOptions) {
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
    ${renderStripeHeader(businessInfo, documentMeta)}
    ${renderStripeClient(quote.client)}
    ${renderStripeItems(lineItems)}
    ${renderStripeSummary({
      subtotal: quote.subtotal,
      tax: quote.taxTotal,
      total: quote.total
    })}
  `;

  const pageStyles = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif;
        color: #0a2540;
        line-height: 1.4;
        margin: 0;
        padding: 48px;
        background: white;
        font-size: 14px;
      }
      * {
        box-sizing: border-box;
      }
    </style>
  `;

  return generateEnhancedPDFHtml(`${pageStyles}${content}`, `Quote ${quote.number} - ${quote.client.name}`);
}

export function renderStripeInvoiceHtml(invoice: InvoiceDetail, options?: TemplateOptions) {
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
    ${renderStripeHeader(businessInfo, documentMeta)}
    ${renderStripeClient(invoice.client)}
    ${renderStripeItems(lineItems)}
    ${renderStripeSummary({
      subtotal: invoice.subtotal,
      tax: invoice.taxTotal,
      total: invoice.total
    })}
    ${options?.bankDetails ? `
      <div class="payment-info">
        <div class="payment-label">Payment details</div>
        <div class="payment-content">${formatMultiline(options.bankDetails)}</div>
      </div>
      <style>
        .payment-info {
          margin-bottom: 32px;
        }
        .payment-label {
          font-size: 12px;
          color: #8792a2;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
          margin-bottom: 8px;
        }
        .payment-content {
          font-size: 14px;
          color: #425466;
          line-height: 1.5;
        }
      </style>
    ` : ''}
  `;

  const pageStyles = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif;
        color: #0a2540;
        line-height: 1.4;
        margin: 0;
        padding: 48px;
        background: white;
        font-size: 14px;
      }
      * {
        box-sizing: border-box;
      }
    </style>
  `;

  return generateEnhancedPDFHtml(`${pageStyles}${content}`, `Invoice ${invoice.number} - ${invoice.client.name}`);
}