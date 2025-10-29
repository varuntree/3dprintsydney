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

import { computeAutoOrientQuaternion } from "@/lib/3d/orientation";

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
}

interface ModelViewerProps {
  url: string;
  filename?: string; // helps choose loader
  onLoadComplete?: () => void;
  onError?: (error: Error) => void;
  onTransformChange?: (matrix: THREE.Matrix4) => void;
}

function mergeObjectGeometries(root: THREE.Object3D): THREE.BufferGeometry | null {
  const geoms: THREE.BufferGeometry[] = [];
  root.updateMatrixWorld(true);
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if ((mesh as any).isMesh && mesh.geometry) {
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

const tempBox = new THREE.Box3();
const tempCenter = new THREE.Vector3();
const tempSphere = new THREE.Sphere();
const tempCenterVec = new THREE.Vector3();
const tempDir = new THREE.Vector3();

function centerGroupToOrigin(group: THREE.Group) {
  tempBox.setFromObject(group);
  if (tempBox.isEmpty()) return;
  tempBox.getCenter(tempCenter);
  group.position.sub(tempCenter);
  group.updateMatrixWorld(true);
}

function fitCameraToGroup(
  group: THREE.Group,
  camera: THREE.PerspectiveCamera,
  controls?: any
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

function getGroupMinY(group: THREE.Group): number {
  tempBox.setFromObject(group);
  if (tempBox.isEmpty()) return 0;
  return tempBox.min.y;
}

function positionCameraForPreset(
  group: THREE.Group,
  camera: THREE.PerspectiveCamera,
  controls: any,
  preset: ViewPreset
) {
  const radius = getGroupRadius(group);
  const distance = Math.max(radius * 2, 25);
  const tilt = radius * 0.2;

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

// (Removed geometry baking; orientation is applied once to the group's quaternion)

function STLObject({ url, onGroup }: { url: string; onGroup: (g: THREE.Group) => void }) {
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
    if (group) onGroup(group);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group]);

  return <primitive ref={groupRef} object={group} />;
}

function ThreeMFObject({ url, onGroup }: { url: string; onGroup: (g: THREE.Group) => void }) {
  const groupRaw = useLoader(ThreeMFLoader as any, url) as THREE.Group;
  const groupRef = useRef<THREE.Group>(null);
  const group = useMemo(() => {
    const g = groupRaw.clone(true);
    const defaultMat = new THREE.MeshStandardMaterial({ color: "#ff7435", metalness: 0.0, roughness: 0.8 });
    g.traverse((obj) => {
      if ((obj as any).isMesh) {
        const m = obj as THREE.Mesh;
        m.material = defaultMat;
        m.castShadow = false;
        m.receiveShadow = false;
      }
    });
    return g;
  }, [groupRaw]);

  useEffect(() => {
    if (group) onGroup(group);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group]);

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
  onReady,
  onError,
  onTransformChange,
  onCameraReady,
  helpersVisible = false,
}: {
  url: string;
  filename?: string;
  onReady: (object: THREE.Object3D | null) => void;
  onError?: (error: Error) => void;
  onTransformChange?: (matrix: THREE.Matrix4) => void;
  onCameraReady?: (camera: THREE.PerspectiveCamera, controls: any) => void;
  helpersVisible?: boolean;
}) {
  const { camera, gl, size } = useThree();
  const controlsRef = useRef<any>(null);
  const objectRef = useRef<THREE.Group | null>(null);

  const ext = extFromFilename(filename) ?? "stl";
  const urlKey = `${url}|${filename ?? ""}`;
  const preparedForKeyRef = useRef<string | null>(null);

  useEffect(() => {
    // Disable shadow mapping entirely for performance and stability
    gl.shadowMap.enabled = false;
  }, [gl]);

  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    if (perspective.isPerspectiveCamera && controlsRef.current) {
      onCameraReady?.(perspective, controlsRef.current);
    }
  }, [camera, onCameraReady]);

  const prepareGroup = useCallback((group: THREE.Group) => {
    // Prevent repeated preparation for the same model key
    if (preparedForKeyRef.current === urlKey) {
      return;
    }
    try {
      const merged = mergeObjectGeometries(group);
      if (merged) {
        const q = computeAutoOrientQuaternion(merged, "upright");
        group.quaternion.copy(q);
        group.updateMatrixWorld(true);
      }
      centerGroupToOrigin(group);

      const persp = camera as THREE.PerspectiveCamera;
      fitCameraToGroup(group, persp, controlsRef.current);

      preparedForKeyRef.current = urlKey;
      onReady(group);
    } catch (err) {
      console.error("[ModelViewer] Failed to prepare model", err);
      onError?.(err as Error);
    }
  }, [onError, onReady, urlKey, camera]);

  // Emit transform changes only when user interaction actually changes the scene
  useEffect(() => {
    if (!controlsRef.current || !onTransformChange || !objectRef.current) return;
    const handler = () => {
      if (objectRef.current) {
        onTransformChange(objectRef.current.matrixWorld.clone());
      }
    };
    controlsRef.current.addEventListener("change", handler);
    return () => {
      try {
        controlsRef.current?.removeEventListener("change", handler);
      } catch {}
    };
  }, [onTransformChange]);

  return (
    <>
      {/* Simple, shadow-free lighting */}
      <hemisphereLight intensity={0.8} groundColor={"#bcbcbc"} color={"#ffffff"} />
      <directionalLight intensity={0.5} position={[40, 80, 40]} />

      {helpersVisible && objectRef.current ? (
        (() => {
          const minY = getGroupMinY(objectRef.current! as THREE.Group);
          return (
            <>
              <gridHelper args={[400, 40, "#94a3b8", "#64748b"]} position={[0, minY - 0.5, 0]} />
              <axesHelper args={[120]} position={[0, minY, 0]} />
            </>
          );
        })()
      ) : null}

      {/* Loaded object group */}
      <group ref={objectRef}>
        {ext === "3mf" ? (
          <ThreeMFObject
            url={url}
            onGroup={(g) => {
              objectRef.current = g;
              prepareGroup(g);
            }}
          />
        ) : (
          <STLObject
            url={url}
            onGroup={(g) => {
              objectRef.current = g;
              prepareGroup(g);
            }}
          />
        )}
      </group>

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
        makeDefault
      />

      <AdaptiveDpr />
    </>
  );
}

