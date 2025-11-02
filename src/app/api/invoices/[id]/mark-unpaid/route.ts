import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import { markInvoiceUnpaid } from "@/server/services/invoices";
import { requireInvoiceAccess } from "@/server/auth/permissions";
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
    const invoiceId = await parseId(context.params);
    await requireInvoiceAccess(request, invoiceId);
    await markInvoiceUnpaid(invoiceId);
    return okAuth(req, { success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid invoice id") {
      return failAuth(req, "INVALID_ID", error.message, 400);
    }
    return handleErrorAuth(req, error, "invoices.markUnpaid");
  }
}
