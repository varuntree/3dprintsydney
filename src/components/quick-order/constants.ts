import {
  UploadCloud,
  Settings2,
  Package,
  CreditCard,
  Box,
} from "lucide-react";
import type { Step } from "./types";

export const STEP_META = [
  { id: "upload" as const, label: "Upload", icon: UploadCloud },
  { id: "orient" as const, label: "Orient", icon: Box },
  { id: "configure" as const, label: "Configure", icon: Settings2 },
  { id: "price" as const, label: "Price", icon: Package },
  { id: "checkout" as const, label: "Checkout", icon: CreditCard },
];

export const STEP_SEQUENCE = STEP_META.map((step) => step.id) as readonly Step[];

export const DRAFT_KEY = "quick-order-draft";
