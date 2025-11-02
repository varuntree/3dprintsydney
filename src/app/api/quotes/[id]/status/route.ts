import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import { updateQuoteStatus } from "@/server/services/quotes";
import { quoteStatusSchema } from "@/lib/schemas/quotes";
import { ZodError } from "zod";
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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  await requireAdmin(request);
  try {
    const id = await parseId(context.params);
    const body = await request.json();
    const validated = quoteStatusSchema.parse(body);
    const quote = await updateQuoteStatus(id, validated);
    return okAuth(req, quote);
  } catch (error) {
    if (error instanceof ZodError) {
      return failAuth(req, "VALIDATION_ERROR", "Invalid status payload", 422, {
        issues: error.issues,
      });
    }
    if (error instanceof Error && error.message === "Invalid quote id") {
      return failAuth(req, "INVALID_ID", error.message, 400);
    }
    return handleErrorAuth(req, error, "quotes.status");
  }
}
