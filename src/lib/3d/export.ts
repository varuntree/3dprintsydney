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
