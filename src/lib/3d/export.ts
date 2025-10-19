/**
 * STL Export Utilities
 *
 * Handles exporting Three.js meshes to STL format with baked transformations
 */

import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { applyTransformToGeometry, centerModelOnBed } from "./coordinates";

/**
 * Exports a Three.js mesh to STL format (binary or ASCII)
 * Automatically bakes transformations into geometry before export
 *
 * @param mesh - The mesh to export
 * @param binary - Whether to use binary STL format (default: true, recommended)
 * @returns Promise<Blob> - STL file as a Blob
 */
export async function exportSTL(
  mesh: THREE.Mesh,
  binary: boolean = true
): Promise<Blob> {
  // Clone the mesh to avoid modifying the original
  const clonedMesh = mesh.clone();
  clonedMesh.geometry = mesh.geometry.clone();

  // Bake transformations into geometry
  applyTransformToGeometry(clonedMesh);

  // Re-center on bed
  centerModelOnBed(clonedMesh);

  // Export to STL
  const exporter = new STLExporter();
  const result = exporter.parse(clonedMesh, { binary });

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
