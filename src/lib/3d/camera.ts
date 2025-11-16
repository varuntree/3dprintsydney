import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const tempBox = new THREE.Box3();
const tempSphere = new THREE.Sphere();
const tempTarget = new THREE.Vector3();

export function fitCameraToGroup(
  group: THREE.Group,
  camera: THREE.PerspectiveCamera,
  controls?: OrbitControlsImpl | null
) {
  tempBox.setFromObject(group);
  if (tempBox.isEmpty()) return;
  tempBox.getBoundingSphere(tempSphere);
  const radius = tempSphere.radius || 1;
  const center = tempSphere.center ?? new THREE.Vector3();
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const distance = (radius / Math.tan(fov / 2)) * 1.4;
  camera.position.set(center.x, center.y + radius * 0.6, center.z + distance);
  camera.near = Math.max(0.1, distance / 1000);
  camera.far = Math.max(distance * 10, camera.near + 10);
  camera.updateProjectionMatrix();
  if (controls?.target) {
    controls.target.copy(center);
    controls.update();
  } else {
    camera.lookAt(center);
  }
}

export function getGroupBoundingSphere(group: THREE.Group): THREE.Sphere | null {
  tempBox.setFromObject(group);
  if (tempBox.isEmpty()) return null;
  tempBox.getBoundingSphere(tempSphere);
  return tempSphere;
}

export function getGroupRadius(group: THREE.Group): number {
  const sphere = getGroupBoundingSphere(group);
  if (!sphere || !isFinite(sphere.radius) || sphere.radius === 0) {
    return 50;
  }
  return sphere.radius;
}

export type ViewPreset = "top" | "bottom" | "front" | "back" | "left" | "right" | "iso";

export function positionCameraForPreset(
  group: THREE.Group,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControlsImpl | null,
  preset: ViewPreset
) {
  const sphere = getGroupBoundingSphere(group);
  const center = sphere?.center ?? tempTarget.set(0, 0, 0);
  const radius = sphere?.radius ?? getGroupRadius(group);
  const distance = Math.max(radius * 2, 25);

  switch (preset) {
    case "top":
      camera.position.set(center.x, center.y + distance, center.z + 0.001);
      camera.up.set(0, 0, -1);
      break;
    case "bottom":
      camera.position.set(center.x, center.y - distance, center.z - 0.001);
      camera.up.set(0, 0, 1);
      break;
    case "front":
      camera.position.set(center.x, center.y + radius * 0.3, center.z + distance);
      camera.up.set(0, 1, 0);
      break;
    case "back":
      camera.position.set(center.x, center.y + radius * 0.3, center.z - distance);
      camera.up.set(0, 1, 0);
      break;
    case "left":
      camera.position.set(center.x - distance, center.y + radius * 0.3, center.z);
      camera.up.set(0, 1, 0);
      break;
    case "right":
      camera.position.set(center.x + distance, center.y + radius * 0.3, center.z);
      camera.up.set(0, 1, 0);
      break;
    case "iso":
    default:
      camera.position.set(center.x + distance * 0.75, center.y + distance * 0.7, center.z + distance * 0.75);
      camera.up.set(0, 1, 0);
      break;
  }

  camera.near = Math.max(0.1, distance / 1000);
  camera.far = Math.max(distance * 10, camera.near + 10);
  camera.updateProjectionMatrix();

  if (controls?.target) {
    controls.target.copy(center);
    controls.update();
  }

  camera.lookAt(center);
}

export function retargetControlsToGroup(group: THREE.Group, controls: OrbitControlsImpl | null) {
  if (!controls) return;
  const sphere = getGroupBoundingSphere(group);
  if (sphere) {
    tempTarget.copy(sphere.center ?? group.position);
  } else {
    tempTarget.copy(group.position);
  }
  controls.target.copy(tempTarget);
  controls.update();
}
