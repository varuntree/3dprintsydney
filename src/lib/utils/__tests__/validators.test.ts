import { describe, expect, it } from "vitest";
import { validateOrderFile } from "../validators";

describe("validateOrderFile", () => {
  it("accepts 3D CL files with octet-stream MIME based on extension", () => {
    expect(() =>
      validateOrderFile({ size: 1, type: "application/octet-stream", name: "sample.3dcl" }, 10)
    ).not.toThrow();
  });

  it("accepts vendor-specific 3D CL MIME types", () => {
    expect(() =>
      validateOrderFile({ size: 1, type: "model/3dcl", name: "sample.3dcl" }, 10)
    ).not.toThrow();
  });
});
