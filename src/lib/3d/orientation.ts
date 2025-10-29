import * as THREE from "three";

const WORLD_UP = new THREE.Vector3(0, 1, 0);

type Extents = { height: number; areaXZ: number };

function fibonacciSphereDirections(n: number): THREE.Vector3[] {
  const dirs: THREE.Vector3[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / Math.max(1, n - 1)) * 2; // 1..-1
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = phi * i;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    dirs.push(new THREE.Vector3(x, y, z));
  }
  return dirs;
}

function measureExtentsSampled(
  positions: ArrayLike<number>,
  vertexCount: number,
  stride: number,
  quat: THREE.Quaternion
): Extents {
  const v = new THREE.Vector3();
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < vertexCount; i += stride) {
    const i3 = i * 3;
    v.set(positions[i3], positions[i3 + 1], positions[i3 + 2]).applyQuaternion(quat);
    if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y;
    if (v.z < minZ) minZ = v.z; if (v.z > maxZ) maxZ = v.z;
  }
  const width = Math.max(0, maxX - minX);
  const depth = Math.max(0, maxZ - minZ);
  const height = Math.max(0, maxY - minY);
  return { height, areaXZ: width * depth };
}

export type AutoOrientMode = "upright" | "flat";

/**
 * Compute a deterministic quaternion via continuous sampling.
 * mode = "upright": maximize height; mode = "flat": minimize height.
 * Tie-breaker: minimize XZ footprint area.
 */
export function computeAutoOrientQuaternion(
  geometry: THREE.BufferGeometry,
  mode: AutoOrientMode = "upright",
  options: { directionSamples?: number; vertexSamples?: number } = {}
): THREE.Quaternion {
  const pos = geometry.getAttribute("position");
  if (!pos || pos.count === 0) return new THREE.Quaternion();

  const DIR_SAMPLES = Math.max(24, Math.min(240, options.directionSamples ?? 96));
  const MAX_VERTS = Math.max(1000, Math.min(20000, options.vertexSamples ?? 8000));

  const positions = pos.array as ArrayLike<number>;
  const vertexCount = pos.count;
  const stride = Math.max(1, Math.floor(vertexCount / MAX_VERTS));

  const dirs = fibonacciSphereDirections(DIR_SAMPLES);
  const eps = 1e-6;
  let best: { q: THREE.Quaternion; height: number; areaXZ: number } | null = null;
  const neg = new THREE.Vector3();

  for (const d of dirs) {
    for (let sign = 0; sign < 2; sign++) {
      const up = sign === 0 ? d : neg.copy(d).multiplyScalar(-1);
      const q = new THREE.Quaternion().setFromUnitVectors(up, WORLD_UP);
      const { height, areaXZ } = measureExtentsSampled(positions, vertexCount, stride, q);

      if (!best) {
        best = { q, height, areaXZ };
        continue;
      }

      const better =
        mode === "upright"
          ? height > best.height + eps || (Math.abs(height - best.height) <= eps && areaXZ < best.areaXZ - eps)
          : height < best.height - eps || (Math.abs(height - best.height) <= eps && areaXZ < best.areaXZ - eps);
      if (better) best = { q, height, areaXZ };
    }
  }
  return (best?.q ?? new THREE.Quaternion()).normalize();
}
