import type { QuoteDetail } from "@/server/services/quotes";
import { generateEnhancedPDFHtml } from "@/server/pdf/templates/shared/styles";
import { formatMultiline } from "@/server/pdf/templates/shared/utils";
import {
  renderHeader,
  renderClientInfo,
  renderLineItemsTable,
  renderFinancialSummary,
  renderTermsAndConditions,
  renderPageFooter,
  type BusinessInfo,
  type DocumentMeta,
  type LineItem
} from "@/server/pdf/templates/shared/components";
import { paginateLineItems as paginateItems, DEFAULT_PAGINATION_CONFIG, willFitOnSinglePage } from "@/server/pdf/templates/shared/pagination";

type QuoteTemplateOptions = {
  logoDataUrl?: string;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  abn?: string;
  bankDetails?: string;
};

function mapQuoteToLineItems(quote: QuoteDetail): LineItem[] {
  return quote.lines.map((line) => ({
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

function renderQuoteIntroSection(quote: QuoteDetail): string {
  const paymentTermsText = quote.paymentTerms
    ? quote.paymentTerms.days === 0
      ? `${quote.paymentTerms.label} — due on acceptance`
      : `${quote.paymentTerms.label} — ${quote.paymentTerms.days}-day terms`
    : "Payment terms unavailable";

  const expiryText = quote.expiryDate
    ? `Valid until ${new Date(quote.expiryDate).toLocaleDateString('en-AU')}`
    : "No expiry date set";

  return `
    <div class="quote-intro-section page-break-inside-avoid">
      <div class="section-card">
        <h2 class="card-title">Quote Summary</h2>
        <div class="quote-summary-grid">
          <div class="summary-item">
            <span class="summary-label">Items:</span>
            <span class="summary-value">${quote.lines.length} item${quote.lines.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Validity:</span>
            <span class="summary-value">${expiryText}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Payment:</span>
            <span class="summary-value">${paymentTermsText}</span>
          </div>
        </div>
      </div>
    </div>

    <style>
      .quote-intro-section {
        margin-bottom: 20px;
      }

      .quote-summary-grid {
        display: grid;
        gap: 8px;
      }

      .summary-item {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        padding: 4px 0;
      }

      .summary-label {
        color: var(--color-text-muted);
        font-weight: 500;
      }

      .summary-value {
        color: var(--color-text);
        font-weight: 500;
      }
    </style>
  `;
}

function renderQuoteNextStepsSection(bankDetails?: string): string {
  const nextStepsInfo = [
    "Review the items and pricing in this quote carefully",
    "Contact us if you have any questions or need modifications",
    "When ready to proceed, approve this quote to begin production",
    "Payment will be required before work commences"
  ];

  const bankLines = bankDetails
    ? bankDetails.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
    : [];

  return `
    <div class="next-steps-section page-break-inside-avoid">
      <div class="section-card">
        <h2 class="card-title">Next Steps</h2>
        <div class="steps-content">
          <div class="steps-list">
            ${nextStepsInfo.map((step, index) =>
              `<div class="step-item">
                <span class="step-number">${index + 1}.</span>
                <span class="step-text">${step}</span>
              </div>`
            ).join('')}
          </div>

          ${bankLines.length > 0 ? `
            <div class="contact-info">
              <h3>Contact Information</h3>
              ${bankLines.map(line => `<div class="contact-line">${formatMultiline(line)}</div>`).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    </div>

    <style>
      .next-steps-section {
        margin-bottom: 30px;
      }

      .steps-content {
        margin-top: 12px;
      }

      .steps-list {
        margin-bottom: 16px;
      }

      .step-item {
        display: flex;
        align-items: flex-start;
        margin-bottom: 8px;
        font-size: 11px;
        line-height: 1.4;
      }

      .step-number {
        color: var(--color-primary);
        font-weight: 600;
        margin-right: 8px;
        min-width: 16px;
      }

      .step-text {
        color: var(--color-text);
        flex: 1;
      }

      .contact-info h3 {
        font-size: 12px;
        font-weight: 600;
        color: var(--color-text);
        margin: 0 0 8px 0;
        padding-top: 16px;
        border-top: 1px solid var(--color-border);
      }

      .contact-line {
        font-size: 11px;
        color: var(--color-text-muted);
        margin-bottom: 2px;
      }
    </style>
  `;
}

export function renderQuoteHtml(quote: QuoteDetail, options?: QuoteTemplateOptions) {
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
    issueDate: quote.issueDate,
    expiryDate: quote.expiryDate,
    status: quote.status,
    total: quote.total
  };

  const lineItems = mapQuoteToLineItems(quote);
  const isSinglePage = willFitOnSinglePage(lineItems.length, true, false, true);

  let content: string;

  if (isSinglePage) {
    // Single page layout
    content = `
      ${renderHeader(businessInfo, documentMeta)}
      ${renderClientInfo(quote.client, documentMeta)}
      ${renderQuoteIntroSection(quote)}
      ${renderLineItemsTable(lineItems, 1, 1)}
      ${renderFinancialSummary({
        subtotal: quote.subtotal,
        shipping: quote.shippingCost,
        tax: quote.taxTotal,
        total: quote.total
      })}
      ${renderQuoteNextStepsSection(options?.bankDetails)}
      ${quote.notes || quote.terms ? `
        <div class="notes-section">
          ${quote.notes ? `
            <div class="section-card">
              <h2 class="card-title">Notes</h2>
              <div class="notes-content">${formatMultiline(quote.notes)}</div>
            </div>
          ` : ''}
          ${quote.terms ? `
            <div class="section-card">
              <h2 class="card-title">Custom Terms</h2>
              <div class="terms-content">${formatMultiline(quote.terms)}</div>
            </div>
          ` : ''}
        </div>
      ` : ''}
      ${renderTermsAndConditions()}
      ${renderPageFooter(quote.number, quote.total)}
    `;
  } else {
    // Multi-page layout with pagination
    const paginatedItems = paginateItems(lineItems, DEFAULT_PAGINATION_CONFIG);
    const pages = paginatedItems.map((page, index) => {
      let pageContent = '';

      // First page gets header and client info
      if (index === 0) {
        pageContent += renderHeader(businessInfo, documentMeta);
        pageContent += renderClientInfo(quote.client, documentMeta);
        pageContent += renderQuoteIntroSection(quote);
      }

      // Add line items for this page
      pageContent += renderLineItemsTable(page.items, page.pageNumber, page.totalPages);

      // Last page gets financial summary and other sections
      if (page.isLastPage) {
        pageContent += renderFinancialSummary({
          subtotal: quote.subtotal,
          shipping: quote.shippingCost,
          tax: quote.taxTotal,
          total: quote.total
        });
        pageContent += renderQuoteNextStepsSection(options?.bankDetails);

        if (quote.notes || quote.terms) {
          pageContent += `
            <div class="notes-section">
              ${quote.notes ? `
                <div class="section-card">
                  <h2 class="card-title">Notes</h2>
                  <div class="notes-content">${formatMultiline(quote.notes)}</div>
                </div>
              ` : ''}
              ${quote.terms ? `
                <div class="section-card">
                  <h2 class="card-title">Custom Terms</h2>
                  <div class="terms-content">${formatMultiline(quote.terms)}</div>
                </div>
              ` : ''}
            </div>
          `;
        }

        pageContent += renderTermsAndConditions();
      }

      pageContent += renderPageFooter(quote.number, quote.total, page.pageNumber, page.totalPages);

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

  return generateEnhancedPDFHtml(contentWithStyles, `Quote ${quote.number} - ${quote.client.name}`);
}
