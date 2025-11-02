import { ZodError } from "zod";
import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import { getQuote, updateQuote, deleteQuote } from "@/server/services/quotes";
import { quoteInputSchema } from "@/lib/schemas/quotes";
import { requireAdmin } from "@/server/auth/api-helpers";
import type { NextRequest } from "next/server";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid quote id");
  }
  return id;
}

/**
 * GET /api/quotes/[id]
 * ADMIN ONLY
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    const id = await parseId(context.params);
    const quote = await getQuote(id);
    return okAuth(req, quote);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid quote id") {
      return failAuth(req, "INVALID_ID", error.message, 400);
    }
    return handleErrorAuth(req, error, "quotes.detail");
  }
}

/**
 * PUT /api/quotes/[id]
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
    const validated = quoteInputSchema.parse(body);
    const quote = await updateQuote(id, validated);
    return okAuth(req, quote);
  } catch (error) {
    if (error instanceof ZodError) {
      return failAuth(req, "VALIDATION_ERROR", "Invalid quote payload", 422, {
        issues: error.issues,
      });
    }
    if (error instanceof Error && error.message === "Invalid quote id") {
      return failAuth(req, "INVALID_ID", error.message, 400);
    }
    return handleErrorAuth(req, error, "quotes.update");
  }
}

/**
 * DELETE /api/quotes/[id]
 * ADMIN ONLY
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    const id = await parseId(context.params);
    const quote = await deleteQuote(id);
    return okAuth(req, quote);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid quote id") {
      return failAuth(req, "INVALID_ID", error.message, 400);
    }
    return handleErrorAuth(req, error, "quotes.delete");
  }
}
