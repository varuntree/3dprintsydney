import { Package, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuickOrder } from "../context/QuickOrderContext";

export function OrderSummary({
  showBreakdown = true,
  actionButton,
}: {
  showBreakdown?: boolean;
  actionButton?: React.ReactNode;
}) {
  const {
    priceData,
    currentStep,
    shippingQuote,
    studentDiscountRate,
    studentDiscountEligible,
  } = useQuickOrder();

  if (!priceData) return null;

  const hasStudentDiscount = Boolean(
    priceData && priceData.discountType === "PERCENT" && priceData.discountValue > 0
  );
  const displayDiscountRate = hasStudentDiscount
    ? priceData?.discountValue ?? studentDiscountRate
    : studentDiscountRate;
  const taxLabelSuffix =
    typeof priceData?.taxRate === "number"
      ? ` (${priceData.taxRate % 1 === 0 ? priceData.taxRate.toFixed(0) : priceData.taxRate.toFixed(2)}%)`
      : "";

  return (
    <section className="rounded-lg border border-border bg-surface-overlay p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Package className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-base font-semibold sm:text-lg">Price Summary</h2>
      </div>
      <div className="space-y-2 text-sm">
        {hasStudentDiscount ? (
          <>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Original subtotal</span>
              <span className="line-through">${priceData.originalSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-emerald-600">
              <span>
                Student discount (
                {displayDiscountRate % 1 === 0
                  ? displayDiscountRate.toFixed(0)
                  : displayDiscountRate.toFixed(2)}
                %)
              </span>
              <span>- ${priceData.discountAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal after discount</span>
              <span className="font-medium">${priceData.subtotal.toFixed(2)}</span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">${priceData.subtotal.toFixed(2)}</span>
          </div>
        )}
        <div className="border-t border-border/50 pt-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Truck className="h-3.5 w-3.5" />
              Delivery
            </span>
            <span className="font-medium">
              {shippingQuote ? `$${priceData.shipping.toFixed(2)}` : "Awaiting address"}
            </span>
          </div>
          {shippingQuote ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {shippingQuote.label}
              {shippingQuote.remoteApplied && shippingQuote.remoteSurcharge
                ? ` (+$${shippingQuote.remoteSurcharge.toFixed(2)} remote surcharge)`
                : ""}
            </p>
          ) : null}
        </div>
        {priceData.taxAmount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{`Tax${taxLabelSuffix}`}</span>
            <span className="font-medium">${priceData.taxAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="border-t border-border pt-2">
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span>${priceData.total.toFixed(2)}</span>
          </div>
        </div>
        
        {showBreakdown && priceData.items?.length ? (
          <div className="mt-4 space-y-3 text-xs">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Per-file breakdown
            </p>
            {priceData.items.map((item) => (
              <div key={item.filename} className="rounded-md border border-border/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-foreground">{item.filename}</span>
                  <span className="text-muted-foreground">
                    Qty {item.quantity} · ${item.unitPrice.toFixed(2)} ea
                  </span>
                </div>
                {item.breakdown ? (
                  <dl className="mt-2 grid grid-cols-1 gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
                    <div className="flex items-center justify-between">
                      <dt>Model weight</dt>
                      <dd>{(item.breakdown.modelWeight ?? item.breakdown.grams ?? 0).toFixed(1)} g</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>Support weight</dt>
                      <dd>{(item.breakdown.supportWeight ?? item.breakdown.supportGrams ?? 0).toFixed(1)} g</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>Material cost</dt>
                      <dd>${(item.breakdown.materialCost ?? 0).toFixed(2)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>Time cost</dt>
                      <dd>${(item.breakdown.timeCost ?? 0).toFixed(2)}</dd>
                    </div>
                  </dl>
                ) : null}
                <div className="mt-2 flex items-center justify-between text-sm font-semibold">
                  <span>Line total</span>
                  <span>${item.total.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {actionButton && <div className="mt-4">{actionButton}</div>}
    </section>
  );
}
