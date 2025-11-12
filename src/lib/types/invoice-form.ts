import type { DiscountType } from "@/lib/constants/enums";
import type {
  InvoiceLineType,
  ModellingComplexity,
  modellingComplexityValues,
  invoiceLineTypes,
} from "@/lib/types/modelling";

export type InvoiceLineFormValue = {
  productTemplateId?: number | null;
  name: string;
  description?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  discountType: DiscountType;
  discountValue?: number;
  orderIndex?: number;
  calculatorBreakdown?: Record<string, unknown>;
  lineType: InvoiceLineType;
  modellingBrief?: string;
  modellingComplexity?: ModellingComplexity;
  modellingRevisionCount?: number;
  modellingHourlyRate?: number;
  modellingEstimatedHours?: number;
};

export type InvoiceFormValues = {
  clientId: number;
  issueDate?: string;
  dueDate?: string;
  taxRate?: number;
  discountType: DiscountType;
  discountValue?: number;
  shippingCost?: number;
  shippingLabel?: string;
  poNumber?: string;
  notes?: string;
  terms?: string;
  paymentPreference?: string;
  creditRequestedAmount?: number;
  deliveryQuoteSnapshot?: unknown;
  lines: InvoiceLineFormValue[];
};
