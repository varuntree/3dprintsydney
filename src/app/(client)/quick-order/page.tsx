"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  UploadCloud,
  Settings2,
  Package,
  CreditCard,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  X,
  Loader2,
  FileText,
  Box,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import STLViewerWrapper, { type STLViewerRef } from "@/components/3d/STLViewerWrapper";
import RotationControls from "@/components/3d/RotationControls";
import { exportSTL } from "@/lib/3d/export";

type Upload = { id: string; filename: string; size: number };
type Material = { id: number; name: string; costPerGram: number };

type Step = "upload" | "orient" | "configure" | "price" | "checkout";

type ShippingQuote = {
  code: string;
  label: string;
  baseAmount: number;
  amount: number;
  remoteSurcharge?: number;
  remoteApplied: boolean;
};

type FileSettings = {
  materialId: number;
  layerHeight: number;
  infill: number;
  quantity: number;
  supportsEnabled: boolean;
  supportPattern: "normal" | "tree";
  supportAngle: number;
};

type FileStatus = "idle" | "running" | "success" | "fallback" | "error";

type FileStatusState = {
  state: FileStatus;
  message?: string;
  fallback?: boolean;
};

export default function QuickOrderPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [role, setRole] = useState<"ADMIN" | "CLIENT" | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [settings, setSettings] = useState<Record<string, FileSettings>>({});
  const [metrics, setMetrics] = useState<
    Record<string, { grams: number; timeSec: number; fallback?: boolean; error?: string }>
  >({});
  const [fileStatuses, setFileStatuses] = useState<Record<string, FileStatusState>>({});
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null);
  const [address, setAddress] = useState({
    name: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postcode: "",
    phone: "",
  });
  const [priceData, setPriceData] = useState<{
    subtotal: number;
    shipping: number;
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const initializedRef = useRef(false);

  // Orientation state
  const [orientedFileIds, setOrientedFileIds] = useState<Record<string, string>>({});
  const [currentlyOrienting, setCurrentlyOrienting] = useState<string | null>(null);
  const [isLocking, setIsLocking] = useState(false);
  const viewerRef = useRef<STLViewerRef>(null);
  const [acceptedFallbacks, setAcceptedFallbacks] = useState<Set<string>>(new Set<string>());

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    fetch("/api/auth/me").then(async (r) => {
      if (!r.ok) {
        router.replace("/login");
        return;
      }
      const { data } = await r.json();
      setRole(data.role);
    });
    fetch("/api/client/materials").then(async (r) => {
      try {
        if (!r.ok) {
          setMaterials([]);
          return;
        }
        const j = await r.json();
        const arr = (j && (j.data ?? j)) as unknown;
        if (Array.isArray(arr)) {
          setMaterials(arr as Material[]);
        } else {
          setMaterials([]);
        }
      } catch {
        setMaterials([]);
      }
    });
  }, [router]);

  async function processFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    const fd = new FormData();
    files.forEach((file) => fd.append("files", file));
    setLoading(true);
    setError(null);
    const res = await fetch("/api/quick-order/upload", { method: "POST", body: fd });
    setLoading(false);
    if (!res.ok) {
      setError("Upload failed");
      return;
    }
    const { data } = await res.json();
    const uploaded = data as Upload[];
    setUploads((prev) => [...prev, ...uploaded]);
    const defaultMat = materials[0]?.id ?? 0;
    setSettings((prev) => {
      const next = { ...prev } as Record<string, FileSettings>;
      uploaded.forEach((it) => {
        next[it.id] = {
          materialId: defaultMat,
          layerHeight: 0.2,
          infill: 20,
          quantity: 1,
          supportsEnabled: true,
          supportPattern: "normal",
          supportAngle: 45,
        };
      });
      return next;
    });
    setFileStatuses((prev) => {
      const next = { ...prev } as Record<string, FileStatusState>;
      uploaded.forEach((it) => {
        next[it.id] = { state: "idle" };
      });
      return next;
    });
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      uploaded.forEach((it) => next.add(it.id));
      return next;
    });
    if (uploads.length === 0) {
      setCurrentStep("orient");
      // Automatically select the first uploaded file for orientation
      if (uploaded.length > 0) {
        setCurrentlyOrienting(uploaded[0].id);
      }
    }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      await processFiles(e.target.files);
      e.target.value = "";
    }
  }

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

  function removeUpload(id: string) {
    const nextUploads = uploads.filter((u) => u.id !== id);
    if (nextUploads.length === uploads.length) return;
    setUploads(nextUploads);
    setSettings((prev) => {
      const copy = { ...prev } as typeof prev;
      delete copy[id];
      return copy;
    });
    setMetrics((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setFileStatuses((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setAcceptedFallbacks((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setPriceData(null);
    setShippingQuote(null);
    setCurrentStep(nextUploads.length === 0 ? "upload" : "configure");
  }

  async function handleLockOrientation() {
    if (!currentlyOrienting || !viewerRef.current) {
      return;
    }

    try {
      setIsLocking(true);
      setError(null);

      const mesh = viewerRef.current.getMesh();
      if (!mesh) {
        setError("No model loaded in viewer");
        return;
      }

      // Export oriented STL
      const stlBlob = await exportSTL(mesh, true);
      const file = new File([stlBlob], "oriented.stl", { type: "application/octet-stream" });

      // Upload oriented STL
      const fd = new FormData();
      fd.append("fileId", currentlyOrienting);
      fd.append("orientedSTL", file);

      const res = await fetch("/api/quick-order/orient", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        setError("Failed to save oriented file");
        return;
      }

      const { data } = await res.json();

      // Map original file ID to oriented file ID
      setOrientedFileIds((prev) => ({
        ...prev,
        [currentlyOrienting]: data.newFileId,
      }));

      // Move to next file or configure step
      const currentIndex = uploads.findIndex((u) => u.id === currentlyOrienting);
      const nextFile = uploads[currentIndex + 1];

      if (nextFile) {
        setCurrentlyOrienting(nextFile.id);
      } else {
        setCurrentlyOrienting(null);
        setCurrentStep("configure");
      }
    } catch (err) {
      console.error("Orientation lock error:", err);
      setError("Failed to lock orientation");
    } finally {
      setIsLocking(false);
    }
  }

  async function prepareFiles() {
    if (uploads.length === 0) return;
    setPreparing(true);
    setError(null);
    setAcceptedFallbacks(new Set<string>());
    setPriceData(null);
    setShippingQuote(null);

    for (const upload of uploads) {
      const fileId = orientedFileIds[upload.id] || upload.id;
      const fileSettings = settings[upload.id];
      if (!fileSettings) continue;

      setFileStatuses((prev) => ({
        ...prev,
        [upload.id]: { state: "running" },
      }));

      try {
        const res = await fetch("/api/quick-order/slice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file: {
              id: fileId,
              layerHeight: fileSettings.layerHeight,
              infill: fileSettings.infill,
              supports: {
                enabled: fileSettings.supportsEnabled,
                pattern: fileSettings.supportPattern,
                angle: fileSettings.supportAngle,
              },
            },
          }),
        });

        const payload = await res
          .json()
          .catch(() => ({ error: "Prepare failed" }));

        if (!res.ok || !payload) {
          const message = typeof payload?.error === "string" ? payload.error : "Prepare failed";
          throw new Error(message);
        }

        const { data } = payload as {
          data?: { grams: number; timeSec: number; fallback?: boolean; error?: string };
        };

        if (!data || typeof data.grams !== "number" || typeof data.timeSec !== "number") {
          throw new Error("Unexpected slicer response");
        }
        const fallback = Boolean(data?.fallback);
        const grams = Number(data?.grams) || 0;
        const timeSec = Number(data?.timeSec) || 0;
        const errorMessage = typeof data?.error === "string" ? data.error : undefined;

        setMetrics((prev) => ({
          ...prev,
          [upload.id]: { grams, timeSec, fallback, error: errorMessage },
        }));

        setFileStatuses((prev) => ({
          ...prev,
          [upload.id]: {
            state: fallback ? "fallback" : "success",
            message: errorMessage,
            fallback,
          },
        }));

        if (!fallback) {
          setAcceptedFallbacks((prev) => {
            if (!prev.size) return prev; // nothing to remove
            const next = new Set(prev);
            next.delete(upload.id);
            return next;
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Prepare failed";
        setFileStatuses((prev) => ({
          ...prev,
          [upload.id]: { state: "error", message },
        }));
        setError("Preparing files failed. Expand the file for details and try again.");
      }
    }

    setPreparing(false);
  }

  async function computePrice() {
    setLoading(true);
    setPricing(true);
    setError(null);
    setShippingQuote(null);
    setPriceData(null);
    const fallbackPending = uploads.some(
      (u) => metrics[u.id]?.fallback && !acceptedFallbacks.has(u.id),
    );
    if (fallbackPending) {
      setLoading(false);
      setPricing(false);
      setError("Accept fallback estimates or re-prepare the affected files before pricing.");
      return;
    }
    const items = uploads.map((u) => ({
      fileId: u.id,
      filename: u.filename,
      materialId: settings[u.id].materialId,
      materialName:
        materials.find((m) => m.id === settings[u.id].materialId)?.name ?? undefined,
      layerHeight: settings[u.id].layerHeight,
      infill: settings[u.id].infill,
      quantity: settings[u.id].quantity,
      supports: {
        enabled: settings[u.id].supportsEnabled,
        pattern: settings[u.id].supportPattern,
        angle: settings[u.id].supportAngle,
        acceptedFallback: acceptedFallbacks.has(u.id),
      },
      metrics:
        metrics[u.id] ?? {
          grams: 80,
          timeSec: 3600,
          fallback: true,
        },
    }));
    try {
      const res = await fetch("/api/quick-order/price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          location: {
            state: address.state,
            postcode: address.postcode,
          },
        }),
      });
      if (!res.ok) {
        setError("Pricing failed");
        return;
      }
      const { data } = await res.json();
      const quote: ShippingQuote | null = data.shipping ?? null;
      setShippingQuote(quote);
      const subtotal = Math.round((data.subtotal ?? 0) * 100) / 100;
      const shippingAmount = quote ? Math.round((quote.amount ?? 0) * 100) / 100 : 0;
      setPriceData({
        subtotal,
        shipping: shippingAmount,
        total: Math.round((subtotal + shippingAmount) * 100) / 100,
      });
      setCurrentStep("price");
    } catch (err) {
      console.error(err);
      setError("Pricing failed");
    } finally {
      setLoading(false);
      setPricing(false);
    }
  }

  async function checkout() {
    setLoading(true);
    setError(null);
    const fallbackPending = uploads.some(
      (u) => metrics[u.id]?.fallback && !acceptedFallbacks.has(u.id),
    );
    if (fallbackPending) {
      setLoading(false);
      setError("Accept fallback estimates or re-prepare the affected files before checkout.");
      return;
    }
    const items = uploads.map((u) => ({
      fileId: u.id,
      filename: u.filename,
      materialId: settings[u.id].materialId,
      materialName:
        materials.find((m) => m.id === settings[u.id].materialId)?.name ?? undefined,
      layerHeight: settings[u.id].layerHeight,
      infill: settings[u.id].infill,
      quantity: settings[u.id].quantity,
      supports: {
        enabled: settings[u.id].supportsEnabled,
        pattern: settings[u.id].supportPattern,
        angle: settings[u.id].supportAngle,
        acceptedFallback: acceptedFallbacks.has(u.id),
      },
      metrics:
        metrics[u.id] ?? {
          grams: 80,
          timeSec: 3600,
          fallback: true,
        },
    }));
    const res = await fetch("/api/quick-order/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, address }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Checkout failed");
      return;
    }
    const { data } = await res.json();
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    } else {
      const dest = role === "CLIENT" ? `/client/orders/${data.invoiceId}` : `/invoices/${data.invoiceId}`;
      router.replace(dest);
    }
  }

  function toggleFileExpanded(id: string) {
    const next = new Set(expandedFiles);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedFiles(next);
  }

  function acceptFallback(id: string) {
    setAcceptedFallbacks((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setFileStatuses((prev) => {
      const entry = prev[id];
      if (!entry) return prev;
      return {
        ...prev,
        [id]: {
          ...entry,
          message: entry.message,
          fallback: true,
        },
      };
    });
  }

  const canPrepare = uploads.length > 0;
  const hasPreparedAll = uploads.every((u) => metrics[u.id]);
  const hasFallbacks = uploads.some((u) => metrics[u.id]?.fallback);
  const fallbackNeedsAttention = uploads.some(
    (u) => metrics[u.id]?.fallback && !acceptedFallbacks.has(u.id),
  );

  const steps = [
    { id: "upload", label: "Upload", icon: UploadCloud },
    { id: "configure", label: "Configure", icon: Settings2 },
    { id: "orient", label: "Orient", icon: Box },
    { id: "price", label: "Price", icon: Package },
    { id: "checkout", label: "Checkout", icon: CreditCard },
  ] as const;

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const hasUploads = uploads.length > 0;
  const SHOW_ROTATION_CONTROLS = true;

  return (
    <div className="space-y-6">
      {/* Workflow Steps */}
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-overlay p-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStepIndex;
          const isComplete = index < currentStepIndex;

          return (
            <div key={step.id} className="flex flex-1 items-center">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                    isComplete
                      ? "border-green-600 bg-green-600 text-white"
                      : isActive
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-300 bg-white text-gray-400"
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span
                  className={cn(
                    "hidden text-sm font-medium sm:block",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="mx-2 h-0.5 flex-1 bg-gray-200" />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {hasFallbacks && (
        <div className="rounded-lg border border-amber-300 bg-yellow-50 p-3 text-xs text-amber-800">
          {fallbackNeedsAttention
            ? "One or more files are using estimated metrics. Accept the estimate or adjust settings and prepare again before pricing."
            : "You’re using estimated metrics for at least one file. You can proceed, but re-run Prepare later for exact figures."}
        </div>
      )}

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Upload & Files */}
        <div className="space-y-6 lg:col-span-2">
          {/* Upload & File List */}
          <section className="rounded-2xl border border-border bg-surface-overlay/90 p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface-overlay/80">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Files</h2>
                <span className="text-xs text-muted-foreground">Upload STL or 3MF</span>
              </div>
              {hasUploads ? (
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{uploads.length} file{uploads.length === 1 ? "" : "s"}</span>
              ) : null}
            </div>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Uploaded files</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canPrepare || preparing || !hasUploads}
                    onClick={prepareFiles}
                  >
                    {preparing ? "Preparing..." : hasPreparedAll ? "Re-prepare" : "Prepare files"}
                  </Button>
                </div>
                {hasUploads ? (
                  <ul className="space-y-2 max-h-64 overflow-y-auto overflow-x-hidden pr-1">
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
                              className="flex flex-1 items-center gap-3 text-left"
                              onClick={() => toggleFileExpanded(file.id)}
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
                ) : (
                  <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-background/60 text-center text-sm text-muted-foreground">
                    <p>No files yet. Drag and drop or click the square to upload.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Orientation Step */}
          {currentStep === "orient" && uploads.length > 0 && (
            <section className="rounded-2xl border border-border bg-surface-overlay/90 p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface-overlay/80">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Box className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h2 className="text-lg font-semibold">Orient Your Models</h2>
                    {currentlyOrienting && (
                      <p className="text-xs text-muted-foreground">
                        File {uploads.findIndex((u) => u.id === currentlyOrienting) + 1} of {uploads.length}
                        {" · "}
                        {Object.keys(orientedFileIds).length} oriented
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("configure")}
                  disabled={isLocking}
                >
                  Skip Orientation
                </Button>
              </div>

              {/* File Selection */}
              <div className="mb-4 flex flex-wrap gap-2">
                {uploads.map((u) => {
                  const isOriented = !!orientedFileIds[u.id];
                  const isCurrent = currentlyOrienting === u.id;

                  return (
                    <Button
                      key={u.id}
                      size="sm"
                      variant={isCurrent ? "default" : "outline"}
                      onClick={() => setCurrentlyOrienting(u.id)}
                      disabled={isLocking}
                      className={cn(
                        "relative max-w-full overflow-hidden",
                        isOriented && "border-green-500 bg-green-50 text-green-700"
                      )}
                    >
                      {isOriented && (
                        <Check className="mr-1 h-3 w-3 text-green-600" />
                      )}
                      <span className="block max-w-[180px] truncate" title={u.filename}>{u.filename}</span>
                    </Button>
                  );
                })}
              </div>

              {currentlyOrienting ? (
                <div className="space-y-4">
                  {/* 3D Viewer */}
                  <STLViewerWrapper
                    key={currentlyOrienting}
                    ref={viewerRef}
                    url={`/api/tmp-file/${currentlyOrienting}`}
                    onError={(err) => setError(err.message)}
                  />

                  {/* Rotation Controls */}
                  {SHOW_ROTATION_CONTROLS ? (
                    <RotationControls
                      onRotate={(axis, degrees) => {
                        viewerRef.current?.rotateModel(axis, degrees);
                      }}
                      onReset={() => {
                        viewerRef.current?.resetOrientation();
                      }}
                      onCenter={() => {
                        viewerRef.current?.centerModel();
                      }}
                      onLockOrientation={handleLockOrientation}
                      isLocking={isLocking}
                      disabled={false}
                    />
                  ) : null}
                </div>
              ) : Object.keys(orientedFileIds).length === uploads.length ? (
                <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-green-200 bg-green-50 p-8 text-center">
                  <div>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                      <Check className="h-8 w-8 text-green-600" />
                    </div>
                    <p className="text-lg font-semibold text-green-800">
                      All files oriented!
                    </p>
                    <p className="mt-2 text-sm text-green-700">
                      {uploads.length} file{uploads.length === 1 ? "" : "s"} ready for configuration
                    </p>
                    <Button
                      onClick={() => setCurrentStep("configure")}
                      className="mt-4 bg-green-600 text-white hover:bg-green-500"
                    >
                      Continue to Configure
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted p-8 text-center">
                  <div>
                    <Box className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground">
                      Select a file above to begin orientation
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Files Configuration - Collapsible with Max Height */}
          {uploads.length > 0 && (
            <section className="rounded-2xl border border-border bg-surface-overlay/90 p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface-overlay/80">
              <div className="mb-4 flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">File Settings</h2>
              </div>
              <div className="max-h-[500px] space-y-3 overflow-y-auto pr-2">
                {uploads.map((u) => {
                  const isExpanded = expandedFiles.has(u.id);
                  const hasMetrics = !!metrics[u.id];
                  const status = fileStatuses[u.id]?.state ?? "idle";
                  const statusMessage = fileStatuses[u.id]?.message;
                  const fallbackActive = metrics[u.id]?.fallback ?? false;
                  const fallbackAccepted = acceptedFallbacks.has(u.id);
                  const statusBadge = (() => {
                    switch (status) {
                      case "running":
                        return { text: "Preparing...", className: "bg-blue-100 text-blue-700" };
                      case "success":
                        return { text: "Ready", className: "bg-green-100 text-green-700" };
                      case "fallback":
                        return fallbackAccepted
                          ? { text: "Estimate accepted", className: "bg-amber-100 text-amber-800" }
                          : { text: "Needs review", className: "bg-red-100 text-red-700" };
                      case "error":
                        return { text: "Error", className: "bg-red-100 text-red-700" };
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
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>

                      {/* File Settings - Collapsible */}
                      {isExpanded && (
                        <div className="border-t border-border p-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <Label className="text-xs">Material</Label>
                                <Link
                                  href="/materials"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                  className="flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:underline"
                                >
                                  <Info className="h-3 w-3" />
                                  Info
                                </Link>
                              </div>
                              <Select
                                value={String(settings[u.id]?.materialId ?? "")}
                                onValueChange={(v) =>
                                  setSettings((s) => ({
                                    ...s,
                                    [u.id]: { ...s[u.id], materialId: Number(v) },
                                  }))
                                }
                                disabled={!Array.isArray(materials) || materials.length === 0}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(Array.isArray(materials) ? materials : []).map((m) => (
                                    <SelectItem key={m.id} value={String(m.id)}>
                                      {m.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Layer Height (mm)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={settings[u.id]?.layerHeight ?? 0.2}
                                onChange={(e) =>
                                  setSettings((s) => ({
                                    ...s,
                                    [u.id]: { ...s[u.id], layerHeight: Number(e.target.value) },
                                  }))
                                }
                                className="h-9"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Infill %</Label>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={settings[u.id]?.infill ?? 20}
                                onChange={(e) =>
                                  setSettings((s) => ({
                                    ...s,
                                    [u.id]: { ...s[u.id], infill: Number(e.target.value) },
                                  }))
                                }
                                className="h-9"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Quantity</Label>
                              <Input
                                type="number"
                                min={1}
                                value={settings[u.id]?.quantity ?? 1}
                                onChange={(e) =>
                                  setSettings((s) => ({
                                    ...s,
                                    [u.id]: { ...s[u.id], quantity: Number(e.target.value) },
                                  }))
                                }
                                className="h-9"
                              />
                            </div>
                            <div className="col-span-2 rounded-md border border-border/70 bg-surface-muted px-3 py-2">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs font-medium text-foreground">Supports</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    Auto-generate support material when overhangs exceed the angle threshold.
                                  </p>
                                </div>
                                <Switch
                                  checked={settings[u.id]?.supportsEnabled ?? true}
                                  onCheckedChange={(checked) =>
                                    setSettings((s) => ({
                                      ...s,
                                      [u.id]: {
                                        ...s[u.id],
                                        supportsEnabled: checked,
                                      },
                                    }))
                                  }
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Support pattern</Label>
                              <Select
                                value={settings[u.id]?.supportPattern ?? "normal"}
                                onValueChange={(value) =>
                                  setSettings((s) => ({
                                    ...s,
                                    [u.id]: {
                                      ...s[u.id],
                                      supportPattern: value as "normal" | "tree",
                                    },
                                  }))
                                }
                                disabled={!settings[u.id]?.supportsEnabled}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="normal">Standard</SelectItem>
                                  <SelectItem value="tree">Organic (Tree)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Support threshold (°)</Label>
                              <Input
                                type="number"
                                min={1}
                                max={89}
                                step="1"
                                value={settings[u.id]?.supportAngle ?? 45}
                                onChange={(e) =>
                                  setSettings((s) => ({
                                    ...s,
                                    [u.id]: {
                                      ...s[u.id],
                                      supportAngle: Number(e.target.value) || 45,
                                    },
                                  }))
                                }
                                disabled={!settings[u.id]?.supportsEnabled}
                                className="h-9"
                              />
                            </div>
                          </div>

                          {(status === "error" || statusMessage) && (
                            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                              <p className="font-medium">Unable to prepare this file</p>
                              <p className="mt-1">{statusMessage ?? "The slicer reported an error."}</p>
                              <p className="mt-2 text-[11px]">
                                Review the orientation or adjust the settings and try preparing again.
                              </p>
                            </div>
                          )}

                          {fallbackActive && (
                            <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                <div className="space-y-2">
                                  <div>
                                    <p className="font-medium">We’re using estimated metrics</p>
                                    <p className="mt-1 text-[11px] text-amber-700">
                                      {statusMessage ||
                                        "The slicer couldn't return precise numbers. Accept this estimate now or re-run Prepare after adjusting settings."}
                                    </p>
                                  </div>
                                  {!fallbackAccepted ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        acceptFallback(u.id);
                                      }}
                                    >
                                      Accept estimate for pricing
                                    </Button>
                                  ) : (
                                    <p className="text-[11px] font-medium text-amber-700">
                                      Estimate accepted. You can re-prepare later for exact numbers.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={computePrice}
                  disabled={uploads.length === 0 || loading || pricing}
                  className={cn(
                    "flex items-center gap-2 bg-blue-600 text-white shadow-md transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60",
                    pricing ? "animate-pulse" : "hover:bg-blue-500"
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
          )}
        </div>

        {/* Right Column - Price Summary & Checkout */}
        <div className="space-y-6">
          {/* Price Summary */}
          {priceData && (
            <section className="rounded-lg border border-border bg-surface-overlay p-6">
              <div className="mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Price Summary</h2>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${priceData.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium">
                    {shippingQuote
                      ? `$${priceData.shipping.toFixed(2)}`
                      : "Awaiting address"}
                  </span>
                </div>
                {shippingQuote ? (
                  <p className="text-xs text-muted-foreground">
                    {shippingQuote.label}
                    {shippingQuote.remoteApplied && shippingQuote.remoteSurcharge
                      ? ` (includes +$${shippingQuote.remoteSurcharge.toFixed(2)} remote surcharge)`
                      : ""}
                  </p>
                ) : null}
                <div className="border-t border-border pt-2">
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total</span>
                    <span>${priceData.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Shipping & Address */}
          {priceData && (
            <section className="rounded-lg border border-border bg-surface-overlay p-6">
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Checkout</h2>
              </div>
              <div className="space-y-4">
                <div className="rounded-md border border-dashed border-border bg-surface-muted p-4">
                  {shippingQuote ? (
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-foreground">
                        {shippingQuote.label} ({shippingQuote.code})
                      </p>
                      <p className="text-muted-foreground">
                        Estimated shipping: ${shippingQuote.amount.toFixed(2)}
                      </p>
                      {shippingQuote.remoteApplied && shippingQuote.remoteSurcharge ? (
                        <p className="text-xs text-amber-600">
                          Remote surcharge +${shippingQuote.remoteSurcharge.toFixed(2)} applied based on postcode.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Provide a state and postcode to calculate shipping.
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={address.name}
                      onChange={(e) => setAddress({ ...address, name: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input
                      value={address.phone}
                      onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Address Line 1</Label>
                    <Input
                      value={address.line1}
                      onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Address Line 2</Label>
                    <Input
                      value={address.line2}
                      onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">City</Label>
                      <Input
                        value={address.city}
                        onChange={(e) => setAddress({ ...address, city: e.target.value })}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">State</Label>
                      <Input
                        value={address.state}
                        onChange={(e) =>
                          setAddress({
                            ...address,
                            state: e.target.value.toUpperCase(),
                          })
                        }
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Postcode</Label>
                    <Input
                      value={address.postcode}
                      onChange={(e) => setAddress({ ...address, postcode: e.target.value })}
                      className="h-9"
                    />
                  </div>
                </div>

                <Button
                  className="w-full bg-blue-600 text-white shadow-md hover:bg-blue-500"
                  onClick={checkout}
                  disabled={!priceData || !shippingQuote || loading}
                >
                  {loading ? "Processing..." : "Place Order"}
                </Button>
              </div>
            </section>
          )}

          {/* Help Card */}
          {uploads.length === 0 && (
            <section className="rounded-lg border border-border bg-surface-overlay p-6">
              <h3 className="mb-2 font-semibold">How it works</h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li>1. Upload your 3D model files</li>
                <li>2. Configure print settings</li>
                <li>3. Get instant pricing</li>
                <li>4. Complete checkout</li>
              </ol>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
