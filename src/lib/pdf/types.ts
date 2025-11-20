export type PdfBusinessInfo = {
  name: string;
  email: string;
  phone: string;
  address: string;
  abn: string | null;
};

export type PdfClientInfo = {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

export type PdfLineItem = {
  name: string;
  description: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountType: string;
  discountValue: number | null;
  total: number;
};

export type PdfTotals = {
  subtotal: number;
  shippingCost: number;
  discountType: string;
  discountValue: number | null;
  taxTotal: number;
  total: number;
  currency: string;
};

export type InvoicePdfDocument = {
  business: PdfBusinessInfo;
  client: PdfClientInfo;
  document: {
    number: string;
    issueDate: string;
    dueDate: string | null;
    status: string;
    paymentTerms: string | null;
    paidAt: string | null;
  };
  totals: PdfTotals & {
    balanceDue: number;
  };
  lines: PdfLineItem[];
  notes: string;
  terms: string;
  bankDetails: string | null;
  stripeCheckoutUrl: string | null;
};

export type QuotePdfDocument = {
  business: PdfBusinessInfo;
  client: PdfClientInfo;
  document: {
    number: string;
    issueDate: string;
    validUntil: string | null;
    status: string;
    paymentTerms: string | null;
  };
  totals: PdfTotals;
  lines: PdfLineItem[];
  notes: string;
  terms: string;
};
