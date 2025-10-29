import * as THREE from "three";

// World configuration: Y-up, horizontal ground plane is XZ
const WORLD_UP = new THREE.Vector3(0, 1, 0);

// Reusable working objects (avoid allocations in tight paths)
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

function evaluateOrientation(geometry: THREE.BufferGeometry, quat: THREE.Quaternion) {
  const tmp = geometry.clone();
  const m = new THREE.Matrix4().makeRotationFromQuaternion(quat);
  tmp.applyMatrix4(m);
  tmp.computeBoundingBox();
  const bbox = tmp.boundingBox!;
  const width = Math.max(0, bbox.max.x - bbox.min.x);
  const depth = Math.max(0, bbox.max.z - bbox.min.z);
  const height = Math.max(0, bbox.max.y - bbox.min.y);
  const areaXZ = width * depth;
  return { quat, width, depth, height, areaXZ };
}

function bestUprightQuaternion(geometry: THREE.BufferGeometry): THREE.Quaternion {
  // Candidates: align each of ±X, ±Y, ±Z to +Y (world up)
  const axes = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1),
  ];

  // Chosen convention: Prefer MIN height (sit flat on bed), tie-break by MIN footprint area
  let best = { quat: new THREE.Quaternion(), height: Number.POSITIVE_INFINITY, areaXZ: Number.POSITIVE_INFINITY };
  for (const a of axes) {
    const q = new THREE.Quaternion().setFromUnitVectors(a, WORLD_UP);
    const res = evaluateOrientation(geometry, q);
    if (
      res.height < best.height - 1e-6 ||
      (Math.abs(res.height - best.height) <= 1e-6 && res.areaXZ < best.areaXZ - 1e-6)
    ) {
      best = { quat: q, height: res.height, areaXZ: res.areaXZ };
    }
  }
  return best.quat;
}

export function alignGeometryToHorizontalPlane(geometry: THREE.BufferGeometry): void {
  // Deterministic orientation: choose the rotation that minimizes model height (Y extent)
  // and minimizes ground footprint (XZ area) as a tie-breaker so the model sits flat on the horizontal plane.
  if (!geometry.attributes.position) return;

  // Compute best rotation (min height) and apply
  const q = bestUprightQuaternion(geometry);
  const m = new THREE.Matrix4().makeRotationFromQuaternion(q);
  geometry.applyMatrix4(m);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

export function normalizeGeometry(geometry: THREE.BufferGeometry): void {
  const bbox = safeComputeBoundingBox(geometry);
  if (!bbox) return;

  const offsetX = (bbox.min.x + bbox.max.x) / 2;
  const offsetZ = (bbox.min.z + bbox.max.z) / 2;
  const offsetY = bbox.min.y; // place base on ground

  geometry.translate(-offsetX, -offsetY, -offsetZ);
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
  if (workingBox.isEmpty()) return;

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
