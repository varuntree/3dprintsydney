import { describe, expect, it } from "vitest";
import { Mesh, MeshBasicMaterial, PerspectiveCamera, Quaternion, Vector2, Vector3, BoxGeometry } from "three";

import { calculateFaceToGroundQuaternion, raycastFace } from "@/lib/3d/face-alignment";

describe("calculateFaceToGroundQuaternion", () => {
  it("aligns upward-facing normals to point downward", () => {
    const normal = new Vector3(0, 1, 0);
    const q = calculateFaceToGroundQuaternion(normal, new Quaternion());
    const transformed = normal.clone().applyQuaternion(q);
    expect(transformed.y).toBeCloseTo(-1, 3);
    expect(transformed.x).toBeCloseTo(0, 3);
    expect(transformed.z).toBeCloseTo(0, 3);
  });

  it("rotates X-normal onto the build plate", () => {
    const normal = new Vector3(1, 0, 0);
    const q = calculateFaceToGroundQuaternion(normal, new Quaternion());
    const transformed = normal.clone().applyQuaternion(q);
    expect(transformed.y).toBeCloseTo(-1, 3);
  });

  it("raycasts the front face normal", () => {
    const mesh = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial());
    const camera = new PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    const hit = raycastFace(mesh, new Vector2(0, 0), camera);
    expect(hit).not.toBeNull();
    expect(hit?.normal.z ?? 0).toBeCloseTo(1, 2);
  });
});
