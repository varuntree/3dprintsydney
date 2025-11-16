"use client";

import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/currency";
import { useOrientationStore, useSupports } from "@/stores/orientation-store";
import {
  ArrowDownCircle,
  ArrowLeftCircle,
  ArrowRightCircle,
  ArrowUpCircle,
  Axis3D,
  Compass,
  Maximize2,
  Pointer,
  RefreshCcw,
  RotateCcw,
  AlertTriangle,
  Loader2,
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
  onOrientToFaceToggle?: (enabled: boolean) => void;
  orientToFaceActive?: boolean;
  supportCostPerGram?: number;
  lockGuardReason?: string;
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
  onOrientToFaceToggle,
  orientToFaceActive,
  supportCostPerGram = 0.25,
  lockGuardReason,
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
    "flex w-full items-center justify-center gap-1.5 whitespace-normal break-words text-center sm:gap-2";
  const rotationGridClasses = "grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2";
  const utilityGridClasses = "grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2";

  const utilityActions = useMemo(
    () => [
      {
        key: "recenter",
        label: "Recenter",
        icon: <Square className="h-4 w-4 flex-shrink-0" />,
        onClick: onRecenter,
        variant: "secondary" as const,
      },
      {
        key: "fit-view",
        label: "Fit View",
        icon: <Maximize2 className="h-4 w-4 flex-shrink-0" />,
        onClick: onFitView,
        variant: "secondary" as const,
      },
      {
        key: "auto-orient",
        label: "Auto Orient",
        icon: <Sparkles className="h-4 w-4 flex-shrink-0" />,
        onClick: onAutoOrient,
        variant: "secondary" as const,
      },
      {
        key: "face-select",
        label: faceSelectionEnabled ? "Click model face" : "Orient to Face",
        icon: <Pointer className="h-4 w-4 flex-shrink-0" />,
        onClick: toggleFaceSelection,
        variant: faceSelectionEnabled ? "default" : "outline",
      },
      {
        key: "reset",
        label: "Reset",
        icon: <RefreshCcw className="h-4 w-4 flex-shrink-0" />,
        onClick: onReset,
        variant: "outline" as const,
      },
    ],
    [
      faceSelectionEnabled,
      onRecenter,
      onFitView,
      onAutoOrient,
      toggleFaceSelection,
      onReset,
    ]
  );

  useEffect(() => {
    if (!controlsDisabled || !faceSelectionEnabled) return;
    if (orientToFaceActive === undefined) {
      setInternalFaceSelect(false);
    }
    onOrientToFaceToggle?.(false);
  }, [controlsDisabled, faceSelectionEnabled, onOrientToFaceToggle, orientToFaceActive]);

  const supportGrams = supportWeight || supportVolume;
  const supportCost = supportGrams * supportCostPerGram;

  return (
    <div className="w-full min-w-0 space-y-3 rounded-xl border border-border bg-surface-overlay/80 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface-overlay/70">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Axis3D className="h-4 w-4" />
          Orientation Controls
        </div>
        <div className="flex items-center gap-2" />
      </div>
      <p className="text-xs text-muted-foreground">
        Fine tune orientation before locking it in.
      </p>

      <div className={rotationGridClasses}>
        {primaryActions.map((action) => (
          <Button
            key={`${action.axis}-${action.degrees}`}
            type="button"
            variant="outline"
            disabled={controlsDisabled}
            className={actionButtonClasses}
            onClick={() => onRotate(action.axis, action.degrees)}
          >
            {action.icon}
            <span className="text-xs font-medium">{action.label}</span>
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {autoOrientStatus === "running" && (
          <StatusPill tone="primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {autoOrientMessage ?? "Calculating best orientation…"}
          </StatusPill>
        )}
        {autoOrientStatus === "timeout" && (
          <StatusPill tone="warning">
            <AlertTriangle className="h-3.5 w-3.5" />
            {autoOrientMessage ?? "Auto-orient timed out. Result simplified."}
          </StatusPill>
        )}
        {autoOrientStatus === "error" && (
          <StatusPill tone="danger">
            <AlertTriangle className="h-3.5 w-3.5" />
            {autoOrientMessage ?? "Auto-orient failed. Orientation reset."}
          </StatusPill>
        )}
        {overhangStatus === "running" && (
          <StatusPill tone="muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {overhangMessage ?? "Detecting overhangs…"}
          </StatusPill>
        )}
        {overhangStatus === "error" && (
          <StatusPill tone="warning">
            <AlertTriangle className="h-3.5 w-3.5" />
            {overhangMessage ?? "Overhang preview unavailable."}
          </StatusPill>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {(Object.keys(angleInputs) as AxisKey[]).map((axis) => (
          <label key={axis} className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            {axis.toUpperCase()} Rotation
            <Input
              type="number"
              min={0}
              max={359}
              step={1}
              value={angleInputs[axis]}
              disabled={disabled}
              onChange={(event) => handleAngleInput(axis, event.target.value)}
              onBlur={handleAngleCommit}
              onKeyDown={handleAngleKeyDown}
              className="text-sm"
            />
          </label>
        ))}
      </div>
      <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>Current rotation</span>
        <span className="font-medium text-foreground">
          X {currentEuler.x.toFixed(1)}° · Y {currentEuler.y.toFixed(1)}° · Z {currentEuler.z.toFixed(1)}°
        </span>
      </div>

      <Separator className="bg-border/60" />

      <div className={utilityGridClasses}>
        {utilityActions.map((action) => (
          <Button
            key={action.key}
            type="button"
            variant={action.variant}
            disabled={controlsDisabled}
            className={actionButtonClasses}
            onClick={action.onClick}
          >
            {action.icon}
            <span className="text-xs sm:text-sm">{action.label}</span>
          </Button>
        ))}
        <Button
          type="button"
          disabled={disabled || isLocking || interactionDisabled || Boolean(lockGuardReason)}
          className="flex w-full items-center justify-center gap-1.5 bg-black text-white hover:bg-black/90"
          onClick={onLock}
        >
          {isLocking ? (
            <>
              <Compass className="h-4 w-4 flex-shrink-0 animate-spin" />
              <span className="text-xs sm:text-sm">Saving…</span>
            </>
          ) : (
            <>
              <Compass className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Lock Orientation</span>
            </>
          )}
        </Button>
      </div>

      {lockGuardReason ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {lockGuardReason}
        </div>
      ) : null}

      {interactionDisabled && interactionMessage ? (
        <div className="rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {interactionMessage}
        </div>
      ) : null}

      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <ul className="list-disc space-y-1 pl-4">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-1 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span className="font-medium text-foreground">Estimated supports</span>
          <span className="text-sm font-semibold text-foreground">
            {supportGrams > 0 ? `${supportGrams.toFixed(1)}g` : "0g"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Cost impact</span>
          <span className="font-medium text-foreground">{formatCurrency(supportCost)}</span>
        </div>
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
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium ${STATUS_PILL_TONES[tone]}`}
    >
      {children}
    </span>
  );
}
