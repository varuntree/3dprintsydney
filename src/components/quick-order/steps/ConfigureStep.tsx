import { Settings2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuickOrder } from "../context/QuickOrderContext";
import { ConfigurationFileList } from "../shared/ConfigurationFileList";

export function ConfigureStep() {
  const {
    uploads,
    canPrepare,
    preparing,
    hasPreparedAll,
    prepareFiles,
    computePrice,
    loading,
    pricing,
    allOrientationsLocked,
    currentStep,
    hasUploads,
  } = useQuickOrder();

  // Additional helpers derived from hook state if not exposed directly, 
  // but hook exposes most.
  // canPrepare is not exposed directly, let's check hook.
  // I didn't expose `canPrepare` in hook return. I exposed `allOrientationsLocked`.
  // `canPrepare` = uploads.length > 0 && allOrientationsLocked.
  
  const canPrepareCalc = uploads.length > 0 && allOrientationsLocked;
  // `hasPreparedAll` = uploads.every(u => metrics[u.id])
  // I didn't expose `hasPreparedAll`.
  // I'll calculate locally.
  
  const { metrics } = useQuickOrder();
  const hasPreparedAllCalc = uploads.every((u) => metrics[u.id]);

  // Check if we are in configure step? The parent decides rendering.
  // But the list might be used elsewhere.
  // The button logic is specific here.

  return (
    <section className="rounded-2xl border border-border bg-surface-overlay/90 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface-overlay/80 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold sm:text-lg">File Settings</h2>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canPrepareCalc || preparing || !hasUploads}
          onClick={prepareFiles}
        >
          {preparing ? "Preparing..." : hasPreparedAllCalc ? "Re-prepare" : "Prepare files"}
        </Button>
      </div>
      
      <ConfigurationFileList />
      
      <div className="mt-4 flex justify-end">
        <Button
          onClick={computePrice}
          disabled={uploads.length === 0 || loading || pricing || !allOrientationsLocked}
          className={cn(
            "flex w-full items-center justify-center gap-2 sm:w-auto",
            pricing && "animate-pulse"
          )}
        >
          {pricing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Calculating...
            </>
          ) : (
            "Calculate Price"
          )}
        </Button>
      </div>
    </section>
  );
}
