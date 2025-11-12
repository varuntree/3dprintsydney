import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import { createQuote, listQuotes } from "@/server/services/quotes";
import { quoteInputSchema } from "@/lib/schemas/quotes";
import { ZodError } from "zod";
import { requireAdmin } from "@/server/auth/api-helpers";
import type { NextRequest } from "next/server";

/**
 * GET /api/quotes
 * ADMIN ONLY - Quote management is admin-only
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? undefined;
    const status = searchParams.getAll("status");
    const limit = Number(searchParams.get("limit") ?? "0");
    const offset = Number(searchParams.get("offset") ?? "0");
    const sort = (searchParams.get("sort") as "issueDate" | "createdAt" | "number" | null) ?? null;
    const order = (searchParams.get("order") as "asc" | "desc" | null) ?? null;
    const quotes = await listQuotes({
      q,
      statuses: status.length ? (status as ("DRAFT"|"PENDING"|"ACCEPTED"|"DECLINED"|"CONVERTED")[]) : undefined,
      limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
      offset: Number.isFinite(offset) && offset >= 0 ? offset : undefined,
      sort: sort ?? undefined,
      order: order ?? undefined,
    });
    return okAuth(request, quotes);
  } catch (error) {
    return handleErrorAuth(request, error, "quotes.list");
  }
}

/**
 * POST /api/quotes
 * ADMIN ONLY - Only admins can create quotes
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const validated = quoteInputSchema.parse(body);
    const quote = await createQuote(validated);
    return okAuth(request, quote, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return failAuth(request, "VALIDATION_ERROR", "Invalid quote payload", 422, {
        issues: error.issues,
      });
    }
    return handleErrorAuth(request, error, "quotes.create");
  }
}
