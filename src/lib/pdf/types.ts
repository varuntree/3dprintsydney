export type PdfBusinessInfo = {
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  abn?: string;
  bankDetails?: string;
  logoDataUrl?: string;
};

export type PdfClientInfo = {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

export type PdfLineItem = {
  title: string;
  description?: string;
  detailLines: string[];
  quantityDisplay: string;
  originalUnitPrice: number;
  discountedUnitPrice: number;
  total: number;
  discountDisplay?: string;
  discountNote?: string;
};

export type PdfTotals = {
  subtotal: number;
  discount?: {
    label: string;
    amount: number;
    subtotalAfter: number;
  };
  shipping?: {
    label: string;
    amount: number;
  };
  tax?: {
    label: string;
    amount: number;
  };
  total: number;
  amountDue: {
    label: string;
    amount: number;
    displayOverride?: string;
  };
};

export type PdfPaymentSection = {
  bankDetails?: string;
  stripeUrl?: string;
  amountDue: number;
  reference: string;
};

export type PdfPaymentConfirmation = {
  method?: string;
  paidDate?: Date | null;
  reference?: string;
  amount?: number;
};

export type PdfDocumentInfo = {
  number: string;
  issueDate: Date;
  columns: [
    { label: string; value: string },
    { label: string; value: string },
    { label: string; value: string },
  ];
};

export type QuotePdfTemplate = {
  currency: string;
  business: PdfBusinessInfo;
  client: PdfClientInfo;
  logoDataUrl?: string;
  document: PdfDocumentInfo & {
    validUntilLabel: string;
    footerText: string;
    largeAmountText: string;
  };
  lines: PdfLineItem[];
  totals: PdfTotals;
  notes?: string;
  termsConditions: string;
  footerReference: string;
};

export type InvoicePdfTemplate = {
  currency: string;
  business: PdfBusinessInfo;
  client: PdfClientInfo;
  logoDataUrl?: string;
  document: PdfDocumentInfo & {
    footerText: string;
    largeAmountText: string;
    isPaid: boolean;
    paidIndicator: boolean;
  };
  lines: PdfLineItem[];
  totals: PdfTotals;
  notes?: string;
  termsConditions: string;
  footerReference: string;
  reviewHtml?: string;
  thankYouText?: string;
  paymentSection?: PdfPaymentSection;
  paymentConfirmation?: PdfPaymentConfirmation;
};
