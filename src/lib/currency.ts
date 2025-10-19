export type NumericLike = number | string | { toNumber?: () => number; toString?: () => string };

function coerceNumber(value: NumericLike | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value.toNumber === "function") {
    const parsed = Number(value.toNumber());
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value.toString === "function") {
    const parsed = Number(value.toString());
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  const parsed = Number(value as unknown as number);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function toAmount(value: NumericLike | null | undefined) {
  return coerceNumber(value);
}

export function formatCurrency(value: NumericLike | number | string, currency = "AUD") {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(coerceNumber(value));
}

export function clampCurrency(value: number) {
  return Math.max(0, Math.round(value * 100) / 100);
}
