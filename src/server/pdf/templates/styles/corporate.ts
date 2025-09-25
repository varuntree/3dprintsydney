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

function renderCorporateHeader(businessInfo: BusinessInfo, documentMeta: DocumentMeta): string {
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return `
    <div class="corporate-header">
      <div class="header-background"></div>
      <div class="header-content">
        <div class="business-section">
          ${businessInfo.logoDataUrl ? `<img src="${businessInfo.logoDataUrl}" alt="Logo" class="company-logo" />` : ''}
          <div class="business-info">
            <h1 class="business-name">${businessInfo.businessName || 'Business Name'}</h1>
            <div class="business-details">
              ${businessInfo.businessAddress ? `<div class="address">${formatMultiline(businessInfo.businessAddress)}</div>` : ''}
              <div class="contact-row">
                ${businessInfo.businessPhone ? `<span class="phone">Tel: ${businessInfo.businessPhone}</span>` : ''}
                ${businessInfo.businessEmail ? `<span class="email">Email: ${businessInfo.businessEmail}</span>` : ''}
              </div>
              ${businessInfo.abn ? `<div class="abn">ABN: ${businessInfo.abn}</div>` : ''}
            </div>
          </div>
        </div>

        <div class="document-section">
          <div class="document-badge">
            <h2 class="document-type">${documentMeta.type}</h2>
            <div class="document-number">${documentMeta.number}</div>
          </div>
          <div class="document-dates">
            <div class="date-item">
              <span class="date-label">Issue Date:</span>
              <span class="date-value">${formatDate(documentMeta.issueDate)}</span>
            </div>
            ${documentMeta.dueDate ? `
              <div class="date-item">
                <span class="date-label">Due Date:</span>
                <span class="date-value">${formatDate(documentMeta.dueDate)}</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>

    <style>
      .corporate-header {
        position: relative;
        margin: -40px -40px 40px -40px;
        padding: 30px 40px;
        background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
        color: white;
      }

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }

      .business-section {
        display: flex;
        align-items: flex-start;
        gap: 16px;
      }

      .company-logo {
        width: 60px;
        height: 60px;
        object-fit: contain;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 8px;
      }

      .business-name {
        font-size: 24px;
        font-weight: 700;
        margin: 0 0 8px 0;
        color: white;
        letter-spacing: 0.5px;
      }

      .business-details {
        font-size: 11px;
        line-height: 1.5;
        color: rgba(255, 255, 255, 0.9);
      }

      .contact-row {
        display: flex;
        gap: 20px;
        margin: 4px 0;
      }

      .document-section {
        text-align: right;
      }

      .document-badge {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        padding: 16px 20px;
        margin-bottom: 16px;
      }

      .document-type {
        font-size: 18px;
        font-weight: 700;
        margin: 0 0 8px 0;
        color: white;
        letter-spacing: 2px;
      }

      .document-number {
        font-size: 14px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.95);
      }

      .document-dates {
        font-size: 11px;
      }

      .date-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
        min-width: 180px;
      }

      .date-label {
        color: rgba(255, 255, 255, 0.8);
        font-weight: 500;
      }

      .date-value {
        color: white;
        font-weight: 600;
      }
    </style>
  `;
}

function renderCorporateClientInfo(client: any): string {
  return `
    <div class="corporate-client">
      <div class="section-header">
        <h3 class="section-title">Bill To</h3>
        <div class="section-underline"></div>
      </div>
      <div class="client-details">
        <div class="client-name">${client.name}</div>
        ${client.email ? `<div class="client-contact">Email: ${client.email}</div>` : ''}
      </div>
    </div>

    <style>
      .corporate-client {
        margin-bottom: 40px;
      }

      .section-header {
        margin-bottom: 12px;
      }

      .section-title {
        font-size: 14px;
        font-weight: 700;
        color: #1a365d;
        margin: 0 0 4px 0;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .section-underline {
        width: 40px;
        height: 3px;
        background: #1a365d;
      }

      .client-name {
        font-size: 16px;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 4px;
      }

      .client-contact {
        font-size: 12px;
        color: #4a5568;
      }
    </style>
  `;
}

function renderCorporateLineItems(lineItems: LineItem[]): string {
  return `
    <div class="corporate-items">
      <div class="section-header">
        <h3 class="section-title">Items & Services</h3>
        <div class="section-underline"></div>
      </div>

      <div class="items-table">
        <div class="table-header">
          <div class="col-description">Description</div>
          <div class="col-qty">Qty</div>
          <div class="col-rate">Rate</div>
          <div class="col-amount">Amount</div>
        </div>

        ${lineItems.map(item => `
          <div class="table-row">
            <div class="col-description">
              <div class="item-name">${item.name}</div>
              ${item.description ? `<div class="item-desc">${item.description}</div>` : ''}
            </div>
            <div class="col-qty">${item.quantity}</div>
            <div class="col-rate">$${item.unitPrice.toFixed(2)}</div>
            <div class="col-amount">$${item.total.toFixed(2)}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <style>
      .corporate-items {
        margin-bottom: 30px;
      }

      .items-table {
        border: 2px solid #1a365d;
        border-radius: 4px;
        overflow: hidden;
        margin-top: 16px;
      }

      .table-header {
        display: flex;
        background: #1a365d;
        color: white;
        font-weight: 600;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .table-row {
        display: flex;
        border-bottom: 1px solid #e2e8f0;
        background: white;
      }

      .table-row:hover {
        background: #f7fafc;
      }

      .table-row:last-child {
        border-bottom: none;
      }

      .col-description {
        flex: 1;
        padding: 12px 16px;
      }

      .col-qty, .col-rate, .col-amount {
        width: 80px;
        padding: 12px 16px;
        text-align: right;
        font-size: 11px;
      }

      .item-name {
        font-weight: 600;
        color: #2d3748;
        font-size: 12px;
        margin-bottom: 2px;
      }

      .item-desc {
        font-size: 10px;
        color: #718096;
        line-height: 1.4;
      }
    </style>
  `;
}

function renderCorporateSummary(financial: any): string {
  return `
    <div class="corporate-summary">
      <div class="summary-box">
        <div class="summary-header">
          <h4 class="summary-title">Total Summary</h4>
        </div>
        <div class="summary-content">
          <div class="summary-line">
            <span class="summary-label">Subtotal</span>
            <span class="summary-value">$${financial.subtotal.toFixed(2)}</span>
          </div>
          ${financial.tax > 0 ? `
            <div class="summary-line">
              <span class="summary-label">Tax (GST)</span>
              <span class="summary-value">$${financial.tax.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="summary-line total-line">
            <span class="summary-label">TOTAL</span>
            <span class="summary-value">$${financial.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>

    <style>
      .corporate-summary {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 40px;
      }

      .summary-box {
        width: 280px;
        border: 2px solid #1a365d;
        border-radius: 4px;
        overflow: hidden;
      }

      .summary-header {
        background: #1a365d;
        color: white;
        padding: 12px 16px;
      }

      .summary-title {
        font-size: 12px;
        font-weight: 700;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .summary-content {
        background: white;
        padding: 16px;
      }

      .summary-line {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        font-size: 12px;
      }

      .total-line {
        border-top: 2px solid #1a365d;
        margin-top: 8px;
        padding-top: 12px;
        font-weight: 700;
        font-size: 14px;
        color: #1a365d;
      }

      .summary-label {
        color: #4a5568;
        font-weight: 500;
      }

      .summary-value {
        color: #2d3748;
        font-weight: 600;
      }

      .total-line .summary-label,
      .total-line .summary-value {
        color: #1a365d;
      }
    </style>
  `;
}

export function renderCorporateQuoteHtml(quote: QuoteDetail, options?: TemplateOptions) {
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
    ${renderCorporateHeader(businessInfo, documentMeta)}
    ${renderCorporateClientInfo(quote.client)}
    ${renderCorporateLineItems(lineItems)}
    ${renderCorporateSummary({
      subtotal: quote.subtotal,
      tax: quote.taxTotal,
      total: quote.total
    })}
    ${quote.notes ? `
      <div class="corporate-notes">
        <div class="section-header">
          <h3 class="section-title">Additional Notes</h3>
          <div class="section-underline"></div>
        </div>
        <div class="notes-content">${formatMultiline(quote.notes)}</div>
      </div>
      <style>
        .corporate-notes {
          margin-bottom: 30px;
        }
        .notes-content {
          font-size: 11px;
          line-height: 1.5;
          color: #4a5568;
          margin-top: 12px;
          padding: 16px;
          background: #f7fafc;
          border-radius: 4px;
          border-left: 4px solid #1a365d;
        }
      </style>
    ` : ''}
  `;

  const pageStyles = `
    <style>
      body {
        font-family: 'Times New Roman', Times, serif;
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

export function renderCorporateInvoiceHtml(invoice: InvoiceDetail, options?: TemplateOptions) {
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
    ${renderCorporateHeader(businessInfo, documentMeta)}
    ${renderCorporateClientInfo(invoice.client)}
    ${renderCorporateLineItems(lineItems)}
    ${renderCorporateSummary({
      subtotal: invoice.subtotal,
      tax: invoice.taxTotal,
      total: invoice.total
    })}
    ${options?.bankDetails ? `
      <div class="corporate-payment">
        <div class="section-header">
          <h3 class="section-title">Payment Information</h3>
          <div class="section-underline"></div>
        </div>
        <div class="payment-content">${formatMultiline(options.bankDetails)}</div>
      </div>
      <style>
        .corporate-payment {
          margin-bottom: 30px;
        }
        .payment-content {
          font-size: 11px;
          line-height: 1.5;
          color: #4a5568;
          margin-top: 12px;
          padding: 16px;
          background: #f7fafc;
          border-radius: 4px;
          border-left: 4px solid #1a365d;
        }
      </style>
    ` : ''}
  `;

  const pageStyles = `
    <style>
      body {
        font-family: 'Times New Roman', Times, serif;
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