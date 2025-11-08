import path from "node:path";
import { BufferGeometry, Float32BufferAttribute } from "three";

const ASCII_VERTEX_REGEX = /vertex\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/gi;

export function loadGeometryFromModel(buffer: Buffer, filename: string): BufferGeometry {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".stl") {
    return parseStl(buffer);
  }
  throw new Error(`Unsupported model format: ${ext || "unknown"}`);
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
