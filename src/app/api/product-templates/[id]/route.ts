import { ZodError } from "zod";
import { ok, fail, handleError } from "@/server/api/respond";
import {
  updateProductTemplate,
  deleteProductTemplate,
} from "@/server/services/product-templates";
import { productTemplateInputSchema } from "@/lib/schemas/catalog";
import { requireAdmin } from "@/server/auth/api-helpers";
import type { NextRequest } from "next/server";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid template id");
  }
  return id;
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  await requireAdmin(request);
  try {
    const id = await parseId(context.params);
    const body = await request.json();
    const validated = productTemplateInputSchema.parse(body);
    const template = await updateProductTemplate(id, validated);
    return ok(template);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid template payload", 422, {
        issues: error.issues,
      });
    }
    if (error instanceof Error && error.message.includes("required")) {
      return fail("BUSINESS_RULE", error.message, 422);
    }
    if (error instanceof Error && error.message === "Invalid template id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "templates.update");
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  await requireAdmin(request);
  try {
    const id = await parseId(context.params);
    const template = await deleteProductTemplate(id);
    return ok(template);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid template id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "templates.delete");
  }
}
