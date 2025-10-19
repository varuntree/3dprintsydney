"use client";

import { Button } from "@/components/ui/button";
import {
  RotateCw,
  RotateCcw,
  RefreshCw,
  Maximize2,
  Lock,
  Loader2,
} from "lucide-react";

interface RotationControlsProps {
  onRotate: (axis: "x" | "y" | "z", degrees: number) => void;
  onReset: () => void;
  onCenter: () => void;
  onLockOrientation: () => void;
  isLocking?: boolean;
  disabled?: boolean;
}

export default function RotationControls({
  onRotate,
  onReset,
  onCenter,
  onLockOrientation,
  isLocking = false,
  disabled = false,
}: RotationControlsProps) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface-overlay p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Rotation Controls</h3>
        <p className="text-xs text-muted-foreground">
          Rotate your model for optimal print orientation
        </p>
      </div>

      {/* Rotation Axes */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* X Axis */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            X Axis (Front-Back)
          </label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRotate("x", -90)}
              disabled={disabled}
              className="flex-1"
              title="Rotate -90° around X-axis"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRotate("x", 90)}
              disabled={disabled}
              className="flex-1"
              title="Rotate +90° around X-axis"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Y Axis */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Y Axis (Left-Right)
          </label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRotate("y", -90)}
              disabled={disabled}
              className="flex-1"
              title="Rotate -90° around Y-axis"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRotate("y", 90)}
              disabled={disabled}
              className="flex-1"
              title="Rotate +90° around Y-axis"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Z Axis */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Z Axis (Spin)
          </label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRotate("z", -90)}
              disabled={disabled}
              className="flex-1"
              title="Rotate -90° around Z-axis"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRotate("z", 90)}
              disabled={disabled}
              className="flex-1"
              title="Rotate +90° around Z-axis"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button
          size="sm"
          variant="outline"
          onClick={onReset}
          disabled={disabled}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Reset
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCenter}
          disabled={disabled}
          className="flex items-center gap-2"
        >
          <Maximize2 className="h-4 w-4" />
          Center
        </Button>
        <Button
          size="sm"
          onClick={onLockOrientation}
          disabled={disabled || isLocking}
          className="ml-auto flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-500"
        >
          {isLocking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Locking...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Lock Orientation
            </>
          )}
        </Button>
      </div>

      {/* Help Text */}
      <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-800">
        <p className="font-medium">💡 Tip:</p>
        <p className="mt-1">
          Orient your model so the largest flat surface touches the build plate.
          This reduces support material and improves print quality.
        </p>
      </div>
    </div>
  );
}
