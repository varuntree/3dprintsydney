"use client";

import { useState, useEffect, forwardRef } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { STLViewerHandle } from "./STLViewer";
import * as THREE from "three";

const STLViewer = dynamic(() => import("./STLViewer"), {
  ssr: false,
  loading: () => <Skeleton className="h-[480px] w-full rounded-lg" />,
});

interface STLViewerWrapperProps {
  url: string;
  onTransformChange?: (matrix: THREE.Matrix4) => void;
  onLoadComplete?: () => void;
  onError?: (error: Error) => void;
}

const STLViewerWrapper = forwardRef<STLViewerHandle, STLViewerWrapperProps>((props, ref) => {
  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  // Don't render anything on server
  if (!isClient) {
    return <Skeleton className="h-[480px] w-full rounded-lg" />;
  }

  return (
    <div className={isMobile ? "mx-auto w-full max-w-[min(480px,100%)]" : "w-full"}>
      <STLViewer ref={ref} {...props} />
    </div>
  );
});

STLViewerWrapper.displayName = "STLViewerWrapper";

export default STLViewerWrapper;

// Re-export the ref type for parent components
export type { STLViewerHandle as STLViewerRef };
