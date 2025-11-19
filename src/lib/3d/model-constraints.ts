import * as THREE from "three";
import { HALF_PLATE_MM } from "./build-volume";

/**
 * Unified model constraint system for 3D viewer
 * Centralizes all constraint logic (grounding, clamping, bounds checking)
 */

const tempBox = new THREE.Box3();
const tempVector = new THREE.Vector3();

/**
 * Center the geometry of an object around (0,0,0)
 * This modifies the geometry in place!
 */
export function centerGeometry(object: THREE.Object3D): void {
  object.updateMatrixWorld(true);

  // If it's a mesh, center its geometry
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.computeBoundingBox();
        const bbox = mesh.geometry.boundingBox;
        if (bbox) {
          const center = new THREE.Vector3();
          bbox.getCenter(center);
          // Translate geometry so its center is at (0,0,0)
          mesh.geometry.translate(-center.x, -center.y, -center.z);
          mesh.geometry.computeBoundingBox(); // Recompute after translate
        }
      }
    }
  });
}

/**
 * Ensure model sits on the ground plane (Y >= 0)
 * Assumes the object's origin is at its visual center (due to centerGeometry)
 */
export function seatObjectOnGround(object: THREE.Object3D): void {
  object.updateMatrixWorld(true);
  tempBox.setFromObject(object);

  if (!isFinite(tempBox.min.y)) return;

  // We want min.y to be 0
  // Current min.y is some value. We need to move the object up/down.
  // The object's position.y controls the group's vertical placement.

  const bottomY = tempBox.min.y;
  const currentY = object.position.y;

  // If bottomY is at 10, we need to move down by 10.
  // New position = currentPosition - bottomY
  // Wait, if we move the object, tempBox changes.

  // Let's calculate the offset needed.
  // We want the world-space bottom to be 0.
  // WorldBottom = ObjectPosition.y + LocalBottom (roughly, if no rotation)
  // Actually, simpler:
  // The distance from the current bottom to 0 is -bottomY.
  // So we add -bottomY to the current position.

  object.position.y -= bottomY;
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

  // We don't clamp Y here because seatObjectOnGround handles it, 
  // and we generally don't want to force it down if the user lifted it (unless we do?)
  // For now, let's enforce positive Y only if it goes below ground.
  let deltaY = 0;
  if (tempBox.min.y < -0.01) { // Epsilon
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
  // Always ensure it's on ground and in bounds
  seatObjectOnGround(object);
  clampGroupToBuildVolume(object as THREE.Group);
}

/**
 * Recenter model on the build plate (0,0,0)
 */
export function recenterObjectToGround(object: THREE.Object3D): void {
  // Reset X/Z to 0, then seat on ground
  object.position.x = 0;
  object.position.z = 0;
  object.updateMatrixWorld(true);
  seatObjectOnGround(object);
}
