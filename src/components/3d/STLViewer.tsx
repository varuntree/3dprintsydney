"use client";

import { Suspense, useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import * as THREE from "three";
import { centerModelOnBed, alignMeshToHorizontalPlane } from "@/lib/3d/coordinates";

interface STLViewerProps {
  url: string;
  onTransformChange?: (matrix: THREE.Matrix4) => void;
  onLoadComplete?: () => void;
  onError?: (error: Error) => void;
}

export interface STLViewerRef {
  getMesh: () => THREE.Mesh | null;
  resetOrientation: () => void;
  centerModel: () => void;
  rotateModel: (axis: "x" | "y" | "z", degrees: number) => void;
}

function Model({
  url,
  onLoadComplete,
  onError,
  meshRef,
}: STLViewerProps & {
  meshRef: React.MutableRefObject<THREE.Mesh | null>;
}) {
  const geometry = useLoader(STLLoader, url);

  // Auto-center and align model on load
  useEffect(() => {
    if (meshRef.current && geometry) {
      try {
        // First align model to lie flat horizontally
        alignMeshToHorizontalPlane(meshRef.current);
        // Then center it on the build plate
        centerModelOnBed(meshRef.current);
        onLoadComplete?.();
      } catch (error) {
        console.error("[STLViewer] Failed to align/center model:", error);
        onError?.(error as Error);
      }
    }
  }, [geometry, meshRef, onLoadComplete, onError]);

  return (
    <mesh ref={meshRef}>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial color="#ff6b35" metalness={0.1} roughness={0.4} />
    </mesh>
  );
}

function ErrorFallback({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
      <div>
        <p className="font-semibold text-destructive">Failed to load 3D model</p>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 rounded-md bg-destructive px-4 py-2 text-sm text-white hover:bg-destructive/90"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

function Scene({ url, onLoadComplete, onError, meshRef }: STLViewerProps & {
  meshRef: React.MutableRefObject<THREE.Mesh | null>;
}) {
  const { camera } = useThree();

  useEffect(() => {
    // Configure camera for better viewing
    camera.position.set(0, 150, 250);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />

      {/* Build plate grid (256x256mm typical for 3D printers) */}
      <Grid
        infiniteGrid={false}
        cellSize={10}
        sectionSize={50}
        fadeDistance={300}
        fadeStrength={1}
        cellThickness={0.5}
        sectionThickness={1.5}
        cellColor="#6e6e6e"
        sectionColor="#333333"
        args={[256, 256]}
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
      />

      {/* Model */}
      <Suspense fallback={null}>
        <Model
          url={url}
          onLoadComplete={onLoadComplete}
          onError={onError}
          meshRef={meshRef}
        />
      </Suspense>

      {/* OrbitControls - placed here to avoid remounting issues */}
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
    </>
  );
}

const STLViewer = forwardRef<STLViewerRef, STLViewerProps>(
  ({ url, onLoadComplete, onError }, ref) => {
    const meshRef = useRef<THREE.Mesh | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [key, setKey] = useState(0); // For retry mechanism

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      getMesh: () => meshRef.current,
      resetOrientation: () => {
        if (meshRef.current) {
          meshRef.current.rotation.set(0, 0, 0);
          meshRef.current.position.set(0, 0, 0);
          meshRef.current.scale.set(1, 1, 1);
          centerModelOnBed(meshRef.current);
        }
      },
      centerModel: () => {
        if (meshRef.current) {
          centerModelOnBed(meshRef.current);
        }
      },
      rotateModel: (axis: "x" | "y" | "z", degrees: number) => {
        if (meshRef.current) {
          const radians = THREE.MathUtils.degToRad(degrees);
          switch (axis) {
            case "x":
              meshRef.current.rotateX(radians);
              break;
            case "y":
              meshRef.current.rotateY(radians);
              break;
            case "z":
              meshRef.current.rotateZ(radians);
              break;
          }
          // Re-center model on build plate after rotation
          centerModelOnBed(meshRef.current);
          meshRef.current.updateMatrix();
        }
      },
    }));

    const handleError = (err: Error) => {
      console.error("[STLViewer] Error:", err);
      setError(err);
      onError?.(err);
    };

    const handleRetry = () => {
      setError(null);
      setKey((prev) => prev + 1); // Force remount
    };

    if (error) {
      return <ErrorFallback error={error} onRetry={handleRetry} />;
    }

    return (
      <div className="h-[600px] w-full rounded-lg border border-border bg-surface-muted">
        <Canvas
          key={key}
          camera={{ position: [0, 150, 250], fov: 50 }}
          onError={(err) => handleError(new Error(String(err)))}
        >
          <Scene
            url={url}
            onLoadComplete={onLoadComplete}
            onError={handleError}
            meshRef={meshRef}
          />
        </Canvas>
      </div>
    );
  }
);

STLViewer.displayName = "STLViewer";

export default STLViewer;
