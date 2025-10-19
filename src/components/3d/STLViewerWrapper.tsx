"use client";

import { useState, useEffect, forwardRef } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { STLViewerRef } from "./STLViewer";
import * as THREE from "three";

const STLViewer = dynamic(() => import("./STLViewer"), {
  ssr: false,
  loading: () => <Skeleton className="h-[600px] w-full rounded-lg" />,
});

interface STLViewerWrapperProps {
  url: string;
  onTransformChange?: (matrix: THREE.Matrix4) => void;
  onLoadComplete?: () => void;
  onError?: (error: Error) => void;
}

const STLViewerWrapper = forwardRef<STLViewerRef, STLViewerWrapperProps>(
  (props, ref) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setIsMobile(window.innerWidth < 768);

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Don't render anything on server
  if (!isClient) {
    return <Skeleton className="h-[600px] w-full rounded-lg" />;
  }

    // Mobile fallback
    if (isMobile) {
      return (
        <div className="flex h-[600px] w-full items-center justify-center rounded-lg border border-border bg-surface-muted p-8 text-center">
          <div className="max-w-md">
            <div className="mb-4 text-4xl">📱</div>
            <p className="text-lg font-semibold text-foreground">
              3D Orientation on Desktop
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              The 3D model orientation feature works best on desktop with a mouse.
              Please use a larger screen for full orientation controls, or skip this
              step to continue.
            </p>
          </div>
        </div>
      );
    }

    return <STLViewer ref={ref} {...props} />;
  }
);

STLViewerWrapper.displayName = "STLViewerWrapper";

export default STLViewerWrapper;

// Re-export the ref type for parent components
export type { STLViewerRef };
