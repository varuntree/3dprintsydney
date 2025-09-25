import type { InvoiceDetail } from "@/server/services/invoices";
import { formatCurrency } from "@/lib/currency";
import { generateEnhancedPDFHtml } from "@/server/pdf/templates/shared/styles";
import { formatMultiline } from "@/server/pdf/templates/shared/utils";
import {
  renderHeader,
  renderClientInfo,
  renderLineItemsTable,
  renderFinancialSummary,
  renderPaymentInstructions,
  renderTermsAndConditions,
  renderPageFooter,
  type BusinessInfo,
  type DocumentMeta,
  type LineItem
} from "@/server/pdf/templates/shared/components";
import { paginateLineItems as paginateItems, DEFAULT_PAGINATION_CONFIG, willFitOnSinglePage } from "@/server/pdf/templates/shared/pagination";

type InvoiceTemplateOptions = {
  logoDataUrl?: string;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  abn?: string;
  bankDetails?: string;
};

function mapInvoiceToLineItems(invoice: InvoiceDetail): LineItem[] {
  return invoice.lines.map((line) => ({
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
}

function calculateDaysOverdue(dueDate: Date | null): number {
  if (!dueDate) return 0;
  const now = new Date();
  const due = new Date(dueDate);
  const diffTime = now.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

function formatPaymentStatus(invoice: InvoiceDetail): { label: string; urgency: 'high' | 'medium' | 'low' } {
  if (invoice.status === 'PAID') {
    return { label: 'Paid in full', urgency: 'low' };
  }

  const daysOverdue = invoice.dueDate ? calculateDaysOverdue(invoice.dueDate) : 0;

  if (invoice.status === 'OVERDUE' || daysOverdue > 0) {
    return {
      label: `Overdue by ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}`,
      urgency: 'high'
    };
  }

  if (invoice.dueDate) {
    const daysUntilDue = Math.ceil((invoice.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue <= 3) {
      return { label: `Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`, urgency: 'medium' };
    }
  }

  return { label: 'Payment pending', urgency: 'low' };
}

function renderInvoiceStatusSection(invoice: InvoiceDetail): string {
  const paymentStatus = formatPaymentStatus(invoice);
  const paymentTermsText = invoice.paymentTerms
    ? invoice.paymentTerms.days === 0
      ? `${invoice.paymentTerms.label} — due immediately`
      : `${invoice.paymentTerms.label} — ${invoice.paymentTerms.days}-day terms`
    : "Payment terms unavailable";

  const dueDateText = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString('en-AU')
    : "No due date set";

  return `
    <div class="invoice-status-section page-break-inside-avoid">
      <div class="section-card">
        <h2 class="card-title">Payment Status</h2>
        <div class="status-content">
          <div class="payment-status ${paymentStatus.urgency}">
            <span class="status-indicator"></span>
            <span class="status-text">${paymentStatus.label}</span>
          </div>
          <div class="payment-details">
            <div class="detail-row">
              <span class="detail-label">Due date:</span>
              <span class="detail-value">${dueDateText}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Terms:</span>
              <span class="detail-value">${paymentTermsText}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Balance:</span>
              <span class="detail-value balance-amount ${invoice.balanceDue > 0 ? 'outstanding' : 'paid'}">
                ${formatCurrency(invoice.balanceDue)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <style>
      .invoice-status-section {
        margin-bottom: 20px;
      }

      .status-content {
        margin-top: 12px;
      }

      .payment-status {
        display: flex;
        align-items: center;
        margin-bottom: 16px;
        padding: 12px 16px;
        border-radius: var(--border-radius);
        font-weight: 600;
        font-size: 13px;
      }

      .payment-status.high {
        background: #fee2e2;
        color: #991b1b;
      }

      .payment-status.medium {
        background: #fef3c7;
        color: #92400e;
      }

      .payment-status.low {
        background: #dcfce7;
        color: #166534;
      }

      .status-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 8px;
      }

      .payment-status.high .status-indicator {
        background: #ef4444;
      }

      .payment-status.medium .status-indicator {
        background: #f59e0b;
      }

      .payment-status.low .status-indicator {
        background: #10b981;
      }

      .payment-details {
        display: grid;
        gap: 6px;
      }

      .detail-row {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        padding: 4px 0;
      }

      .detail-label {
        color: var(--color-text-muted);
        font-weight: 500;
      }

      .detail-value {
        color: var(--color-text);
        font-weight: 500;
      }

      .balance-amount.outstanding {
        color: var(--color-danger);
        font-weight: 600;
      }

      .balance-amount.paid {
        color: var(--color-success);
        font-weight: 600;
      }
    </style>
  `;
}

function renderPaymentHistorySection(invoice: InvoiceDetail): string {
  if (!invoice.payments || invoice.payments.length === 0) {
    return '';
  }

  const paymentRows = invoice.payments
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
    .map(payment => `
      <tr>
        <td class="payment-date">${new Date(payment.paidAt).toLocaleDateString('en-AU')}</td>
        <td class="payment-method">${payment.method.replace('_', ' ')}</td>
        <td class="payment-reference">${payment.reference || '—'}</td>
        <td class="payment-amount">${formatCurrency(payment.amount)}</td>
      </tr>
    `).join('');

  const totalPaid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);

  return `
    <div class="payment-history-section page-break-inside-avoid">
      <div class="section-card">
        <h2 class="card-title">Payment History</h2>
        <div class="payment-history-content">
          <table class="payment-history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${paymentRows}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="3">Total Paid</td>
                <td class="payment-amount">${formatCurrency(totalPaid)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    <style>
      .payment-history-section {
        margin-bottom: 30px;
      }

      .payment-history-content {
        margin-top: 12px;
      }

      .payment-history-table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid var(--color-border);
        border-radius: var(--border-radius);
        overflow: hidden;
        font-size: 11px;
      }

      .payment-history-table thead th {
        background: var(--color-background-soft);
        padding: 8px 10px;
        text-align: left;
        font-weight: 600;
        color: var(--color-text-muted);
        border-bottom: 1px solid var(--color-border);
      }

      .payment-history-table thead th:last-child {
        text-align: right;
      }

      .payment-history-table tbody td {
        padding: 8px 10px;
        border-bottom: 1px solid var(--color-border);
      }

      .payment-history-table tbody tr:last-child td {
        border-bottom: none;
      }

      .payment-date {
        color: var(--color-text-muted);
      }

      .payment-method {
        text-transform: capitalize;
        color: var(--color-text);
      }

      .payment-reference {
        color: var(--color-text-muted);
        font-family: monospace;
        font-size: 10px;
      }

      .payment-amount {
        text-align: right;
        font-variant-numeric: tabular-nums;
        font-weight: 500;
        color: var(--color-text);
      }

      .payment-history-table tfoot .total-row td {
        font-weight: 600;
        background: var(--color-background-soft);
        border-top: 2px solid var(--color-border-strong);
      }
    </style>
  `;
}

export function renderInvoiceHtml(
  invoice: InvoiceDetail,
  options?: InvoiceTemplateOptions,
) {
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
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    status: invoice.status,
    total: invoice.total,
    balanceDue: invoice.balanceDue
  };

  const lineItems = mapInvoiceToLineItems(invoice);
  const hasPaymentHistory = invoice.payments && invoice.payments.length > 0;
  const isSinglePage = willFitOnSinglePage(
    lineItems.length,
    true, // financial summary
    true, // payment section
    true, // terms section
    DEFAULT_PAGINATION_CONFIG
  );

  // Default bank details if none provided
  const bankDetails = options?.bankDetails || [
    'Commonwealth Bank',
    'BSB: 067-873',
    'Account: 1772 6784',
    'Account Name: Huxley Studios',
    `Reference: ${invoice.number}`
  ].join('\n');

  let content: string;

  if (isSinglePage) {
    // Single page layout
    content = `
      ${renderHeader(businessInfo, documentMeta)}
      ${renderClientInfo(invoice.client, documentMeta)}
      ${renderInvoiceStatusSection(invoice)}
      ${renderLineItemsTable(lineItems, 1, 1)}
      ${renderFinancialSummary({
        subtotal: invoice.subtotal,
        shipping: invoice.shippingCost,
        tax: invoice.taxTotal,
        total: invoice.total,
        balanceDue: invoice.balanceDue
      })}
      ${renderPaymentInstructions(bankDetails, invoice.stripeCheckoutUrl, invoice.balanceDue)}
      ${hasPaymentHistory ? renderPaymentHistorySection(invoice) : ''}
      ${invoice.notes || invoice.terms ? `
        <div class="notes-section">
          ${invoice.notes ? `
            <div class="section-card">
              <h2 class="card-title">Notes</h2>
              <div class="notes-content">${formatMultiline(invoice.notes)}</div>
            </div>
          ` : ''}
          ${invoice.terms ? `
            <div class="section-card">
              <h2 class="card-title">Custom Terms</h2>
              <div class="terms-content">${formatMultiline(invoice.terms)}</div>
            </div>
          ` : ''}
        </div>
      ` : ''}
      ${renderTermsAndConditions()}
      ${renderPageFooter(invoice.number, invoice.total)}
    `;
  } else {
    // Multi-page layout with pagination
    const paginatedItems = paginateItems(lineItems, DEFAULT_PAGINATION_CONFIG);
    const pages = paginatedItems.map((page, index) => {
      let pageContent = '';

      // First page gets header and status info
      if (index === 0) {
        pageContent += renderHeader(businessInfo, documentMeta);
        pageContent += renderClientInfo(invoice.client, documentMeta);
        pageContent += renderInvoiceStatusSection(invoice);
      }

      // Add line items for this page
      pageContent += renderLineItemsTable(page.items, page.pageNumber, page.totalPages);

      // Last page gets financial summary and other sections
      if (page.isLastPage) {
        pageContent += renderFinancialSummary({
          subtotal: invoice.subtotal,
          shipping: invoice.shippingCost,
          tax: invoice.taxTotal,
          total: invoice.total,
          balanceDue: invoice.balanceDue
        });
        pageContent += renderPaymentInstructions(bankDetails, invoice.stripeCheckoutUrl, invoice.balanceDue);

        if (hasPaymentHistory) {
          pageContent += renderPaymentHistorySection(invoice);
        }

        if (invoice.notes || invoice.terms) {
          pageContent += `
            <div class="notes-section">
              ${invoice.notes ? `
                <div class="section-card">
                  <h2 class="card-title">Notes</h2>
                  <div class="notes-content">${formatMultiline(invoice.notes)}</div>
                </div>
              ` : ''}
              ${invoice.terms ? `
                <div class="section-card">
                  <h2 class="card-title">Custom Terms</h2>
                  <div class="terms-content">${formatMultiline(invoice.terms)}</div>
                </div>
              ` : ''}
            </div>
          `;
        }

        pageContent += renderTermsAndConditions();
      }

      pageContent += renderPageFooter(invoice.number, invoice.total, page.pageNumber, page.totalPages);

      return pageContent;
    }).join('<div class="page-break-before"></div>');

    content = pages;
  }

  const additionalStyles = `
    .notes-section {
      margin-bottom: 30px;
    }

    .notes-section .section-card {
      margin-bottom: 16px;
    }

    .notes-content,
    .terms-content {
      font-size: 11px;
      line-height: 1.4;
      color: var(--color-text);
      margin-top: 8px;
    }
  `;

  const contentWithStyles = `
    <style>
      ${additionalStyles}
    </style>
    ${content}
  `;

  return generateEnhancedPDFHtml(contentWithStyles, `Invoice ${invoice.number} - ${invoice.client.name}`);
}
