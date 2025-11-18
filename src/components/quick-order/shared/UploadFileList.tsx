import { FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuickOrder } from "../context/QuickOrderContext";

export function UploadFileList() {
  const {
    uploads,
    metrics,
    expandedFiles,
    toggleFileExpanded,
    removeUpload,
    currentStep,
  } = useQuickOrder();
  
  const isConfigureStep = currentStep === "configure";

  if (uploads.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-background/60 p-4 text-center text-sm text-muted-foreground">
        <p>No files yet. Drag and drop or click the square to upload.</p>
      </div>
    );
  }

  return (
    <ul className="flex-1 space-y-2 overflow-y-auto overflow-x-hidden pr-2 [scrollbar-width:thin]">
      {uploads.map((file) => {
        const isExpanded = expandedFiles.has(file.id);
        const fileMetrics = metrics[file.id];
        return (
          <li key={file.id}>
            <div
              className={cn(
                "group flex w-full items-center gap-3 overflow-hidden rounded-xl border border-border/70 bg-surface-overlay/60 p-3 transition hover:border-primary/40",
                isExpanded && "border-primary/70 bg-primary/5"
              )}
            >
              <button
                type="button"
                className={cn(
                  "flex flex-1 items-center gap-3 text-left",
                  !isConfigureStep && "cursor-default opacity-80",
                )}
                onClick={() => toggleFileExpanded(file.id)}
                disabled={!isConfigureStep}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground" title={file.filename}>{file.filename}</p>
                  {fileMetrics ? (
                    <p className="text-xs text-muted-foreground">
                      ~{Math.round(fileMetrics.grams)}g · ~{Math.ceil((fileMetrics.timeSec || 0) / 60)} min
                      {fileMetrics.fallback ? " (est.)" : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Settings pending</p>
                  )}
                </div>
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  removeUpload(file.id);
                }}
                aria-label={`Remove ${file.filename}`}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-destructive/20 text-destructive transition hover:bg-destructive/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
