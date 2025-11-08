import { BufferAttribute, BufferGeometry, MathUtils, Quaternion, Vector3 } from "three";

export interface OverhangData {
  overhangFaceIndices: number[];
  supportArea: number;
  supportVolume: number;
  supportWeight: number;
  contactArea: number;
}

const DOWN_VECTOR = new Vector3(0, -1, 0);
const TEMP_A = new Vector3();
const TEMP_B = new Vector3();
const TEMP_C = new Vector3();
const TEMP_CB = new Vector3();
const TEMP_AB = new Vector3();
const NORMAL = new Vector3();
const TEMP_VERTEX = new Vector3();

const DEFAULT_DENSITY_FACTOR = 0.3;
const PLA_DENSITY_G_PER_MM3 = 0.00124; // Approx 1.24 g/cm^3
const HEIGHT_EPSILON = 0.1; // Ignore faces essentially touching the plate

const EMPTY_RESULT: OverhangData = Object.freeze({
  overhangFaceIndices: [],
  supportArea: 0,
  supportVolume: 0,
  supportWeight: 0,
  contactArea: 0,
});

export function detectOverhangs(
  geometry: BufferGeometry,
  quaternion: Quaternion,
  threshold = 45
): OverhangData {
  const positionAttr = geometry.getAttribute("position");
  if (!positionAttr || positionAttr.count === 0) {
    return EMPTY_RESULT;
  }

  const indexAttr = geometry.getIndex();
  const triangleCount = indexAttr ? indexAttr.count / 3 : positionAttr.count / 3;
  if (!Number.isFinite(triangleCount) || triangleCount <= 0) {
    return EMPTY_RESULT;
  }

  const vertexCount = positionAttr.count;
  const rotatedPositions = new Float32Array(vertexCount * 3);
  let minWorldY = Infinity;

  for (let i = 0; i < vertexCount; i += 1) {
    TEMP_VERTEX.fromBufferAttribute(positionAttr as BufferAttribute, i);
    TEMP_VERTEX.applyQuaternion(quaternion);
    rotatedPositions[i * 3] = TEMP_VERTEX.x;
    rotatedPositions[i * 3 + 1] = TEMP_VERTEX.y;
    rotatedPositions[i * 3 + 2] = TEMP_VERTEX.z;
    if (TEMP_VERTEX.y < minWorldY) {
      minWorldY = TEMP_VERTEX.y;
    }
  }

  if (!Number.isFinite(minWorldY)) {
    minWorldY = 0;
  }

  const cosThreshold = Math.cos(MathUtils.degToRad(threshold));
  const overhangFaceIndices: number[] = [];
  let supportArea = 0;
  let supportVolume = 0;
  let contactArea = 0;

  for (let faceIdx = 0; faceIdx < triangleCount; faceIdx += 1) {
    const vertexOffset = faceIdx * 3;
    const aIndex = indexAttr ? indexAttr.getX(vertexOffset) : vertexOffset;
    const bIndex = indexAttr ? indexAttr.getX(vertexOffset + 1) : vertexOffset + 1;
    const cIndex = indexAttr ? indexAttr.getX(vertexOffset + 2) : vertexOffset + 2;

    const aOffset = aIndex * 3;
    const bOffset = bIndex * 3;
    const cOffset = cIndex * 3;

    TEMP_A.set(rotatedPositions[aOffset], rotatedPositions[aOffset + 1], rotatedPositions[aOffset + 2]);
    TEMP_B.set(rotatedPositions[bOffset], rotatedPositions[bOffset + 1], rotatedPositions[bOffset + 2]);
    TEMP_C.set(rotatedPositions[cOffset], rotatedPositions[cOffset + 1], rotatedPositions[cOffset + 2]);

    TEMP_CB.subVectors(TEMP_C, TEMP_B);
    TEMP_AB.subVectors(TEMP_A, TEMP_B);
    NORMAL.crossVectors(TEMP_CB, TEMP_AB);
    const area = NORMAL.length() * 0.5;
    if (area === 0) {
      continue;
    }
    NORMAL.normalize();

    const dot = NORMAL.dot(DOWN_VECTOR);
    if (dot < cosThreshold) {
      continue;
    }

    const avgHeight = ((TEMP_A.y + TEMP_B.y + TEMP_C.y) / 3) - minWorldY;
    if (avgHeight <= HEIGHT_EPSILON) {
      contactArea += area;
      continue;
    }

    overhangFaceIndices.push(faceIdx);
    supportArea += area;
    const estimatedVolume = area * Math.max(avgHeight, 0) * DEFAULT_DENSITY_FACTOR;
    supportVolume += estimatedVolume;
  }

  return {
    overhangFaceIndices,
    supportArea,
    supportVolume,
    supportWeight: supportVolume * PLA_DENSITY_G_PER_MM3,
    contactArea,
  };
}
