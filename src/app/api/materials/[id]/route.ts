import { ZodError } from "zod";
import { ok, fail, handleError } from "@/server/api/respond";
import { updateMaterial, deleteMaterial } from "@/server/services/materials";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (Number.isNaN(id) || id <= 0) {
    throw new Error("Invalid material id");
  }
  return id;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await parseId(context.params);
    const payload = await request.json();
    const material = await updateMaterial(id, payload);
    return ok(material);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid material payload", 422, {
        issues: error.issues,
      });
    }
    if (error instanceof Error && error.message === "Invalid material id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "materials.update");
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await parseId(context.params);
    const material = await deleteMaterial(id);
    return ok(material);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid material id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "materials.delete");
  }
}
