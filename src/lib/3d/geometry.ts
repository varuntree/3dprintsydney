import * as THREE from "three";
import { browserLogger } from "@/lib/logging/browser-logger";

export function calculateModelCenter(object: THREE.Object3D): THREE.Vector3 {
  const box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  if (box.isEmpty()) {
    if (object.children.length > 0) {
      browserLogger.error({
        scope: "bug.33.model-alignment",
        message: "Empty bounding box after loading model",
        data: { name: object.name },
      });
    }
    return center;
  }
  box.getCenter(center);
  if (!Number.isFinite(center.x) || !Number.isFinite(center.y) || !Number.isFinite(center.z)) {
    browserLogger.error({
      scope: "bug.33.model-alignment",
      message: "Computed non-finite center",
      data: {
        bounds: {
          min: box.min.toArray(),
          max: box.max.toArray(),
        },
      },
    });
    return center.set(0, 0, 0);
  }
  return center;
}

export function centerObjectAtOrigin(object: THREE.Object3D): void {
  const center = calculateModelCenter(object);
  object.position.sub(center);
  object.updateMatrixWorld(true);
}
