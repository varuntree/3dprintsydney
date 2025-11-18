import { Button } from "@/components/ui/button";
import { useQuickOrder } from "../context/QuickOrderContext";
import { OrderSummary } from "../shared/OrderSummary";

export function PriceStep() {
  const { goToStep, loading } = useQuickOrder();

  return (
    <OrderSummary
      showBreakdown={true}
      actionButton={
        <Button className="w-full" onClick={() => goToStep("checkout")} disabled={loading}>
          Continue to Checkout
        </Button>
      }
    />
  );
}
