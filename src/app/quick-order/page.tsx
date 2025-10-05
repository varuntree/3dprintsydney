"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Upload = { id: string; filename: string; size: number };
type Material = { id: number; name: string; costPerGram: number };

export default function QuickOrderPage() {
  const router = useRouter();
  const [priced, setPriced] = useState(false);
  const [role, setRole] = useState<"ADMIN" | "CLIENT" | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [settings, setSettings] = useState<Record<string, { materialId: number; layerHeight: number; infill: number; quantity: number }>>({});
  const [metrics, setMetrics] = useState<Record<string, { grams: number; timeSec: number; fallback?: boolean }>>({});
  const [shippingCode, setShippingCode] = useState<string | undefined>(undefined);
  const [shippingOptions, setShippingOptions] = useState<{ code: string; label: string; amount: number }[]>([]);
  const [address, setAddress] = useState({ name: "", line1: "", line2: "", city: "", state: "", postcode: "", phone: "" });
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
    fetch("/api/materials").then(async (r) => {
      const j = await r.json();
      setMaterials(j.data ?? j);
    });
  }, [router]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append("files", f);
    setLoading(true);
    const res = await fetch("/api/quick-order/upload", { method: "POST", body: fd });
    setLoading(false);
    if (!res.ok) { setError("Upload failed"); return; }
    const { data } = await res.json();
    setUploads((prev) => [...prev, ...data]);
    const defaultMat = materials[0]?.id ?? 1;
    const next = { ...settings };
    for (const it of data as Upload[]) {
      next[it.id] = { materialId: defaultMat, layerHeight: 0.2, infill: 20, quantity: 1 };
    }
    setSettings(next);
  }

  async function runSlice() {
    setLoading(true);
    setError(null);
    const files = uploads.map((u) => ({ id: u.id, layerHeight: settings[u.id].layerHeight, infill: settings[u.id].infill, supports: true }));
    const res = await fetch("/api/quick-order/slice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ files }) });
    setLoading(false);
    if (!res.ok) { setError("Slicing failed"); return; }
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
    const res = await fetch("/api/quick-order/price", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
    setLoading(false);
    if (!res.ok) { setError("Pricing failed"); return; }
    const { data } = await res.json();
    setShippingOptions(data.shippingOptions ?? []);
    setPriced(true);
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
    const res = await fetch("/api/quick-order/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, shippingCode, address }) });
    setLoading(false);
    if (!res.ok) { setError("Checkout failed"); return; }
    const { data } = await res.json();
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    } else {
      const dest = role === 'CLIENT' ? `/client/orders/${data.invoiceId}` : `/invoices/${data.invoiceId}`;
      router.replace(dest);
    }
  }

  const canSlice = uploads.length > 0;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Quick Order</h1>
        <p className="text-sm text-muted-foreground">Upload, set basic options, slice for estimates, price, and checkout — all on one page.</p>
        {Object.values(metrics).some(m => m?.fallback) ? (
          <p className="mt-2 rounded-md border border-amber-300 bg-yellow-50 px-3 py-2 text-xs text-amber-800">
            Slicing metrics are estimated using fallbacks. Install and configure a slicer CLI to improve accuracy.
          </p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upload */}
        <section className="space-y-4 rounded-lg border border-border bg-surface-overlay p-4">
          <div className="space-y-2">
            <Label>Upload STL/3MF</Label>
            <Input type="file" multiple accept=".stl,.3mf" onChange={onUpload} />
          </div>
          {uploads.length > 0 && (
            <div className="text-sm text-muted-foreground">{uploads.length} file(s) added.</div>
          )}
          <div className="flex justify-end">
            <Button disabled={!canSlice || loading} onClick={runSlice}>Slice all</Button>
          </div>
        </section>

        {/* Settings per file */}
        <section className="space-y-3 rounded-lg border border-border bg-surface-overlay p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Settings</h2>
            <Button variant="outline" size="sm" disabled={uploads.length === 0 || loading} onClick={computePrice}>Calculate price</Button>
          </div>
          {uploads.length === 0 ? (
            <p className="text-sm text-muted-foreground">Upload files to configure.</p>
          ) : (
            uploads.map((u) => (
              <div key={u.id} className="rounded border border-border p-3">
                <div className="mb-2 text-sm font-medium">{u.filename}</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <Label>Material</Label>
                    <Select value={String(settings[u.id]?.materialId ?? "")} onValueChange={(v) => setSettings((s) => ({ ...s, [u.id]: { ...s[u.id], materialId: Number(v) } }))}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {materials.map((m) => (
                          <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Quality (layer mm)</Label>
                    <Input type="number" step="0.01" value={settings[u.id]?.layerHeight ?? 0.2} onChange={(e) => setSettings((s) => ({ ...s, [u.id]: { ...s[u.id], layerHeight: Number(e.target.value) } }))} />
                  </div>
                  <div>
                    <Label>Infill %</Label>
                    <Input type="number" min={0} max={100} value={settings[u.id]?.infill ?? 20} onChange={(e) => setSettings((s) => ({ ...s, [u.id]: { ...s[u.id], infill: Number(e.target.value) } }))} />
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input type="number" min={1} value={settings[u.id]?.quantity ?? 1} onChange={(e) => setSettings((s) => ({ ...s, [u.id]: { ...s[u.id], quantity: Number(e.target.value) } }))} />
                  </div>
                </div>
                {metrics[u.id] && (
                  <div className="mt-2 text-xs text-muted-foreground">~{Math.round(metrics[u.id].grams)} g, ~{Math.ceil((metrics[u.id].timeSec||0)/60)} min {metrics[u.id].fallback ? "(est.)" : ""}</div>
                )}
              </div>
            ))
          )}
        </section>

        {/* Shipping + address */}
        <section className="space-y-4 rounded-lg border border-border bg-surface-overlay p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Shipping</Label>
              <Select value={shippingCode} onValueChange={setShippingCode}>
                <SelectTrigger className="w-full"><SelectValue placeholder={priced ? "Select shipping" : "Calculate price first"} /></SelectTrigger>
                <SelectContent>
                  {shippingOptions.map((o) => (
                    <SelectItem key={o.code} value={o.code}>{o.label} {o.amount ? `(+${o.amount.toFixed(2)})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="hidden sm:block" />
            <div>
              <Label>Name</Label>
              <Input value={address.name} onChange={(e) => setAddress({ ...address, name: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Address line 1</Label>
              <Input value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Address line 2</Label>
              <Input value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} />
            </div>
            <div>
              <Label>City</Label>
              <Input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
            </div>
            <div>
              <Label>State</Label>
              <Input value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
            </div>
            <div>
              <Label>Postcode</Label>
              <Input value={address.postcode} onChange={(e) => setAddress({ ...address, postcode: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end"><Button onClick={checkout} disabled={uploads.length===0 || loading}>Checkout</Button></div>
        </section>
      </div>
    </div>
  );
}
