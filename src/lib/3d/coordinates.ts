/**
 * Coordinate System Utilities
 *
 * Handles conversion between Three.js coordinate system (Y-up) and
 * 3D printer coordinate system (Z-up, used by Bambu Studio, PrusaSlicer, etc.)
 */

import * as THREE from "three";

/**
 * Sets up a Three.js scene to use Z-up coordinate system
 * (standard for 3D printing software like Bambu Studio)
 */
export function setupZUpScene(scene: THREE.Scene): void {
  // Rotate scene to make Z-up instead of Y-up
  scene.rotation.x = -Math.PI / 2;
}

/**
 * Centers a model on the build plate and ensures bottom touches Z=0
 * Works correctly with Z-up coordinate system
 */
export function centerModelOnBed(mesh: THREE.Mesh): void {
  // Compute bounding box
  mesh.geometry.computeBoundingBox();
  const bbox = mesh.geometry.boundingBox;

  if (!bbox) return;

  // Calculate center offset (XY plane)
  const centerX = (bbox.max.x + bbox.min.x) / 2;
  const centerY = (bbox.max.y + bbox.min.y) / 2;

  // Move model so it's centered on XY and bottom touches Z=0
  mesh.position.set(-centerX, -centerY, -bbox.min.z);
}

/**
 * Applies the current transformation matrix to the geometry vertices
 * This "bakes" rotations/translations into the mesh so they persist when exported
 */
export function applyTransformToGeometry(mesh: THREE.Mesh): void {
  // Update matrices
  mesh.updateMatrix();
  mesh.updateMatrixWorld(true);

  // Apply transformation to geometry
  mesh.geometry.applyMatrix4(mesh.matrix);

  // Reset position/rotation/scale after baking
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  mesh.scale.set(1, 1, 1);
  mesh.updateMatrix();
}

/**
 * Rotates a mesh around a specific axis by degrees
 */
export function rotateMesh(
  mesh: THREE.Mesh,
  axis: "x" | "y" | "z",
  degrees: number
): void {
  const radians = (degrees * Math.PI) / 180;

  switch (axis) {
    case "x":
      mesh.rotateX(radians);
      break;
    case "y":
      mesh.rotateY(radians);
      break;
    case "z":
      mesh.rotateZ(radians);
      break;
  }

  // Re-center after rotation
  centerModelOnBed(mesh);
}
