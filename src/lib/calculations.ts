export type DiscountType = "NONE" | "PERCENT" | "FIXED";

export interface LineTotalsArgs {
  quantity: number;
  unitPrice: number;
  discountType?: DiscountType;
  discountValue?: number;
}

export function calculateLineTotal({
  quantity,
  unitPrice,
  discountType = "NONE",
  discountValue = 0,
}: LineTotalsArgs) {
  const base = quantity * unitPrice;
  if (discountType === "PERCENT") {
    return Math.max(0, base - base * (discountValue / 100));
  }
  if (discountType === "FIXED") {
    return Math.max(0, base - discountValue);
  }
  return Math.max(0, base);
}

export interface DocumentTotalsArgs {
  lines: { total: number }[];
  discountType?: DiscountType;
  discountValue?: number;
  shippingCost?: number;
  taxRate?: number;
}

export function calculateDocumentTotals({
  lines,
  discountType = "NONE",
  discountValue = 0,
  shippingCost = 0,
  taxRate = 0,
}: DocumentTotalsArgs) {
  const subtotal = lines.reduce((acc, line) => acc + line.total, 0);
  let discounted = subtotal;
  if (discountType === "PERCENT") {
    discounted = Math.max(0, subtotal - subtotal * (discountValue / 100));
  } else if (discountType === "FIXED") {
    discounted = Math.max(0, subtotal - discountValue);
  }
  const taxedBase = discounted + shippingCost;
  const tax = Math.max(0, taxedBase * (taxRate / 100));
  const total = Math.max(0, taxedBase + tax);
  return {
    subtotal,
    discounted,
    shippingCost,
    tax,
    total,
  };
}
