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
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const distance = (radius / Math.tan(fov / 2)) * 1.4;
  camera.position.set(0, radius * 0.6, distance);
  camera.near = Math.max(0.1, distance / 1000);
  camera.far = Math.max(distance * 10, camera.near + 10);
  camera.updateProjectionMatrix();
  if (controls?.target) {
    controls.target.set(0, 0, 0);
    controls.update();
  } else {
    camera.lookAt(0, 0, 0);
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
  const radius = getGroupRadius(group);
  const distance = Math.max(radius * 2, 25);

  switch (preset) {
    case "top":
      camera.position.set(0, distance, 0.001);
      camera.up.set(0, 0, -1);
      break;
    case "bottom":
      camera.position.set(0, -distance, -0.001);
      camera.up.set(0, 0, 1);
      break;
    case "front":
      camera.position.set(0, radius * 0.3, distance);
      camera.up.set(0, 1, 0);
      break;
    case "back":
      camera.position.set(0, radius * 0.3, -distance);
      camera.up.set(0, 1, 0);
      break;
    case "left":
      camera.position.set(-distance, radius * 0.3, 0);
      camera.up.set(0, 1, 0);
      break;
    case "right":
      camera.position.set(distance, radius * 0.3, 0);
      camera.up.set(0, 1, 0);
      break;
    case "iso":
    default:
      camera.position.set(distance * 0.75, distance * 0.7, distance * 0.75);
      camera.up.set(0, 1, 0);
      break;
  }

  camera.near = Math.max(0.1, distance / 1000);
  camera.far = Math.max(distance * 10, camera.near + 10);
  camera.updateProjectionMatrix();

  if (controls?.target) {
    controls.target.set(0, 0, 0);
    controls.update();
  }

  camera.lookAt(0, 0, 0);
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
      if (onTransformChange) {
        onTransformChange(group.matrixWorld.clone());
      }
    },
    [clampGroupToBuildVolume, gizmoMode, onTransformChange, updateBoundsStatus]
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
    useOrientationStore.getState().reset();
  }, [url]);

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
        syncOrientationFromGroup();
        if (onTransformChange) onTransformChange(group.matrixWorld.clone());
      },
      rotate: (axis, degrees) => {
        if (!sceneObject) return;
        const group = sceneObject as THREE.Group;
        rotateGroup(group, axis, degrees);
        if (controlsRef.current) {
          controlsRef.current.target.set(0, 0, 0);
          controlsRef.current.update();
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

    const urlKey = `${url}|${filename ?? ""}`;

    return (
      <div className="h-[480px] w-full overflow-hidden rounded-lg border border-border bg-surface-muted">
        <Canvas
        key={urlKey}
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
