"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Axis3D,
  Box,
  Compass,
  Grid,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { PanDirection, ViewPreset } from "./ModelViewer";
import { cn } from "@/lib/utils";

interface ViewNavigationControlsProps {
  onPan: (direction: PanDirection) => void;
  onZoom: (direction: "in" | "out") => void;
  onPreset: (preset: ViewPreset) => void;
  onFit: () => void;
  onReset: () => void;
  onToggleHelpers: () => void;
  helpersVisible: boolean;
  disabled?: boolean;
  className?: string;
  mode?: "full" | "presets-only";
}

const presetButtons: Array<{ label: string; preset: ViewPreset; title: string }> = [
  { label: "Top", preset: "top", title: "Top view" },
  { label: "Bottom", preset: "bottom", title: "Bottom view" },
  { label: "Front", preset: "front", title: "Front view" },
  { label: "Back", preset: "back", title: "Back view" },
  { label: "Left", preset: "left", title: "Left side view" },
  { label: "Right", preset: "right", title: "Right side view" },
  { label: "Iso", preset: "iso", title: "Isometric view" },
];

export default function ViewNavigationControls({
  onPan,
  onZoom,
  onPreset,
  onFit,
  onReset,
  onToggleHelpers,
  helpersVisible,
  disabled = false,
  className,
  mode = "full",
}: ViewNavigationControlsProps) {
  const presets = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {presetButtons.map((btn) => (
        <Button
          key={btn.preset}
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => onPreset(btn.preset)}
          className="justify-center py-2 text-sm"
          title={btn.title}
        >
          {btn.label}
        </Button>
      ))}
    </div>
  );

  if (mode === "presets-only") {
    return (
      <div
        className={cn(
          "w-full space-y-3 rounded-t-xl border border-border bg-surface-overlay/80 p-3 text-xs shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface-overlay/70",
          className
        )}
      >
        {presets}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full space-y-4 rounded-xl border border-border bg-surface-overlay/80 p-4 text-xs shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface-overlay/70",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Axis3D className="h-4 w-4" />
          View Controls
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={helpersVisible ? "default" : "outline"}
            className="h-8 gap-1 text-xs"
            disabled={disabled}
            onClick={onToggleHelpers}
            title={helpersVisible ? "Hide axes/grid" : "Show axes/grid"}
          >
            <Grid className="h-3.5 w-3.5" />
            {helpersVisible ? "Hide" : "Show"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="grid grid-cols-3 gap-2 place-items-center">
          <span />
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={disabled}
            className="h-9 w-9"
            onClick={() => onPan("up")}
            title="Pan up"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <span />

          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={disabled}
            className="h-9 w-9"
            onClick={() => onPan("left")}
            title="Pan left"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            disabled={disabled}
            className="h-9 w-9"
            onClick={() => onPreset("iso")}
            title="Set isometric view"
          >
            <Compass className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={disabled}
            className="h-9 w-9"
            onClick={() => onPan("right")}
            title="Pan right"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>

          <span />
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={disabled}
            className="h-9 w-9"
            onClick={() => onPan("down")}
            title="Pan down"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <span />
        </div>

        <div className="flex flex-col items-center justify-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={disabled}
            className="h-9 w-9"
            onClick={() => onZoom("in")}
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={disabled}
            className="h-9 w-9"
            onClick={() => onZoom("out")}
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={disabled}
            onClick={onFit}
            className="flex h-10 items-center justify-center gap-2 text-sm"
          >
            <Box className="h-4 w-4" />
            Fit View
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={onReset}
            className="flex h-10 items-center justify-center gap-2 text-xs"
          >
            Reset View
          </Button>
        </div>
      </div>

      <Separator className="bg-border/60" />
      {presets}
    </div>
  );
}
