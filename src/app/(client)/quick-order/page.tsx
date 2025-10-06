"use client";

import { useEffect, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Upload as UploadIcon,
  Settings2,
  Package,
  CreditCard,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Upload = { id: string; filename: string; size: number };
type Material = { id: number; name: string; costPerGram: number };

type Step = "upload" | "configure" | "price" | "checkout";

export default function QuickOrderPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [role, setRole] = useState<"ADMIN" | "CLIENT" | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [settings, setSettings] = useState<
    Record<string, { materialId: number; layerHeight: number; infill: number; quantity: number }>
  >({});
  const [metrics, setMetrics] = useState<
    Record<string, { grams: number; timeSec: number; fallback?: boolean }>
  >({});
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [shippingCode, setShippingCode] = useState<string | undefined>(undefined);
  const [shippingOptions, setShippingOptions] = useState<
    { code: string; label: string; amount: number }[]
  >([]);
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append("files", f);
    setLoading(true);
    setError(null);
    const res = await fetch("/api/quick-order/upload", { method: "POST", body: fd });
    setLoading(false);
    if (!res.ok) {
      setError("Upload failed");
      return;
    }
    const { data } = await res.json();
    setUploads((prev) => [...prev, ...data]);
    const defaultMat = Array.isArray(materials) && materials.length > 0 ? materials[0]!.id : undefined;
    const next = { ...settings };
    const newExpanded = new Set(expandedFiles);
    for (const it of data as Upload[]) {
      next[it.id] = { materialId: defaultMat ?? 0, layerHeight: 0.2, infill: 20, quantity: 1 };
      newExpanded.add(it.id); // Auto-expand new files
    }
    setSettings(next);
    setExpandedFiles(newExpanded);
    if (uploads.length === 0) setCurrentStep("configure");
  }

  async function runSlice() {
    setLoading(true);
    setError(null);
    const files = uploads.map((u) => ({
      id: u.id,
      layerHeight: settings[u.id].layerHeight,
      infill: settings[u.id].infill,
      supports: true,
    }));
    const res = await fetch("/api/quick-order/slice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Slicing failed");
      return;
    }
    const { data } = await res.json();
    const next: Record<string, { grams: number; timeSec: number; fallback?: boolean }> = { ...metrics };
    for (const m of data as Array<{ id: string; grams: number; timeSec: number; fallback?: boolean }>) {
      next[m.id] = { grams: m.grams, timeSec: m.timeSec, fallback: m.fallback };
    }
    setMetrics(next);
  }

  async function computePrice() {
    setLoading(true);
    setError(null);
    const items = uploads.map((u) => ({
      fileId: u.id,
      filename: u.filename,
      materialId: settings[u.id].materialId,
      layerHeight: settings[u.id].layerHeight,
      infill: settings[u.id].infill,
      quantity: settings[u.id].quantity,
      metrics: metrics[u.id] ?? { grams: 80, timeSec: 3600, fallback: true },
    }));
    const res = await fetch("/api/quick-order/price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Pricing failed");
      return;
    }
    const { data } = await res.json();
    setShippingOptions(data.shippingOptions ?? []);
    setPriceData({
      subtotal: data.subtotal ?? 0,
      shipping: 0,
      total: data.subtotal ?? 0,
    });
    setCurrentStep("price");
  }

  async function checkout() {
    setLoading(true);
    setError(null);
    const items = uploads.map((u) => ({
      fileId: u.id,
      filename: u.filename,
      materialId: settings[u.id].materialId,
      layerHeight: settings[u.id].layerHeight,
      infill: settings[u.id].infill,
      quantity: settings[u.id].quantity,
      metrics: metrics[u.id] ?? { grams: 80, timeSec: 3600, fallback: true },
    }));
    const res = await fetch("/api/quick-order/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, shippingCode, address }),
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

  const canSlice = uploads.length > 0;
  const hasSlicedAll = uploads.every((u) => metrics[u.id]);

  const steps = [
    { id: "upload", label: "Upload", icon: UploadIcon },
    { id: "configure", label: "Configure", icon: Settings2 },
    { id: "price", label: "Price", icon: Package },
    { id: "checkout", label: "Checkout", icon: CreditCard },
  ] as const;

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

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

      {Object.values(metrics).some((m) => m?.fallback) && (
        <div className="rounded-lg border border-amber-300 bg-yellow-50 p-3 text-xs text-amber-800">
          Slicing metrics are estimated using fallbacks. Install and configure a slicer CLI for accurate results.
        </div>
      )}

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Upload & Files */}
        <div className="space-y-6 lg:col-span-2">
          {/* Upload Section */}
          <section className="rounded-lg border border-border bg-surface-overlay p-6">
            <div className="mb-4 flex items-center gap-2">
              <UploadIcon className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Upload Files</h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file-upload">Select STL or 3MF files</Label>
                <Input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".stl,.3mf"
                  onChange={onUpload}
                  className="mt-1"
                />
              </div>
              {uploads.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{uploads.length} file(s) uploaded</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canSlice || loading}
                    onClick={runSlice}
                  >
                    {loading ? "Slicing..." : hasSlicedAll ? "Re-slice All" : "Slice All"}
                  </Button>
                </div>
              )}
            </div>
          </section>

          {/* Files Configuration - Collapsible with Max Height */}
          {uploads.length > 0 && (
            <section className="rounded-lg border border-border bg-surface-overlay p-6">
              <div className="mb-4 flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">File Settings</h2>
              </div>
              <div className="max-h-[500px] space-y-3 overflow-y-auto pr-2">
                {uploads.map((u) => {
                  const isExpanded = expandedFiles.has(u.id);
                  const hasMetrics = !!metrics[u.id];

                  return (
                    <div key={u.id} className="rounded-lg border border-border bg-background">
                      {/* File Header - Always Visible */}
                      <div
                        className="flex cursor-pointer items-center justify-between p-3 hover:bg-surface-muted"
                        onClick={() => toggleFileExpanded(u.id)}
                      >
                        <div className="flex-1">
                          <div className="font-medium">{u.filename}</div>
                          {hasMetrics && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              ~{Math.round(metrics[u.id].grams)}g, ~
                              {Math.ceil((metrics[u.id].timeSec || 0) / 60)} min
                              {metrics[u.id].fallback ? " (est.)" : ""}
                            </div>
                          )}
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
                              <Label className="text-xs">Material</Label>
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
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={computePrice} disabled={uploads.length === 0 || loading}>
                  Calculate Price
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
                    {shippingCode ? `$${priceData.shipping.toFixed(2)}` : "TBD"}
                  </span>
                </div>
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
                <div>
                  <Label className="text-xs">Shipping Method</Label>
                  <Select value={shippingCode} onValueChange={setShippingCode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select shipping" />
                    </SelectTrigger>
                    <SelectContent>
                      {shippingOptions.map((o) => (
                        <SelectItem key={o.code} value={o.code}>
                          {o.label} {o.amount ? `(+$${o.amount.toFixed(2)})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                        onChange={(e) => setAddress({ ...address, state: e.target.value })}
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

                <Button className="w-full" onClick={checkout} disabled={!shippingCode || loading}>
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
