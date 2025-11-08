import * as THREE from "three";

const DOWN = new THREE.Vector3(0, -1, 0);
const raycaster = new THREE.Raycaster();

export function calculateFaceToGroundQuaternion(
  faceNormal: THREE.Vector3,
  currentQuat: THREE.Quaternion
): THREE.Quaternion {
  if (faceNormal.lengthSq() === 0) {
    return currentQuat.clone();
  }
  const worldNormal = faceNormal.clone().applyQuaternion(currentQuat).normalize();
  if (worldNormal.lengthSq() === 0) {
    return currentQuat.clone();
  }
  const alignQuat = new THREE.Quaternion().setFromUnitVectors(worldNormal, DOWN);
  return alignQuat.multiply(currentQuat).normalize();
}

export function raycastFace(
  object: THREE.Object3D,
  pointer: THREE.Vector2,
  camera: THREE.Camera
): { normal: THREE.Vector3; point: THREE.Vector3 } | null {
  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObject(object, true);
  if (!intersections.length) {
    return null;
  }
  const hit = intersections[0];
  if (!hit.face || !hit.object) {
    return null;
  }
  const normalWorld = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
  const pointWorld = hit.point.clone();
  return { normal: normalWorld, point: pointWorld };
}
