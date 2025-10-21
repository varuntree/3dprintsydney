import { ZodError } from "zod";
import { ok, fail, handleError } from "@/server/api/respond";
import { listProductTemplates, createProductTemplate } from "@/server/services/product-templates";
import { productTemplateInputSchema } from "@/lib/schemas/catalog";
import { requireAdmin } from "@/server/auth/session";
import type { NextRequest } from "next/server";

/**
 * GET /api/product-templates
 * ADMIN ONLY - Product template management is admin-only
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? undefined;
    const limit = Number(searchParams.get("limit") ?? "0");
    const offset = Number(searchParams.get("offset") ?? "0");
    const sort = (searchParams.get("sort") as "updatedAt" | "name" | null) ?? null;
    const order = (searchParams.get("order") as "asc" | "desc" | null) ?? null;
    const templates = await listProductTemplates({
      q,
      limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
      offset: Number.isFinite(offset) && offset >= 0 ? offset : undefined,
      sort: sort ?? undefined,
      order: order ?? undefined,
    });
    return ok(templates);
  } catch (error) {
    return handleError(error, "templates.list");
  }
}

/**
 * POST /api/product-templates
 * ADMIN ONLY - Only admins can create product templates
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const validated = productTemplateInputSchema.parse(body);
    const template = await createProductTemplate(validated);
    return ok(template, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid template payload", 422, {
        issues: error.issues,
      });
    }
    if (error instanceof Error && error.message.includes("required")) {
      return fail("BUSINESS_RULE", error.message, 422);
    }
    return handleError(error, "templates.create");
  }
}
