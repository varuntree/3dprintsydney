import { describe, expect, it } from "vitest";
import { BoxGeometry, MathUtils, Quaternion, SphereGeometry, Vector3 } from "three";

import { detectOverhangs } from "@/lib/3d/overhang-detector";

function buildBox(size = 20) {
  const geom = new BoxGeometry(size, size, size);
  geom.translate(0, size / 2, 0);
  return geom;
}

describe("detectOverhangs", () => {
  it("returns zero overhangs for a cube resting on the build plate", () => {
    const geom = buildBox();
    const quat = new Quaternion();
    const result = detectOverhangs(geom, quat);
    expect(result.overhangFaceIndices).toHaveLength(0);
    expect(result.supportVolume).toBe(0);
    geom.dispose();
  });

  it("detects overhangs when cube is tilted past the threshold", () => {
    const geom = buildBox();
    const quat = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), MathUtils.degToRad(60));
    const result = detectOverhangs(geom, quat);
    expect(result.overhangFaceIndices.length).toBeGreaterThan(0);
    expect(result.supportVolume).toBeGreaterThan(0);
    geom.dispose();
  });

  it("derives support weight directly from the estimated volume", () => {
    const geom = buildBox();
    const quat = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), MathUtils.degToRad(60));
    const result = detectOverhangs(geom, quat);
    expect(result.supportWeight).toBeCloseTo(result.supportVolume * 0.00124, 5);
    geom.dispose();
  });

  it("estimates minimal supports for a sphere", () => {
    const geom = new SphereGeometry(10, 16, 16);
    const quat = new Quaternion();
    const result = detectOverhangs(geom, quat);
    expect(result.overhangFaceIndices.length).toBeGreaterThan(0);
    expect(result.supportVolume).toBeLessThan(200);
    geom.dispose();
  });

  it("respects custom threshold angles", () => {
    const geom = buildBox();
    const quat = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), MathUtils.degToRad(30));
    const strict = detectOverhangs(geom, quat, 30);
    const lenient = detectOverhangs(geom, quat, 60);
    expect(strict.overhangFaceIndices.length).toBeGreaterThanOrEqual(lenient.overhangFaceIndices.length);
    expect(strict.supportVolume).toBeGreaterThanOrEqual(lenient.supportVolume);
    geom.dispose();
  });
});
