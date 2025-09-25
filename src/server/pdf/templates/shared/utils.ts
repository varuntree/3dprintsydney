import { formatCurrency } from "@/lib/currency";

export const escapeHtml = (value: string | null | undefined) =>
  value
    ? value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
    : "";

export const formatMultiline = (value: string | null | undefined) =>
  value ? escapeHtml(value).replace(/\n/g, "<br />") : "";

export function discountLabel(type: string, value?: number | null) {
  if (type === "PERCENT") {
    return `${(value ?? 0).toFixed(2)}%`;
  }
  if (type === "FIXED") {
    return formatCurrency(value ?? 0);
  }
  return "—";
}

