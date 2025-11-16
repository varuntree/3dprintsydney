import * as THREE from "three";
import { HALF_PLATE_MM, BUILD_HEIGHT_MM } from "./build-volume";

/**
 * Unified model constraint system for 3D viewer
 * Centralizes all constraint logic (grounding, clamping, bounds checking)
 */

const tempBox = new THREE.Box3();

/**
 * Ensure model sits on the ground plane (Y >= 0) while preserving XZ translation
 */
export function seatObjectOnGround(object: THREE.Object3D): void {
  object.updateMatrixWorld(true);
  tempBox.setFromObject(object);
  
  if (!isFinite(tempBox.min.y)) return;
  
  const deltaY = tempBox.min.y - object.position.y;
  // Move upward by negative delta to bring min.y to 0
  object.position.y -= deltaY;
  object.updateMatrixWorld(true);
}

/**
 * Clamp model position to stay within build volume boundaries
 */
export function clampGroupToBuildVolume(group: THREE.Group): void {
  tempBox.setFromObject(group);
  
  if (tempBox.isEmpty()) return;

  let deltaX = 0;
  if (tempBox.min.x < -HALF_PLATE_MM) {
    deltaX = -HALF_PLATE_MM - tempBox.min.x;
  } else if (tempBox.max.x > HALF_PLATE_MM) {
    deltaX = HALF_PLATE_MM - tempBox.max.x;
  }

  let deltaZ = 0;
  if (tempBox.min.z < -HALF_PLATE_MM) {
    deltaZ = -HALF_PLATE_MM - tempBox.min.z;
  } else if (tempBox.max.z > HALF_PLATE_MM) {
    deltaZ = HALF_PLATE_MM - tempBox.max.z;
  }

  let deltaY = 0;
  if (tempBox.min.y < 0) {
    deltaY = -tempBox.min.y;
  }

  if (deltaX !== 0 || deltaY !== 0 || deltaZ !== 0) {
    group.position.x += deltaX;
    group.position.y += deltaY;
    group.position.z += deltaZ;
    group.updateMatrixWorld(true);
  }
}

/**
 * Apply all constraints to a model after transformation
 * Call this after user completes a transform (not during)
 */
export function applyAllConstraints(
  object: THREE.Object3D,
  mode: "rotate" | "translate"
): void {
  if (mode === "translate") {
    clampGroupToBuildVolume(object as THREE.Group);
  } else {
    seatObjectOnGround(object);
    clampGroupToBuildVolume(object as THREE.Group);
  }
}

/**
 * Recenter model on the build plate
 */
export function recenterObjectToGround(object: THREE.Object3D): void {
  object.updateMatrixWorld(true);
  
  tempBox.setFromObject(object);
  
  if (!isFinite(tempBox.min.x) || !isFinite(tempBox.min.y) || !isFinite(tempBox.min.z)) {
    return;
  }

  const center = new THREE.Vector3();
  tempBox.getCenter(center);

  // Calculate offsets as deltas from current position
  const offsetX = center.x - object.position.x;
  const offsetY = tempBox.min.y - object.position.y;
  const offsetZ = center.z - object.position.z;

  // Apply deltas
  object.position.x -= offsetX;
  object.position.y -= offsetY;
  object.position.z -= offsetZ;

  object.updateMatrixWorld(true);
}
