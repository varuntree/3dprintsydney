"use client";

import { TransformControls } from "@react-three/drei";
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

  if (!target || !enabled) {
    return null;
  }

  const handleMouseDown = () => {
    onDraggingChange?.(true);
  };

  const handleObjectChange = () => {
    if (!target) return;
    onTransform?.(target);
  };

  const handleMouseUp = () => {
    onDraggingChange?.(false);
    if (!target) return;
    const q = target.quaternion.clone();
    const p = target.position.clone();
    setOrientation([q.x, q.y, q.z, q.w], [p.x, p.y, p.z]);
    onTransformComplete?.(target);
  };

  return (
    <TransformControls
      object={target}
      enabled={enabled}
      mode={mode}
      translationSnap={mode === "translate" ? translationSnap ?? 1 : undefined}
      showX
      showY
      showZ
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onObjectChange={handleObjectChange}
    />
  );
}
