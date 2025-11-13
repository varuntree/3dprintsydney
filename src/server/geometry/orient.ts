import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import path from "node:path";

import type { OrientationData } from "@/server/services/tmp-files";
import { loadGeometryFromModel } from "./load-geometry";

export function applyOrientationToModel(
  buffer: Buffer,
  filename: string,
  orientation: OrientationData
): { buffer: Buffer; filename: string; mimeType: string } {
  const geometry = loadGeometryFromModel(buffer, filename);
  const mesh = new THREE.Mesh(geometry);
  const quaternion = new THREE.Quaternion(
    orientation.quaternion[0],
    orientation.quaternion[1],
    orientation.quaternion[2],
    orientation.quaternion[3]
  ).normalize();
  mesh.quaternion.copy(quaternion);
  mesh.position.set(orientation.position[0], orientation.position[1], orientation.position[2]);
  mesh.updateMatrixWorld(true);

  const exporter = new STLExporter();
  const dataView = exporter.parse(mesh, { binary: true }) as DataView;
  const arrayBuffer = dataView.buffer.slice(dataView.byteOffset, dataView.byteOffset + dataView.byteLength);
  const orientedName = `${path.basename(filename, path.extname(filename) || undefined)}.stl`;
  return {
    buffer: Buffer.from(arrayBuffer),
    filename: orientedName,
    mimeType: "application/octet-stream",
  };
}
