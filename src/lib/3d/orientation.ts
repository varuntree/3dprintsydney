import * as THREE from "three";

import { detectOverhangs } from "./overhang-detector";
import { browserLogger } from "@/lib/logging/browser-logger";

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const SUPPORT_WEIGHT = 0.6;
const HEIGHT_WEIGHT = 0.2;
const CONTACT_WEIGHT = 0.2;
const CONTACT_EPS = 1e-3;
const SCORE_EPS = 1e-6;

type Extents = { height: number; areaXZ: number };

export type AutoOrientMode = "upright" | "flat";

export interface AutoOrientMetrics {
  supportVolume: number;
  height: number;
  contactArea: number;
  score: number;
}

export interface AutoOrientResult {
  quaternion: THREE.Quaternion;
  metrics: AutoOrientMetrics;
  timedOut: boolean;
}

interface AutoOrientOptions {
  directionSamples?: number;
  vertexSamples?: number;
  maxDurationMs?: number;
}

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
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (let i = 0; i < vertexCount; i += stride) {
    const i3 = i * 3;
    v.set(positions[i3], positions[i3 + 1], positions[i3 + 2]).applyQuaternion(quat);
    if (v.x < minX) minX = v.x;
    if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.y > maxY) maxY = v.y;
    if (v.z < minZ) minZ = v.z;
    if (v.z > maxZ) maxZ = v.z;
  }
  const width = Math.max(0, maxX - minX);
  const depth = Math.max(0, maxZ - minZ);
  const height = Math.max(0, maxY - minY);
  return { height, areaXZ: width * depth };
}

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function pushCandidate(target: THREE.Vector3[], seen: Set<string>, vec: THREE.Vector3) {
  if (vec.lengthSq() === 0) return;
  const normalized = vec.clone().normalize();
  const key = `${normalized.x.toFixed(4)}|${normalized.y.toFixed(4)}|${normalized.z.toFixed(4)}`;
  if (seen.has(key)) return;
  seen.add(key);
  target.push(normalized);
}

function computePrincipalAxes(positions: ArrayLike<number>, vertexCount: number): THREE.Vector3[] {
  if (!vertexCount) return [];
  const mean = new THREE.Vector3();
  for (let i = 0; i < vertexCount; i += 1) {
    const i3 = i * 3;
    mean.x += Number(positions[i3] ?? 0);
    mean.y += Number(positions[i3 + 1] ?? 0);
    mean.z += Number(positions[i3 + 2] ?? 0);
  }
  mean.divideScalar(vertexCount);

  let xx = 0,
    xy = 0,
    xz = 0,
    yy = 0,
    yz = 0,
    zz = 0;
  for (let i = 0; i < vertexCount; i += 1) {
    const i3 = i * 3;
    const dx = Number(positions[i3] ?? 0) - mean.x;
    const dy = Number(positions[i3 + 1] ?? 0) - mean.y;
    const dz = Number(positions[i3 + 2] ?? 0) - mean.z;
    xx += dx * dx;
    xy += dx * dy;
    xz += dx * dz;
    yy += dy * dy;
    yz += dy * dz;
    zz += dz * dz;
  }

  const { values, vectors } = jacobiEigenDecomposition([
    xx,
    xy,
    xz,
    xy,
    yy,
    yz,
    xz,
    yz,
    zz,
  ]);

  return values
    .map((value, idx) => ({ value, vector: vectors[idx] }))
    .sort((a, b) => b.value - a.value)
    .map(({ vector }) => vector.normalize());
}

function jacobiEigenDecomposition(matrix: number[]) {
  const a = matrix.slice();
  const v = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const idx = (row: number, col: number) => row * 3 + col;
  const maxIterations = 10;
  const eps = 1e-10;

  for (let iter = 0; iter < maxIterations; iter += 1) {
    let p = 0;
    let q = 1;
    let max = Math.abs(a[idx(0, 1)]);
    const candidates: [number, number, number][] = [
      [0, 2, Math.abs(a[idx(0, 2)])],
      [1, 2, Math.abs(a[idx(1, 2)])],
    ];
    for (const [cp, cq, value] of candidates) {
      if (value > max) {
        max = value;
        p = cp;
        q = cq;
      }
    }
    if (max < eps) break;

    const appIndex = idx(p, p);
    const aqqIndex = idx(q, q);
    const apqIndex = idx(p, q);
    const app = a[appIndex];
    const aqq = a[aqqIndex];
    const apq = a[apqIndex];

    const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
    const c = Math.cos(phi);
    const s = Math.sin(phi);

    for (let i = 0; i < 3; i += 1) {
      if (i === p || i === q) continue;
      const aipIndex = idx(i, p);
      const aiqIndex = idx(i, q);
      const aip = a[aipIndex];
      const aiq = a[aiqIndex];
      const newAip = c * aip - s * aiq;
      const newAiq = s * aip + c * aiq;
      a[aipIndex] = newAip;
      a[aiqIndex] = newAiq;
      a[idx(p, i)] = newAip;
      a[idx(q, i)] = newAiq;
    }

    const newApp = c * c * app - 2 * s * c * apq + s * s * aqq;
    const newAqq = s * s * app + 2 * s * c * apq + c * c * aqq;
    a[appIndex] = newApp;
    a[aqqIndex] = newAqq;
    a[apqIndex] = 0;
    a[idx(q, p)] = 0;

    for (let i = 0; i < 3; i += 1) {
      const vip = v[i * 3 + p];
      const viq = v[i * 3 + q];
      v[i * 3 + p] = c * vip - s * viq;
      v[i * 3 + q] = s * vip + c * viq;
    }
  }

  const values = [a[0], a[4], a[8]];
  const vectors = [
    new THREE.Vector3(v[0], v[3], v[6]),
    new THREE.Vector3(v[1], v[4], v[7]),
    new THREE.Vector3(v[2], v[5], v[8]),
  ];
  return { values, vectors };
}

