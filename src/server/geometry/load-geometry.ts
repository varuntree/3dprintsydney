import path from "node:path";
import { BufferGeometry, Float32BufferAttribute } from "three";
import { unzipSync } from "fflate";
import { DOMParser } from "@xmldom/xmldom";

const ASCII_VERTEX_REGEX = /vertex\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/gi;

export function loadGeometryFromModel(buffer: Buffer, filename: string): BufferGeometry {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".stl") {
    return parseStl(buffer);
  }
  if (ext === ".3mf") {
    return parseThreeMf(buffer);
  }
  throw new Error(`Unsupported model format: ${ext || "unknown"}`);
}

function parseThreeMf(buffer: Buffer): BufferGeometry {
  let archive: Record<string, Uint8Array>;
  try {
    archive = unzipSync(new Uint8Array(buffer));
  } catch (error) {
    throw new Error(`Failed to unzip 3MF archive: ${(error as Error).message}`);
  }

  const modelEntry = Object.keys(archive).find((key) => key.toLowerCase().endsWith("3d/3dmodel.model"));
  if (!modelEntry) {
    throw new Error("3MF archive missing 3D/3dmodel.model entry");
  }

  const decoder = new TextDecoder();
  const xmlContent = decoder.decode(archive[modelEntry]);
  const dom = new DOMParser().parseFromString(xmlContent, "application/xml");
  if (!dom || !dom.documentElement) {
    throw new Error("Failed to parse 3MF XML");
  }

  const objects = dom.getElementsByTagName("object");
  const positions: number[] = [];

  for (let i = 0; i < objects.length; i += 1) {
    const mesh = objects.item(i)?.getElementsByTagName("mesh").item(0);
    if (!mesh) continue;
    const vertexNodes = mesh.getElementsByTagName("vertex");
    const vertices: Array<{ x: number; y: number; z: number }> = [];
    for (let v = 0; v < vertexNodes.length; v += 1) {
      const node = vertexNodes.item(v);
      if (!node) continue;
      const x = Number(node.getAttribute("x"));
      const y = Number(node.getAttribute("y"));
      const z = Number(node.getAttribute("z"));
      if ([x, y, z].some((val) => Number.isNaN(val))) {
        continue;
      }
      vertices.push({ x, y, z });
    }

    const triangleNodes = mesh.getElementsByTagName("triangle");
    for (let t = 0; t < triangleNodes.length; t += 1) {
      const tri = triangleNodes.item(t);
      if (!tri) continue;
      const v1 = Number(tri.getAttribute("v1"));
      const v2 = Number(tri.getAttribute("v2"));
      const v3 = Number(tri.getAttribute("v3"));
      if ([v1, v2, v3].some((index) => !Number.isInteger(index) || index < 0 || index >= vertices.length)) {
        continue;
      }
      const verts = [vertices[v1], vertices[v2], vertices[v3]];
      verts.forEach((vert) => {
        positions.push(vert.x, vert.y, vert.z);
      });
    }
  }

  if (positions.length === 0) {
    throw new Error("3MF file contained no mesh data");
  }

  return buildGeometry(new Float32Array(positions));
}

function parseStl(buffer: Buffer): BufferGeometry {
  if (isBinaryStl(buffer)) {
    return parseBinaryStl(buffer);
  }
  return parseAsciiStl(buffer.toString("utf-8"));
}

function isBinaryStl(buffer: Buffer) {
  if (buffer.length < 84) return false;
  const faceCount = buffer.readUInt32LE(80);
  const expectedLength = 84 + faceCount * 50;
  return buffer.length === expectedLength;
}

function parseBinaryStl(buffer: Buffer): BufferGeometry {
  const faceCount = buffer.readUInt32LE(80);
  const positions = new Float32Array(faceCount * 9);
  for (let face = 0; face < faceCount; face += 1) {
    const offset = 84 + face * 50;
    let cursor = offset + 12; // skip normal
    for (let vertex = 0; vertex < 3; vertex += 1) {
      const idx = face * 9 + vertex * 3;
      positions[idx] = buffer.readFloatLE(cursor);
      positions[idx + 1] = buffer.readFloatLE(cursor + 4);
      positions[idx + 2] = buffer.readFloatLE(cursor + 8);
      cursor += 12;
    }
  }
  return buildGeometry(positions);
}

function parseAsciiStl(content: string): BufferGeometry {
  const vertices: number[] = [];
  ASCII_VERTEX_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ASCII_VERTEX_REGEX.exec(content))) {
    vertices.push(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
  }
  if (vertices.length === 0 || vertices.length % 9 !== 0) {
    throw new Error("Failed to parse ASCII STL");
  }
  return buildGeometry(new Float32Array(vertices));
}

function buildGeometry(positions: Float32Array): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}
