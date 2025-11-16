This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: src/components/3d/**, src/lib/3d/**, src/stores/orientation-store.ts, src/hooks/use-webgl-context.ts, src/workers/overhang-worker.ts, src/lib/types/modelling.ts, src/server/geometry/**, src/app/api/quick-order/orient/route.ts, src/app/api/quick-order/analyze-supports/route.ts
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

## Additional Info

# Directory Structure
```
src/
  app/
    api/
      quick-order/
        analyze-supports/
          route.ts
        orient/
          route.ts
  components/
    3d/
      BuildPlate.tsx
      ModelViewer.tsx
      ModelViewerWrapper.tsx
      OrientationGizmo.tsx
      OverhangHighlight.tsx
      RotationControls.tsx
      ViewNavigationControls.tsx
  hooks/
    use-webgl-context.ts
  lib/
    3d/
      build-volume.ts
      coordinates.ts
      export.ts
      face-alignment.ts
      geometry.ts
      orientation.ts
      overhang-detector.ts
      webgl-context.ts
    types/
      modelling.ts
  server/
    geometry/
      load-geometry.ts
      orient.ts
  stores/
    orientation-store.ts
  workers/
    overhang-worker.ts
```

# Files

## File: src/components/3d/OverhangHighlight.tsx
```typescript
import { memo, useEffect, useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute } from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

interface OverhangHighlightProps {
  geometry: BufferGeometry | null;
  overhangFaces: number[];
}

function OverhangHighlight({ geometry, overhangFaces }: OverhangHighlightProps) {
  const highlightGeometry = useMemo(() => {
    if (!geometry || overhangFaces.length === 0) {
      return null;
    }

    const baseGeometry = geometry.index ? geometry.toNonIndexed() : geometry;
    const shouldDisposeBase = baseGeometry !== geometry;
    const positionAttr = baseGeometry.getAttribute("position");
    if (!positionAttr) {
      if (shouldDisposeBase) {
        baseGeometry.dispose();
      }
      return null;
    }

    const sourceArray = positionAttr.array as ArrayLike<number>;
    const triangles: BufferGeometry[] = [];

    overhangFaces.forEach((faceIdx) => {
      const start = faceIdx * 9;
      if (start + 9 > positionAttr.count * 3) {
        return;
      }
      const triangle = new BufferGeometry();
      const values = new Float32Array(9);
      for (let i = 0; i < 9; i += 1) {
        values[i] = Number(sourceArray[start + i] ?? 0);
      }
      triangle.setAttribute("position", new Float32BufferAttribute(values, 3));
      triangles.push(triangle);
    });

    if (shouldDisposeBase) {
      baseGeometry.dispose();
    }

    if (triangles.length === 0) {
      return null;
    }

    const merged = BufferGeometryUtils.mergeGeometries(triangles, false) as BufferGeometry | null;
    triangles.forEach((tri) => tri.dispose());

    if (!merged) {
      return null;
    }

    merged.computeVertexNormals();
    return merged;
  }, [geometry, overhangFaces]);

  useEffect(() => {
    return () => {
      highlightGeometry?.dispose();
    };
  }, [highlightGeometry]);

  if (!highlightGeometry) {
    return null;
  }

  return (
    <mesh geometry={highlightGeometry} frustumCulled={false}>
      <meshBasicMaterial color="#ff4d4f" opacity={0.4} transparent depthWrite={false} />
    </mesh>
  );
}

export default memo(OverhangHighlight);
```

## File: src/hooks/use-webgl-context.ts
```typescript
import { useEffect } from "react";
import * as THREE from "three";
import { handleContextLoss } from "@/lib/3d/webgl-context";
import { browserLogger } from "@/lib/logging/browser-logger";

export function useWebGLContext(renderer: THREE.WebGLRenderer | null) {
  useEffect(() => {
    if (!renderer) return undefined;

    const cleanup = handleContextLoss(
      renderer,
      () => {
        browserLogger.warn({
          scope: "browser.webgl",
          message: "WebGL context lost in ModelViewer",
        });
      },
      () => {
        browserLogger.info({
          scope: "browser.webgl",
          message: "WebGL context restored; reloading for stability",
        });
        browserLogger.error({
          scope: "bug.34.preview-crash",
          message: "WebGL context restored after loss",
          data: { renderer: renderer.domElement?.id ?? null },
        });
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      },
    );

    return cleanup;
  }, [renderer]);
}
```

## File: src/lib/3d/build-volume.ts
```typescript
import * as THREE from "three";

export const BUILD_PLATE_SIZE_MM = 240;
export const BUILD_HEIGHT_MM = 240;
export const HALF_PLATE_MM = BUILD_PLATE_SIZE_MM / 2;

export interface BuildVolumeStatus {
  inBounds: boolean;
  width: number;
  depth: number;
  height: number;
  violations: string[];
}

export function describeBuildVolume(box: THREE.Box3): BuildVolumeStatus {
  const width = Math.max(0, box.max.x - box.min.x);
  const depth = Math.max(0, box.max.z - box.min.z);
  const height = Math.max(0, box.max.y - box.min.y);
  const violations: string[] = [];

  if (box.max.x > HALF_PLATE_MM) {
    violations.push(`Model exceeds +X plate limit by ${(box.max.x - HALF_PLATE_MM).toFixed(1)}mm`);
  }
  if (box.min.x < -HALF_PLATE_MM) {
    violations.push(`Model exceeds -X plate limit by ${(-HALF_PLATE_MM - box.min.x).toFixed(1)}mm`);
  }
  if (box.max.z > HALF_PLATE_MM) {
    violations.push(`Model exceeds +Z plate limit by ${(box.max.z - HALF_PLATE_MM).toFixed(1)}mm`);
  }
  if (box.min.z < -HALF_PLATE_MM) {
    violations.push(`Model exceeds -Z plate limit by ${(-HALF_PLATE_MM - box.min.z).toFixed(1)}mm`);
  }
  if (box.max.y > BUILD_HEIGHT_MM) {
    violations.push(`Model exceeds build height by ${(box.max.y - BUILD_HEIGHT_MM).toFixed(1)}mm`);
  }
  if (box.min.y < -1e-2) {
    violations.push(`Model dips below build plate by ${Math.abs(box.min.y).toFixed(2)}mm`);
  }

  return {
    inBounds: violations.length === 0,
    width,
    depth,
    height,
    violations,
  };
}
```

## File: src/lib/3d/export.ts
```typescript
/**
 * STL Export Utilities
 *
 * Handles exporting Three.js meshes to STL format with baked transformations
 */

import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { recenterObjectToGround } from "./coordinates";

/**
 * Exports a Three.js mesh to STL format (binary or ASCII)
 * Automatically bakes transformations into geometry before export
 *
 * @param mesh - The mesh to export
 * @param binary - Whether to use binary STL format (default: true, recommended)
 * @returns Promise<Blob> - STL file as a Blob
 */
export async function exportSTL(
  object: THREE.Object3D,
  binary: boolean = true
): Promise<Blob> {
  const clone = object.clone(true);
  clone.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) {
      const mesh = node as THREE.Mesh;
      mesh.geometry = mesh.geometry.clone();
      mesh.updateMatrixWorld(true);
    }
  });

  clone.updateMatrixWorld(true);
  recenterObjectToGround(clone);

  const exporter = new STLExporter();
  const result = exporter.parse(clone, { binary });

  // Convert to Blob
  if (binary) {
    // Binary format returns DataView
    const dataView = result as DataView;
    // Create ArrayBuffer from DataView
    const arrayBuffer = new ArrayBuffer(dataView.byteLength);
    const view = new Uint8Array(arrayBuffer);
    const sourceView = new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);
    view.set(sourceView);

    return new Blob([arrayBuffer], {
      type: "application/octet-stream",
    });
  } else {
    // ASCII format returns string
    return new Blob([result as string], { type: "text/plain" });
  }
}
```

## File: src/lib/3d/face-alignment.ts
```typescript
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
```

## File: src/lib/3d/webgl-context.ts
```typescript
import * as THREE from "three";

export function handleContextLoss(
  renderer: THREE.WebGLRenderer,
  onLoss: () => void,
  onRestore: () => void,
): () => void {
  const canvas = renderer.domElement;

  const handleLoss = (event: Event) => {
    event.preventDefault();
    onLoss();
  };

  const handleRestore = () => {
    onRestore();
  };

  canvas.addEventListener("webglcontextlost", handleLoss);
  canvas.addEventListener("webglcontextrestored", handleRestore);

  return () => {
    canvas.removeEventListener("webglcontextlost", handleLoss);
    canvas.removeEventListener("webglcontextrestored", handleRestore);
  };
}
```

## File: src/lib/types/modelling.ts
```typescript
export const invoiceLineTypes = ["PRINT", "MODELLING"] as const;
export type InvoiceLineType = (typeof invoiceLineTypes)[number];

export const modellingComplexityValues = ["SIMPLE", "MODERATE", "COMPLEX"] as const;
export type ModellingComplexity = (typeof modellingComplexityValues)[number];
```

## File: src/app/api/quick-order/analyze-supports/route.ts
```typescript
import { NextRequest } from "next/server";
import * as THREE from "three";

import { requireAuth } from "@/server/auth/api-helpers";
import { okAuth, failAuth } from "@/server/api/respond";
import { requireTmpFile, downloadTmpFileToBuffer } from "@/server/services/tmp-files";
import { loadGeometryFromModel } from "@/server/geometry/load-geometry";
import { detectOverhangs } from "@/lib/3d/overhang-detector";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

interface AnalyzeSupportsBody {
  fileId: string;
  quaternion: [number, number, number, number];
  supportSettings?: {
    enabled: boolean;
    angle: number;
    style: string;
  };
}

const DEFAULT_SUPPORT_ANGLE = 45;
const MIN_ESTIMATED_TIME_SEC = 60;
const TIME_SEC_PER_CUBIC_MM = 6;

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = (await request.json()) as AnalyzeSupportsBody | null;

    if (!body || typeof body.fileId !== "string" || !Array.isArray(body.quaternion)) {
      return failAuth(request, "VALIDATION_ERROR", "fileId and quaternion are required", 422);
    }
    if (body.quaternion.length !== 4 || body.quaternion.some((value) => typeof value !== "number")) {
      return failAuth(request, "VALIDATION_ERROR", "Quaternion must be an array of four numbers", 422);
    }

    const record = await requireTmpFile(user.id, body.fileId);
    const buffer = await downloadTmpFileToBuffer(body.fileId);
    let geometry: THREE.BufferGeometry;
    try {
      geometry = loadGeometryFromModel(buffer, record.filename);
    } catch (parseError) {
      return failAuth(request, "UNSUPPORTED_MODEL", (parseError as Error).message, 422);
    }

    const quaternion = new THREE.Quaternion(...body.quaternion).normalize();
    const threshold = typeof body.supportSettings?.angle === "number" ? body.supportSettings.angle : DEFAULT_SUPPORT_ANGLE;
    const analysis = detectOverhangs(geometry, quaternion, threshold);

    const estimatedTime = Math.max(
      MIN_ESTIMATED_TIME_SEC,
      Math.round(analysis.supportVolume * TIME_SEC_PER_CUBIC_MM)
    );

    return okAuth(request, {
      overhangFaces: analysis.overhangFaceIndices,
      supportVolume: analysis.supportVolume,
      supportWeight: analysis.supportWeight,
      contactArea: analysis.contactArea,
      estimatedTime,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return failAuth(request, error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: "quick-order.analyze-supports", error });
    return failAuth(request, "INTERNAL_ERROR", "Failed to analyze supports", 500);
  }
}
```

## File: src/components/3d/BuildPlate.tsx
```typescript
import { memo, useMemo } from "react";
import { Text } from "@react-three/drei";
import { BUILD_HEIGHT_MM, BUILD_PLATE_SIZE_MM } from "@/lib/3d/build-volume";

const PLATE_SIZE = BUILD_PLATE_SIZE_MM;
const GRID_DIVISIONS = 24;
const AXIS_LENGTH = PLATE_SIZE / 2;
const BUILD_HEIGHT = BUILD_HEIGHT_MM;

const labelPositions: [number, number, number][] = [
  [PLATE_SIZE / 2 + 6, 0.1, PLATE_SIZE / 2 + 6],
  [-PLATE_SIZE / 2 - 6, 0.1, PLATE_SIZE / 2 + 6],
  [PLATE_SIZE / 2 + 6, 0.1, -PLATE_SIZE / 2 - 6],
  [-PLATE_SIZE / 2 - 6, 0.1, -PLATE_SIZE / 2 - 6],
];

