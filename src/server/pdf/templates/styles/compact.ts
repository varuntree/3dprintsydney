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

function renderCompactHeader(businessInfo: BusinessInfo, documentMeta: DocumentMeta): string {
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return `
    <div class="compact-header">
      <div class="header-left">
        <div class="business-name">${businessInfo.businessName || 'Business Name'}</div>
        <div class="business-contact">
          ${businessInfo.businessEmail ? `${businessInfo.businessEmail}` : ''}
          ${businessInfo.businessPhone ? ` • ${businessInfo.businessPhone}` : ''}
        </div>
        ${businessInfo.abn ? `<div class="abn">ABN: ${businessInfo.abn}</div>` : ''}
      </div>

      <div class="header-center">
        <div class="client-name">${documentMeta.type === 'QUOTE' ? 'TO: ' : 'BILL TO: '}</div>
      </div>

      <div class="header-right">
        <div class="doc-type">${documentMeta.type}</div>
        <div class="doc-number">${documentMeta.number}</div>
        <div class="doc-date">${formatDate(documentMeta.issueDate)}</div>
        ${documentMeta.dueDate ? `<div class="due-date">Due: ${formatDate(documentMeta.dueDate)}</div>` : ''}
      </div>
    </div>

    <style>
      .compact-header {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 20px;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 2px solid #2d3748;
        font-size: 9px;
      }

      .business-name {
        font-size: 14px;
        font-weight: 700;
        color: #1a202c;
        margin-bottom: 2px;
      }

      .business-contact, .abn {
        color: #4a5568;
        font-size: 8px;
        line-height: 1.2;
      }

      .client-name {
        font-size: 10px;
        font-weight: 600;
        color: #2d3748;
        text-align: center;
      }

      .header-right {
        text-align: right;
      }

      .doc-type {
        font-size: 12px;
        font-weight: 700;
        color: #1a202c;
        margin-bottom: 2px;
      }

      .doc-number {
        font-size: 10px;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 2px;
      }

      .doc-date, .due-date {
        font-size: 8px;
        color: #4a5568;
        line-height: 1.2;
      }
    </style>
  `;
}

