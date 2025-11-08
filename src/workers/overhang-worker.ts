/// <reference lib="webworker" />

import { detectOverhangs } from "@/lib/3d/overhang-detector";
import { BufferGeometry, BufferAttribute, Float32BufferAttribute, Quaternion } from "three";

interface WorkerRequest {
  positions: Float32Array;
  index: Uint32Array | null;
  quaternion: [number, number, number, number];
  threshold: number;
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
    const { positions, index, quaternion, threshold } = event.data;
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    if (index) {
      geometry.setIndex(new BufferAttribute(index, 1));
    }
    const quat = new Quaternion(...quaternion);
    const result = detectOverhangs(geometry, quat, threshold);
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