function BuildPlateComponent() {
  const textMaterialProps = useMemo(
    () => ({ color: "#cbd5f5", fontSize: 8, anchorX: "center" as const, anchorY: "middle" as const }),
    []
  );

  return (
    <group position={[0, 0, 0]}>
      <gridHelper args={[PLATE_SIZE, GRID_DIVISIONS, "#94a3b8", "#64748b"]} position={[0, 0, 0]} />
      <axesHelper args={[AXIS_LENGTH]} position={[0, 0, 0]} />

      <mesh position={[0, BUILD_HEIGHT / 2, 0]}
        frustumCulled={false}
      >
        <boxGeometry args={[PLATE_SIZE, BUILD_HEIGHT, PLATE_SIZE]} />
        <meshBasicMaterial color="#0ea5e9" opacity={0.08} transparent />
      </mesh>

      {labelPositions.map((pos, idx) => (
        <Text key={`plate-label-${idx}`} position={pos} {...textMaterialProps}>
          {`${PLATE_SIZE}mm × ${PLATE_SIZE}mm`}
        </Text>
      ))}
    </group>
  );
}

const BuildPlate = memo(BuildPlateComponent);
export default BuildPlate;
```

## File: src/lib/3d/coordinates.ts
```typescript
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
  object.updateMatrixWorld(true); // CRITICAL: update before setFromObject

  workingBox.setFromObject(object);
  if (!isFinite(workingBox.min.x) || !isFinite(workingBox.min.y) || !isFinite(workingBox.min.z)) {
    return;
  }

  workingBox.getCenter(workingCenter);

  // Calculate offsets as deltas from current position
  const offsetX = workingCenter.x - object.position.x;
  const offsetY = workingBox.min.y - object.position.y;
  const offsetZ = workingCenter.z - object.position.z;

  // Apply deltas (not absolute positions)
  object.position.x -= offsetX;
  object.position.y -= offsetY;
  object.position.z -= offsetZ;

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

  // Build rotation quaternion for this increment
  const rotQuat = new THREE.Quaternion();
  const axisVec =
    axis === "x" ? new THREE.Vector3(1, 0, 0) :
    axis === "y" ? new THREE.Vector3(0, 1, 0) :
                   new THREE.Vector3(0, 0, 1);
  rotQuat.setFromAxisAngle(axisVec, radians);

  // Apply to current quaternion (compound rotation)
  object.quaternion.multiplyQuaternions(rotQuat, object.quaternion).normalize();

  // CRITICAL: update world matrix before recentering
  object.updateMatrixWorld(true);

  // Now recenter using updated AABB
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
```

## File: src/lib/3d/geometry.ts
```typescript
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
```

## File: src/lib/3d/overhang-detector.ts
```typescript
import { BufferAttribute, BufferGeometry, MathUtils, Quaternion, Vector3 } from "three";

export interface OverhangData {
  overhangFaceIndices: number[];
  supportArea: number;
  supportVolume: number;
  supportWeight: number;
  contactArea: number;
}

const DOWN_VECTOR = new Vector3(0, -1, 0);
const TEMP_A = new Vector3();
const TEMP_B = new Vector3();
const TEMP_C = new Vector3();
const TEMP_CB = new Vector3();
const TEMP_AB = new Vector3();
const NORMAL = new Vector3();
const TEMP_VERTEX = new Vector3();
const ZERO_TRANSLATION = new Vector3();

const DEFAULT_DENSITY_FACTOR = 0.3;
const PLA_DENSITY_G_PER_MM3 = 0.00124; // Approx 1.24 g/cm^3
const HEIGHT_EPSILON = 0.1; // Ignore faces essentially touching the plate

const EMPTY_RESULT: OverhangData = Object.freeze({
  overhangFaceIndices: [],
  supportArea: 0,
  supportVolume: 0,
  supportWeight: 0,
  contactArea: 0,
});

export function detectOverhangs(
  geometry: BufferGeometry,
  quaternion: Quaternion,
  threshold = 45,
  translation?: Vector3 | null
): OverhangData {
  const positionAttr = geometry.getAttribute("position");
  if (!positionAttr || positionAttr.count === 0) {
    return EMPTY_RESULT;
  }

  const indexAttr = geometry.getIndex();
  const triangleCount = indexAttr ? indexAttr.count / 3 : positionAttr.count / 3;
  if (!Number.isFinite(triangleCount) || triangleCount <= 0) {
    return EMPTY_RESULT;
  }

  const vertexCount = positionAttr.count;
  const translationVec = translation ?? ZERO_TRANSLATION;
  const rotatedPositions = new Float32Array(vertexCount * 3);
  let minWorldY = Infinity;

  for (let i = 0; i < vertexCount; i += 1) {
    TEMP_VERTEX.fromBufferAttribute(positionAttr as BufferAttribute, i);
    TEMP_VERTEX.applyQuaternion(quaternion);
    TEMP_VERTEX.add(translationVec);
    rotatedPositions[i * 3] = TEMP_VERTEX.x;
    rotatedPositions[i * 3 + 1] = TEMP_VERTEX.y;
    rotatedPositions[i * 3 + 2] = TEMP_VERTEX.z;
    if (TEMP_VERTEX.y < minWorldY) {
      minWorldY = TEMP_VERTEX.y;
    }
  }

  if (!Number.isFinite(minWorldY)) {
    minWorldY = 0;
  }

  const cosThreshold = Math.cos(MathUtils.degToRad(threshold));
  const overhangFaceIndices: number[] = [];
  let supportArea = 0;
  let supportVolume = 0;
  let contactArea = 0;

  for (let faceIdx = 0; faceIdx < triangleCount; faceIdx += 1) {
    const vertexOffset = faceIdx * 3;
    const aIndex = indexAttr ? indexAttr.getX(vertexOffset) : vertexOffset;
    const bIndex = indexAttr ? indexAttr.getX(vertexOffset + 1) : vertexOffset + 1;
    const cIndex = indexAttr ? indexAttr.getX(vertexOffset + 2) : vertexOffset + 2;

    const aOffset = aIndex * 3;
    const bOffset = bIndex * 3;
    const cOffset = cIndex * 3;

    TEMP_A.set(rotatedPositions[aOffset], rotatedPositions[aOffset + 1], rotatedPositions[aOffset + 2]);
    TEMP_B.set(rotatedPositions[bOffset], rotatedPositions[bOffset + 1], rotatedPositions[bOffset + 2]);
    TEMP_C.set(rotatedPositions[cOffset], rotatedPositions[cOffset + 1], rotatedPositions[cOffset + 2]);

    TEMP_CB.subVectors(TEMP_C, TEMP_B);
    TEMP_AB.subVectors(TEMP_A, TEMP_B);
    NORMAL.crossVectors(TEMP_CB, TEMP_AB);
    const area = NORMAL.length() * 0.5;
    if (area === 0) {
      continue;
    }
    NORMAL.normalize();

    const dot = NORMAL.dot(DOWN_VECTOR);
    if (dot < cosThreshold) {
      continue;
    }

    const avgHeight = ((TEMP_A.y + TEMP_B.y + TEMP_C.y) / 3) - minWorldY;
    if (avgHeight <= HEIGHT_EPSILON) {
      contactArea += area;
      continue;
    }

    overhangFaceIndices.push(faceIdx);
    supportArea += area;
    const estimatedVolume = area * Math.max(avgHeight, 0) * DEFAULT_DENSITY_FACTOR;
    supportVolume += estimatedVolume;
  }

  return {
    overhangFaceIndices,
    supportArea,
    supportVolume,
    supportWeight: supportVolume * PLA_DENSITY_G_PER_MM3,
    contactArea,
  };
}
```

## File: src/server/geometry/load-geometry.ts
```typescript
import path from "node:path";
import { BufferGeometry, Float32BufferAttribute } from "three";
import { unzipSync } from "fflate";
import { DOMParser } from "@xmldom/xmldom";

const ASCII_VERTEX_REGEX = /vertex\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/gi;

export function loadGeometryFromModel(buffer: Buffer, filename: string): BufferGeometry {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".stl") {
    return parseStl(buffer);
  }
  if (ext === ".3mf") {
    return parseThreeMf(buffer);
  }
  throw new Error(`Unsupported model format: ${ext || "unknown"}`);
}

function parseThreeMf(buffer: Buffer): BufferGeometry {
  let archive: Record<string, Uint8Array>;
  try {
    archive = unzipSync(new Uint8Array(buffer));
  } catch (error) {
    throw new Error(`Failed to unzip 3MF archive: ${(error as Error).message}`);
  }

  const modelEntry = Object.keys(archive).find((key) => key.toLowerCase().endsWith("3d/3dmodel.model"));
  if (!modelEntry) {
    throw new Error("3MF archive missing 3D/3dmodel.model entry");
  }

  const decoder = new TextDecoder();
  const xmlContent = decoder.decode(archive[modelEntry]);
  const dom = new DOMParser().parseFromString(xmlContent, "application/xml");
  if (!dom || !dom.documentElement) {
    throw new Error("Failed to parse 3MF XML");
  }

  const objects = dom.getElementsByTagName("object");
  const positions: number[] = [];

  for (let i = 0; i < objects.length; i += 1) {
    const mesh = objects.item(i)?.getElementsByTagName("mesh").item(0);
    if (!mesh) continue;
    const vertexNodes = mesh.getElementsByTagName("vertex");
    const vertices: Array<{ x: number; y: number; z: number }> = [];
    for (let v = 0; v < vertexNodes.length; v += 1) {
      const node = vertexNodes.item(v);
      if (!node) continue;
      const x = Number(node.getAttribute("x"));
      const y = Number(node.getAttribute("y"));
      const z = Number(node.getAttribute("z"));
      if ([x, y, z].some((val) => Number.isNaN(val))) {
        continue;
      }
      vertices.push({ x, y, z });
    }

    const triangleNodes = mesh.getElementsByTagName("triangle");
    for (let t = 0; t < triangleNodes.length; t += 1) {
      const tri = triangleNodes.item(t);
      if (!tri) continue;
      const v1 = Number(tri.getAttribute("v1"));
      const v2 = Number(tri.getAttribute("v2"));
      const v3 = Number(tri.getAttribute("v3"));
      if ([v1, v2, v3].some((index) => !Number.isInteger(index) || index < 0 || index >= vertices.length)) {
        continue;
      }
      const verts = [vertices[v1], vertices[v2], vertices[v3]];
      verts.forEach((vert) => {
        positions.push(vert.x, vert.y, vert.z);
      });
    }
  }

  if (positions.length === 0) {
    throw new Error("3MF file contained no mesh data");
  }

  return buildGeometry(new Float32Array(positions));
}

function parseStl(buffer: Buffer): BufferGeometry {
  if (isBinaryStl(buffer)) {
    return parseBinaryStl(buffer);
  }
  return parseAsciiStl(buffer.toString("utf-8"));
}

function isBinaryStl(buffer: Buffer) {
  if (buffer.length < 84) return false;
  const faceCount = buffer.readUInt32LE(80);
  const expectedLength = 84 + faceCount * 50;
  return buffer.length === expectedLength;
}

function parseBinaryStl(buffer: Buffer): BufferGeometry {
  const faceCount = buffer.readUInt32LE(80);
  const positions = new Float32Array(faceCount * 9);
  for (let face = 0; face < faceCount; face += 1) {
    const offset = 84 + face * 50;
    let cursor = offset + 12; // skip normal
    for (let vertex = 0; vertex < 3; vertex += 1) {
      const idx = face * 9 + vertex * 3;
      positions[idx] = buffer.readFloatLE(cursor);
      positions[idx + 1] = buffer.readFloatLE(cursor + 4);
      positions[idx + 2] = buffer.readFloatLE(cursor + 8);
      cursor += 12;
    }
  }
  return buildGeometry(positions);
}

function parseAsciiStl(content: string): BufferGeometry {
  const vertices: number[] = [];
  ASCII_VERTEX_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ASCII_VERTEX_REGEX.exec(content))) {
    vertices.push(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
  }
  if (vertices.length === 0 || vertices.length % 9 !== 0) {
    throw new Error("Failed to parse ASCII STL");
  }
  return buildGeometry(new Float32Array(vertices));
}

function buildGeometry(positions: Float32Array): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}
```

## File: src/server/geometry/orient.ts
```typescript
import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import path from "node:path";

import type { OrientationData } from "@/server/services/tmp-files";
import { loadGeometryFromModel } from "./load-geometry";

