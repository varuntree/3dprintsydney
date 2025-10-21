import { ok, fail, handleError } from "@/server/api/respond";
import { revertInvoiceToQuote } from "@/server/services/invoices";
import { requireAdmin } from "@/server/auth/api-helpers";
import type { NextRequest } from "next/server";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id } = await paramsPromise;
  const parsed = Number(id);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Invalid invoice id");
  }
  return parsed;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    const invoiceId = await parseId(context.params);
    await revertInvoiceToQuote(invoiceId);
    return ok({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid invoice id") {
      return fail("INVALID_ID", error.message, 400);
    }
    if (error instanceof Error) {
      if (error.message.includes("Paid invoices cannot")) {
        return fail("INVOICE_PAID", error.message, 409);
      }
      if (error.message.includes("payments")) {
        return fail("INVOICE_HAS_PAYMENTS", error.message, 409);
      }
    }
    return handleError(error, "invoices.revert");
  }
}
