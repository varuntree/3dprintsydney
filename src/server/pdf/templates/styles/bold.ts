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

function renderBoldHeader(businessInfo: BusinessInfo, documentMeta: DocumentMeta): string {
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return `
    <div class="bold-header">
      <div class="header-banner">
        <div class="banner-content">
          <h1 class="document-type">${documentMeta.type}</h1>
          <div class="document-number">#${documentMeta.number}</div>
        </div>
        <div class="document-amount">$${documentMeta.total.toFixed(2)}</div>
      </div>

      <div class="header-details">
        <div class="business-section">
          <h2 class="section-heading">FROM</h2>
          <div class="business-name">${businessInfo.businessName || 'Business Name'}</div>
          <div class="business-info">
            ${businessInfo.businessAddress ? `<div class="address">${formatMultiline(businessInfo.businessAddress)}</div>` : ''}
            <div class="contact-info">
              ${businessInfo.businessEmail ? `<div class="contact-item">${businessInfo.businessEmail}</div>` : ''}
              ${businessInfo.businessPhone ? `<div class="contact-item">${businessInfo.businessPhone}</div>` : ''}
            </div>
            ${businessInfo.abn ? `<div class="abn">ABN: ${businessInfo.abn}</div>` : ''}
          </div>
        </div>

        <div class="document-section">
          <h2 class="section-heading">DOCUMENT DETAILS</h2>
          <div class="detail-grid">
            <div class="detail-item">
              <div class="detail-label">Issue Date</div>
              <div class="detail-value">${formatDate(documentMeta.issueDate)}</div>
            </div>
            ${documentMeta.dueDate ? `
              <div class="detail-item">
                <div class="detail-label">Due Date</div>
                <div class="detail-value">${formatDate(documentMeta.dueDate)}</div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>

    <style>
      .bold-header {
        margin-bottom: 40px;
      }

      .header-banner {
        background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
        color: white;
        padding: 32px 40px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: -40px -40px 32px -40px;
        position: relative;
        overflow: hidden;
      }

      .header-banner::before {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        width: 100px;
        height: 100%;
        background: linear-gradient(45deg, transparent 0%, rgba(255,255,255,0.05) 100%);
      }

      .document-type {
        font-size: 36px;
        font-weight: 900;
        margin: 0 0 8px 0;
        text-transform: uppercase;
        letter-spacing: 2px;
        position: relative;
      }

      .document-number {
        font-size: 18px;
        font-weight: 600;
        opacity: 0.9;
        position: relative;
      }

      .document-amount {
        font-size: 42px;
        font-weight: 900;
        position: relative;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      }

      .header-details {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 40px;
      }

      .section-heading {
        font-size: 16px;
        font-weight: 900;
        color: #1a202c;
        margin: 0 0 16px 0;
        text-transform: uppercase;
        letter-spacing: 2px;
        border-bottom: 4px solid #4299e1;
        padding-bottom: 8px;
        display: inline-block;
      }

      .business-name {
        font-size: 24px;
        font-weight: 800;
        color: #1a202c;
        margin-bottom: 12px;
      }

      .business-info {
        font-size: 13px;
        color: #4a5568;
        line-height: 1.5;
      }

      .address {
        margin-bottom: 8px;
      }

      .contact-info {
        margin-bottom: 8px;
      }

      .contact-item {
        margin-bottom: 2px;
      }

      .abn {
        font-weight: 600;
        color: #2d3748;
      }

      .detail-grid {
        display: grid;
        gap: 16px;
      }

      .detail-item {
        display: flex;
        flex-direction: column;
      }

      .detail-label {
        font-size: 12px;
        font-weight: 700;
        color: #718096;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 4px;
      }

      .detail-value {
        font-size: 15px;
        font-weight: 600;
        color: #1a202c;
      }
    </style>
  `;
}

function renderBoldClient(client: any): string {
  return `
    <div class="bold-client">
      <h2 class="section-heading">BILL TO</h2>
      <div class="client-details">
        <div class="client-name">${client.name}</div>
        ${client.email ? `<div class="client-email">${client.email}</div>` : ''}
      </div>
    </div>

    <style>
      .bold-client {
        margin-bottom: 40px;
      }

      .client-details {
        background: #f7fafc;
        border-left: 6px solid #4299e1;
        padding: 20px;
        border-radius: 0 8px 8px 0;
      }

      .client-name {
        font-size: 20px;
        font-weight: 700;
        color: #1a202c;
        margin-bottom: 6px;
      }

      .client-email {
        font-size: 14px;
        color: #4a5568;
        font-weight: 500;
      }
    </style>
  `;
}

function renderBoldItems(lineItems: LineItem[]): string {
  return `
    <div class="bold-items">
      <h2 class="section-heading">ITEMS & SERVICES</h2>

      <div class="items-container">
        ${lineItems.map(item => `
          <div class="item-card">
            <div class="item-header">
              <h3 class="item-name">${item.name}</h3>
              <div class="item-total">$${item.total.toFixed(2)}</div>
            </div>
            ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
            <div class="item-footer">
              <div class="item-details">
                <span class="qty-badge">${item.quantity}x</span>
                <span class="price-detail">@ $${item.unitPrice.toFixed(2)} each</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <style>
      .bold-items {
        margin-bottom: 40px;
      }

      .items-container {
        display: grid;
        gap: 16px;
        margin-top: 20px;
      }

      .item-card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        border-left: 4px solid #4299e1;
      }

      .item-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 8px;
      }

      .item-name {
        font-size: 18px;
        font-weight: 700;
        color: #1a202c;
        margin: 0;
        flex: 1;
        margin-right: 16px;
      }

      .item-total {
        font-size: 20px;
        font-weight: 800;
        color: #4299e1;
      }

      .item-description {
        font-size: 13px;
        color: #718096;
        line-height: 1.5;
        margin-bottom: 12px;
      }

      .item-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .item-details {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .qty-badge {
        background: #1a202c;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
      }

      .price-detail {
        font-size: 12px;
        color: #4a5568;
        font-weight: 500;
      }
    </style>
  `;
}

function renderBoldSummary(financial: any): string {
  return `
    <div class="bold-summary">
      <div class="summary-card">
        <h2 class="section-heading">TOTAL SUMMARY</h2>

        <div class="summary-content">
          <div class="summary-items">
            <div class="summary-row">
              <span class="summary-label">SUBTOTAL</span>
              <span class="summary-value">$${financial.subtotal.toFixed(2)}</span>
            </div>
            ${financial.tax > 0 ? `
              <div class="summary-row">
                <span class="summary-label">TAX (GST)</span>
                <span class="summary-value">$${financial.tax.toFixed(2)}</span>
              </div>
            ` : ''}
          </div>

          <div class="total-section">
            <div class="total-row">
              <span class="total-label">AMOUNT DUE</span>
              <span class="total-amount">$${financial.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <style>
      .bold-summary {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 40px;
      }

      .summary-card {
        width: 350px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        overflow: hidden;
        border: 1px solid #e2e8f0;
      }

      .summary-card .section-heading {
        margin: 0;
        padding: 20px 24px;
        background: #f7fafc;
        border-bottom: 2px solid #4299e1;
        font-size: 14px;
      }

      .summary-content {
        padding: 24px;
      }

      .summary-items {
        margin-bottom: 20px;
      }

      .summary-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 12px;
        font-size: 14px;
      }

      .summary-label {
        color: #4a5568;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .summary-value {
        color: #1a202c;
        font-weight: 600;
      }

      .total-section {
        border-top: 3px solid #1a202c;
        padding-top: 16px;
        background: #f7fafc;
        margin: 0 -24px -24px -24px;
        padding-left: 24px;
        padding-right: 24px;
        padding-bottom: 24px;
      }

      .total-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .total-label {
        font-size: 16px;
        font-weight: 800;
        color: #1a202c;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .total-amount {
        font-size: 28px;
        font-weight: 900;
        color: #1a202c;
      }
    </style>
  `;
}

export function renderBoldQuoteHtml(quote: QuoteDetail, options?: TemplateOptions) {
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
    ${renderBoldHeader(businessInfo, documentMeta)}
    ${renderBoldClient(quote.client)}
    ${renderBoldItems(lineItems)}
    ${renderBoldSummary({
      subtotal: quote.subtotal,
      tax: quote.taxTotal,
      total: quote.total
    })}
  `;

  const pageStyles = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        color: #1a202c;
        line-height: 1.4;
        margin: 0;
        padding: 40px;
        background: #f8fafc;
      }
      * {
        box-sizing: border-box;
      }
    </style>
  `;

  return generateEnhancedPDFHtml(`${pageStyles}${content}`, `Quote ${quote.number} - ${quote.client.name}`);
}

export function renderBoldInvoiceHtml(invoice: InvoiceDetail, options?: TemplateOptions) {
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
    ${renderBoldHeader(businessInfo, documentMeta)}
    ${renderBoldClient(invoice.client)}
    ${renderBoldItems(lineItems)}
    ${renderBoldSummary({
      subtotal: invoice.subtotal,
      tax: invoice.taxTotal,
      total: invoice.total
    })}
    ${options?.bankDetails ? `
      <div class="payment-section">
        <h2 class="section-heading">PAYMENT DETAILS</h2>
        <div class="payment-card">
          <div class="payment-content">${formatMultiline(options.bankDetails)}</div>
        </div>
      </div>
      <style>
        .payment-section {
          margin-bottom: 40px;
        }
        .payment-card {
          background: #f7fafc;
          border-left: 6px solid #4299e1;
          padding: 20px;
          border-radius: 0 8px 8px 0;
        }
        .payment-content {
          font-size: 13px;
          color: #4a5568;
          line-height: 1.6;
          font-weight: 500;
        }
      </style>
    ` : ''}
  `;

  const pageStyles = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        color: #1a202c;
        line-height: 1.4;
        margin: 0;
        padding: 40px;
        background: #f8fafc;
      }
      * {
        box-sizing: border-box;
      }
    </style>
  `;

  return generateEnhancedPDFHtml(`${pageStyles}${content}`, `Invoice ${invoice.number} - ${invoice.client.name}`);
}