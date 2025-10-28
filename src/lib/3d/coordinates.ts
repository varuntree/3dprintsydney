import * as THREE from "three";

const workingBox = new THREE.Box3();
const workingCenter = new THREE.Vector3();
const workingSphere = new THREE.Sphere();

function safeComputeBoundingBox(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox();
  if (!geometry.boundingBox) {
    geometry.computeBoundingSphere();
  }
  return geometry.boundingBox ?? null;
}

export function normalizeGeometry(geometry: THREE.BufferGeometry): void {
  const bbox = safeComputeBoundingBox(geometry);
  if (!bbox) return;

  const offsetX = (bbox.min.x + bbox.max.x) / 2;
  const offsetZ = (bbox.min.z + bbox.max.z) / 2;
  const offsetY = bbox.min.y;

  geometry.translate(-offsetX, -offsetY, -offsetZ);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

export function alignGeometryToHorizontalPlane(geometry: THREE.BufferGeometry): void {
  const bbox = safeComputeBoundingBox(geometry);
  if (!bbox) return;

  const size = new THREE.Vector3();
  bbox.getSize(size);

  const axes = [
    { axis: "x" as const, size: size.x },
    { axis: "y" as const, size: size.y },
    { axis: "z" as const, size: size.z },
  ].sort((a, b) => b.size - a.size);

  const tallestAxis = axes[0]?.axis;

  if (tallestAxis === "z") {
    geometry.rotateX(Math.PI / 2);
  } else if (tallestAxis === "x") {
    geometry.rotateZ(Math.PI / 2);
  }

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

export function recenterObjectToGround(object: THREE.Object3D): void {
  workingBox.setFromObject(object);
  if (!isFinite(workingBox.min.x) || !isFinite(workingBox.min.y) || !isFinite(workingBox.min.z)) {
    return;
  }

  workingBox.getCenter(workingCenter);

  object.position.x -= workingCenter.x;
  object.position.z -= workingCenter.z;
  object.position.y -= workingBox.min.y;
  object.updateMatrixWorld(true);
}

export function fitObjectToView(
  object: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  padding = 1.2
): void {
  workingBox.setFromObject(object);
  if (workingBox.isEmpty()) {
    return;
  }

  workingBox.getBoundingSphere(workingSphere);
  const radius = workingSphere.radius * padding;
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const distance = radius / Math.tan(fov / 2);

  camera.position.set(radius, radius * 0.75, distance * 1.1);
  camera.near = Math.max(0.1, radius / 50);
  camera.far = Math.max(camera.near + 1000, distance * 5);
  camera.lookAt(0, radius * 0.25, 0);
  camera.updateProjectionMatrix();
}

export function applyTransformToGeometry(mesh: THREE.Mesh): void {
  mesh.updateMatrixWorld(true);
  mesh.geometry.applyMatrix4(mesh.matrixWorld);
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  mesh.scale.set(1, 1, 1);
  mesh.updateMatrixWorld(true);
}

export function rotateObject(
  object: THREE.Object3D,
  axis: "x" | "y" | "z",
  degrees: number
): void {
  const radians = THREE.MathUtils.degToRad(degrees);
  switch (axis) {
    case "x":
      object.rotateX(radians);
      break;
    case "y":
      object.rotateY(radians);
      break;
    case "z":
      object.rotateZ(radians);
      break;
  }
  recenterObjectToGround(object);
}

// Backwards compatibility helpers (legacy callers expect these names)

export function centerModelOnBed(object: THREE.Object3D): void {
  recenterObjectToGround(object);
}

export function alignMeshToHorizontalPlane(mesh: THREE.Mesh): void {
  const geometry = mesh.geometry as THREE.BufferGeometry;
  alignGeometryToHorizontalPlane(geometry);
  mesh.updateMatrixWorld(true);
}

export function rotateMesh(
  mesh: THREE.Object3D,
  axis: "x" | "y" | "z",
  degrees: number
): void {
  rotateObject(mesh, axis, degrees);
}
