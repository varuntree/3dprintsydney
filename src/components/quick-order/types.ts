import type { OrientationQuaternion, OrientationPosition } from "@/stores/orientation-store";

export type Upload = { id: string; filename: string; size: number };
export type Material = { id: number; name: string; costPerGram: number };

export type Step = "upload" | "orient" | "configure" | "price" | "checkout";

export type ShippingQuote = {
  code: string;
  label: string;
  baseAmount: number;
  amount: number;
  remoteSurcharge?: number;
  remoteApplied: boolean;
};

export type FileSettings = {
  materialId: number;
  layerHeight: number;
  infill: number;
  quantity: number;
  supportsEnabled: boolean;
};

export type FileStatus = "idle" | "running" | "success" | "fallback" | "error";

export type FileStatusState = {
  state: FileStatus;
  message?: string;
  fallback?: boolean;
};

export type GizmoMode = "rotate" | "translate";

export type PriceDataState = {
  originalSubtotal: number;
  subtotal: number;
  discountAmount: number;
  discountType: "NONE" | "PERCENT" | "FIXED";
  discountValue: number;
  shipping: number;
  taxAmount: number;
  taxRate?: number;
  total: number;
  items: Array<{
    filename: string;
    quantity: number;
    unitPrice: number;
    total: number;
    breakdown?: Record<string, number> | null;
  }>;
};

export type OrientationSnapshot = {
  quaternion: OrientationQuaternion;
  position: OrientationPosition;
  autoOriented?: boolean;
  helpersVisible?: boolean;
  gizmoEnabled?: boolean;
  gizmoMode?: GizmoMode;
  supportVolume?: number;
  supportWeight?: number;
};

export type SliceResult = { grams: number; timeSec: number; fallback?: boolean; error?: string };

export type DraftState = {
  timestamp: number;
  step: Step;
  uploads: Array<{ id: string; filename: string; size: number }>;
  settings: Record<string, FileSettings>;
  orientationState: Record<string, OrientationSnapshot>;
  orientationLocked: Record<string, boolean>;
  address: {
    name: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    postcode: string;
    phone: string;
  };
  metrics: Record<string, { grams: number; timeSec: number; fallback?: boolean; error?: string }>;
};