export function computeAutoOrientQuaternion(
  geometry: THREE.BufferGeometry,
  mode: AutoOrientMode = "upright",
  options: AutoOrientOptions = {}
): AutoOrientResult {
  const pos = geometry.getAttribute("position");
  if (!pos || pos.count === 0) {
    return {
      quaternion: new THREE.Quaternion(),
      metrics: { supportVolume: 0, height: 0, contactArea: 0, score: Infinity },
    };
  }

  const start = nowMs();
  const maxDuration = options.maxDurationMs ?? Number.POSITIVE_INFINITY;
  let timedOut = false;
  const DIR_SAMPLES = Math.max(24, Math.min(200, options.directionSamples ?? 64));
  const MAX_VERTS = Math.max(1000, Math.min(20000, options.vertexSamples ?? 8000));

  const positions = pos.array as ArrayLike<number>;
  const vertexCount = pos.count;
  const stride = Math.max(1, Math.floor(vertexCount / MAX_VERTS));

  const candidateDirections: THREE.Vector3[] = [];
  const seen = new Set<string>();

  const principalAxes = computePrincipalAxes(positions, vertexCount);
  for (const axis of principalAxes) {
    pushCandidate(candidateDirections, seen, axis);
    pushCandidate(candidateDirections, seen, axis.clone().multiplyScalar(-1));
  }

  const dirs = fibonacciSphereDirections(DIR_SAMPLES);
  for (const dir of dirs) {
    pushCandidate(candidateDirections, seen, dir);
    pushCandidate(candidateDirections, seen, dir.clone().multiplyScalar(-1));
  }

  if (candidateDirections.length === 0) {
    candidateDirections.push(new THREE.Vector3(0, 1, 0));
  }

  let best: AutoOrientResult | null = null;

  for (const dir of candidateDirections) {
    if (!timedOut && nowMs() - start > maxDuration) {
      timedOut = true;
      break;
    }
    const quaternion = new THREE.Quaternion().setFromUnitVectors(dir, WORLD_UP);
    const { height } = measureExtentsSampled(positions, vertexCount, stride, quaternion);
    const overhang = detectOverhangs(geometry, quaternion);
    const contactArea = overhang.contactArea;
    const supportVolume = overhang.supportVolume;
    const contactPenalty = 1 / Math.max(contactArea, CONTACT_EPS);
    const heightPenalty = mode === "upright" ? height : height * 0.5;
    const score =
      SUPPORT_WEIGHT * supportVolume + HEIGHT_WEIGHT * heightPenalty + CONTACT_WEIGHT * contactPenalty;

    const metrics: AutoOrientMetrics = {
      supportVolume,
      height,
      contactArea,
      score,
    };

    if (!best || metrics.score + SCORE_EPS < best.metrics.score) {
      best = { quaternion: quaternion.clone(), metrics, timedOut: false };
    }
  }

  if ((!best || timedOut) && principalAxes.length) {
    const fallback = selectPrincipalAxisFallback(positions, vertexCount, stride, principalAxes);
    if (fallback) {
      best = fallback;
      timedOut = true;
    }
  }

  const elapsed = nowMs() - start;
  if (process.env.NODE_ENV !== "production") {
    browserLogger.debug({
      scope: "browser.auto-orient",
      message: `[AutoOrient] evaluated ${candidateDirections.length} candidates in ${elapsed.toFixed(1)}ms${timedOut ? " (timed out)" : ""}`.trim(),
      data: {
        candidateCount: candidateDirections.length,
        durationMs: elapsed,
        timedOut,
        metrics: best?.metrics,
      },
    });
  }

  const fallbackResult: AutoOrientResult = {
    quaternion: new THREE.Quaternion(),
    metrics: { supportVolume: 0, height: 0, contactArea: 0, score: Infinity },
    timedOut,
  };

  return best ? { ...best, timedOut: timedOut || best.timedOut } : fallbackResult;
}

function selectPrincipalAxisFallback(
  positions: ArrayLike<number>,
  vertexCount: number,
  stride: number,
  axes: THREE.Vector3[]
): AutoOrientResult | null {
  if (!vertexCount || !axes.length) return null;
  let best: AutoOrientResult | null = null;
  for (const axis of axes) {
    if (axis.lengthSq() === 0) continue;
    const variants = [axis.clone(), axis.clone().multiplyScalar(-1)];
    for (const variant of variants) {
      if (variant.lengthSq() === 0) continue;
      const quaternion = new THREE.Quaternion().setFromUnitVectors(variant.normalize(), WORLD_UP);
      const extents = measureExtentsSampled(positions, vertexCount, stride, quaternion);
      const metrics: AutoOrientMetrics = {
        supportVolume: 0,
        height: extents.height,
        contactArea: extents.areaXZ,
        score: extents.height,
      };
      if (!best || metrics.height + SCORE_EPS < best.metrics.height) {
        best = {
          quaternion: quaternion.clone(),
          metrics,
          timedOut: true,
        };
      }
    }
  }
  return best;
}
