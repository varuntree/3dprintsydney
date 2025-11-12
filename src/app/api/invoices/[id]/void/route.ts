import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import { voidInvoice } from "@/server/services/invoices";
import { requireAdmin } from "@/server/auth/api-helpers";
import type { NextRequest } from "next/server";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id } = await paramsPromise;
  const parsed = Number(id);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error("Invalid invoice id");
  return parsed;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const id = await parseId(context.params);
    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason : undefined;
    const invoice = await voidInvoice(id, reason);
    return okAuth(request, invoice);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Invalid invoice id")) {
      return failAuth(request, "INVALID_ID", error.message, 400);
    }
    return handleErrorAuth(request, error, "invoices.void");
  }
}
