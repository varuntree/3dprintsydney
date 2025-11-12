import * as THREE from "three";

export const BUILD_PLATE_SIZE_MM = 240;
export const BUILD_HEIGHT_MM = 240;
export const HALF_PLATE_MM = BUILD_PLATE_SIZE_MM / 2;

export interface BuildVolumeStatus {
  inBounds: boolean;
  width: number;
  depth: number;
  height: number;
  violations: string[];
}

export function describeBuildVolume(box: THREE.Box3): BuildVolumeStatus {
  const width = Math.max(0, box.max.x - box.min.x);
  const depth = Math.max(0, box.max.z - box.min.z);
  const height = Math.max(0, box.max.y - box.min.y);
  const violations: string[] = [];

  if (box.max.x > HALF_PLATE_MM) {
    violations.push(`Model exceeds +X plate limit by ${(box.max.x - HALF_PLATE_MM).toFixed(1)}mm`);
  }
  if (box.min.x < -HALF_PLATE_MM) {
    violations.push(`Model exceeds -X plate limit by ${(-HALF_PLATE_MM - box.min.x).toFixed(1)}mm`);
  }
  if (box.max.z > HALF_PLATE_MM) {
    violations.push(`Model exceeds +Z plate limit by ${(box.max.z - HALF_PLATE_MM).toFixed(1)}mm`);
  }
  if (box.min.z < -HALF_PLATE_MM) {
    violations.push(`Model exceeds -Z plate limit by ${(-HALF_PLATE_MM - box.min.z).toFixed(1)}mm`);
  }
  if (box.max.y > BUILD_HEIGHT_MM) {
    violations.push(`Model exceeds build height by ${(box.max.y - BUILD_HEIGHT_MM).toFixed(1)}mm`);
  }
  if (box.min.y < -1e-2) {
    violations.push(`Model dips below build plate by ${Math.abs(box.min.y).toFixed(2)}mm`);
  }

  return {
    inBounds: violations.length === 0,
    width,
    depth,
    height,
    violations,
  };
}
