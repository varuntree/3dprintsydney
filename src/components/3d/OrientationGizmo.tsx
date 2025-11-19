"use client";

import { useEffect, useRef } from "react";
import { TransformControls } from "@react-three/drei";
import { TransformControls as TransformControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useOrientationStore } from "@/stores/orientation-store";

export type GizmoMode = "rotate" | "translate";

interface OrientationGizmoProps {
  target: THREE.Object3D | null;
  enabled: boolean;
  mode?: GizmoMode;
  translationSnap?: number;
  onDraggingChange?: (dragging: boolean) => void;
  onTransform?: (object: THREE.Object3D) => void;
  onTransformComplete?: (object: THREE.Object3D) => void;
}

export default function OrientationGizmo({
  target,
  enabled,
  mode = "rotate",
  translationSnap,
  onDraggingChange,
  onTransform,
  onTransformComplete,
}: OrientationGizmoProps) {
  const setOrientation = useOrientationStore((state) => state.setOrientation);
  const controlsRef = useRef<TransformControlsImpl | null>(null);

  if (!target || !enabled) {
    return null;
  }

  const handleObjectChange = () => {
    if (!target) return;
    onTransform?.(target);
  };

  const commitTransform = () => {
    if (!target) return;
    const q = target.quaternion.clone();
    const p = target.position.clone();
    setOrientation([q.x, q.y, q.z, q.w], [p.x, p.y, p.z]);
    onTransformComplete?.(target);
  };

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return undefined;
    const handleDraggingChanged = (event: THREE.Event) => {
      const dragging = (event as { value?: boolean }).value ?? false;
      onDraggingChange?.(dragging);
      if (!dragging) {
        commitTransform();
      }
    };
    (controls as any).addEventListener("dragging-changed", handleDraggingChanged);
    return () => {
      (controls as any).removeEventListener("dragging-changed", handleDraggingChanged);
    };
  }, [commitTransform, onDraggingChange]);

  return (
    <TransformControls
      ref={controlsRef}
      object={target}
      enabled={enabled}
      mode={mode}
      space="local"
      translationSnap={mode === "translate" ? translationSnap ?? 1 : undefined}
      size={2.5}
      showX
      showY
      showZ
      onObjectChange={handleObjectChange}
    />
  );
}