function renderCompactItems(lineItems: LineItem[], financial: any): string {
  return `
    <div class="compact-items">
      <table class="items-table">
        <thead>
          <tr>
            <th class="col-desc">Description</th>
            <th class="col-qty">Qty</th>
            <th class="col-price">Price</th>
            <th class="col-total">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lineItems.map(item => `
            <tr>
              <td class="col-desc">
                <div class="item-name">${item.name}</div>
                ${item.description ? `<div class="item-desc">${item.description}</div>` : ''}
              </td>
              <td class="col-qty">${item.quantity}</td>
              <td class="col-price">$${item.unitPrice.toFixed(2)}</td>
              <td class="col-total">$${item.total.toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr class="spacer-row"><td colspan="4"></td></tr>
          <tr class="summary-row">
            <td colspan="3" class="summary-label">Subtotal:</td>
            <td class="summary-value">$${financial.subtotal.toFixed(2)}</td>
          </tr>
          ${financial.tax > 0 ? `
            <tr class="summary-row">
              <td colspan="3" class="summary-label">Tax:</td>
              <td class="summary-value">$${financial.tax.toFixed(2)}</td>
            </tr>
          ` : ''}
          <tr class="total-row">
            <td colspan="3" class="total-label">TOTAL:</td>
            <td class="total-value">$${financial.total.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <style>
      .compact-items {
        margin-bottom: 20px;
      }

      .items-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 9px;
      }

      .items-table th {
        background: #f7fafc;
        border: 1px solid #e2e8f0;
        padding: 6px 8px;
        text-align: left;
        font-weight: 600;
        color: #2d3748;
        font-size: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .items-table td {
        border: 1px solid #e2e8f0;
        padding: 6px 8px;
        vertical-align: top;
      }

      .col-desc {
        width: 50%;
      }

      .col-qty, .col-price, .col-total {
        width: 16.67%;
        text-align: right;
      }

      .item-name {
        font-weight: 600;
        color: #1a202c;
        font-size: 9px;
        margin-bottom: 1px;
      }

      .item-desc {
        color: #718096;
        font-size: 8px;
        line-height: 1.3;
      }

      .spacer-row td {
        border: none;
        padding: 4px 0;
      }

      .summary-row td, .total-row td {
        border-left: none;
        border-right: none;
        border-bottom: 1px solid #e2e8f0;
        padding: 4px 8px;
      }

      .total-row td {
        border-bottom: 2px solid #2d3748;
        font-weight: 700;
        font-size: 10px;
      }

      .summary-label, .total-label {
        text-align: right;
        color: #4a5568;
        font-weight: 500;
      }

      .summary-value, .total-value {
        text-align: right;
        color: #1a202c;
        font-weight: 600;
      }

      .total-label, .total-value {
        color: #1a202c;
      }
    </style>
  `;
}

function renderCompactFooter(client: any, notes?: string, bankDetails?: string): string {
  return `
    <div class="compact-footer">
      <div class="footer-section">
        <div class="client-section">
          <div class="section-title">Client:</div>
          <div class="client-name">${client.name}</div>
          ${client.email ? `<div class="client-email">${client.email}</div>` : ''}
        </div>
      </div>

      ${notes ? `
        <div class="footer-section">
          <div class="section-title">Notes:</div>
          <div class="notes-text">${formatMultiline(notes)}</div>
        </div>
      ` : ''}

      ${bankDetails ? `
        <div class="footer-section">
          <div class="section-title">Payment:</div>
          <div class="payment-text">${formatMultiline(bankDetails)}</div>
        </div>
      ` : ''}
    </div>

    <style>
      .compact-footer {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-top: 20px;
        padding-top: 12px;
        border-top: 1px solid #e2e8f0;
        font-size: 8px;
      }

      .section-title {
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .client-name {
        font-weight: 600;
        color: #1a202c;
        font-size: 9px;
        margin-bottom: 2px;
      }

      .client-email, .notes-text, .payment-text {
        color: #4a5568;
        line-height: 1.3;
      }
    </style>
  `;
}

export function renderCompactQuoteHtml(quote: QuoteDetail, options?: TemplateOptions) {
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
    ${renderCompactHeader(businessInfo, documentMeta)}
    ${renderCompactItems(lineItems, {
      subtotal: quote.subtotal,
      tax: quote.taxTotal,
      total: quote.total
    })}
    ${renderCompactFooter(quote.client, quote.notes, options?.bankDetails)}
  `;

  const pageStyles = `
    <style>
      body {
        font-family: Arial, Helvetica, sans-serif;
        color: #1a202c;
        line-height: 1.2;
        margin: 0;
        padding: 20px;
        background: white;
        font-size: 9px;
      }
      * {
        box-sizing: border-box;
      }
    </style>
  `;

  return generateEnhancedPDFHtml(`${pageStyles}${content}`, `Quote ${quote.number} - ${quote.client.name}`);
}

export function renderCompactInvoiceHtml(invoice: InvoiceDetail, options?: TemplateOptions) {
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
    ${renderCompactHeader(businessInfo, documentMeta)}
    ${renderCompactItems(lineItems, {
      subtotal: invoice.subtotal,
      tax: invoice.taxTotal,
      total: invoice.total
    })}
    ${renderCompactFooter(invoice.client, invoice.notes, options?.bankDetails)}
  `;

  const pageStyles = `
    <style>
      body {
        font-family: Arial, Helvetica, sans-serif;
        color: #1a202c;
        line-height: 1.2;
        margin: 0;
        padding: 20px;
        background: white;
        font-size: 9px;
      }
      * {
        box-sizing: border-box;
      }
    </style>
  `;

  return generateEnhancedPDFHtml(`${pageStyles}${content}`, `Invoice ${invoice.number} - ${invoice.client.name}`);
}