import { ok, fail, handleError } from "@/server/api/respond";
import { convertQuoteToInvoice } from "@/server/services/quotes";
import { requireAdmin } from "@/server/auth/session";
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
    const invoice = await convertQuoteToInvoice(id);
    return ok(invoice);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid quote id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "quotes.convert");
  }
}