export function applyOrientationToModel(
  buffer: Buffer,
  filename: string,
  orientation: OrientationData
): { buffer: Buffer; filename: string; mimeType: string } {
  const geometry = loadGeometryFromModel(buffer, filename);
  const mesh = new THREE.Mesh(geometry);
  const quaternion = new THREE.Quaternion(
    orientation.quaternion[0],
    orientation.quaternion[1],
    orientation.quaternion[2],
    orientation.quaternion[3]
  ).normalize();
  mesh.quaternion.copy(quaternion);
  mesh.position.set(orientation.position[0], orientation.position[1], orientation.position[2]);
  mesh.updateMatrixWorld(true);

  const exporter = new STLExporter();
  const dataView = exporter.parse(mesh, { binary: true }) as DataView;
  const arrayBuffer = dataView.buffer.slice(dataView.byteOffset, dataView.byteOffset + dataView.byteLength);
  const orientedName = `${path.basename(filename, path.extname(filename) || undefined)}.stl`;
  return {
    buffer: Buffer.from(arrayBuffer),
    filename: orientedName,
    mimeType: "application/octet-stream",
  };
}
```

## File: src/components/3d/ModelViewerWrapper.tsx
```typescript
"use client";

import { useState, useEffect, forwardRef, type ForwardedRef } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { ModelViewerHandle } from "./ModelViewer";
import type * as THREE from "three";

const ModelViewer = dynamic(() => import("./ModelViewer"), {
  ssr: false,
  loading: () => <Skeleton className="h-[480px] w-full rounded-lg" />,
});

interface ModelViewerWrapperProps {
  url: string;
  filename?: string;
  fileSizeBytes?: number;
  onTransformChange?: (matrix: THREE.Matrix4) => void;
  onLoadComplete?: () => void;
  onError?: (error: Error) => void;
  facePickMode?: boolean;
  onFacePickComplete?: () => void;
  overhangThreshold?: number;
}

const ModelViewerWrapper = forwardRef<ModelViewerHandle, ModelViewerWrapperProps>((props, ref) => {
  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!isClient) {
    return <Skeleton className="h-[480px] w-full rounded-lg" />;
  }

  return (
    <div className={isMobile ? "mx-auto w-full max-w-[min(480px,100%)]" : "w-full"}>
      <ModelViewer ref={ref as ForwardedRef<ModelViewerHandle>} {...props} />
    </div>
  );
});

ModelViewerWrapper.displayName = "ModelViewerWrapper";

export default ModelViewerWrapper;

export type { ModelViewerHandle as ModelViewerRef };
```

## File: src/components/3d/OrientationGizmo.tsx
```typescript
"use client";

import { TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { useOrientationStore } from "@/stores/orientation-store";

export type GizmoMode = "rotate" | "translate";

interface OrientationGizmoProps {
  target: THREE.Object3D | null;
  enabled: boolean;
  mode?: GizmoMode;
  translationSnap?: number;
  onDraggingChange?: (dragging: boolean) => void;
  onTransform?: (object: THREE.Object3D) => void;
  onTransformComplete?: (object: THREE.Object3D) => void;
}

export default function OrientationGizmo({
  target,
  enabled,
  mode = "rotate",
  translationSnap,
  onDraggingChange,
  onTransform,
  onTransformComplete,
}: OrientationGizmoProps) {
  const setOrientation = useOrientationStore((state) => state.setOrientation);

  if (!target || !enabled) {
    return null;
  }

  const handleMouseDown = () => {
    onDraggingChange?.(true);
  };

  const handleObjectChange = () => {
    if (!target) return;
    onTransform?.(target);
  };

  const handleMouseUp = () => {
    onDraggingChange?.(false);
    if (!target) return;
    const q = target.quaternion.clone();
    const p = target.position.clone();
    setOrientation([q.x, q.y, q.z, q.w], [p.x, p.y, p.z]);
    onTransformComplete?.(target);
  };

  return (
    <TransformControls
      object={target}
      enabled={enabled}
      mode={mode}
      space="local"
      translationSnap={mode === "translate" ? translationSnap ?? 1 : undefined}
      showX
      showY
      showZ
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onObjectChange={handleObjectChange}
    />
  );
}
```

## File: src/components/3d/ViewNavigationControls.tsx
```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Axis3D,
  Box,
  Compass,
  Grid,
  Move,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { PanDirection, ViewPreset } from "./ModelViewer";
import { cn } from "@/lib/utils";

interface ViewNavigationControlsProps {
  onPan: (direction: PanDirection) => void;
  onZoom: (direction: "in" | "out") => void;
  onPreset: (preset: ViewPreset) => void;
  onFit: () => void;
  onReset: () => void;
  onToggleHelpers: () => void;
  helpersVisible: boolean;
  disabled?: boolean;
  className?: string;
  mode?: "full" | "presets-only";
  onToggleGizmo?: (enabled: boolean) => void;
  gizmoEnabled?: boolean;
  onGizmoModeChange?: (mode: "rotate" | "translate") => void;
  gizmoMode?: "rotate" | "translate";
}

const presetButtons: Array<{ label: string; preset: ViewPreset; title: string }> = [
  { label: "Top", preset: "top", title: "Top view" },
  { label: "Bottom", preset: "bottom", title: "Bottom view" },
  { label: "Front", preset: "front", title: "Front view" },
  { label: "Back", preset: "back", title: "Back view" },
  { label: "Left", preset: "left", title: "Left side view" },
  { label: "Right", preset: "right", title: "Right side view" },
  { label: "Iso", preset: "iso", title: "Isometric view" },
];

export default function ViewNavigationControls({
  onPan,
  onZoom,
  onPreset,
  onFit,
  onReset,
  onToggleHelpers,
  helpersVisible,
  disabled = false,
  className,
  mode = "full",
  onToggleGizmo,
  gizmoEnabled = false,
  onGizmoModeChange,
  gizmoMode = "rotate",
}: ViewNavigationControlsProps) {
  const presets = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {presetButtons.map((btn) => (
        <Button
          key={btn.preset}
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => onPreset(btn.preset)}
          className="justify-center py-2 text-sm"
          title={btn.title}
        >
          {btn.label}
        </Button>
      ))}
    </div>
  );

  if (mode === "presets-only") {
    return (
      <div
        className={cn(
          "w-full space-y-3 rounded-t-xl border border-border bg-surface-overlay/80 p-3 text-xs shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface-overlay/70",
          className
        )}
      >
        {presets}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full space-y-4 rounded-xl border border-border bg-surface-overlay/80 p-4 text-xs shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface-overlay/70",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Axis3D className="h-4 w-4" />
          View Controls
        </div>
        <div className="flex items-center gap-2">
          {onToggleGizmo ? (
            <Button
              type="button"
              size="sm"
              variant={gizmoEnabled ? "default" : "outline"}
              className="h-8 gap-1 text-xs"
              disabled={disabled}
              onClick={() => onToggleGizmo(!gizmoEnabled)}
              title={gizmoEnabled ? "Hide gizmo" : "Show gizmo"}
            >
              <Move className="h-3.5 w-3.5" />
              Gizmo
            </Button>
          ) : null}
          {onGizmoModeChange ? (
            <Button
              type="button"
              size="sm"
              variant={gizmoMode === "translate" ? "default" : "outline"}
              className="h-8 gap-1 text-xs"
              disabled={disabled || !gizmoEnabled}
              onClick={() => onGizmoModeChange(gizmoMode === "rotate" ? "translate" : "rotate")}
              title={gizmoMode === "rotate" ? "Switch to translate mode" : "Switch to rotate mode"}
            >
              {gizmoMode === "rotate" ? (
                <RotateCcw className="h-3.5 w-3.5" />
              ) : (
                <Move className="h-3.5 w-3.5" />
              )}
              {gizmoMode === "rotate" ? "Rotate" : "Move"}
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant={helpersVisible ? "default" : "outline"}
            className="h-8 gap-1 text-xs"
            disabled={disabled}
            onClick={onToggleHelpers}
            title={helpersVisible ? "Hide axes/grid" : "Show axes/grid"}
          >
            <Grid className="h-3.5 w-3.5" />
            {helpersVisible ? "Hide" : "Show"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="grid grid-cols-3 gap-2 place-items-center">
          <span />
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={disabled}
            className="h-9 w-9"
            onClick={() => onPan("up")}
            title="Pan up"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <span />

          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={disabled}
            className="h-9 w-9"
            onClick={() => onPan("left")}
            title="Pan left"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            disabled={disabled}
            className="h-9 w-9"
            onClick={() => onPreset("iso")}
            title="Set isometric view"
          >
            <Compass className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={disabled}
            className="h-9 w-9"
            onClick={() => onPan("right")}
            title="Pan right"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>

          <span />
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={disabled}
            className="h-9 w-9"
            onClick={() => onPan("down")}
            title="Pan down"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <span />
        </div>

        <div className="flex flex-col items-center justify-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={disabled}
            className="h-9 w-9"
            onClick={() => onZoom("in")}
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={disabled}
            className="h-9 w-9"
            onClick={() => onZoom("out")}
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={disabled}
            onClick={onFit}
            className="flex h-10 items-center justify-center gap-2 text-sm"
          >
            <Box className="h-4 w-4" />
            Fit View
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={onReset}
            className="flex h-10 items-center justify-center gap-2 text-xs"
          >
            Reset View
          </Button>
        </div>
      </div>

      <Separator className="bg-border/60" />
      {presets}
    </div>
  );
}
```

## File: src/workers/overhang-worker.ts
```typescript
/// <reference lib="webworker" />

import { detectOverhangs } from "@/lib/3d/overhang-detector";
import { BufferGeometry, BufferAttribute, Float32BufferAttribute, Quaternion, Vector3 } from "three";

interface WorkerRequest {
  positions: Float32Array;
  index: Uint32Array | null;
  quaternion: [number, number, number, number];
  threshold: number;
  position: [number, number, number] | null;
}

interface WorkerResponse {
  faces: number[];
  supportVolume: number;
  supportWeight: number;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const scope = "worker.overhang";
  const startTime = performance.now();
  try {
    const { positions, index, quaternion, threshold, position } = event.data;
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    if (index) {
      geometry.setIndex(new BufferAttribute(index, 1));
    }
    const quat = new Quaternion(...quaternion);
    const translation = position ? new Vector3(position[0], position[1], position[2]) : undefined;
    const result = detectOverhangs(geometry, quat, threshold, translation);
    const payload: WorkerResponse = {
      faces: result.overhangFaceIndices,
      supportVolume: result.supportVolume,
      supportWeight: result.supportWeight,
    };
    self.postMessage({
      type: "log",
      level: "info",
      scope,
      message: "Overhang detection completed",
      data: {
        supportVolume: result.supportVolume,
        supportWeight: result.supportWeight,
        durationMs: Math.round(performance.now() - startTime),
      },
    });
    self.postMessage(payload);
  } catch (error) {
    self.postMessage({
      type: "log",
      level: "error",
      scope,
      message: "Overhang worker error",
      error: error instanceof Error ? error.message : String(error),
      data: {},
    });
    throw error;
  }
};
```

## File: src/app/api/quick-order/orient/route.ts
```typescript
import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/api-helpers";
import { processOrientedFile, saveOrientationSnapshot } from "@/server/services/quick-order";
import { okAuth, failAuth } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { OrientationData } from "@/server/services/tmp-files";

export const runtime = "nodejs";

/**
 * POST /api/quick-order/orient
 *
 * Supports two payloads:
 *  - JSON orientation snapshots `{ originalFileId, quaternion, position, autoOriented? }`
 *    which persist orientation metadata for the existing tmp file.
 *  - Multipart uploads containing an `orientedSTL` file for legacy flows where the
 *    client bakes the orientation into a new mesh before upload.
 */
function parseNumberTuple(value: unknown, expectedLength: number): number[] | null {
  if (!Array.isArray(value) || value.length !== expectedLength) {
    return null;
  }
  const parsed = value.map((entry) => {
    if (typeof entry === "number" && Number.isFinite(entry)) {
      return entry;
    }
    if (typeof entry === "string" && entry.trim() !== "") {
      const numeric = Number(entry);
      if (Number.isFinite(numeric)) {
        return numeric;
      }
    }
    return null;
  });
  if (parsed.some((num) => num === null)) {
    return null;
  }
  return parsed as number[];
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function parseOrientationPayload(body: Record<string, unknown>):
  | { fileId: string; orientation: OrientationData }
  | null {
  const rawId =
    typeof body.originalFileId === "string"
      ? body.originalFileId
      : typeof body.fileId === "string"
      ? body.fileId
      : null;
  const quaternion = parseNumberTuple(body.quaternion, 4);
  const position = parseNumberTuple(body.position, 3);

  if (!rawId || !quaternion || !position) {
    return null;
  }

  const orientation: OrientationData = {
    quaternion: quaternion as OrientationData["quaternion"],
    position: position as OrientationData["position"],
    autoOriented: Boolean(body.autoOriented),
  };

  const supportVolume = parseOptionalNumber(body.supportVolume);
  const supportWeight = parseOptionalNumber(body.supportWeight);
  if (supportVolume !== undefined) {
    orientation.supportVolume = supportVolume;
  }
  if (supportWeight !== undefined) {
    orientation.supportWeight = supportWeight;
  }

  return { fileId: rawId, orientation };
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as Record<string, unknown>;
      const parsed = parseOrientationPayload(body);

      if (!parsed) {
        return failAuth(request,
          "VALIDATION_ERROR",
          "Invalid orientation payload",
          422,
        );
      }

      const result = await saveOrientationSnapshot(parsed.fileId, parsed.orientation, user.id);
      return okAuth(request, result);
    }

    if (
      contentType.includes("multipart/form-data") ||
      contentType.includes("application/x-www-form-urlencoded")
    ) {
      const formData = await request.formData();
      const fileId = formData.get("fileId") as string;
      const orientedSTL = formData.get("orientedSTL") as File;

      if (!fileId || !orientedSTL) {
        return failAuth(request,
          "VALIDATION_ERROR",
          "Missing required fields: fileId and orientedSTL",
          422,
        );
      }

      const buffer = Buffer.from(await orientedSTL.arrayBuffer());
      const filename = orientedSTL.name || "oriented.stl";
      const mimeType = orientedSTL.type || "application/octet-stream";

      const result = await processOrientedFile(
        fileId,
        { buffer, filename, mimeType },
        user.id,
      );

      return okAuth(request, result);
    }

    return failAuth(request,
      "UNSUPPORTED_MEDIA_TYPE",
      "Content-Type must be application/json or multipart form data",
      415,
    );
  } catch (error) {
    if (error instanceof AppError) {
      return failAuth(request,
        error.code,
        error.message,
        error.status,
        error.details as Record<string, unknown> | undefined,
      );
    }
    logger.error({ scope: "quick-order.orient", message: 'Orientation failed', error });
    return failAuth(request, "INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
}
```

## File: src/components/3d/RotationControls.tsx
```typescript
"use client";

import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/currency";
import { useOrientationStore, useSupports } from "@/stores/orientation-store";
import {
  ArrowDownCircle,
  ArrowLeftCircle,
  ArrowRightCircle,
  ArrowUpCircle,
  Axis3D,
  Compass,
  Maximize2,
  Pointer,
  RefreshCcw,
  RotateCcw,
  AlertTriangle,
  Loader2,
  Sparkles,
  Square,
} from "lucide-react";

interface RotationControlsProps {
  onReset: () => void;
  onRecenter: () => void;
  onFitView: () => void;
  onAutoOrient: () => void;
  onLock: () => void;
  onRotate: (axis: "x" | "y" | "z", degrees: number) => void;
  isLocking?: boolean;
  disabled?: boolean;
  onOrientToFaceToggle?: (enabled: boolean) => void;
  orientToFaceActive?: boolean;
  supportCostPerGram?: number;
  lockGuardReason?: string;
}

type ControlAction = {
  label: string;
  axis: "x" | "y" | "z";
  degrees: number;
  icon: ReactNode;
};

export default function RotationControls({
  onReset,
  onRecenter,
  onFitView,
  onAutoOrient,
  onLock,
  onRotate,
  isLocking = false,
  disabled = false,
  onOrientToFaceToggle,
  orientToFaceActive,
  supportCostPerGram = 0.25,
  lockGuardReason,
}: RotationControlsProps) {
  const primaryActions = useMemo<ControlAction[]>(
    () => [
      {
        label: "Rotate Left",
        axis: "y",
        degrees: -45,
        icon: <ArrowLeftCircle className="h-4 w-4" />,
      },
      {
        label: "Rotate Right",
        axis: "y",
        degrees: 45,
        icon: <ArrowRightCircle className="h-4 w-4" />,
      },
      {
        label: "Tilt Forward",
        axis: "x",
        degrees: -45,
        icon: <ArrowDownCircle className="h-4 w-4" />,
      },
      {
        label: "Tilt Back",
        axis: "x",
        degrees: 45,
        icon: <ArrowUpCircle className="h-4 w-4" />,
      },
      {
        label: "Rotate Z",
        axis: "z",
        degrees: 90,
        icon: <RotateCcw className="h-4 w-4" />,
      },
    ],
    []
  );

  type AxisKey = "x" | "y" | "z";

  const quaternionTuple = useOrientationStore((state) => state.quaternion);
  const positionTuple = useOrientationStore((state) => state.position);
  const setOrientationState = useOrientationStore((state) => state.setOrientation);
  const {
    supportVolume,
    supportWeight,
    overhangStatus,
    overhangMessage,
    autoOrientStatus,
    autoOrientMessage,
    interactionDisabled,
    interactionMessage,
    warnings,
  } = useSupports();

  const quaternion = useMemo(() => new THREE.Quaternion(...quaternionTuple), [quaternionTuple]);
  const currentEuler = useMemo(() => {
    const euler = new THREE.Euler().setFromQuaternion(quaternion, "XYZ");
    const toDegrees = (value: number) => {
      const deg = THREE.MathUtils.radToDeg(value);
      const normalized = ((deg % 360) + 360) % 360;
      return Math.round(normalized * 10) / 10;
    };
    return { x: toDegrees(euler.x), y: toDegrees(euler.y), z: toDegrees(euler.z) };
  }, [quaternion]);

  const [angleInputs, setAngleInputs] = useState(currentEuler);
  useEffect(() => {
    setAngleInputs((prev) => {
      if (prev.x === currentEuler.x && prev.y === currentEuler.y && prev.z === currentEuler.z) {
        return prev;
      }
      return currentEuler;
    });
  }, [currentEuler]);

  const normalizeAngle = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    const normalized = ((value % 360) + 360) % 360;
    return Math.round(normalized * 10) / 10;
  };

  const applyAngles = (nextAngles: Record<AxisKey, number>) => {
    const clamped: Record<AxisKey, number> = {
      x: normalizeAngle(nextAngles.x),
      y: normalizeAngle(nextAngles.y),
      z: normalizeAngle(nextAngles.z),
    };
    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(clamped.x),
      THREE.MathUtils.degToRad(clamped.y),
      THREE.MathUtils.degToRad(clamped.z),
      "XYZ"
    );
    const newQuat = new THREE.Quaternion().setFromEuler(euler);
    setOrientationState([newQuat.x, newQuat.y, newQuat.z, newQuat.w], positionTuple);
  };

  const handleAngleInput = (axis: AxisKey, value: string) => {
    const numeric = Number(value);
    setAngleInputs((prev) => ({ ...prev, [axis]: Number.isNaN(numeric) ? 0 : numeric }));
  };

  const handleAngleCommit = () => {
    applyAngles(angleInputs);
  };

  const handleAngleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAngleCommit();
    }
  };

  const [internalFaceSelect, setInternalFaceSelect] = useState(false);
  const faceSelectionEnabled = orientToFaceActive ?? internalFaceSelect;

  const toggleFaceSelection = () => {
    const next = !faceSelectionEnabled;
    if (orientToFaceActive === undefined) {
      setInternalFaceSelect(next);
    }
    onOrientToFaceToggle?.(next);
  };

  const controlsDisabled = disabled || interactionDisabled;

  useEffect(() => {
    if (!controlsDisabled || !faceSelectionEnabled) return;
    if (orientToFaceActive === undefined) {
      setInternalFaceSelect(false);
    }
    onOrientToFaceToggle?.(false);
  }, [controlsDisabled, faceSelectionEnabled, onOrientToFaceToggle, orientToFaceActive]);

  const supportGrams = supportWeight || supportVolume;
  const supportCost = supportGrams * supportCostPerGram;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-overlay/80 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface-overlay/70">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Axis3D className="h-4 w-4" />
          Orientation Controls
        </div>
        <div className="flex items-center gap-2" />
      </div>
      <p className="text-xs text-muted-foreground">
        Fine tune orientation before locking it in.
      </p>

      <div className="grid gap-2 sm:grid-cols-5">
        {primaryActions.map((action) => (
          <Button
            key={`${action.axis}-${action.degrees}`}
            type="button"
            variant="outline"
            disabled={controlsDisabled}
            className="flex w-full items-center justify-center gap-2"
            onClick={() => onRotate(action.axis, action.degrees)}
          >
            {action.icon}
            <span className="text-xs font-medium">{action.label}</span>
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {autoOrientStatus === "running" && (
          <StatusPill tone="primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {autoOrientMessage ?? "Calculating best orientation…"}
          </StatusPill>
        )}
        {autoOrientStatus === "timeout" && (
          <StatusPill tone="warning">
            <AlertTriangle className="h-3.5 w-3.5" />
            {autoOrientMessage ?? "Auto-orient timed out. Result simplified."}
          </StatusPill>
        )}
        {autoOrientStatus === "error" && (
          <StatusPill tone="danger">
            <AlertTriangle className="h-3.5 w-3.5" />
            {autoOrientMessage ?? "Auto-orient failed. Orientation reset."}
          </StatusPill>
        )}
        {overhangStatus === "running" && (
          <StatusPill tone="muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {overhangMessage ?? "Detecting overhangs…"}
          </StatusPill>
        )}
        {overhangStatus === "error" && (
          <StatusPill tone="warning">
            <AlertTriangle className="h-3.5 w-3.5" />
            {overhangMessage ?? "Overhang preview unavailable."}
          </StatusPill>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {(Object.keys(angleInputs) as AxisKey[]).map((axis) => (
          <label key={axis} className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            {axis.toUpperCase()} Rotation
            <Input
              type="number"
              min={0}
              max={359}
              step={1}
              value={angleInputs[axis]}
              disabled={disabled}
              onChange={(event) => handleAngleInput(axis, event.target.value)}
              onBlur={handleAngleCommit}
              onKeyDown={handleAngleKeyDown}
              className="text-sm"
            />
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Current rotation</span>
        <span className="font-medium text-foreground">
          X {currentEuler.x.toFixed(1)}° · Y {currentEuler.y.toFixed(1)}° · Z {currentEuler.z.toFixed(1)}°
        </span>
      </div>

      <Separator className="bg-border/60" />

      <div className="grid gap-2 sm:grid-cols-6">
        <Button
          type="button"
          variant="secondary"
          disabled={controlsDisabled}
          className="flex w-full items-center justify-center gap-2"
          onClick={onRecenter}
        >
          <Square className="h-4 w-4" />
          Recenter
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={controlsDisabled}
          className="flex w-full items-center justify-center gap-2"
          onClick={onFitView}
        >
          <Maximize2 className="h-4 w-4" />
          Fit View
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={controlsDisabled}
          className="flex w-full items-center justify-center gap-2"
          onClick={onAutoOrient}
        >
          <Sparkles className="h-4 w-4" />
          Auto Orient
        </Button>
        <Button
          type="button"
          variant={faceSelectionEnabled ? "default" : "outline"}
          disabled={controlsDisabled}
          className="flex w-full items-center justify-center gap-2"
          onClick={toggleFaceSelection}
        >
          <Pointer className="h-4 w-4" />
          {faceSelectionEnabled ? "Click model face" : "Orient to Face"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={controlsDisabled}
          className="flex w-full items-center justify-center gap-2"
          onClick={onReset}
        >
          <RefreshCcw className="h-4 w-4" />
          Reset
        </Button>
        <Button
          type="button"
          disabled={disabled || isLocking || interactionDisabled || Boolean(lockGuardReason)}
          className="flex w-full items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-500 sm:col-span-2"
          onClick={onLock}
        >
          {isLocking ? (
            <>
              <Compass className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Compass className="h-4 w-4" />
              Lock Orientation
            </>
          )}
        </Button>
      </div>

      {lockGuardReason ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {lockGuardReason}
        </div>
      ) : null}

      {interactionDisabled && interactionMessage ? (
        <div className="rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {interactionMessage}
        </div>
      ) : null}

      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <ul className="list-disc space-y-1 pl-4">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-1 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span className="font-medium text-foreground">Estimated supports</span>
          <span className="text-sm font-semibold text-foreground">
            {supportGrams > 0 ? `${supportGrams.toFixed(1)}g` : "0g"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Cost impact</span>
          <span className="font-medium text-foreground">{formatCurrency(supportCost)}</span>
        </div>
      </div>
    </div>
  );
}

const STATUS_PILL_TONES = {
  primary: "bg-blue-600/10 text-blue-700",
  warning: "bg-amber-500/15 text-amber-800",
  danger: "bg-destructive/10 text-destructive",
  muted: "bg-muted/60 text-muted-foreground",
} as const;

function StatusPill({ tone = "muted", children }: { tone?: keyof typeof STATUS_PILL_TONES; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium ${STATUS_PILL_TONES[tone]}`}
    >
      {children}
    </span>
  );
}
```

## File: src/lib/3d/orientation.ts
```typescript
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
      timedOut: false,
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
```

## File: src/stores/orientation-store.ts
```typescript
import { create, type StateCreator } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { browserLogger } from '@/lib/logging/browser-logger';

export type OrientationQuaternion = [number, number, number, number];
export type OrientationPosition = [number, number, number];
export type OrientationGizmoMode = "rotate" | "translate";

export interface OrientationBoundsStatus {
  inBounds: boolean;
  width: number;
  depth: number;
  height: number;
  violations: string[];
}

type LoadingState = "idle" | "running" | "error" | "timeout";

interface OrientationState {
  quaternion: OrientationQuaternion;
  position: OrientationPosition;
  overhangFaces: number[];
  supportVolume: number;
  supportWeight: number;
  supportEnabled: boolean;
  isAutoOriented: boolean;
  overhangStatus: LoadingState;
  overhangMessage?: string;
  autoOrientStatus: LoadingState;
  autoOrientMessage?: string;
  interactionDisabled: boolean;
  interactionMessage?: string;
  warnings: string[];
  boundsStatus: OrientationBoundsStatus | null;
  helpersVisible: boolean;
  gizmoEnabled: boolean;
  gizmoMode: OrientationGizmoMode;
}

interface OrientationActions {
  setOrientation: (
    quaternion: OrientationQuaternion,
    position?: OrientationPosition,
    options?: { auto?: boolean }
  ) => void;
  setOverhangData: (params: { faces: number[]; supportVolume: number; supportWeight: number }) => void;
  toggleSupports: (nextState?: boolean) => void;
  setSupportsEnabled: (enabled: boolean) => void;
  setAnalysisStatus: (status: LoadingState, message?: string) => void;
  setAutoOrientStatus: (status: LoadingState, message?: string) => void;
  setInteractionLock: (disabled: boolean, message?: string) => void;
  addWarning: (message: string) => void;
  clearWarnings: () => void;
  setBoundsStatus: (status: OrientationBoundsStatus | null) => void;
  setHelpersVisible: (visible: boolean) => void;
  setGizmoEnabledState: (enabled: boolean) => void;
  setGizmoMode: (mode: OrientationGizmoMode) => void;
  reset: () => void;
}

const initialQuaternion: OrientationQuaternion = [0, 0, 0, 1];
const initialPosition: OrientationPosition = [0, 0, 0];

const initialState: OrientationState = {
  quaternion: initialQuaternion,
  position: initialPosition,
  overhangFaces: [],
  supportVolume: 0,
  supportWeight: 0,
  supportEnabled: true,
  isAutoOriented: false,
  overhangStatus: "idle",
  autoOrientStatus: "idle",
  interactionDisabled: false,
  warnings: [],
  boundsStatus: null,
  helpersVisible: false,
  gizmoEnabled: false,
  gizmoMode: "rotate",
};

export type OrientationStore = OrientationState & OrientationActions;

const STORAGE_KEY = "quickprint-orientation";
export const ORIENTATION_STORAGE_KEY = STORAGE_KEY;

const isClient = typeof window !== "undefined";
const sessionStorage = isClient
  ? createJSONStorage(() => ({
      getItem: (name: string) => {
        try {
          return window.sessionStorage.getItem(name);
        } catch (error) {
          browserLogger.error({
            scope: "bug.31.orientation-missing",
            message: "Failed to read orientation persistence",
            error,
          });
          return null;
        }
      },
      setItem: (name: string, value: string) => {
        try {
          window.sessionStorage.setItem(name, value);
        } catch (error) {
          browserLogger.error({
            scope: "bug.31.orientation-missing",
            message: "Failed to write orientation persistence",
            error,
          });
        }
      },
      removeItem: (name: string) => {
        try {
          window.sessionStorage.removeItem(name);
        } catch (error) {
          browserLogger.error({
            scope: "bug.31.orientation-missing",
            message: "Failed to clear orientation persistence",
            error,
          });
        }
      },
    }))
  : undefined;

export function clearOrientationPersistence() {
  if (!isClient) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    browserLogger.error({
      scope: "bug.31.orientation-missing",
      message: "Failed to clear orientation persistence",
      error,
    });
  }
}

const createOrientationStore: StateCreator<OrientationStore> = (set) => ({
  ...initialState,
  setOrientation: (quaternion, position = initialPosition, options) =>
    set((state) => {
      const nextQuat = normalizeQuaternion(quaternion);
      const nextPos: OrientationPosition = [...position] as OrientationPosition;
      const unchangedQuat =
        state.quaternion[0] === nextQuat[0] &&
        state.quaternion[1] === nextQuat[1] &&
        state.quaternion[2] === nextQuat[2] &&
        state.quaternion[3] === nextQuat[3];
      const unchangedPos =
        state.position[0] === nextPos[0] &&
        state.position[1] === nextPos[1] &&
        state.position[2] === nextPos[2];
      const nextAuto = options?.auto ?? state.isAutoOriented;
      if (unchangedQuat && unchangedPos && nextAuto === state.isAutoOriented) {
        return state;
      }
      return {
        quaternion: nextQuat,
        position: nextPos,
        isAutoOriented: nextAuto,
      };
    }),
  setOverhangData: ({ faces, supportVolume, supportWeight }) =>
    set(() => ({
      overhangFaces: faces,
      supportVolume,
      supportWeight,
      overhangStatus: "idle",
      overhangMessage: undefined,
    })),
  toggleSupports: (nextState) =>
    set((state) => ({ supportEnabled: nextState ?? !state.supportEnabled })),
  setSupportsEnabled: (enabled) => set(() => ({ supportEnabled: enabled })),
  setAnalysisStatus: (status, message) => set(() => ({ overhangStatus: status, overhangMessage: message })),
  setAutoOrientStatus: (status, message) =>
    set(() => ({ autoOrientStatus: status, autoOrientMessage: message })),
  setInteractionLock: (disabled, message) =>
    set(() => ({ interactionDisabled: disabled, interactionMessage: message })),
  addWarning: (message) =>
    set((state) => {
      if (state.warnings.includes(message)) {
        return state;
      }
      return { warnings: [...state.warnings, message] };
    }),
  clearWarnings: () => set(() => ({ warnings: [] })),
  setBoundsStatus: (status) =>
    set((state) => {
      const prev = state.boundsStatus;
      const same =
        (!prev && !status) ||
        (prev &&
          status &&
          prev.inBounds === status.inBounds &&
          prev.width === status.width &&
          prev.depth === status.depth &&
          prev.height === status.height &&
          prev.violations.length === status.violations.length &&
          prev.violations.every((v, i) => v === status.violations[i]));
      return same ? state : { boundsStatus: status };
    }),
  setHelpersVisible: (visible) => set(() => ({ helpersVisible: visible })),
  setGizmoEnabledState: (enabled) => set(() => ({ gizmoEnabled: enabled })),
  setGizmoMode: (mode) => set(() => ({ gizmoMode: mode })),
  reset: () => {
    clearOrientationPersistence();
    set({ ...initialState });
  },
});

export const useOrientationStore = create<OrientationStore>()(
  persist(createOrientationStore, {
    name: STORAGE_KEY,
    storage: sessionStorage,
  }),
);

export const useOrientation = () =>
  useOrientationStore(
    useShallow((state) => ({
      quaternion: state.quaternion,
      position: state.position,
      isAutoOriented: state.isAutoOriented,
    })),
  );

export const useSupports = () =>
  useOrientationStore(
    useShallow((state) => ({
      supportEnabled: state.supportEnabled,
      supportVolume: state.supportVolume,
      supportWeight: state.supportWeight,
      overhangFaces: state.overhangFaces,
      overhangStatus: state.overhangStatus,
      overhangMessage: state.overhangMessage,
      autoOrientStatus: state.autoOrientStatus,
      autoOrientMessage: state.autoOrientMessage,
      interactionDisabled: state.interactionDisabled,
      interactionMessage: state.interactionMessage,
      warnings: state.warnings,
      boundsStatus: state.boundsStatus,
    })),
  );

function normalizeQuaternion(tuple: OrientationQuaternion): OrientationQuaternion {
  const [x, y, z, w] = tuple;
  const magnitude = Math.hypot(x, y, z, w);
  if (!Number.isFinite(magnitude) || magnitude < 1e-4) {
    return [...initialQuaternion];
  }
  const inv = 1 / magnitude;
  return [x * inv, y * inv, z * inv, w * inv] as OrientationQuaternion;
}
```

## File: src/components/3d/ModelViewer.tsx
```typescript
"use client";

import {
  Suspense,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import * as THREE from "three";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { AdaptiveDpr, Html, OrbitControls } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { computeAutoOrientQuaternion } from "@/lib/3d/orientation";
import { detectOverhangs } from "@/lib/3d/overhang-detector";
import { calculateFaceToGroundQuaternion, raycastFace } from "@/lib/3d/face-alignment";
import { recenterObjectToGround } from "@/lib/3d/coordinates";
import {
  useOrientationStore,
  OrientationQuaternion,
  OrientationPosition,
  OrientationBoundsStatus,
} from "@/stores/orientation-store";
import { describeBuildVolume, HALF_PLATE_MM } from "@/lib/3d/build-volume";
import BuildPlate from "./BuildPlate";
import OverhangHighlight from "./OverhangHighlight";
import OrientationGizmo, { type GizmoMode } from "./OrientationGizmo";
import { browserLogger } from "@/lib/logging/browser-logger";
import { useWebGLContext } from "@/hooks/use-webgl-context";

type SupportedExt = "stl" | "3mf";
function extFromFilename(name?: string | null): SupportedExt | null {
  if (!name) return null;
  const ext = name.toLowerCase().split(".").pop();
  if (ext === "stl") return "stl";
  if (ext === "3mf") return "3mf";
  return null;
}

export type PanDirection = "left" | "right" | "up" | "down";
export type ViewPreset = "top" | "bottom" | "front" | "back" | "left" | "right" | "iso";

export interface ModelViewerHandle {
  getObject: () => THREE.Object3D | null;
  resetView: () => void;
  recenter: () => void;
  rotate: (axis: "x" | "y" | "z", degrees: number) => void;
  fit: () => void;
  autoOrient: () => void;
  pan: (direction: PanDirection, stepScale?: number) => void;
  zoom: (direction: "in" | "out", factor?: number) => void;
  setView: (preset: ViewPreset) => void;
  setHelpersVisible: (visible: boolean) => void;
  toggleHelpers: () => void;
  orientToFace: (faceNormal: THREE.Vector3) => void;
  getOrientation: () => { quaternion: OrientationQuaternion; position: OrientationPosition };
  setOrientation: (quaternion: OrientationQuaternion, position?: OrientationPosition) => void;
  setGizmoEnabled: (enabled: boolean) => void;
  setGizmoMode: (mode: GizmoMode) => void;
}

interface ModelViewerProps {
  url: string;
  filename?: string; // helps choose loader
  fileSizeBytes?: number;
  onLoadComplete?: () => void;
  onError?: (error: Error) => void;
  onTransformChange?: (matrix: THREE.Matrix4) => void;
  facePickMode?: boolean;
  onFacePickComplete?: () => void;
  overhangThreshold?: number;
}

function mergeObjectGeometries(root: THREE.Object3D): THREE.BufferGeometry | null {
  const geoms: THREE.BufferGeometry[] = [];
  root.updateMatrixWorld(true);
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) {
      const cloned = mesh.geometry.clone();
      const world = mesh.matrixWorld.clone();
      cloned.applyMatrix4(world);
      geoms.push(cloned);
    }
  });
  if (geoms.length === 0) return null;
  try {
    return BufferGeometryUtils.mergeGeometries(geoms, false) as THREE.BufferGeometry;
  } catch {
    // Fallback to first geometry
    return geoms[0];
  }
}

const IDENTITY_TUPLE: OrientationQuaternion = [0, 0, 0, 1];
const LARGE_MODEL_BYTES = 50 * 1024 * 1024;
const AUTO_ORIENT_TIMEOUT_MS = 5000;
const FLAT_MODEL_THRESHOLD_MM = 0.2;

type OverhangWorkerResponse = {
  faces: number[];
  supportVolume: number;
  supportWeight: number;
};

function tupleToQuaternion(tuple: OrientationQuaternion): THREE.Quaternion {
  return new THREE.Quaternion(tuple[0], tuple[1], tuple[2], tuple[3]).normalize();
}

function quaternionToTuple(quaternion: THREE.Quaternion): OrientationQuaternion {
  const normalized = quaternion.clone().normalize();
  return [normalized.x, normalized.y, normalized.z, normalized.w];
}

function vectorToTuple(vec: THREE.Vector3): OrientationPosition {
  return [vec.x, vec.y, vec.z];
}

function isIdentityTuple(tuple: OrientationQuaternion) {
  return (
    tuple[0] === IDENTITY_TUPLE[0] &&
    tuple[1] === IDENTITY_TUPLE[1] &&
    tuple[2] === IDENTITY_TUPLE[2] &&
    tuple[3] === IDENTITY_TUPLE[3]
  );
}

const tempBox = new THREE.Box3();
const tempSphere = new THREE.Sphere();
const tempDir = new THREE.Vector3();
const tempTranslation = new THREE.Vector3();
const DEFAULT_BOUNDS_MESSAGE = "Model exceeds the 240mm build volume. Reposition before locking orientation.";
const tempTarget = new THREE.Vector3();
const tempCenter = new THREE.Vector3();

function computeBoundsStatusFromObject(object: THREE.Object3D | null): OrientationBoundsStatus | null {
  if (!object) return null;
  tempBox.setFromObject(object);
  if (tempBox.isEmpty()) return null;
  return describeBuildVolume(tempBox);
}

function formatBoundsMessage(status: OrientationBoundsStatus): string {
  if (!status.violations.length) {
    return DEFAULT_BOUNDS_MESSAGE;
  }
  return `Build volume exceeded: ${status.violations[0]}`;
}

function fitCameraToGroup(
  group: THREE.Group,
  camera: THREE.PerspectiveCamera,
  controls?: OrbitControlsImpl | null
) {
  tempBox.setFromObject(group);
  if (tempBox.isEmpty()) return;
  tempBox.getBoundingSphere(tempSphere);
  const radius = tempSphere.radius || 1;
  tempCenter.copy(tempSphere.center ?? new THREE.Vector3());
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const distance = (radius / Math.tan(fov / 2)) * 1.4;
  camera.position.set(tempCenter.x, tempCenter.y + radius * 0.6, tempCenter.z + distance);
  camera.near = Math.max(0.1, distance / 1000);
  camera.far = Math.max(distance * 10, camera.near + 10);
  camera.updateProjectionMatrix();
  if (controls?.target) {
    controls.target.copy(tempCenter);
    controls.update();
  } else {
    camera.lookAt(tempCenter);
  }
}

function getGroupBoundingSphere(group: THREE.Group): THREE.Sphere | null {
  tempBox.setFromObject(group);
  if (tempBox.isEmpty()) return null;
  tempBox.getBoundingSphere(tempSphere);
  return tempSphere;
}

function getGroupRadius(group: THREE.Group): number {
  const sphere = getGroupBoundingSphere(group);
  if (!sphere || !isFinite(sphere.radius) || sphere.radius === 0) {
    return 50;
  }
  return sphere.radius;
}

function positionCameraForPreset(
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

function retargetControlsToGroup(
  group: THREE.Group,
  controls: OrbitControlsImpl | null
) {
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

function rotateGroup(group: THREE.Group, axis: "x" | "y" | "z", degrees: number) {
  const radians = THREE.MathUtils.degToRad(degrees);
  switch (axis) {
    case "x":
      group.rotateX(radians);
      break;
    case "y":
      group.rotateY(radians);
      break;
    case "z":
      group.rotateZ(radians);
      break;
  }
  group.updateMatrixWorld(true);
}

type AutoOrientStatusSetter = (status: "idle" | "running" | "error" | "timeout", message?: string) => void;

function applyAutoOrientToGroup(
  geometry: THREE.BufferGeometry | null,
  group: THREE.Group,
  options: {
    largeModel: boolean;
    setStatus: AutoOrientStatusSetter;
    addWarning: (message: string) => void;
  }
): THREE.Quaternion | null {
  if (!geometry) {
    options.setStatus("error", "Auto-orient is unavailable for this file.");
    return null;
  }
  try {
    options.setStatus("running", "Calculating best orientation…");
    const result = computeAutoOrientQuaternion(geometry, "upright", {
      directionSamples: options.largeModel ? 32 : undefined,
      maxDurationMs: AUTO_ORIENT_TIMEOUT_MS,
    });
    group.quaternion.copy(result.quaternion);
    group.updateMatrixWorld(true);
    if (result.timedOut) {
      options.setStatus("timeout", "Auto-orient timed out—using simplified result.");
      options.addWarning("Auto-orient timed out and used a simplified result.");
    } else {
      options.setStatus("idle");
    }
    return group.quaternion.clone();
  } catch (err) {
    browserLogger.error({
      scope: "browser.auto-orient",
      message: "[ModelViewer] auto-orient failed",
      error: err,
    });
    options.setStatus("error", "Auto-orient failed—resetting orientation.");
    group.quaternion.identity();
    group.rotation.set(0, 0, 0);
    group.position.set(0, 0, 0);
    group.updateMatrixWorld(true);
    options.addWarning("Auto-orient failed—orientation was reset.");
    return group.quaternion.clone();
  }
}

function isGeometryEffectivelyFlat(geometry: THREE.BufferGeometry | null) {
  if (!geometry) return false;
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox;
  if (!bbox) return false;
  const height = bbox.max.y - bbox.min.y;
  return !Number.isFinite(height) || height <= FLAT_MODEL_THRESHOLD_MM;
}

// (Removed geometry baking; orientation is applied once to the group's quaternion)

function STLObject({ url, onLoaded }: { url: string; onLoaded?: () => void }) {
  const raw = useLoader(STLLoader, url) as THREE.BufferGeometry;
  const groupRef = useRef<THREE.Group>(null);
  const group = useMemo(() => {
    const geom = raw.clone();
    geom.computeVertexNormals();
    const mesh = new THREE.Mesh(
      geom,
      new THREE.MeshStandardMaterial({ color: "#ff7435", metalness: 0.0, roughness: 0.8 })
    );
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    const g = new THREE.Group();
    g.add(mesh);
    return g;
  }, [raw]);

  useEffect(() => {
    onLoaded?.();
  }, [onLoaded]);

  return <primitive ref={groupRef} object={group} />;
}

function ThreeMFObject({ url, onLoaded }: { url: string; onLoaded?: () => void }) {
  const groupRaw = useLoader(ThreeMFLoader, url) as THREE.Group;
  const groupRef = useRef<THREE.Group>(null);
  const group = useMemo(() => {
    const g = groupRaw.clone(true);
    const defaultMat = new THREE.MeshStandardMaterial({ color: "#ff7435", metalness: 0.0, roughness: 0.8 });
    g.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.material = defaultMat;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      }
    });
    return g;
  }, [groupRaw]);

  useEffect(() => {
    onLoaded?.();
  }, [onLoaded]);

  return <primitive ref={groupRef} object={group} />;
}

function LoaderOverlay() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-background/90 px-6 py-4 text-sm shadow-lg">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-transparent" />
        Loading 3D model…
      </div>
    </Html>
  );
}

function Scene({
  url,
  filename,
  fileSizeBytes,
  onReady,
  onError,
  onTransformChange,
  onCameraReady,
  helpersVisible = false,
  gizmoEnabled = false,
  gizmoMode = "rotate",
  facePickMode = false,
  onFacePickRequest,
  overhangThreshold = 45,
}: {
  url: string;
  filename?: string;
  fileSizeBytes?: number;
  onReady: (object: THREE.Object3D | null) => void;
  onError?: (error: Error) => void;
  onTransformChange?: (matrix: THREE.Matrix4) => void;
  onCameraReady?: (camera: THREE.PerspectiveCamera, controls: OrbitControlsImpl | null) => void;
  helpersVisible?: boolean;
  gizmoEnabled?: boolean;
  gizmoMode?: GizmoMode;
  facePickMode?: boolean;
  onFacePickRequest?: (normal: THREE.Vector3) => void;
  overhangThreshold?: number;
}) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const objectRef = useRef<THREE.Group | null>(null);
  const storeQuaternion = useOrientationStore((state) => state.quaternion);
  const storePosition = useOrientationStore((state) => state.position);
  const overhangFaces = useOrientationStore((state) => state.overhangFaces);
  const supportEnabled = useOrientationStore((state) => state.supportEnabled);
  const setOrientationState = useOrientationStore((state) => state.setOrientation);
  const setOverhangData = useOrientationStore((state) => state.setOverhangData);
  const setAnalysisStatus = useOrientationStore((state) => state.setAnalysisStatus);
  const setAutoOrientStatus = useOrientationStore((state) => state.setAutoOrientStatus);
  const setInteractionLock = useOrientationStore((state) => state.setInteractionLock);
  const setBoundsStatus = useOrientationStore((state) => state.setBoundsStatus);
  const addWarning = useOrientationStore((state) => state.addWarning);
  const clearWarnings = useOrientationStore((state) => state.clearWarnings);
  const analysisGeometryRef = useRef<THREE.BufferGeometry | null>(null);
  const serializedGeometryRef = useRef<{ positions: Float32Array; index: Uint32Array | null } | null>(null);
  const thresholdRef = useRef(overhangThreshold);
  const [analysisGeometry, setAnalysisGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [gizmoDragging, setGizmoDragging] = useState(false);
  const [modelVersion, setModelVersion] = useState(0);
  const overhangTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const workerFailedRef = useRef(false);
  const geometryMissingLoggedRef = useRef(false);
  const largeModel = (fileSizeBytes ?? 0) > LARGE_MODEL_BYTES;
  const boundsLockRef = useRef<{ active: boolean; message: string | null }>({ active: false, message: null });

  const ext = extFromFilename(filename) ?? "stl";
  const urlKey = `${url}|${filename ?? ""}`;
  const preparedForKeyRef = useRef<string | null>(null);

  useEffect(() => {
    clearWarnings();
    setInteractionLock(false, undefined);
  }, [urlKey, clearWarnings, setInteractionLock]);

  useEffect(() => {
    return () => {
      setBoundsStatus(null);
      if (boundsLockRef.current.active) {
        const store = useOrientationStore.getState();
        if (store.interactionMessage === boundsLockRef.current.message) {
          setInteractionLock(false, undefined);
        }
        boundsLockRef.current = { active: false, message: null };
      }
    };
  }, [setBoundsStatus, setInteractionLock]);

  useEffect(() => {
    if (largeModel) {
      addWarning("Large file (>50 MB). Some interactions are simplified for performance.");
    }
  }, [addWarning, largeModel]);

  const performOverhangAnalysis = useCallback(
    (quaternion: THREE.Quaternion, translation?: THREE.Vector3 | null) => {
      const geometry = analysisGeometryRef.current;
      if (!geometry) {
        setAnalysisStatus("error", "No geometry available for overhang analysis.");
        return;
      }
      try {
        const data = detectOverhangs(geometry, quaternion, thresholdRef.current ?? 45, translation ?? null);
        setOverhangData({
          faces: data.overhangFaceIndices,
          supportVolume: data.supportVolume,
          supportWeight: data.supportWeight,
        });
  } catch (err) {
    browserLogger.error({
      scope: "browser.overhang.analysis",
      message: "[ModelViewer] overhang analysis failed",
      error: err,
    });
    setAnalysisStatus("error", "Overhang preview failed. Using last known estimate.");
    addWarning("Overhang preview failed. Estimates may be outdated.");
  }
    },
    [addWarning, setAnalysisStatus, setOverhangData]
  );

  const dispatchOverhangAnalysis = useCallback(
    (quaternion: THREE.Quaternion, translation?: THREE.Vector3 | null) => {
      if (!analysisGeometryRef.current) {
        if (!geometryMissingLoggedRef.current) {
          browserLogger.info({
            scope: "browser.overhang.analysis",
            message: "Skipping overhang analysis; geometry not ready",
          });
          geometryMissingLoggedRef.current = true;
        }
        setAnalysisStatus("error", "Overhang unavailable until model loads.");
        return;
      }
      const worker = workerRef.current;
      const serialized = serializedGeometryRef.current;
      setAnalysisStatus("running", "Detecting overhangs…");
      const translationTuple = translation
        ? ([translation.x, translation.y, translation.z] as [number, number, number])
        : null;
      if (worker && serialized && !workerFailedRef.current && !largeModel) {
        worker.postMessage({
          positions: serialized.positions.slice(0),
          index: serialized.index ? serialized.index.slice(0) : null,
          quaternion: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
          position: translationTuple,
          threshold: thresholdRef.current ?? 45,
        });
        return;
      }

      const reason = largeModel
        ? "large-model"
        : !worker || workerFailedRef.current
          ? "worker-unavailable"
          : "geometry-missing";
      browserLogger.info({
        scope: "browser.overhang.analysis",
        message: "Falling back to inline overhang estimation",
        data: {
          reason,
          fileSizeBytes,
        },
      });
      performOverhangAnalysis(quaternion, translation);
    },
    [fileSizeBytes, largeModel, performOverhangAnalysis, setAnalysisStatus]
  );

  const cloneGeometryForWorker = useCallback((geometry: THREE.BufferGeometry | null) => {
    if (!geometry) {
      serializedGeometryRef.current = null;
      return;
    }
    const positionAttr = geometry.getAttribute("position");
    if (!positionAttr) {
      serializedGeometryRef.current = null;
      return;
    }
    const positionsSource = positionAttr.array as Float32Array;
    const positionsCopy = new Float32Array(positionsSource.length);
    positionsCopy.set(positionsSource);
    let indexCopy: Uint32Array | null = null;
    const indexAttr = geometry.getIndex();
    if (indexAttr) {
      const source = indexAttr.array as ArrayLike<number>;
      indexCopy = new Uint32Array(source.length);
      for (let i = 0; i < source.length; i += 1) {
        indexCopy[i] = Number(source[i]);
      }
    }
    serializedGeometryRef.current = { positions: positionsCopy, index: indexCopy };
  }, []);

  const updateBoundsStatus = useCallback(
    (group?: THREE.Group | null) => {
      const status = computeBoundsStatusFromObject(group ?? objectRef.current);
      setBoundsStatus(status);
      if (status && !status.inBounds) {
        const message = formatBoundsMessage(status);
        browserLogger.warn({
          scope: "browser.orientation.bounds",
          message,
          data: { ...status },
        });
        if (!boundsLockRef.current.active || boundsLockRef.current.message !== message) {
          boundsLockRef.current = { active: true, message };
          setInteractionLock(true, message);
        }
      } else if (boundsLockRef.current.active) {
        const store = useOrientationStore.getState();
        if (store.interactionMessage === boundsLockRef.current.message) {
          setInteractionLock(false, undefined);
        }
        boundsLockRef.current = { active: false, message: null };
      }
    },
    [setBoundsStatus, setInteractionLock]
  );
  const clampGroupToBuildVolume = useCallback((group: THREE.Group) => {
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
  }, []);

  const runOverhangAnalysis = useCallback(
    (quaternion?: THREE.Quaternion, translation?: THREE.Vector3 | null) => {
      if (!analysisGeometryRef.current) {
        return;
      }
      if (overhangTimeoutRef.current) {
        clearTimeout(overhangTimeoutRef.current);
      }
      const targetQuat = quaternion ?? objectRef.current?.quaternion ?? null;
      const targetTranslation = translation ?? objectRef.current?.position ?? null;
      if (!targetQuat) return;
      const clonedQuat = targetQuat.clone();
      const clonedTranslation = targetTranslation ? targetTranslation.clone() : null;
      overhangTimeoutRef.current = setTimeout(() => {
        dispatchOverhangAnalysis(clonedQuat, clonedTranslation);
      }, 300);
    },
    [dispatchOverhangAnalysis]
  );

  const handleGizmoTransform = useCallback(
    (obj: THREE.Object3D) => {
      const group = obj as THREE.Group;
      if (gizmoMode === "translate") {
        clampGroupToBuildVolume(group);
      }
      updateBoundsStatus(group);
      retargetControlsToGroup(group, controlsRef.current);
      if (onTransformChange) {
        onTransformChange(group.matrixWorld.clone());
      }
    },
    [clampGroupToBuildVolume, gizmoMode, onTransformChange, updateBoundsStatus]
  );

  const handleGizmoTransformComplete = useCallback(
    (obj: THREE.Object3D) => {
      const group = obj as THREE.Group;
      if (gizmoMode === "translate") {
        clampGroupToBuildVolume(group);
      }
      updateBoundsStatus(group);
      retargetControlsToGroup(group, controlsRef.current);
      runOverhangAnalysis(group.quaternion.clone(), group.position.clone());
      browserLogger.info({
        scope: "browser.orientation.gizmo",
        message: "Gizmo transform complete",
        data: {
          mode: gizmoMode,
          position: { x: group.position.x, y: group.position.y, z: group.position.z },
        },
      });
      if (onTransformChange) {
        onTransformChange(group.matrixWorld.clone());
      }
    },
    [clampGroupToBuildVolume, gizmoMode, onTransformChange, runOverhangAnalysis, updateBoundsStatus]
  );

  const handleModelLoaded = useCallback(() => {
    setModelVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    return () => {
      analysisGeometryRef.current?.dispose();
      serializedGeometryRef.current = null;
      if (overhangTimeoutRef.current) {
        clearTimeout(overhangTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Disable shadow mapping entirely for performance and stability
    gl.shadowMap.enabled = false;
  }, [gl]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const worker = new Worker(new URL("../../workers/overhang-worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;
    type WorkerLogMessage = {
      type: "log";
      level: "debug" | "info" | "warn" | "error";
      scope: string;
      message?: string;
      data?: Record<string, unknown>;
      error?: unknown;
    };
    worker.onmessage = (event) => {
      const data = event.data as OverhangWorkerResponse | WorkerLogMessage;
      if ((data as WorkerLogMessage).type === "log") {
        const logPayload = data as WorkerLogMessage;
        const logLevel = logPayload.level ?? "info";
        const logFn = browserLogger[logLevel] ?? browserLogger.info;
        logFn({
          scope: logPayload.scope,
          message: logPayload.message,
          data: logPayload.data,
          error: logPayload.error,
        });
        return;
      }
      const { faces, supportVolume, supportWeight } = data as OverhangWorkerResponse;
      setOverhangData({ faces, supportVolume, supportWeight });
      setAnalysisStatus("idle");
    };
    worker.onerror = (error) => {
      browserLogger.error({
        scope: "browser.worker.overhang",
        message: "[ModelViewer] overhang worker error",
        error,
      });
      setAnalysisStatus("error", "Overhang worker failed. Falling back to slower estimation.");
      addWarning("Overhang worker failed. Falling back to slower estimation.");
      workerFailedRef.current = true;
      workerRef.current = null;
      worker.terminate();
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [addWarning, setAnalysisStatus, setOverhangData]);

  useEffect(() => {
    if (!facePickMode || !objectRef.current) return;
    const domElement = gl.domElement;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (!facePickMode || !objectRef.current) return;
      event.preventDefault();
      const rect = domElement.getBoundingClientRect();
      const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      const pointer = new THREE.Vector2(ndcX, ndcY);
      const hit = raycastFace(objectRef.current, pointer, camera);
      if (hit) {
        onFacePickRequest?.(hit.normal.clone());
      }
    };
    domElement.addEventListener("pointerdown", handlePointerDown);
    return () => domElement.removeEventListener("pointerdown", handlePointerDown);
  }, [facePickMode, gl, camera, onFacePickRequest]);

  useEffect(() => {
    if (!objectRef.current) return;
    if (preparedForKeyRef.current !== urlKey) return;
    const quaternion = tupleToQuaternion(storeQuaternion);
    const [px, py, pz] = storePosition;
    objectRef.current.quaternion.copy(quaternion);
    objectRef.current.position.set(px, py, pz);
    objectRef.current.updateMatrixWorld(true);
    tempTranslation.set(px, py, pz);
    runOverhangAnalysis(quaternion, tempTranslation);
    updateBoundsStatus(objectRef.current);
  }, [storePosition, storeQuaternion, runOverhangAnalysis, updateBoundsStatus]);

  useEffect(() => {
    thresholdRef.current = overhangThreshold;
    runOverhangAnalysis();
  }, [overhangThreshold, runOverhangAnalysis]);

  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    if (perspective.isPerspectiveCamera && controlsRef.current) {
      onCameraReady?.(perspective, controlsRef.current);
    }
  }, [camera, onCameraReady]);

  const prepareGroup = useCallback(
    (group: THREE.Group) => {
      if (preparedForKeyRef.current === urlKey) {
        return;
      }
      try {
        const merged = mergeObjectGeometries(group);
        if (analysisGeometryRef.current && analysisGeometryRef.current !== merged) {
          analysisGeometryRef.current.dispose();
        }
        analysisGeometryRef.current = merged ?? null;
        setAnalysisGeometry(merged ?? null);
        cloneGeometryForWorker(merged ?? null);
        geometryMissingLoggedRef.current = false;

        const storeState = useOrientationStore.getState();
        let appliedQuaternion: THREE.Quaternion | null = null;

        if (isGeometryEffectivelyFlat(merged)) {
          setInteractionLock(true, "Model appears nearly flat (<0.2 mm). Orientation is disabled.");
          addWarning("Model appears nearly flat (<0.2 mm). Orientation controls disabled.");
        } else {
          setInteractionLock(false, undefined);
        }

        if (merged) {
          if (isIdentityTuple(storeState.quaternion)) {
            appliedQuaternion = applyAutoOrientToGroup(merged, group, {
              largeModel,
              setStatus: setAutoOrientStatus,
              addWarning,
            });
          } else {
            appliedQuaternion = tupleToQuaternion(storeState.quaternion);
            group.quaternion.copy(appliedQuaternion);
            setAutoOrientStatus("idle");
          }
          group.updateMatrixWorld(true);
        } else {
          setAutoOrientStatus("error", "Auto-orient unavailable—model geometry missing.");
          setAnalysisStatus("error", "No geometry to analyze. Delete and re-upload.");
        }

        recenterObjectToGround(group);
        updateBoundsStatus(group);

        if (appliedQuaternion && isIdentityTuple(storeState.quaternion)) {
          setOrientationState(quaternionToTuple(appliedQuaternion), vectorToTuple(group.position), { auto: true });
        }

        const persp = camera as THREE.PerspectiveCamera;
        fitCameraToGroup(group, persp, controlsRef.current);

        preparedForKeyRef.current = urlKey;
        runOverhangAnalysis(appliedQuaternion ?? group.quaternion.clone(), group.position.clone());
        onReady(group);
      } catch (err) {
        browserLogger.error({
          scope: "browser.model.prepare",
          message: "[ModelViewer] Failed to prepare model",
          error: err,
        });
        setAutoOrientStatus("error", "Model preparation failed.");
        setAnalysisStatus("error", "Failed to analyze model. Delete and re-upload.");
        setInteractionLock(true, "Model failed to load. Delete and re-upload.");
        addWarning("Model failed to load. Please remove and re-upload the file.");
        onError?.(err as Error);
      }
    },
    [
      addWarning,
      camera,
      cloneGeometryForWorker,
      largeModel,
      onError,
      onReady,
      runOverhangAnalysis,
      setAnalysisStatus,
      setAutoOrientStatus,
      setInteractionLock,
      setOrientationState,
      updateBoundsStatus,
      urlKey,
    ]
  );

  useEffect(() => {
    if (!modelVersion) return;
    if (!objectRef.current) return;
    prepareGroup(objectRef.current);
  }, [modelVersion, prepareGroup]);

  // Emit transform changes only when user interaction actually changes the scene
  useEffect(() => {
    if (!controlsRef.current || !onTransformChange || !objectRef.current) return;
    const controls = controlsRef.current;
    const handler = () => {
      if (objectRef.current) {
        onTransformChange(objectRef.current.matrixWorld.clone());
      }
    };
    controls.addEventListener("change", handler);
    return () => {
      try {
        controls.removeEventListener("change", handler);
      } catch {}
    };
  }, [onTransformChange]);

  return (
    <>
      {/* Simple, shadow-free lighting */}
      <hemisphereLight intensity={0.8} groundColor={"#bcbcbc"} color={"#ffffff"} />
      <directionalLight intensity={0.5} position={[40, 80, 40]} />

      {helpersVisible ? <BuildPlate /> : null}

      {/* Loaded object group */}
      <group ref={objectRef}>
        {ext === "3mf" ? (
          <ThreeMFObject url={url} onLoaded={handleModelLoaded} />
        ) : (
          <STLObject url={url} onLoaded={handleModelLoaded} />
        )}
        {analysisGeometry && supportEnabled && overhangFaces.length > 0 ? (
          <OverhangHighlight geometry={analysisGeometry} overhangFaces={overhangFaces} />
        ) : null}
      </group>

      {gizmoEnabled && objectRef.current ? (
        <OrientationGizmo
          target={objectRef.current}
          enabled={gizmoEnabled}
          mode={gizmoMode}
          translationSnap={1}
          onDraggingChange={setGizmoDragging}
          onTransform={handleGizmoTransform}
          onTransformComplete={handleGizmoTransformComplete}
        />
      ) : null}

      <OrbitControls
        ref={controlsRef}
        enablePan
        enableDamping
        dampingFactor={0.08}
        // prevent flipping beneath the ground
        minPolarAngle={0.001}
        maxPolarAngle={Math.PI - 0.001}
        maxDistance={800}
        minDistance={10}
        enabled={!gizmoDragging && !facePickMode}
        makeDefault
      />

      <AdaptiveDpr />
    </>
  );
}

const ModelViewer = forwardRef<ModelViewerHandle, ModelViewerProps>(
  ({
    url,
    filename,
    fileSizeBytes,
    onError,
    onLoadComplete,
    onTransformChange,
    facePickMode = false,
    onFacePickComplete,
    overhangThreshold = 45,
  }, ref) => {
  const [sceneObject, setSceneObject] = useState<THREE.Object3D | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);

  useWebGLContext(renderer);
  const helpersVisible = useOrientationStore((state) => state.helpersVisible);
  const setHelpersVisible = useOrientationStore((state) => state.setHelpersVisible);
  const gizmoEnabled = useOrientationStore((state) => state.gizmoEnabled);
  const setGizmoEnabledState = useOrientationStore((state) => state.setGizmoEnabledState);
  const gizmoMode = useOrientationStore((state) => state.gizmoMode);
  const setGizmoModeState = useOrientationStore((state) => state.setGizmoMode);
  const setBoundsStatusGlobal = useOrientationStore((state) => state.setBoundsStatus);
  const updateBoundsStatus = useCallback(
    (target?: THREE.Object3D | null) => {
      const status = computeBoundsStatusFromObject(
        (target as THREE.Object3D | null) ?? (sceneObject as THREE.Object3D | null)
      );
      setBoundsStatusGlobal(status);
    },
    [sceneObject, setBoundsStatusGlobal]
  );
  const setOrientationState = useOrientationStore((state) => state.setOrientation);
  const setAutoOrientStatus = useOrientationStore((state) => state.setAutoOrientStatus);
  const addWarning = useOrientationStore((state) => state.addWarning);
  const largeModel = (fileSizeBytes ?? 0) > LARGE_MODEL_BYTES;
  const syncOrientationFromGroup = useCallback(
    (options?: { auto?: boolean }) => {
      if (!sceneObject) {
        setBoundsStatusGlobal(null);
        return;
      }
      const group = sceneObject as THREE.Group;
      setOrientationState(quaternionToTuple(group.quaternion), vectorToTuple(group.position), {
        auto: options?.auto,
      });
      updateBoundsStatus(group);
    },
    [sceneObject, setBoundsStatusGlobal, setOrientationState, updateBoundsStatus]
  );

    const applyFaceAlignment = useCallback(
      (faceNormal: THREE.Vector3 | null) => {
        if (!sceneObject || !faceNormal) return;
        if (faceNormal.lengthSq() === 0) return;
        const group = sceneObject as THREE.Group;
        const nextQuaternion = calculateFaceToGroundQuaternion(faceNormal, group.quaternion.clone());
        group.quaternion.copy(nextQuaternion);
        group.updateMatrixWorld(true);
        syncOrientationFromGroup();
        if (onTransformChange) onTransformChange(group.matrixWorld.clone());
      },
      [sceneObject, syncOrientationFromGroup, onTransformChange]
    );

    const handleFacePickRequest = useCallback(
      (normal: THREE.Vector3) => {
        applyFaceAlignment(normal);
        onFacePickComplete?.();
      },
      [applyFaceAlignment, onFacePickComplete]
    );

  useEffect(() => {
    // Reset orientation state only once on initial mount; avoid fighting parent-controlled hydration
    useOrientationStore.getState().reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!gizmoEnabled && gizmoMode !== "rotate") {
      setGizmoModeState("rotate");
    }
  }, [gizmoEnabled, gizmoMode, setGizmoModeState]);

    useImperativeHandle(ref, () => ({
      getObject: () => sceneObject,
      resetView: () => {
        if (!sceneObject) return;
        const group = sceneObject as THREE.Group;
        const merged = mergeObjectGeometries(group);
        applyAutoOrientToGroup(merged, group, {
          largeModel,
          setStatus: setAutoOrientStatus,
          addWarning,
        });
        recenterObjectToGround(group);
        updateBoundsStatus(group);
        if (cameraRef.current) {
          fitCameraToGroup(group, cameraRef.current, controlsRef.current);
        }
        retargetControlsToGroup(group, controlsRef.current);
        syncOrientationFromGroup({ auto: true });
        if (onTransformChange) onTransformChange(group.matrixWorld.clone());
      },
      recenter: () => {
        if (!sceneObject) return;
        const group = sceneObject as THREE.Group;
        recenterObjectToGround(group);
        updateBoundsStatus(group);
        if (cameraRef.current) {
          fitCameraToGroup(group, cameraRef.current, controlsRef.current);
        }
        retargetControlsToGroup(group, controlsRef.current);
        syncOrientationFromGroup();
        if (onTransformChange) onTransformChange(group.matrixWorld.clone());
      },
      rotate: (axis, degrees) => {
        if (!sceneObject) return;
        const group = sceneObject as THREE.Group;
        rotateGroup(group, axis, degrees);
        if (controlsRef.current) {
          retargetControlsToGroup(group, controlsRef.current);
        }
        syncOrientationFromGroup();
        if (onTransformChange) onTransformChange(group.matrixWorld.clone());
      },
      fit: () => {
        if (!sceneObject || !cameraRef.current) return;
        fitCameraToGroup(sceneObject as THREE.Group, cameraRef.current, controlsRef.current);
        if (onTransformChange) onTransformChange((sceneObject as THREE.Group).matrixWorld.clone());
      },
      autoOrient: () => {
        if (!sceneObject) return;
        const group = sceneObject as THREE.Group;
        const merged = mergeObjectGeometries(group);
        applyAutoOrientToGroup(merged, group, {
          largeModel,
          setStatus: setAutoOrientStatus,
          addWarning,
        });
        recenterObjectToGround(group);
        updateBoundsStatus(group);
        if (cameraRef.current) {
          fitCameraToGroup(group, cameraRef.current, controlsRef.current);
        }
        retargetControlsToGroup(group, controlsRef.current);
        syncOrientationFromGroup({ auto: true });
        if (onTransformChange) onTransformChange(group.matrixWorld.clone());
      },
      pan: (direction, stepScale = 1) => {
        if (!sceneObject || !controlsRef.current || !cameraRef.current) return;
        const group = sceneObject as THREE.Group;
        const controls = controlsRef.current;
        if (!controls) return;
        const camera = cameraRef.current as THREE.PerspectiveCamera;
        const element = controls.domElement as HTMLElement | undefined;

        // Screen pixel intent per click (tweakable)
        const pixelStep = 80 * stepScale;
        const pixelX = direction === "left" ? -pixelStep : direction === "right" ? pixelStep : 0;
        const pixelY = direction === "up" ? -pixelStep : direction === "down" ? pixelStep : 0;

        // Map screen pixels to world units (same math OrbitControls uses internally)
        const clientHeight = element?.clientHeight ?? 600;
        const toTarget = camera.position.clone().sub(controls.target ?? new THREE.Vector3());
        const targetDistance = toTarget.length();
        const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
        const worldPerPixel = (targetDistance * Math.tan(halfFov) * 2) / clientHeight;

        const moveX = pixelX * worldPerPixel;
        const moveY = pixelY * worldPerPixel;

        // Build pan vector in world space using camera columns
        const left = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0).multiplyScalar(-moveX);
        const up = new THREE.Vector3();
        if (controls.screenSpacePanning === true) {
          up.setFromMatrixColumn(camera.matrix, 1).multiplyScalar(moveY);
        } else {
          up.setFromMatrixColumn(camera.matrix, 0);
          up.crossVectors(camera.up, up).multiplyScalar(moveY);
        }
        const panOffset = left.add(up);

        // Apply to both camera and target to preserve relative offset
        camera.position.add(panOffset);
        (controls.target ?? new THREE.Vector3()).add(panOffset);
        controls.update();
        if (onTransformChange) onTransformChange(group.matrixWorld.clone());
      },
      zoom: (direction, factor = 1) => {
        if (!controlsRef.current) return;
        const controls = controlsRef.current;
        if (!controls) return;
        const speed = Math.max(factor, 0.1);
        const scale = Math.pow(0.95, speed);
        if (typeof controls.dollyIn === "function" && typeof controls.dollyOut === "function") {
          if (direction === "in") {
            controls.dollyIn(scale);
          } else {
            controls.dollyOut(scale);
          }
          controls.update();
        } else if (cameraRef.current) {
          const camera = cameraRef.current;
          const delta = direction === "in" ? -speed : speed;
          tempDir.set(0, 0, 1).applyQuaternion(camera.quaternion).multiplyScalar(delta * 5);
          camera.position.add(tempDir);
          camera.updateProjectionMatrix();
        }
      },
      setView: (preset) => {
        if (!sceneObject || !cameraRef.current || !controlsRef.current) return;
        positionCameraForPreset(sceneObject as THREE.Group, cameraRef.current, controlsRef.current, preset);
        retargetControlsToGroup(sceneObject as THREE.Group, controlsRef.current);
        if (onTransformChange) onTransformChange((sceneObject as THREE.Group).matrixWorld.clone());
      },
      setHelpersVisible: (visible) => {
        setHelpersVisible(visible);
      },
      toggleHelpers: () => {
        const current = useOrientationStore.getState().helpersVisible;
        setHelpersVisible(!current);
      },
      orientToFace: (faceNormal) => {
        if (!faceNormal) return;
        applyFaceAlignment(faceNormal);
      },
      getOrientation: () => {
        const state = useOrientationStore.getState();
        return { quaternion: state.quaternion, position: state.position };
      },
      setOrientation: (quaternionTuple, positionTuple) => {
        if (!sceneObject) return;
        const group = sceneObject as THREE.Group;
        const nextQuat = tupleToQuaternion(quaternionTuple);
        group.quaternion.copy(nextQuat);
        if (positionTuple) {
          group.position.set(positionTuple[0], positionTuple[1], positionTuple[2]);
        }
        group.updateMatrixWorld(true);
        updateBoundsStatus(group);
        retargetControlsToGroup(group, controlsRef.current);
        setOrientationState(quaternionTuple, positionTuple ?? vectorToTuple(group.position));
        if (onTransformChange) onTransformChange(group.matrixWorld.clone());
      },
      setGizmoEnabled: (enabled) => {
        setGizmoEnabledState(enabled);
      },
      setGizmoMode: (mode) => {
        setGizmoModeState(mode);
      },
    }),
    [
      addWarning,
      applyFaceAlignment,
      largeModel,
      onTransformChange,
      sceneObject,
      setAutoOrientStatus,
      setGizmoEnabledState,
      setGizmoModeState,
      setHelpersVisible,
      setOrientationState,
      syncOrientationFromGroup,
      updateBoundsStatus,
    ]
  );

    const handleReady = (object: THREE.Object3D | null) => {
      setSceneObject(object);
      if (object) {
        updateBoundsStatus(object as THREE.Group);
        onLoadComplete?.();
        onTransformChange?.(object.matrixWorld.clone());
      }
    };

    const handleError = (err: Error) => {
      browserLogger.error({
        scope: "browser.modelviewer.error",
        message: "[ModelViewer] Error",
        error: err,
      });
      setError(err);
      onError?.(err);
    };

    if (error) {
      return (
        <div className="flex h-[480px] w-full items-center justify-center rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
          <div>
            <p className="font-semibold text-destructive">Failed to load 3D model</p>
            <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-[480px] w-full overflow-hidden rounded-lg border border-border bg-surface-muted">
        <Canvas
        dpr={[1, 2]}
        camera={{ position: [120, 160, 220], fov: 45, near: 0.1, far: 1000 }}
        gl={{ preserveDrawingBuffer: true, antialias: true, powerPreference: "high-performance" }}
        onCreated={({ camera, gl }) => {
          camera.up.set(0, 1, 0);
          cameraRef.current = camera as THREE.PerspectiveCamera;
          rendererRef.current = gl;
          setRenderer(gl);
        }}
        >
          <Suspense fallback={<LoaderOverlay />}>
            <Scene
              url={url}
              filename={filename}
              fileSizeBytes={fileSizeBytes}
              onReady={handleReady}
              onError={handleError}
              onTransformChange={onTransformChange}
              onCameraReady={(cam, controls) => {
                cameraRef.current = cam;
                controlsRef.current = controls;
                if (sceneObject) {
                  fitCameraToGroup(sceneObject as THREE.Group, cam, controls);
                }
              }}
              helpersVisible={helpersVisible}
              gizmoEnabled={gizmoEnabled}
              gizmoMode={gizmoMode}
              facePickMode={facePickMode}
              onFacePickRequest={handleFacePickRequest}
              overhangThreshold={overhangThreshold}
            />
          </Suspense>
        </Canvas>
      </div>
    );
  }
);

ModelViewer.displayName = "ModelViewer";

export default ModelViewer;
```
