"use client";

import { TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { useOrientationStore } from "@/stores/orientation-store";

interface OrientationGizmoProps {
  target: THREE.Object3D | null;
  enabled: boolean;
  onDraggingChange?: (dragging: boolean) => void;
}

export default function OrientationGizmo({ target, enabled, onDraggingChange }: OrientationGizmoProps) {
  const setOrientation = useOrientationStore((state) => state.setOrientation);
  const position = useOrientationStore((state) => state.position);

  if (!target || !enabled) {
    return null;
  }

  const handleDraggingChange = (dragging: boolean) => {
    onDraggingChange?.(dragging);
    if (!dragging) {
      const q = target.quaternion.clone();
      setOrientation([q.x, q.y, q.z, q.w], position);
    }
  };

  return (
    <TransformControls
      object={target}
      enabled={enabled}
      mode="rotate"
      showX
      showY
      showZ
      onDraggingChange={handleDraggingChange}
    />
  );
}
