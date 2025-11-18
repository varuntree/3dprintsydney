import { Info } from "lucide-react";
import { useQuickOrder } from "../context/QuickOrderContext";

export function StatusBanners() {
  const {
    error,
    draftSaved,
    uploads,
    metrics,
    acceptedFallbacks,
    studentDiscountEligible,
    studentDiscountRate,
    priceData,
  } = useQuickOrder();

  const hasFallbacks = uploads.some((u) => metrics[u.id]?.fallback);
  const fallbackNeedsAttention = uploads.some(
    (u) => metrics[u.id]?.fallback && !acceptedFallbacks.has(u.id),
  );

  const hasStudentDiscount = Boolean(
    priceData && priceData.discountType === "PERCENT" && priceData.discountValue > 0,
  );
  const displayDiscountRate = hasStudentDiscount
    ? priceData?.discountValue ?? studentDiscountRate
    : studentDiscountRate;
  const formattedDisplayDiscountRate =
    typeof displayDiscountRate === "number"
      ? displayDiscountRate % 1 === 0
        ? displayDiscountRate.toFixed(0)
        : displayDiscountRate.toFixed(2)
      : "0";

  return (
    <>
      {/* Draft Saved Indicator */}
      {draftSaved && (
        <div className="fixed right-4 top-20 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 shadow-lg dark:border-green-800 dark:bg-green-950 dark:text-green-200">
            Draft saved
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 sm:mt-5">
          {error}
        </div>
      )}

      {hasFallbacks && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-yellow-50 p-3 text-xs text-amber-800 sm:mt-5">
          {fallbackNeedsAttention
            ? "One or more files are using estimated metrics. Accept the estimate or adjust settings and prepare again before pricing."
            : "You’re using estimated metrics for at least one file. You can proceed, but re-run Prepare later for exact figures."}
        </div>
      )}

      {studentDiscountEligible && (
        <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 sm:mt-5">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-semibold">Student pricing applied</p>
              <p className="text-xs sm:text-sm">
                A {formattedDisplayDiscountRate}% discount is automatically applied to your subtotal whenever you checkout with
                your student account.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
