import { memo, useEffect, useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute } from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

interface OverhangHighlightProps {
  geometry: BufferGeometry | null;
  overhangFaces: number[];
}

function OverhangHighlight({ geometry, overhangFaces }: OverhangHighlightProps) {
  const highlightGeometry = useMemo(() => {
    if (!geometry || overhangFaces.length === 0) {
      return null;
    }

    const baseGeometry = geometry.index ? geometry.toNonIndexed() : geometry;
    const shouldDisposeBase = baseGeometry !== geometry;
    const positionAttr = baseGeometry.getAttribute("position");
    if (!positionAttr) {
      if (shouldDisposeBase) {
        baseGeometry.dispose();
      }
      return null;
    }

    const sourceArray = positionAttr.array as ArrayLike<number>;
    const triangles: BufferGeometry[] = [];

    overhangFaces.forEach((faceIdx) => {
      const start = faceIdx * 9;
      if (start + 9 > positionAttr.count * 3) {
        return;
      }
      const triangle = new BufferGeometry();
      const values = new Float32Array(9);
      for (let i = 0; i < 9; i += 1) {
        values[i] = Number(sourceArray[start + i] ?? 0);
      }
      triangle.setAttribute("position", new Float32BufferAttribute(values, 3));
      triangles.push(triangle);
    });

    if (shouldDisposeBase) {
      baseGeometry.dispose();
    }

    if (triangles.length === 0) {
      return null;
    }

    const merged = BufferGeometryUtils.mergeGeometries(triangles, false) as BufferGeometry | null;
    triangles.forEach((tri) => tri.dispose());

    if (!merged) {
      return null;
    }

    merged.computeVertexNormals();
    return merged;
  }, [geometry, overhangFaces]);

  useEffect(() => {
    return () => {
      highlightGeometry?.dispose();
    };
  }, [highlightGeometry]);

  if (!highlightGeometry) {
    return null;
  }

  return (
    <mesh geometry={highlightGeometry} frustumCulled={false}>
      <meshBasicMaterial color="#ff4d4f" opacity={0.4} transparent depthWrite={false} />
    </mesh>
  );
}

export default memo(OverhangHighlight);
