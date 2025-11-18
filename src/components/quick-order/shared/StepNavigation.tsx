import {
  ChevronLeft,
  ChevronRight,
  Check,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STEP_META, STEP_SEQUENCE } from "../constants";
import { useQuickOrder } from "../context/QuickOrderContext";

export function StepNavigation() {
  const {
    currentStep,
    goToStep,
    stepCompletion,
    isStepUnlocked,
    allOrientationsLocked,
  } = useQuickOrder();

  const currentStepIndexRaw = STEP_META.findIndex((s) => s.id === currentStep);
  const currentStepIndex = currentStepIndexRaw === -1 ? 0 : currentStepIndexRaw;
  const previousStepId = currentStepIndex > 0 ? STEP_SEQUENCE[currentStepIndex - 1] : null;
  const nextStepId = currentStepIndex < STEP_SEQUENCE.length - 1 ? STEP_SEQUENCE[currentStepIndex + 1] : null;
  const orientationLockBlocked = currentStep === "orient" && !allOrientationsLocked;

  return (
    <div className="mb-6 overflow-x-auto rounded-xl border border-border bg-card p-3 shadow-sm sm:mb-8 sm:p-4">
      <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-xs font-semibold text-foreground sm:text-sm">
            Step {currentStepIndex + 1} of {STEP_META.length}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {STEP_META[currentStepIndex]?.label ?? ""}
          </span>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => previousStepId && goToStep(previousStepId)}
            disabled={!previousStepId}
            className="h-8 gap-1 px-3 text-xs"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => nextStepId && goToStep(nextStepId)}
            disabled={!nextStepId || !isStepUnlocked(nextStepId)}
            title={orientationLockBlocked ? "Lock orientation to continue" : undefined}
            className="h-8 gap-1 px-3 text-xs"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex w-full items-center gap-1 overflow-x-auto sm:gap-2">
        {STEP_META.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const isComplete = stepCompletion[step.id as keyof typeof stepCompletion];
          const canNavigate = isStepUnlocked(step.id) || Boolean(isComplete);
          const statusLabel = isComplete
            ? "Done"
            : isActive
            ? "In Progress"
            : canNavigate
            ? "Pending"
            : "Locked";

          return (
            <div key={step.id} className="flex min-w-0 flex-1 items-center sm:min-w-fit">
              <button
                type="button"
                onClick={() => (canNavigate ? goToStep(step.id) : null)}
                disabled={!canNavigate}
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-lg p-2 transition-all hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-w-fit sm:flex-row sm:gap-2 sm:p-2.5",
                  canNavigate ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all sm:h-11 sm:w-11",
                    isComplete
                      ? "border-success bg-success text-white shadow-sm"
                      : isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : canNavigate
                      ? "border-border bg-background text-muted-foreground"
                      : "border-border/50 bg-muted/50 text-muted-foreground/50",
                  )}
                >
                  {isComplete ? <Check className="h-5 w-5 sm:h-5 sm:w-5" /> : <Icon className="h-5 w-5 sm:h-5 sm:w-5" />}
                </span>
                <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
                  <span
                    className={cn(
                      "text-xs font-semibold sm:text-sm",
                      isActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                  <span className="hidden text-[10px] font-normal uppercase tracking-wider text-muted-foreground/80 sm:inline">
                    {statusLabel}
                  </span>
                </div>
              </button>
              {index < STEP_META.length - 1 && (
                <div
                  className={cn(
                    "mx-1.5 h-0.5 flex-1 rounded-full transition-all sm:mx-2",
                    isComplete ? "bg-success" : "bg-border/50"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
