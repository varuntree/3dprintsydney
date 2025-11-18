import { X, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useQuickOrder } from "../context/QuickOrderContext";
import { eulerFromQuaternion } from "../utils";
import { FileSettingsForm } from "./FileSettingsForm";

export function ConfigurationFileList() {
  const {
    uploads,
    metrics,
    fileStatuses,
    acceptedFallbacks,
    orientationState,
    orientationLocked,
    settings,
    expandedFiles,
    toggleFileExpanded,
    removeUpload,
  } = useQuickOrder();

  return (
    <div className="max-h-[500px] space-y-3 overflow-y-auto pr-1 sm:pr-2">
      {uploads.map((u) => {
        const isExpanded = expandedFiles.has(u.id);
        const hasMetrics = !!metrics[u.id];
        const status = fileStatuses[u.id]?.state ?? "idle";
        const fallbackActive = metrics[u.id]?.fallback ?? false;
        const fallbackAccepted = acceptedFallbacks.has(u.id);
        const orientationSnapshot = orientationState[u.id];
        const angles = eulerFromQuaternion(orientationSnapshot?.quaternion);
        const supportEstimate = orientationSnapshot?.supportWeight ?? orientationSnapshot?.supportVolume;
        const lockedOrientation = orientationLocked[u.id];

        const statusBadge = (() => {
          switch (status) {
            case "running":
              return { text: "Preparing...", className: "bg-info-subtle text-info-foreground" };
            case "success":
              return { text: "Ready", className: "bg-success-subtle text-success-foreground" };
            case "fallback":
              return fallbackAccepted
                ? { text: "Estimate accepted", className: "bg-warning-subtle text-warning-foreground" }
                : { text: "Needs review", className: "bg-danger-subtle text-danger-foreground" };
            case "error":
              return { text: "Error", className: "bg-danger-subtle text-danger-foreground" };
            default:
              return null;
          }
        })();

        return (
          <div key={u.id} className="rounded-lg border border-border bg-background">
            {/* File Header - Always Visible */}
            <div
              className="flex cursor-pointer items-center justify-between gap-3 p-3 hover:bg-surface-muted"
              onClick={() => toggleFileExpanded(u.id)}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate font-medium">{u.filename}</span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeUpload(u.id);
                    }}
                    aria-label={`Remove ${u.filename}`}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-destructive/30 text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {hasMetrics ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      ~{Math.round(metrics[u.id].grams)}g · ~
                      {Math.ceil((metrics[u.id].timeSec || 0) / 60)} min
                      {fallbackActive ? " (est.)" : ""}
                    </span>
                    {statusBadge ? (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 font-medium",
                          statusBadge.className,
                        )}
                      >
                        {statusBadge.text}
                      </span>
                    ) : null}
                  </div>
                ) : statusBadge ? (
                  <div className="text-xs text-muted-foreground">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 font-medium",
                        statusBadge.className,
                      )}
                    >
                      {statusBadge.text}
                    </span>
                  </div>
                ) : null}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <Badge variant={lockedOrientation ? "default" : "outline"} className="px-2 py-0.5">
                    {lockedOrientation ? "Locked" : "Needs lock"}
                  </Badge>
                  {angles ? (
                    <span>
                      Orientation · X {angles.x}° · Y {angles.y}° · Z {angles.z}°
                    </span>
                  ) : (
                    <span>Orient this file before pricing</span>
                  )}
                  {typeof supportEstimate === "number" ? (
                    <span>Supports ~{supportEstimate.toFixed(1)}g</span>
                  ) : null}
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            {/* File Settings - Collapsible */}
            {isExpanded && (
              <FileSettingsForm fileId={u.id} />
            )}
          </div>
        );
      })}
    </div>
  );
}
