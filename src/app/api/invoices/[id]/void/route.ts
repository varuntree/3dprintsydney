import { ok, fail, handleError } from "@/server/api/respond";
import { voidInvoice } from "@/server/services/invoices";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id } = await paramsPromise;
  const parsed = Number(id);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error("Invalid invoice id");
  return parsed;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const id = await parseId(context.params);
    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason : undefined;
    const invoice = await voidInvoice(id, reason);
    return ok(invoice);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Invalid invoice id")) {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "invoices.void");
  }
}

