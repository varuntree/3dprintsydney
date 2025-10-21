import { ZodError } from "zod";
import { ok, fail, handleError } from "@/server/api/respond";
import { updateMaterial, deleteMaterial } from "@/server/services/materials";
import { materialInputSchema } from "@/lib/schemas/catalog";
import { requireAdmin } from "@/server/auth/session";
import type { NextRequest } from "next/server";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (Number.isNaN(id) || id <= 0) {
    throw new Error("Invalid material id");
  }
  return id;
}

/**
 * PUT /api/materials/[id]
 * ADMIN ONLY
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    const id = await parseId(context.params);
    const body = await request.json();
    const validated = materialInputSchema.parse(body);
    const material = await updateMaterial(id, validated);
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

/**
 * DELETE /api/materials/[id]
 * ADMIN ONLY
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
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
