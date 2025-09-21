import { type Decimal } from "@prisma/client/runtime/library";

export function toAmount(value: Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const asNumber = Number(value);
  return Number.isNaN(asNumber) ? 0 : asNumber;
}

export function formatCurrency(
  value: Decimal | number | string,
  currency = "AUD",
) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(toAmount(value));
}

export function clampCurrency(value: number) {
  return Math.max(0, Math.round(value * 100) / 100);
}
