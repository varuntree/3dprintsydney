import { useQuickOrder } from "../context/QuickOrderContext";
import { OrderSummary } from "./OrderSummary";
import { UploadHelp } from "./UploadHelp";

export function RightSidebar() {
  const {
    currentStep,
    uploads,
    priceData,
  } = useQuickOrder();

  const hasUploads = uploads.length > 0;
  const isUploadStep = currentStep === "upload";
  
  // If we are in Price Step, the OrderSummary is rendered in the main column (by PriceStep component).
  // If we are in Checkout Step, we render OrderSummary here (compact, no breakdown?).
  // Or if I decided to put PriceStep content in Left Column, then Right Column can show compact summary.
  // Actually, PriceStep renders OrderSummary with Breakdown.
  // CheckoutStep renders DeliveryForm.
  // So for CheckoutStep, we definitely want OrderSummary in Right Column.
  
  // What about PriceStep?
  // If PriceStep renders OrderSummary (Main), do we duplicate it in Right Column? No.
  // So if currentStep === 'price', RightSidebar should be empty?
  // Or should PriceStep only render the Breakdown, and RightSidebar render the Totals?
  // In my `PriceStep.tsx`, I rendered `OrderSummary` which includes Totals.
  // So if `currentStep === 'price'`, RightSidebar should hide OrderSummary to avoid duplication.
  
  const showSummary = !!priceData && currentStep !== "price";
  const showUploadHelp = uploads.length === 0 && isUploadStep;

  if (!showSummary && !showUploadHelp) return null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {showSummary && (
        <OrderSummary showBreakdown={false} />
      )}
      {showUploadHelp && <UploadHelp />}
    </div>
  );
}
