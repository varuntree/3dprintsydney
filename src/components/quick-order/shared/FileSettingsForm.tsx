import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuickOrder } from "../context/QuickOrderContext";
import { useOrientationStore } from "@/stores/orientation-store";

export function FileSettingsForm({ fileId }: { fileId: string }) {
  const {
    settings,
    setSettings,
    materials,
    fileStatuses,
    metrics,
    acceptedFallbacks,
    acceptFallback,
    currentlyOrienting,
  } = useQuickOrder();

  const fileSettings = settings[fileId];
  const status = fileStatuses[fileId]?.state ?? "idle";
  const statusMessage = fileStatuses[fileId]?.message;
  const fallbackActive = metrics[fileId]?.fallback ?? false;
  const fallbackAccepted = acceptedFallbacks.has(fileId);

  if (!fileSettings) return null;

  return (
    <div className="border-t border-border p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Material</Label>
          <Select
            value={String(fileSettings.materialId ?? "")}
            onValueChange={(v) =>
              setSettings((s) => ({
                ...s,
                [fileId]: { ...s[fileId], materialId: Number(v) },
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
          <Label className="text-xs">Layer Height</Label>
          <Select
            value={String(fileSettings.layerHeight ?? 0.2)}
            onValueChange={(v) =>
              setSettings((s) => ({
                ...s,
                [fileId]: { ...s[fileId], layerHeight: Number(v) },
              }))
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.12">0.12mm - Fine</SelectItem>
              <SelectItem value="0.16">0.16mm - High</SelectItem>
              <SelectItem value="0.20">0.20mm - Standard</SelectItem>
              <SelectItem value="0.28">0.28mm - Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Infill %</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={fileSettings.infill ?? 20}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                [fileId]: { ...s[fileId], infill: Number(e.target.value) },
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
            value={fileSettings.quantity ?? 1}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                [fileId]: { ...s[fileId], quantity: Number(e.target.value) },
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
              checked={fileSettings.supportsEnabled ?? true}
              onCheckedChange={(checked) => {
                setSettings((s) => ({
                  ...s,
                  [fileId]: {
                    ...s[fileId],
                    supportsEnabled: checked,
                  },
                }));
                if (currentlyOrienting === fileId) {
                  useOrientationStore.getState().setSupportsEnabled(checked);
                }
              }}
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Support pattern</Label>
          <Select value={"normal"} disabled>
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
          <Label className="text-xs">Support style</Label>
          <Select value={"grid"} disabled>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">Grid / Linear</SelectItem>
              <SelectItem value="organic">Organic</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Support threshold (°)</Label>
          <Input type="number" min={1} max={89} step="1" value={45} disabled className="h-9" />
        </div>
        <div>
          <Label className="text-xs">Interface layers</Label>
          <Input type="number" min={1} max={6} step="1" disabled className="h-9" />
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
                    acceptFallback(fileId);
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
  );
}
