import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import { escapeHtml, formatMultiline } from "./utils";

export type BusinessInfo = {
  logoDataUrl?: string;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  abn?: string;
  bankDetails?: string;
};

export type DocumentMeta = {
  number: string;
  type: 'QUOTE' | 'INVOICE';
  issueDate: Date;
  dueDate?: Date | null;
  expiryDate?: Date | null;
  status: string;
  total: number;
  balanceDue?: number;
};

export type ClientInfo = {
  id: number;
  name: string;
};

export type LineItem = {
  id: number;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  discountType: string;
  discountValue: number;
};

// Modern professional header with asymmetrical layout
export function renderHeader(businessInfo: BusinessInfo, meta: DocumentMeta): string {
  const formattedIssueDate = formatDate(meta.issueDate.toISOString());
  const formattedDueDate = meta.dueDate ? formatDate(meta.dueDate.toISOString()) : "—";
  const formattedExpiryDate = meta.expiryDate ? formatDate(meta.expiryDate.toISOString()) : "—";

  const statusLabel = meta.type === 'INVOICE'
    ? (meta.status === 'PAID' ? 'PAID' : meta.status === 'OVERDUE' ? 'OVERDUE' : 'PENDING')
    : (meta.status === 'ACCEPTED' ? 'ACCEPTED' : meta.status === 'DECLINED' ? 'DECLINED' : 'PENDING');

  return `
    <div class="modern-header page-break-inside-avoid">
      <!-- Brand Hero Section -->
      <div class="brand-hero">
        <div class="brand-identity">
          ${businessInfo.logoDataUrl ?
            `<div class="brand-logo">
              <img src="${businessInfo.logoDataUrl}" alt="Logo" class="logo-image" />
            </div>` :
            `<div class="brand-logo-placeholder">
              <span class="logo-initials">${escapeHtml(businessInfo.businessName?.substring(0, 2) || '3D')}</span>
            </div>`
          }
          <div class="brand-info">
            <h1 class="company-name">${escapeHtml(businessInfo.businessName || '3D Print Sydney')}</h1>
            <div class="company-tagline">Professional 3D Printing Services</div>
          </div>
        </div>

        <!-- Document Type & Status -->
        <div class="document-badge">
          <div class="doc-type">${meta.type}</div>
          <div class="status-indicator status-${statusLabel.toLowerCase()}">${statusLabel}</div>
        </div>
      </div>

      <!-- Document Meta Card -->
      <div class="meta-card card">
        <div class="card-body">
          <div class="meta-grid">
            <!-- Left Column -->
            <div class="meta-column">
              <div class="meta-item">
                <div class="meta-label">${meta.type} Number</div>
                <div class="meta-value font-semibold">${escapeHtml(meta.number)}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">Issue Date</div>
                <div class="meta-value">${formattedIssueDate}</div>
              </div>
              ${meta.type === 'INVOICE' && meta.dueDate ? `
                <div class="meta-item">
                  <div class="meta-label">Due Date</div>
                  <div class="meta-value text-secondary">${formattedDueDate}</div>
                </div>
              ` : ''}
              ${meta.type === 'QUOTE' && meta.expiryDate ? `
                <div class="meta-item">
                  <div class="meta-label">Valid Until</div>
                  <div class="meta-value text-secondary">${formattedExpiryDate}</div>
                </div>
              ` : ''}
            </div>

            <!-- Right Column -->
            <div class="meta-column">
              <div class="total-section">
                <div class="total-label">Total Amount</div>
                <div class="total-value">${formatCurrency(meta.total)}</div>
              </div>
              ${meta.balanceDue !== undefined ? `
                <div class="balance-section">
                  <div class="balance-label">Amount Due</div>
                  <div class="balance-value ${meta.balanceDue > 0 ? 'outstanding' : 'paid'}">
                    ${formatCurrency(meta.balanceDue)}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- Business Details Card -->
      <div class="business-card card">
        <div class="card-body">
          <div class="business-details-grid">
            ${businessInfo.businessAddress ? `
              <div class="detail-group">
                <div class="detail-icon">📍</div>
                <div class="detail-content">
                  <div class="detail-label">Address</div>
                  <div class="detail-value">${escapeHtml(businessInfo.businessAddress.replace(/\n/g, '<br>'))}</div>
                </div>
              </div>
            ` : ''}
            ${businessInfo.businessPhone ? `
              <div class="detail-group">
                <div class="detail-icon">📞</div>
                <div class="detail-content">
                  <div class="detail-label">Phone</div>
                  <div class="detail-value">${escapeHtml(businessInfo.businessPhone)}</div>
                </div>
              </div>
            ` : ''}
            ${businessInfo.businessEmail ? `
              <div class="detail-group">
                <div class="detail-icon">✉️</div>
                <div class="detail-content">
                  <div class="detail-label">Email</div>
                  <div class="detail-value">${escapeHtml(businessInfo.businessEmail)}</div>
                </div>
              </div>
            ` : ''}
            ${businessInfo.abn ? `
              <div class="detail-group">
                <div class="detail-icon">🏢</div>
                <div class="detail-content">
                  <div class="detail-label">ABN</div>
                  <div class="detail-value">${escapeHtml(businessInfo.abn)}</div>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

// Modern client information card
export function renderClientInfo(client: ClientInfo, meta: DocumentMeta): string {
  const actionText = meta.type === 'QUOTE' ? 'Prepared for' : 'Bill to';

  return `
    <div class="client-card card page-break-inside-avoid">
      <div class="card-header">
        <div class="client-header-content">
          <div class="client-badge">
            <div class="client-avatar">${escapeHtml(client.name.substring(0, 2).toUpperCase())}</div>
            <div class="client-info">
              <div class="client-label">${actionText}</div>
              <div class="client-name">${escapeHtml(client.name)}</div>
            </div>
          </div>
          <div class="document-summary">
            <div class="summary-item">
              <div class="summary-label">Document</div>
              <div class="summary-value">${escapeHtml(meta.number)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Modern line items section with card-based design
export function renderLineItemsTable(items: LineItem[], currentPage: number, totalPages: number): string {
  const itemCards = items.map(item => {
    const quantity = Number.isInteger(item.quantity) ? item.quantity.toString() : item.quantity.toFixed(2);
    const description = item.description.trim() ? escapeHtml(item.description) : '';
    const discountDisplay = item.discountType === 'PERCENT'
      ? `${item.discountValue.toFixed(1)}%`
      : item.discountType === 'FIXED'
        ? formatCurrency(item.discountValue)
        : '—';

    const hasDiscount = item.discountType !== 'NONE' && item.discountValue > 0;

    return `
      <div class="item-card">
        <div class="item-header">
          <div class="item-main">
            <h4 class="item-name">${escapeHtml(item.name)}</h4>
            ${description ? `<p class="item-description">${description}</p>` : ''}
          </div>
          <div class="item-total-display">
            <div class="item-total-amount">${formatCurrency(item.total)}</div>
          </div>
        </div>
        <div class="item-details">
          <div class="detail-row">
            <div class="detail-group">
              <span class="detail-label">Quantity</span>
              <span class="detail-value">${quantity} ${escapeHtml(item.unit)}</span>
            </div>
            <div class="detail-group">
              <span class="detail-label">Unit Price</span>
              <span class="detail-value">${formatCurrency(item.unitPrice)}</span>
            </div>
            ${hasDiscount ? `
              <div class="detail-group discount-info">
                <span class="detail-label">Discount</span>
                <span class="detail-value discount-value">${discountDisplay}</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="items-section card">
      <div class="card-header">
        <div class="section-header">
          <h2 class="section-title">Items & Services</h2>
          <div class="section-meta">
            <span class="items-count">${items.length} item${items.length !== 1 ? 's' : ''}</span>
            ${totalPages > 1 ? `<span class="page-indicator">Page ${currentPage} of ${totalPages}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="card-body">
        <div class="items-list">
          ${itemCards}
        </div>
        ${totalPages > 1 && currentPage < totalPages ? `
          <div class="page-continuation">
            <div class="continuation-indicator">
              <span class="continuation-text">Continued on next page</span>
              <div class="continuation-progress">
                <div class="progress-bar" style="width: ${(currentPage / totalPages) * 100}%"></div>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// Modern financial summary section
export function renderFinancialSummary(totals: {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  balanceDue?: number;
}): string {
  const lineItems = [
    { label: 'Subtotal', amount: totals.subtotal, show: true },
    { label: 'Shipping', amount: totals.shipping, show: totals.shipping > 0 },
    { label: 'Tax (GST)', amount: totals.tax, show: totals.tax > 0 }
  ];

  return `
    <div class="financial-summary card">
      <div class="card-body">
        <div class="summary-content">
          <div class="summary-lines">
            ${lineItems.filter(item => item.show).map(item => `
              <div class="summary-line">
                <span class="summary-label">${item.label}</span>
                <span class="summary-amount">${formatCurrency(item.amount)}</span>
              </div>
            `).join('')}
          </div>

          <div class="summary-divider"></div>

          <div class="total-section">
            <div class="total-line">
              <span class="total-label">Total</span>
              <span class="total-amount">${formatCurrency(totals.total)}</span>
            </div>
            ${totals.balanceDue !== undefined ? `
              <div class="balance-line">
                <span class="balance-label">Amount Due</span>
                <span class="balance-amount ${totals.balanceDue > 0 ? 'outstanding' : 'paid'}">
                  ${formatCurrency(totals.balanceDue)}
                </span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

// Modern payment instructions for invoices
export function renderPaymentInstructions(bankDetails: string, stripeUrl?: string | null, balanceDue?: number): string {
  const bankLines = bankDetails
    ? bankDetails.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
    : [
        'Commonwealth Bank',
        'BSB: 067-873',
        'Account: 1772 6784',
        'Account Name: Huxley Studios'
      ];

  return `
    <div class="payment-section card">
      <div class="card-header">
        <h2 class="section-title">Payment Options</h2>
        ${balanceDue && balanceDue > 0 ? `
          <div class="payment-amount-badge">
            <span class="badge-label">Amount Due</span>
            <span class="badge-amount">${formatCurrency(balanceDue)}</span>
          </div>
        ` : ''}
      </div>
      <div class="card-body">
        <div class="payment-methods-grid">
          <!-- Bank Transfer Card -->
          <div class="payment-card bank-transfer">
            <div class="payment-card-header">
              <div class="payment-icon">🏦</div>
              <h3 class="payment-title">Bank Transfer</h3>
            </div>
            <div class="payment-card-body">
              <div class="bank-details-grid">
                ${bankLines.map(line => {
                  const [label, ...valueParts] = line.split(':');
                  if (valueParts.length > 0) {
                    return `
                      <div class="bank-detail-row">
                        <span class="bank-label">${escapeHtml(label.trim())}</span>
                        <span class="bank-value">${escapeHtml(valueParts.join(':').trim())}</span>
                      </div>
                    `;
                  } else {
                    return `
                      <div class="bank-detail-row single">
                        <span class="bank-value">${escapeHtml(line)}</span>
                      </div>
                    `;
                  }
                }).join('')}
              </div>
              <div class="payment-note">
                <div class="note-icon">💡</div>
                <div class="note-text">
                  <strong>Payment Reference:</strong> Please include your invoice number to ensure quick processing.
                </div>
              </div>
            </div>
          </div>

          <!-- Online Payment Card -->
          ${stripeUrl && balanceDue && balanceDue > 0 ? `
            <div class="payment-card online-payment">
              <div class="payment-card-header">
                <div class="payment-icon">💳</div>
                <h3 class="payment-title">Pay Online</h3>
              </div>
              <div class="payment-card-body">
                <div class="online-benefits">
                  <div class="benefit-item">✓ Instant payment confirmation</div>
                  <div class="benefit-item">✓ Secure encryption via Stripe</div>
                  <div class="benefit-item">✓ Credit & debit cards accepted</div>
                </div>
                <a href="${stripeUrl}" class="payment-button-modern">
                  <span class="button-text">Pay ${formatCurrency(balanceDue)} Now</span>
                  <span class="button-icon">→</span>
                </a>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// Terms and conditions footer
export function renderTermsAndConditions(customTerms?: string): string {
  const standardTerms = [
    'Payment is required before production unless otherwise agreed in writing.',
    'We manufacture from supplied files; ensure models are production ready for their intended purpose.',
    'Tolerances, finishes, and colours may vary depending on material and printer selection.',
    'All prices include GST unless otherwise stated.'
  ];

  return `
    <div class="terms-section">
      <h2 class="section-title">Terms & Conditions</h2>
      ${customTerms ? `
        <div class="custom-terms">
          ${formatMultiline(customTerms)}
        </div>
        <div class="terms-separator"></div>
      ` : ''}
      <div class="standard-terms">
        ${standardTerms.map(term => `<div class="term-item">• ${term}</div>`).join('')}
      </div>
    </div>
  `;
}

// Modern page footer with document info
export function renderPageFooter(documentNumber: string, totalAmount: number, pageNumber?: number, totalPages?: number): string {
  return `
    <footer class="modern-footer">
      <div class="footer-content-modern">
        <div class="footer-branding">
          <div class="footer-logo">
            <span class="brand-mark">3D</span>
          </div>
          <div class="footer-info">
            <div class="document-reference">
              <span class="ref-label">Document</span>
              <span class="ref-value">${escapeHtml(documentNumber)}</span>
            </div>
            <div class="document-total-footer">
              <span class="total-label">Total</span>
              <span class="total-value">${formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
        ${pageNumber && totalPages ? `
          <div class="footer-pagination">
            <div class="pagination-info">
              <span class="page-current">${pageNumber}</span>
              <span class="page-separator">of</span>
              <span class="page-total">${totalPages}</span>
            </div>
            <div class="pagination-bar">
              <div class="pagination-progress" style="width: ${(pageNumber / totalPages) * 100}%"></div>
            </div>
          </div>
        ` : ''}
      </div>
      <div class="footer-divider"></div>
      <div class="footer-tagline">
        Professional 3D Printing Services • Sydney, Australia
      </div>
    </footer>
  `;
}