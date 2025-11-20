import { useRef, useState } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuickOrder } from "../context/QuickOrderContext";
import { UploadFileList } from "../shared/UploadFileList";

export function UploadStep() {
  const {
    uploads,
    loading,
    processFiles,
    onUpload,
  } = useQuickOrder();

  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (event.dataTransfer?.files?.length) {
      await processFiles(event.dataTransfer.files);
    }
  }

  const hasUploads = uploads.length > 0;

  return (
    <section className="rounded-2xl border border-border bg-surface-overlay/90 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface-overlay/80 sm:p-6 md:scroll-mt-[8.5rem] lg:scroll-mt-[9.5rem]">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold sm:text-lg">
            Upload Files
          </h2>
          <span className="text-xs text-muted-foreground">
            Upload STL or 3MF · max 50 MB per file
          </span>
        </div>
        {hasUploads ? (
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{uploads.length} file{uploads.length === 1 ? "" : "s"}</span>
        ) : null}
      </div>
      <div className="grid gap-4 sm:gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div
          className={cn(
            "relative flex min-h-[260px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 bg-surface-muted text-center transition",
            dragActive && "border-primary bg-primary/5",
            loading && "pointer-events-none opacity-60"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          {loading ? (
            <>
              <Loader2 className="h-14 w-14 animate-spin text-primary" />
              <p className="mt-3 text-sm font-medium text-foreground">Uploading files...</p>
              <p className="text-xs text-muted-foreground">Please wait</p>
            </>
          ) : (
            <>
              <UploadCloud className="h-14 w-14 text-primary" />
              <p className="mt-3 text-sm font-medium text-foreground">Drop files here</p>
              <p className="text-xs text-muted-foreground">or click to browse your computer</p>
            </>
          )}
          <input
            ref={fileInputRef}
            id="file-upload"
            type="file"
            multiple
            accept=".stl,.3mf"
            onChange={onUpload}
            className="hidden"
            disabled={loading}
          />
        </div>
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-background/70 p-4">
          <div className="mb-3 flex flex-shrink-0 items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Uploaded files</h3>
          </div>
          <UploadFileList />
        </div>
      </div>
    </section>
  );
}
