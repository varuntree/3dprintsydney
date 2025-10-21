import { ok, fail, handleError } from "@/server/api/respond";
import { sendQuote } from "@/server/services/quotes";
import { requireAdmin } from "@/server/auth/api-helpers";
import type { NextRequest } from "next/server";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id } = await paramsPromise;
  const parsed = Number(id);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error("Invalid quote id");
  return parsed;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  await requireAdmin(request);
  try {
    const id = await parseId(context.params);
    const quote = await sendQuote(id);
    return ok(quote);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Invalid quote id")) {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "quotes.send");
  }
}

