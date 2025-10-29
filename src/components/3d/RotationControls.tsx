"use client";

import { useMemo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowDownCircle,
  ArrowLeftCircle,
  ArrowRightCircle,
  ArrowUpCircle,
  Axis3D,
  Compass,
  Maximize2,
  RefreshCcw,
  RotateCcw,
  Sparkles,
  Square,
} from "lucide-react";

interface RotationControlsProps {
  onReset: () => void;
  onRecenter: () => void;
  onFitView: () => void;
  onAutoOrient: () => void;
  onLock: () => void;
  onRotate: (axis: "x" | "y" | "z", degrees: number) => void;
  isLocking?: boolean;
  disabled?: boolean;
}

type ControlAction = {
  label: string;
  axis: "x" | "y" | "z";
  degrees: number;
  icon: ReactNode;
};

export default function RotationControls({
  onReset,
  onRecenter,
  onFitView,
  onAutoOrient,
  onLock,
  onRotate,
  isLocking = false,
  disabled = false,
}: RotationControlsProps) {
  const primaryActions = useMemo<ControlAction[]>(
    () => [
      {
        label: "Rotate Left",
        axis: "y",
        degrees: -45,
        icon: <ArrowLeftCircle className="h-4 w-4" />,
      },
      {
        label: "Rotate Right",
        axis: "y",
        degrees: 45,
        icon: <ArrowRightCircle className="h-4 w-4" />,
      },
      {
        label: "Tilt Forward",
        axis: "x",
        degrees: -45,
        icon: <ArrowDownCircle className="h-4 w-4" />,
      },
      {
        label: "Tilt Back",
        axis: "x",
        degrees: 45,
        icon: <ArrowUpCircle className="h-4 w-4" />,
      },
      {
        label: "Rotate Z",
        axis: "z",
        degrees: 90,
        icon: <RotateCcw className="h-4 w-4" />,
      },
    ],
    []
  );

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-overlay/80 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface-overlay/70">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Axis3D className="h-4 w-4" />
          Orientation Controls
        </div>
        <p className="text-xs text-muted-foreground">
          Fine tune orientation before locking it in.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-5">
        {primaryActions.map((action) => (
          <Button
            key={`${action.axis}-${action.degrees}`}
            type="button"
            variant="outline"
            disabled={disabled}
            className="flex w-full items-center justify-center gap-2"
            onClick={() => onRotate(action.axis, action.degrees)}
          >
            {action.icon}
            <span className="text-xs font-medium">{action.label}</span>
          </Button>
        ))}
      </div>

      <Separator className="bg-border/60" />

      <div className="grid gap-2 sm:grid-cols-5">
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          className="flex w-full items-center justify-center gap-2"
          onClick={onRecenter}
        >
          <Square className="h-4 w-4" />
          Recenter
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          className="flex w-full items-center justify-center gap-2"
          onClick={onFitView}
        >
          <Maximize2 className="h-4 w-4" />
          Fit View
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          className="flex w-full items-center justify-center gap-2"
          onClick={onAutoOrient}
        >
          <Sparkles className="h-4 w-4" />
          Auto Orient
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="flex w-full items-center justify-center gap-2"
          onClick={onReset}
        >
          <RefreshCcw className="h-4 w-4" />
          Reset
        </Button>
        <Button
          type="button"
          disabled={disabled || isLocking}
          className="flex w-full items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-500"
          onClick={onLock}
        >
          {isLocking ? (
            <>
              <Compass className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Compass className="h-4 w-4" />
              Lock Orientation
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
