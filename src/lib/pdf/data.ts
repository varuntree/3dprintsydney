import type { InvoiceViewModel } from "@/components/invoices/invoice-view";
import type { QuoteViewModel } from "@/components/quotes/quote-view";
import type {
  InvoicePdfDocument,
  PdfLineItem,
  QuotePdfDocument,
} from "@/lib/pdf/types";

function buildPaymentTermsLabel(
  terms: { label: string; days: number } | null,
  fallbackImmediate: string,
) {
  if (!terms) {
    return fallbackImmediate;
  }

  if (terms.days === 0) {
    return `${terms.label} • ${fallbackImmediate}`;
  }

  return `${terms.label} • ${terms.days}-day terms`;
}

function mapLines(
  lines: InvoiceViewModel["lines"] | QuoteViewModel["lines"],
): PdfLineItem[] {
  return lines
    .slice()
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
    .map((line) => ({
      name: line.name,
      description: line.description ?? null,
      quantity: line.quantity,
      unit: line.unit ?? "",
      unitPrice: line.unitPrice,
      discountType: line.discountType,
      discountValue: line.discountValue ?? null,
      total: line.total,
    }));
}

export function buildInvoicePdfDocument(invoice: InvoiceViewModel): InvoicePdfDocument {
  const paymentTermsLabel = buildPaymentTermsLabel(invoice.paymentTerms, "Due immediately");

  return {
    business: {
      name: invoice.businessName,
      email: invoice.businessEmail,
      phone: invoice.businessPhone,
      address: invoice.businessAddress,
      abn: invoice.abn,
    },
    client: {
      name: invoice.clientName,
    },
    document: {
      number: invoice.number,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      paymentTerms: paymentTermsLabel,
      paidAt: invoice.paidAt,
    },
    totals: {
      subtotal: invoice.subtotal,
      shippingCost: invoice.shippingCost,
      discountType: invoice.discountType,
      discountValue: invoice.discountValue,
      taxTotal: invoice.taxTotal,
      total: invoice.total,
      currency: invoice.currency,
      balanceDue: invoice.balanceDue,
    },
    lines: mapLines(invoice.lines),
    notes: invoice.notes,
    terms: invoice.terms,
    bankDetails: invoice.bankDetails ?? null,
    stripeCheckoutUrl: invoice.stripeCheckoutUrl ?? null,
  };
}

export function buildQuotePdfDocument(quote: QuoteViewModel): QuotePdfDocument {
  const paymentTermsLabel = buildPaymentTermsLabel(quote.paymentTerms, "Due on acceptance");

  return {
    business: {
      name: quote.businessName,
      email: quote.businessEmail,
      phone: quote.businessPhone,
      address: quote.businessAddress,
      abn: quote.abn,
    },
    client: {
      name: quote.client.name,
    },
    document: {
      number: quote.number,
      issueDate: quote.issueDate,
      validUntil: quote.expiryDate,
      status: quote.status,
      paymentTerms: paymentTermsLabel,
    },
    totals: {
      subtotal: quote.subtotal,
      shippingCost: quote.shippingCost,
      discountType: quote.discountType,
      discountValue: quote.discountValue,
      taxTotal: quote.taxTotal,
      total: quote.total,
      currency: quote.currency,
    },
    lines: mapLines(quote.lines),
    notes: quote.notes,
    terms: quote.terms,
  };
}
