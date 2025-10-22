"use client";

import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Maximize2,
  Lock,
  Loader2,
} from "lucide-react";

interface RotationControlsProps {
  onReset: () => void;
  onCenter: () => void;
  onLockOrientation: () => void;
  isLocking?: boolean;
  disabled?: boolean;
}

export default function RotationControls({
  onReset,
  onCenter,
  onLockOrientation,
  isLocking = false,
  disabled = false,
}: RotationControlsProps) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface-overlay p-3 sm:space-y-4 sm:p-4">
      {/* Header - Mobile optimized: Stack on mobile */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold">Rotation Controls</h3>
        <p className="text-xs text-muted-foreground">
          Rotate using mouse/touch for optimal orientation
        </p>
      </div>

      {/* Action Buttons - Mobile optimized: Full-width on mobile, auto width on sm+ */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          size="default"
          variant="outline"
          onClick={onReset}
          disabled={disabled}
          className="flex w-full items-center justify-center gap-2 sm:w-auto"
        >
          <RefreshCw className="h-4 w-4" />
          Reset
        </Button>
        <Button
          size="default"
          variant="outline"
          onClick={onCenter}
          disabled={disabled}
          className="flex w-full items-center justify-center gap-2 sm:w-auto"
        >
          <Maximize2 className="h-4 w-4" />
          Center
        </Button>
        <Button
          size="default"
          onClick={onLockOrientation}
          disabled={disabled || isLocking}
          className="flex w-full items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-500 sm:ml-auto sm:w-auto"
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
