"use client";

import { useState, useEffect, forwardRef } from "react";
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
  onTransformChange?: (matrix: THREE.Matrix4) => void;
  onLoadComplete?: () => void;
  onError?: (error: Error) => void;
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
      <ModelViewer ref={ref as any} {...props} />
    </div>
  );
});

ModelViewerWrapper.displayName = "ModelViewerWrapper";

export default ModelViewerWrapper;

export type { ModelViewerHandle as ModelViewerRef };
