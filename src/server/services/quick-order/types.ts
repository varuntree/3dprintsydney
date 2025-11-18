import type { DiscountType } from '@/lib/calculations';
import type { InvoiceLineType, ModellingComplexity } from "@/lib/types/modelling";

export type QuickOrderItemInput = {
  fileId?: string;
  filename: string;
  materialId: number;
  supportMaterialId?: number;
  materialName?: string;
  layerHeight: number;
  infill: number;
  quantity: number;
  metrics: { grams: number; supportGrams?: number; timeSec: number; fallback?: boolean };
  supports?: {
    enabled: boolean;
    pattern: "normal" | "tree";
    angle: number;
    style?: "grid" | "organic";
    interfaceLayers?: number;
    acceptedFallback?: boolean;
  };
};

export type QuickOrderShippingQuote = {
  code: string;
  label: string;
  baseAmount: number;
  amount: number;
  remoteSurcharge?: number;
  remoteApplied: boolean;
};

export type QuickOrderPrice = {
  items: {
    filename: string;
    unitPrice: number;
    quantity: number;
    total: number;
    breakdown: Record<string, number>;
  }[];
  originalSubtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  subtotal: number;
  shipping: QuickOrderShippingQuote;
  taxRate?: number;
  taxAmount: number;
  total: number;
};

export type ShippingLocation = {
  state?: string | null;
  postcode?: string | null;
};

export type QuickOrderInvoiceOptions = {
  creditRequestedAmount?: number;
  paymentPreference?: string;
  deliveryQuote?: QuickOrderShippingQuote | null;
};
