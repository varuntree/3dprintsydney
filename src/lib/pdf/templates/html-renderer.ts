import type { InvoicePdfDocument, QuotePdfDocument, PdfLineItem } from "../types";
import { formatDate, formatCurrency, discountLabel, parseCalculatorBreakdown } from "./shared";
import { escapeHtml, wrapDocument } from "./html-utils";

// Convert logo image to data URL (client-side only)
async function getLogoDataUrl(): Promise<string> {
  // Check if running in browser
  if (typeof window === "undefined" || typeof fetch === "undefined") {
    return ""; // Server-side: return empty string
  }

  try {
    const response = await fetch("/logo.png");
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Failed to load logo:", error);
    return "";
  }
}

function renderHeader(title: string, logoDataUrl?: string): string {
  const logo = logoDataUrl
    ? `<img src="${logoDataUrl}" alt="Logo" class="brand-logo" />`
    : "";
  return `<table class="header-table section">
    <tr>
      <td>
        <div class="doc-title">${escapeHtml(title)}</div>
      </td>
      <td class="logo-cell">${logo}</td>
    </tr>
  </table>`;
}

function renderDocumentInfo(
  doc: {
    number: string;
    issueDate: string;
    paymentTerms: string | null;
  } & (
    | { dueDate?: string | null; paidAt: string | null; isPaid?: boolean }
    | { validUntil?: string | null; status: string }
  )
): string {
  const labels: string[] = [];
  const values: string[] = [];

  if ("validUntil" in doc) {
    // Quote
    labels.push("Quote Number", "Date Issued", "Valid Until");
    values.push(
      doc.number,
      formatDate(doc.issueDate),
      doc.validUntil ? formatDate(doc.validUntil) : "N/A"
    );
  } else {
    // Invoice
    const isPaid = "isPaid" in doc && doc.isPaid;
    labels.push(
      "Invoice Number",
      "Date Issued",
      isPaid ? "Paid Date" : "Payment Terms"
    );
    values.push(
      doc.number,
      formatDate(doc.issueDate),
      isPaid && "paidAt" in doc ? formatDate(doc.paidAt) : doc.paymentTerms || "Due immediately"
    );
  }

  const rows = labels
    .map(
      (label, i) =>
        `<td>
        <div class="doc-info-label">${escapeHtml(label)}</div>
        <div class="doc-info-value">${escapeHtml(values[i])}</div>
      </td>`
    )
    .join("");

  return `<table class="doc-info-table section"><tr>${rows}</tr></table>`;
}

