"use client";

import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/currency";
import { useOrientationStore, useSupports } from "@/stores/orientation-store";
import { cn } from "@/lib/utils";
import {
  ArrowDownCircle,
  ArrowLeftCircle,
  ArrowRightCircle,
  ArrowUpCircle,
  RotateCcw,
  AlertTriangle,
  Loader2,
  Sparkles,
  Maximize2,
  Grid,
  RefreshCcw,
  Pointer,
  Compass,
} from "lucide-react";

interface OrientationControlsProps {
  onReset: () => void;
  onRecenter: () => void;
  onFitView: () => void;
  onAutoOrient: () => void;
  onLock: () => void;
  onRotate: (axis: "x" | "y" | "z", degrees: number) => void;
  onToggleHelpers: () => void;
  helpersVisible: boolean;
  isLocking?: boolean;
  disabled?: boolean;
  onOrientToFaceToggle?: (enabled: boolean) => void;
  orientToFaceActive?: boolean;
  supportCostPerGram?: number;
  lockGuardReason?: string;
  className?: string;
}

type ControlAction = {
  label: string;
  axis: "x" | "y" | "z";
  degrees: number;
  icon: ReactNode;
};

export default function OrientationControls({
  onReset,
  onRecenter,
  onFitView,
  onAutoOrient,
  onLock,
  onRotate,
  onToggleHelpers,
  helpersVisible,
  isLocking = false,
  disabled = false,
  onOrientToFaceToggle,
  orientToFaceActive,
  supportCostPerGram = 0.25,
  lockGuardReason,
  className,
}: OrientationControlsProps) {
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

  type AxisKey = "x" | "y" | "z";

  const quaternionTuple = useOrientationStore((state) => state.quaternion);
  const positionTuple = useOrientationStore((state) => state.position);
  const setOrientationState = useOrientationStore((state) => state.setOrientation);
  const {
    supportVolume,
    supportWeight,
    autoOrientStatus,
    autoOrientMessage,
    analysisStatus,
    interactionDisabled,
    interactionMessage,
    warnings,
  } = useSupports();

  const overhangStatus = analysisStatus;
  const overhangMessage = warnings[0] ?? interactionMessage ?? autoOrientMessage;

  const quaternion = useMemo(() => new THREE.Quaternion(...quaternionTuple), [quaternionTuple]);
  const currentEuler = useMemo(() => {
    const euler = new THREE.Euler().setFromQuaternion(quaternion, "XYZ");
    const toDegrees = (value: number) => {
      const deg = THREE.MathUtils.radToDeg(value);
      const normalized = ((deg % 360) + 360) % 360;
      return Math.round(normalized * 10) / 10;
    };
    return { x: toDegrees(euler.x), y: toDegrees(euler.y), z: toDegrees(euler.z) };
  }, [quaternion]);

  const [angleInputs, setAngleInputs] = useState(currentEuler);
  useEffect(() => {
    setAngleInputs((prev) => {
      if (prev.x === currentEuler.x && prev.y === currentEuler.y && prev.z === currentEuler.z) {
        return prev;
      }
      return currentEuler;
    });
  }, [currentEuler]);

  const normalizeAngle = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    const normalized = ((value % 360) + 360) % 360;
    return Math.round(normalized * 10) / 10;
  };

  const applyAngles = (nextAngles: Record<AxisKey, number>) => {
    const clamped: Record<AxisKey, number> = {
      x: normalizeAngle(nextAngles.x),
      y: normalizeAngle(nextAngles.y),
      z: normalizeAngle(nextAngles.z),
    };
    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(clamped.x),
      THREE.MathUtils.degToRad(clamped.y),
      THREE.MathUtils.degToRad(clamped.z),
      "XYZ"
    );
    const newQuat = new THREE.Quaternion().setFromEuler(euler);
    setOrientationState([newQuat.x, newQuat.y, newQuat.z, newQuat.w], positionTuple);
  };

  const handleAngleInput = (axis: AxisKey, value: string) => {
    const numeric = Number(value);
    setAngleInputs((prev) => ({ ...prev, [axis]: Number.isNaN(numeric) ? 0 : numeric }));
  };

  const handleAngleCommit = () => {
    applyAngles(angleInputs);
  };

  const handleAngleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAngleCommit();
    }
  };

  const [internalFaceSelect, setInternalFaceSelect] = useState(false);
  const faceSelectionEnabled = orientToFaceActive ?? internalFaceSelect;

  const toggleFaceSelection = () => {
    const next = !faceSelectionEnabled;
    if (orientToFaceActive === undefined) {
      setInternalFaceSelect(next);
    }
    onOrientToFaceToggle?.(next);
  };

  const controlsDisabled = disabled || interactionDisabled;
  const actionButtonClasses =
    "flex flex-col items-center justify-center gap-1 h-auto py-2 px-1 text-xs whitespace-normal break-words text-center";

  const supportGrams = supportWeight || supportVolume;
  const supportCost = supportGrams * supportCostPerGram;

  useEffect(() => {
    if (!controlsDisabled || !faceSelectionEnabled) return;
    if (orientToFaceActive === undefined) {
      setInternalFaceSelect(false);
    }
    onOrientToFaceToggle?.(false);
  }, [controlsDisabled, faceSelectionEnabled, onOrientToFaceToggle, orientToFaceActive]);

  return (
    <div className={cn("flex flex-col gap-4 p-4 bg-surface-overlay/90 backdrop-blur rounded-xl border border-border shadow-lg", className)}>
      
      {/* Top Row: View Controls & Auto Orient */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
           <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onFitView}
            title="Fit View"
            className="h-8 w-8 p-0"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={helpersVisible ? "secondary" : "ghost"}
            size="sm"
            onClick={onToggleHelpers}
            title="Toggle Grid"
             className="h-8 w-8 p-0"
          >
            <Grid className="h-4 w-4" />
          </Button>
           <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            title="Reset View & Orientation"
             className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex gap-2">
            <Button
                type="button"
                variant={faceSelectionEnabled ? "default" : "outline"}
                size="sm"
                onClick={toggleFaceSelection}
                disabled={controlsDisabled}
                className="h-8 text-xs gap-1.5"
            >
                <Pointer className="h-3.5 w-3.5" />
                {faceSelectionEnabled ? "Pick Face" : "Orient to Face"}
            </Button>
             <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onAutoOrient}
                disabled={controlsDisabled}
                className="h-8 text-xs gap-1.5"
            >
                <Sparkles className="h-3.5 w-3.5" />
                Auto Orient
            </Button>
        </div>
      </div>

      <Separator />

      {/* Rotation Controls */}
      <div className="space-y-3">
        <div className="grid grid-cols-5 gap-1">
           {primaryActions.map((action) => (
            <Button
              key={`${action.axis}-${action.degrees}`}
              type="button"
              variant="outline"
              disabled={controlsDisabled}
              className={actionButtonClasses}
              onClick={() => onRotate(action.axis, action.degrees)}
              title={action.label}
            >
              {action.icon}
              <span className="sr-only">{action.label}</span>
            </Button>
          ))}
        </div>

         <div className="grid grid-cols-3 gap-2">
          {(Object.keys(angleInputs) as AxisKey[]).map((axis) => (
            <label key={axis} className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/30 rounded-md px-2 py-1 border border-border/50">
              <span className="uppercase">{axis}</span>
              <input
                type="number"
                min={0}
                max={359}
                step={1}
                value={angleInputs[axis]}
                disabled={disabled}
                onChange={(event) => handleAngleInput(axis, event.target.value)}
                onBlur={handleAngleCommit}
                onKeyDown={handleAngleKeyDown}
                className="w-full min-w-0 bg-transparent text-foreground text-right focus:outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-muted-foreground/50">°</span>
            </label>
          ))}
        </div>
      </div>

      {/* Status & Warnings */}
       <div className="space-y-2 min-h-[1.5rem]">
        {(autoOrientStatus === "running" || overhangStatus === "running") && (
             <StatusPill tone="primary">
                <Loader2 className="h-3 w-3 animate-spin" />
                {autoOrientStatus === "running" ? (autoOrientMessage ?? "Calculating…") : (overhangMessage ?? "Checking supports…")}
             </StatusPill>
        )}
        {(autoOrientStatus === "timeout" || autoOrientStatus === "error" || overhangStatus === "error" || lockGuardReason || warnings.length > 0 || (interactionDisabled && interactionMessage)) && (
             <div className="rounded-md bg-amber-50 p-2 text-xs text-amber-800 border border-amber-200">
                 {lockGuardReason && <div className="font-medium mb-1">{lockGuardReason}</div>}
                 {interactionDisabled && interactionMessage && <div className="mb-1">{interactionMessage}</div>}
                 {warnings.map((w, i) => <div key={i}>• {w}</div>)}
                 {autoOrientStatus === "timeout" && <div>Auto-orient timed out</div>}
                 {autoOrientStatus === "error" && <div>Auto-orient failed</div>}
             </div>
        )}
      </div>

      <Separator />

      {/* Footer: Lock & Costs */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-xs">
             <div className="text-muted-foreground">
                 Supports: <span className="font-medium text-foreground">{supportGrams > 0 ? `${supportGrams.toFixed(1)}g` : "0g"}</span>
             </div>
              <div className="text-muted-foreground">
                 Cost: <span className="font-medium text-foreground">{formatCurrency(supportCost)}</span>
             </div>
        </div>
        
        <Button
          type="button"
          disabled={disabled || isLocking || interactionDisabled || Boolean(lockGuardReason)}
          className="w-full gap-2"
          onClick={onLock}
          size="lg"
        >
          {isLocking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving Orientation…
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

const STATUS_PILL_TONES = {
  primary: "bg-blue-600/10 text-blue-700",
  warning: "bg-amber-500/15 text-amber-800",
  danger: "bg-destructive/10 text-destructive",
  muted: "bg-muted/60 text-muted-foreground",
} as const;

function StatusPill({ tone = "muted", children }: { tone?: keyof typeof STATUS_PILL_TONES; children: ReactNode }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_PILL_TONES[tone]}`}
    >
      {children}
    </div>
  );
}
