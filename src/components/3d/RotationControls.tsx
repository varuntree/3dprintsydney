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
    overhangStatus,
    overhangMessage,
    autoOrientStatus,
    autoOrientMessage,
    interactionDisabled,
    interactionMessage,
    warnings,
  } = useSupports();

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
    <div className="space-y-3 rounded-xl border border-border bg-surface-overlay/80 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface-overlay/70">
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

      <div className="grid gap-2 sm:grid-cols-5">
        {primaryActions.map((action) => (
          <Button
            key={`${action.axis}-${action.degrees}`}
            type="button"
            variant="outline"
            disabled={controlsDisabled}
            className="flex w-full items-center justify-center gap-2"
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

      <div className="grid gap-2 sm:grid-cols-3">
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
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Current rotation</span>
        <span className="font-medium text-foreground">
          X {currentEuler.x.toFixed(1)}° · Y {currentEuler.y.toFixed(1)}° · Z {currentEuler.z.toFixed(1)}°
        </span>
      </div>

      <Separator className="bg-border/60" />

      <div className="grid gap-2 sm:grid-cols-6">
        <Button
          type="button"
          variant="secondary"
          disabled={controlsDisabled}
          className="flex w-full items-center justify-center gap-2"
          onClick={onRecenter}
        >
          <Square className="h-4 w-4" />
          Recenter
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={controlsDisabled}
          className="flex w-full items-center justify-center gap-2"
          onClick={onFitView}
        >
          <Maximize2 className="h-4 w-4" />
          Fit View
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={controlsDisabled}
          className="flex w-full items-center justify-center gap-2"
          onClick={onAutoOrient}
        >
          <Sparkles className="h-4 w-4" />
          Auto Orient
        </Button>
        <Button
          type="button"
          variant={faceSelectionEnabled ? "default" : "outline"}
          disabled={controlsDisabled}
          className="flex w-full items-center justify-center gap-2"
          onClick={toggleFaceSelection}
        >
          <Pointer className="h-4 w-4" />
          {faceSelectionEnabled ? "Click model face" : "Orient to Face"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={controlsDisabled}
          className="flex w-full items-center justify-center gap-2"
          onClick={onReset}
        >
          <RefreshCcw className="h-4 w-4" />
          Reset
        </Button>
        <Button
          type="button"
          disabled={disabled || isLocking || interactionDisabled || Boolean(lockGuardReason)}
          className="flex w-full items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-500 sm:col-span-2"
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