const ModelViewer = forwardRef<ModelViewerHandle, ModelViewerProps>(
  ({ url, filename, onError, onLoadComplete, onTransformChange }, ref) => {
    const [sceneObject, setSceneObject] = useState<THREE.Object3D | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [helpersVisible, setHelpersVisible] = useState(false);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<any | null>(null);

    useImperativeHandle(ref, () => ({
      getObject: () => sceneObject,
      resetView: () => {
        if (!sceneObject) return;
        const group = sceneObject as THREE.Group;
        const merged = mergeObjectGeometries(group);
        if (merged) {
          const q = computeAutoOrientQuaternion(merged, "upright");
          group.quaternion.copy(q);
          group.updateMatrixWorld(true);
        } else {
          group.quaternion.identity();
          group.rotation.set(0, 0, 0);
          group.position.set(0, 0, 0);
          group.updateMatrixWorld(true);
        }
        centerGroupToOrigin(group);
        if (cameraRef.current) {
          fitCameraToGroup(group, cameraRef.current, controlsRef.current);
        }
        if (onTransformChange) onTransformChange(group.matrixWorld.clone());
      },
      recenter: () => {
        if (!sceneObject) return;
        const group = sceneObject as THREE.Group;
        centerGroupToOrigin(group);
        if (cameraRef.current) {
          fitCameraToGroup(group, cameraRef.current, controlsRef.current);
        }
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
        if (merged) {
          const q = computeAutoOrientQuaternion(merged, "upright");
          group.quaternion.copy(q);
          group.updateMatrixWorld(true);
        }
        centerGroupToOrigin(group);
        if (cameraRef.current) {
          fitCameraToGroup(group, cameraRef.current, controlsRef.current);
        }
        if (onTransformChange) onTransformChange(group.matrixWorld.clone());
      },
      pan: (direction, stepScale = 1) => {
        if (!sceneObject || !controlsRef.current || !cameraRef.current) return;
        const group = sceneObject as THREE.Group;
        const controls = controlsRef.current as any;
        const camera = cameraRef.current as THREE.PerspectiveCamera;
        const element = (controls.domElement ?? {}) as { clientHeight?: number; clientWidth?: number };

        // Screen pixel intent per click (tweakable)
        const pixelStep = 80 * stepScale;
        const pixelX = direction === "left" ? -pixelStep : direction === "right" ? pixelStep : 0;
        const pixelY = direction === "up" ? -pixelStep : direction === "down" ? pixelStep : 0;

        // Map screen pixels to world units (same math OrbitControls uses internally)
        const clientHeight = element.clientHeight ?? 600;
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
        const controls = controlsRef.current as any;
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
        setHelpersVisible((prev) => !prev);
      },
    }), [sceneObject, onTransformChange]);

    const handleReady = (object: THREE.Object3D | null) => {
      setSceneObject(object);
      if (object) {
        onLoadComplete?.();
        onTransformChange?.(object.matrixWorld.clone());
      }
    };

    const handleError = (err: Error) => {
      console.error("[ModelViewer] Error", err);
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
          onCreated={({ camera }) => {
            camera.up.set(0, 1, 0);
            cameraRef.current = camera as THREE.PerspectiveCamera;
          }}
        >
          <Suspense fallback={<LoaderOverlay />}>
            <Scene
              url={url}
              filename={filename}
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
            />
          </Suspense>
        </Canvas>
      </div>
    );
  }
);

ModelViewer.displayName = "ModelViewer";

export default ModelViewer;