function renderBusinessAndClientInfo(
  business: {
    name: string;
    address: string;
    phone: string;
    email: string;
    abn: string | null;
  },
  client: { name: string },
  isQuote = false
): string {
  const businessLines = [
    business.name,
    business.address,
    business.phone,
    business.email,
    business.abn ? `ABN: ${business.abn}` : "",
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join("<br>");

  const clientLabel = isQuote ? "Quote for:" : "Bill to:";
  const clientLines = `<strong>${clientLabel}</strong><br>${escapeHtml(client.name)}`;

  return `<table class="info-table section">
    <tr>
      <td>
        <div class="info-block">${businessLines}</div>
      </td>
      <td>
        <div class="info-block">${clientLines}</div>
      </td>
    </tr>
  </table>`;
}

function renderLargeAmount(text: string): string {
  return `<div class="large-amount">${escapeHtml(text)}</div>`;
}

function renderThankYou(): string {
  return `<div class="thank-you-text">Thank you for your payment!</div>`;
}

function renderReviewHtml(): string {
  const reviewLink = "https://g.page/r/CdO3kF8ywZAKEAE/review";
  return `<div class="review-text">
    Loved our service? A <a href="${reviewLink}" style="color:#666666;text-decoration:underline;">Google Review</a> would really help other customers discover us, and you'll receive <strong>30% off the first $100 of an order of your choice</strong> as our way of saying thanks!
  </div>`;
}

function renderLineItems(lines: PdfLineItem[]): string {
  const hasDiscounts = lines.some((line) => line.discountValue && line.discountValue > 0);

  let headers: string[];
  if (hasDiscounts) {
    headers = ["Description", "Qty", "Orig. Price", "Discount", "Disc. Price", "Total"];
  } else {
    headers = ["Description", "Qty", "Unit Price", "Total"];
  }

  const headerRow = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");

  const rows = lines.map((line) => {
    const breakdown = parseCalculatorBreakdown(line.description);
    const description =
      breakdown.length > 0
        ? `<div class="item-title">${escapeHtml(line.name)}</div><div class="item-description">${breakdown.map((b) => `• ${escapeHtml(b)}`).join("<br>")}</div>`
        : `<div class="item-title">${escapeHtml(line.name)}</div>${line.description ? `<div class="item-description">${escapeHtml(line.description)}</div>` : ""}`;

    const qty = `${line.quantity} ${line.unit}`;

    if (hasDiscounts) {
      const origPrice = line.discountValue
        ? line.unitPrice +
          (line.discountType === "percentage"
            ? line.unitPrice * (line.discountValue / 100)
            : line.discountValue / line.quantity)
        : line.unitPrice;

      return `<tr>
        <td>${description}</td>
        <td>${escapeHtml(qty)}</td>
        <td>${formatCurrency(origPrice)}</td>
        <td>${discountLabel(line.discountType, line.discountValue)}</td>
        <td>${formatCurrency(line.unitPrice)}</td>
        <td>${formatCurrency(line.total)}</td>
      </tr>`;
    } else {
      return `<tr>
        <td>${description}</td>
        <td>${escapeHtml(qty)}</td>
        <td>${formatCurrency(line.unitPrice)}</td>
        <td>${formatCurrency(line.total)}</td>
      </tr>`;
    }
  }).join("");

  return `<table class="items-table block-avoid">
    <thead><tr>${headerRow}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderTotals(
  totals: {
    subtotal: number;
    discountType: string;
    discountValue: number | null;
    shippingCost: number;
    taxTotal: number;
    total: number;
    balanceDue?: number;
  },
  isPaid = false
): string {
  const rows: string[] = [];

  rows.push(
    `<div class="totals-row">
      <div class="totals-label">Subtotal</div>
      <div class="totals-value">${formatCurrency(totals.subtotal)}</div>
    </div>`
  );

  if (totals.discountValue && totals.discountValue > 0) {
    const discountAmount =
      totals.discountType === "percentage"
        ? (totals.subtotal * totals.discountValue) / 100
        : totals.discountValue;

    rows.push(
      `<div class="totals-row">
        <div class="totals-label">Discount (${discountLabel(totals.discountType, totals.discountValue)})</div>
        <div class="totals-value">-${formatCurrency(discountAmount)}</div>
      </div>`
    );
  }

  if (totals.shippingCost > 0) {
    rows.push(
      `<div class="totals-row">
        <div class="totals-label">Shipping</div>
        <div class="totals-value">${formatCurrency(totals.shippingCost)}</div>
      </div>`
    );
  }

  rows.push(
    `<div class="totals-row">
      <div class="totals-label">Tax (GST)</div>
      <div class="totals-value">${formatCurrency(totals.taxTotal)}</div>
    </div>`
  );

  rows.push(
    `<div class="totals-row bold">
      <div class="totals-label">Total</div>
      <div class="totals-value">${formatCurrency(totals.total)}</div>
    </div>`
  );

  if (!isPaid && totals.balanceDue !== undefined) {
    rows.push(
      `<div class="totals-row bold">
        <div class="totals-label">Amount Due</div>
        <div class="totals-value">${formatCurrency(totals.balanceDue)}</div>
      </div>`
    );
  }

  return `<div class="totals-wrapper block-avoid">
    <div class="totals-table">${rows.join("")}</div>
  </div>`;
}

function renderPaymentConfirmation(paidAt: string | null, total: number): string {
  if (!paidAt) return "";

  return `<div class="payment-confirmation">
    <div class="payment-confirmation-title">Payment Confirmation</div>
    <table class="payment-details-table">
      <tr>
        <td>Payment Method</td>
        <td>Card Payment</td>
      </tr>
      <tr>
        <td>Date</td>
        <td>${formatDate(paidAt)}</td>
      </tr>
      <tr>
        <td>Amount</td>
        <td>${formatCurrency(total)}</td>
      </tr>
    </table>
  </div>`;
}

function renderPaymentSection(
  bankDetails: string | null,
  stripeCheckoutUrl: string | null,
  invoiceNumber: string,
  balanceDue: number
): string {
  if (!bankDetails && !stripeCheckoutUrl) return "";

  let paymentMethods = "";

  if (bankDetails) {
    paymentMethods += `<td>
      <div class="payment-method-title">Bank Transfer</div>
      <div class="payment-method-content">${escapeHtml(bankDetails).replace(/\n/g, "<br>")}</div>
      <div class="payment-important">⚠️ You MUST include invoice number ${escapeHtml(invoiceNumber)} as reference</div>
    </td>`;
  }

  if (stripeCheckoutUrl) {
    paymentMethods += `<td>
      <div class="payment-method-title">Pay Online with Stripe</div>
      <div class="stripe-box">
        <a href="${escapeHtml(stripeCheckoutUrl)}" class="stripe-link">Pay ${formatCurrency(balanceDue)} Online</a>
        <div class="stripe-note">Secure payment via Stripe</div>
      </div>
    </td>`;
  }

  return `<div class="payment-section">
    <div class="payment-section-title">Payment Options</div>
    <table class="payment-methods-table">
      <tr>${paymentMethods}</tr>
    </table>
  </div>`;
}

function renderNotes(notes: string): string {
  if (!notes || notes.trim().length === 0) return "";

  return `<div class="notes-section">
    <div class="notes-title">Notes</div>
    <div class="notes-content">${escapeHtml(notes).replace(/\n/g, "<br>")}</div>
  </div>`;
}

function renderFooter(terms: string, reference: string): string {
  return `<footer>
    <div>${escapeHtml(terms).replace(/\n/g, "<br>")}</div>
    <div class="footer-reference">${escapeHtml(reference)}</div>
  </footer>`;
}

export async function renderInvoiceHtml(doc: InvoicePdfDocument): Promise<string> {
  const logoDataUrl = await getLogoDataUrl();
  const isPaid = doc.document.status.toLowerCase() === "paid";

  const largeAmountText = isPaid
    ? `${formatCurrency(doc.totals.total)} PAID`
    : `${formatCurrency(doc.totals.balanceDue)} due ${doc.document.dueDate ? formatDate(doc.document.dueDate) : "immediately"}`;

  const footerReference = isPaid
    ? `${doc.document.number} • ${formatCurrency(doc.totals.total)} paid ${formatDate(doc.document.paidAt)}`
    : `${doc.document.number} • ${formatCurrency(doc.totals.balanceDue)} due ${doc.document.dueDate ? formatDate(doc.document.dueDate) : "immediately"}`;

  const sections = [
    renderHeader("Invoice", logoDataUrl),
    isPaid
      ? '<div class="paid-indicator">✓ PAID</div>'
      : '<div style="margin-bottom: 8mm;"></div>',
    renderDocumentInfo({ ...doc.document, isPaid }),
    renderBusinessAndClientInfo(doc.business, doc.client),
    renderLargeAmount(largeAmountText),
    isPaid ? renderThankYou() : renderReviewHtml(),
    renderLineItems(doc.lines),
    renderTotals(doc.totals, isPaid),
    isPaid
      ? renderPaymentConfirmation(doc.document.paidAt, doc.totals.total)
      : renderPaymentSection(
          doc.bankDetails,
          doc.stripeCheckoutUrl,
          doc.document.number,
          doc.totals.balanceDue
        ),
    renderNotes(doc.notes),
  ].join("");

  const content = `<div class="page-shell"><main class="page-content">${sections}</main>${renderFooter(doc.terms, footerReference)}</div>`;
  return wrapDocument(`Invoice ${doc.document.number}`, content);
}

export async function renderQuoteHtml(doc: QuotePdfDocument): Promise<string> {
  const logoDataUrl = await getLogoDataUrl();

  const largeAmountText = doc.document.validUntil
    ? `${formatCurrency(doc.totals.total)} valid until ${formatDate(doc.document.validUntil)}`
    : formatCurrency(doc.totals.total);

  const footerReference = doc.document.validUntil
    ? `${doc.document.number} • quote expires ${formatDate(doc.document.validUntil)}`
    : doc.document.number;

  const sections = [
    renderHeader("Quote", logoDataUrl),
    renderDocumentInfo(doc.document),
    renderBusinessAndClientInfo(doc.business, doc.client, true),
    renderLargeAmount(largeAmountText),
    renderLineItems(doc.lines),
    renderTotals(doc.totals, false),
    renderNotes(doc.notes),
  ].join("");

  const content = `<div class="page-shell"><main class="page-content">${sections}</main>${renderFooter(doc.terms, footerReference)}</div>`;
  return wrapDocument(`Quote ${doc.document.number}`, content);
}
