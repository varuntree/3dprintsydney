import type {
  InvoiceForPdf,
  InvoiceLineForPdf,
  InvoicePaymentForPdf,
  PdfClientData,
  PdfSettingsData,
  QuoteForPdf,
  QuoteLineForPdf,
} from "@/lib/pdf/builders";

export interface PdfBusinessSnapshot {
  name?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  abn?: string | null;
  bankDetails?: string | null;
  logoUrl?: string | null;
}

export interface QuotePdfSnapshot {
  currency: string;
  business: PdfBusinessSnapshot;
  quote: {
    number: string;
    issueDate: string;
    expiryDate: string | null;
    status: string;
    paymentTerms: PdfPaymentTermSnapshot | null;
    subtotal: number;
    total: number;
    taxTotal: number;
    taxRate: number | null;
    discountType: string;
    discountValue: number | null;
    shippingCost: number | null;
    shippingLabel: string | null;
    notes: string | null;
    terms: string | null;
    client: PdfClientSnapshot;
    lines: QuoteLineSnapshot[];
  };
}

export interface InvoicePdfSnapshot {
  currency: string;
  business: PdfBusinessSnapshot;
  invoice: {
    number: string;
    status: string;
    issueDate: string;
    dueDate: string | null;
    paymentTerms: PdfPaymentTermSnapshot | null;
    subtotal: number;
    total: number;
    balanceDue: number;
    taxTotal: number;
    taxRate: number | null;
    discountType: string;
    discountValue: number | null;
    shippingCost: number | null;
    shippingLabel: string | null;
    notes: string | null;
    terms: string | null;
    stripeCheckoutUrl: string | null;
    paidAt: string | null;
    client: PdfClientSnapshot;
    lines: InvoiceLineSnapshot[];
    payments: InvoicePaymentSnapshot[];
  };
}

export interface PdfClientSnapshot {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface PdfPaymentTermSnapshot {
  label: string;
  days: number;
}

export interface QuoteLineSnapshot {
  name: string;
  description: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountType: string;
  discountValue: number | null;
  total: number;
  calculatorBreakdown: Record<string, unknown> | null;
}

export type InvoiceLineSnapshot = QuoteLineSnapshot;

export interface InvoicePaymentSnapshot {
  amount: number;
  method: string;
  reference?: string | null;
  paidAt: string | null;
}

export function snapshotToSettings(snapshot: { currency: string; business: PdfBusinessSnapshot }): PdfSettingsData {
  return {
    businessName: snapshot.business.name ?? undefined,
    businessAddress: snapshot.business.address ?? undefined,
    businessEmail: snapshot.business.email ?? undefined,
    businessPhone: snapshot.business.phone ?? undefined,
    abn: snapshot.business.abn ?? undefined,
    bankDetails: snapshot.business.bankDetails ?? undefined,
    defaultCurrency: snapshot.currency ?? undefined,
  };
}

export function snapshotToQuote(snapshot: QuotePdfSnapshot): QuoteForPdf {
  return {
    number: snapshot.quote.number,
    client: toClient(snapshot.quote.client),
    issueDate: toDate(snapshot.quote.issueDate),
    expiryDate: toOptionalDate(snapshot.quote.expiryDate),
    paymentTerms: snapshot.quote.paymentTerms ? { ...snapshot.quote.paymentTerms } : null,
    subtotal: snapshot.quote.subtotal,
    total: snapshot.quote.total,
    taxTotal: snapshot.quote.taxTotal,
    taxRate: snapshot.quote.taxRate,
    discountType: snapshot.quote.discountType,
    discountValue: snapshot.quote.discountValue,
    shippingCost: snapshot.quote.shippingCost,
    shippingLabel: snapshot.quote.shippingLabel,
    notes: snapshot.quote.notes,
    terms: snapshot.quote.terms,
    lines: snapshot.quote.lines.map(toQuoteLine),
  };
}

export function snapshotToInvoice(snapshot: InvoicePdfSnapshot): InvoiceForPdf {
  return {
    number: snapshot.invoice.number,
    client: toClient(snapshot.invoice.client),
    status: snapshot.invoice.status,
    issueDate: toDate(snapshot.invoice.issueDate),
    dueDate: toOptionalDate(snapshot.invoice.dueDate),
    paymentTerms: snapshot.invoice.paymentTerms ? { ...snapshot.invoice.paymentTerms } : null,
    subtotal: snapshot.invoice.subtotal,
    total: snapshot.invoice.total,
    balanceDue: snapshot.invoice.balanceDue,
    taxTotal: snapshot.invoice.taxTotal,
    taxRate: snapshot.invoice.taxRate,
    discountType: snapshot.invoice.discountType,
    discountValue: snapshot.invoice.discountValue,
    shippingCost: snapshot.invoice.shippingCost,
    shippingLabel: snapshot.invoice.shippingLabel,
    notes: snapshot.invoice.notes,
    terms: snapshot.invoice.terms,
    stripeCheckoutUrl: snapshot.invoice.stripeCheckoutUrl,
    paidAt: toOptionalDate(snapshot.invoice.paidAt),
    lines: snapshot.invoice.lines.map(toQuoteLine) as InvoiceLineForPdf[],
    payments: snapshot.invoice.payments.map(toInvoicePayment),
  };
}

function toClient(client: PdfClientSnapshot): PdfClientData {
  return {
    name: client.name,
    company: client.company ?? null,
    email: client.email ?? null,
    phone: client.phone ?? null,
    address: client.address ?? null,
  };
}

function toQuoteLine(line: QuoteLineSnapshot): QuoteLineForPdf {
  return {
    name: line.name,
    description: line.description,
    quantity: line.quantity,
    unit: line.unit,
    unitPrice: line.unitPrice,
    discountType: line.discountType,
    discountValue: line.discountValue,
    total: line.total,
    calculatorBreakdown: line.calculatorBreakdown,
  };
}

function toInvoicePayment(payment: InvoicePaymentSnapshot): InvoicePaymentForPdf {
  return {
    amount: payment.amount,
    method: payment.method,
    reference: payment.reference ?? null,
    paidAt: toOptionalDate(payment.paidAt),
  };
}

function toDate(value: string): Date {
  return new Date(value);
}

function toOptionalDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
