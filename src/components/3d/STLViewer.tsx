"use client";

import {
  Suspense,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { AdaptiveDpr, ContactShadows, Environment, Html, OrbitControls } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import * as THREE from "three";
import {
  alignGeometryToHorizontalPlane,
  centerModelOnBed,
  fitObjectToView,
  normalizeGeometry,
  recenterObjectToGround,
  rotateObject,
} from "@/lib/3d/coordinates";

export interface STLViewerHandle {
  getObject: () => THREE.Object3D | null;
  resetView: () => void;
  recenter: () => void;
  rotate: (axis: "x" | "y" | "z", degrees: number) => void;
  fit: () => void;
}

interface STLViewerProps {
  url: string;
  onLoadComplete?: () => void;
  onError?: (error: Error) => void;
  onTransformChange?: (matrix: THREE.Matrix4) => void;
}

type ModelProps = {
  url: string;
  onReady: (object: THREE.Object3D | null) => void;
  onError?: (error: Error) => void;
};

function useModelGeometry(url: string) {
  const raw = useLoader(STLLoader, url) as THREE.BufferGeometry;
  return useMemo(() => {
    const cloned = raw.clone();
    cloned.computeVertexNormals();
    alignGeometryToHorizontalPlane(cloned);
    normalizeGeometry(cloned);
    return cloned;
  }, [raw]);
}

function Model({ url, onReady, onError }: ModelProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const geometry = useModelGeometry(url);

  useEffect(() => {
    const group = groupRef.current;
    const mesh = meshRef.current;
    if (!group || !mesh) return;

    try {
      centerModelOnBed(group);
      recenterObjectToGround(group);
      onReady(group);
    } catch (error) {
      console.error("[STLViewer] Failed to prepare model", error);
      onError?.(error as Error);
    }
  }, [geometry, onError, onReady]);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        castShadow
        receiveShadow
        material={useMemo(
          () =>
            new THREE.MeshStandardMaterial({
              color: "#ff7435",
              metalness: 0.1,
              roughness: 0.4,
            }),
          []
        )}
      />
    </group>
  );
}

function Scene({
  url,
  onReady,
  onError,
  onTransformChange,
  onCameraReady,
}: {
  url: string;
  onReady: (object: THREE.Object3D | null) => void;
  onError?: (error: Error) => void;
  onTransformChange?: (matrix: THREE.Matrix4) => void;
  onCameraReady?: (camera: THREE.PerspectiveCamera) => void;
}) {
  const { camera, gl } = useThree();
  const objectRef = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    if (!objectRef.current) return;
    const perspective = camera as THREE.PerspectiveCamera;
    if (!perspective.isPerspectiveCamera) return;
    fitObjectToView(objectRef.current, perspective);
  }, [camera]);

  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    if (perspective.isPerspectiveCamera) {
      onCameraReady?.(perspective);
    }
  }, [camera, onCameraReady]);

  useFrame(() => {
    if (objectRef.current && onTransformChange) {
      onTransformChange(objectRef.current.matrixWorld.clone());
    }
  });

  useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        intensity={0.9}
        position={[40, 80, 40]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight intensity={0.35} position={[-30, 30, -30]} />

      <Model
        url={url}
        onReady={(object) => {
          objectRef.current = object;
          if (object) {
            const perspective = camera as THREE.PerspectiveCamera;
            if (perspective.isPerspectiveCamera) {
              fitObjectToView(object, perspective);
            }
            onReady(object);
          }
        }}
        onError={onError}
      />

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#2f3137" roughness={0.9} metalness={0.1} />
      </mesh>

      <ContactShadows
        opacity={0.4}
        width={400}
        height={400}
        blur={2.5}
        far={80}
        resolution={1024}
      />

      <Environment preset="city" />

      <OrbitControls
        enablePan
        dampingFactor={0.08}
        enableDamping
        maxPolarAngle={Math.PI - 0.15}
        minPolarAngle={0.1}
        maxDistance={800}
        minDistance={20}
        makeDefault
      />

      <AdaptiveDpr pixelated />
    </>
  );
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

const STLViewer = forwardRef<STLViewerHandle, STLViewerProps>(
  ({ url, onError, onLoadComplete, onTransformChange }, ref) => {
    const [sceneObject, setSceneObject] = useState<THREE.Object3D | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);

    useImperativeHandle(ref, () => ({
      getObject: () => sceneObject,
      resetView: () => {
        if (sceneObject) {
          sceneObject.rotation.set(0, 0, 0);
          sceneObject.position.set(0, 0, 0);
          recenterObjectToGround(sceneObject);
        }
      },
      recenter: () => {
        if (sceneObject) {
          recenterObjectToGround(sceneObject);
        }
      },
      rotate: (axis, degrees) => {
        if (sceneObject) {
          rotateObject(sceneObject, axis, degrees);
        }
      },
      fit: () => {
        if (sceneObject && camera && camera.isPerspectiveCamera) {
          fitObjectToView(sceneObject, camera);
        }
      },
    }), [camera, sceneObject]);

    const handleReady = (object: THREE.Object3D | null) => {
      setSceneObject(object);
      if (object) {
        onLoadComplete?.();
        onTransformChange?.(object.matrixWorld.clone());
      }
    };

    const handleError = (err: Error) => {
      console.error("[STLViewer] Error", err);
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
          shadows
          dpr={[1, 2]}
          camera={{ position: [120, 160, 220], fov: 45, near: 0.1, far: 1000 }}
          gl={{ preserveDrawingBuffer: true, antialias: true }}
        >
          <Suspense fallback={<LoaderOverlay />}>
            <Scene
              url={url}
              onReady={handleReady}
              onError={handleError}
              onTransformChange={onTransformChange}
              onCameraReady={setCamera}
            />
          </Suspense>
        </Canvas>
      </div>
    );
  }
);

STLViewer.displayName = "STLViewer";

export default STLViewer;
