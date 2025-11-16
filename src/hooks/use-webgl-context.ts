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
          message: "WebGL context restored; continuing without reload",
        });
        browserLogger.error({
          scope: "bug.34.preview-crash",
          message: "WebGL context restored after loss",
          data: { renderer: renderer.domElement?.id ?? null },
        });
        // Let three/r3f attempt graceful recovery; avoid reload loops
        renderer.resetState();
      },
    );

    return cleanup;
  }, [renderer]);
}
