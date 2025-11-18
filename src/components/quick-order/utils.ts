import * as THREE from "three";
import { browserLogger } from "@/lib/logging/browser-logger";
import type { OrientationQuaternion } from "@/stores/orientation-store";

export function logQuickPrintError(scopeSuffix: string, message: string, error?: unknown) {
  browserLogger.error({
    scope: `browser.quick-print.${scopeSuffix}`,
    message,
    error,
  });
}

export function eulerFromQuaternion(tuple?: OrientationQuaternion) {
  if (!tuple) return null;
  const euler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(...tuple), "XYZ");
  const format = (value: number) => {
    const deg = THREE.MathUtils.radToDeg(value);
    const normalized = ((deg % 360) + 360) % 360;
    return normalized.toFixed(1);
  };
  return { x: format(euler.x), y: format(euler.y), z: format(euler.z) };
}
