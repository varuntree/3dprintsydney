import { NextRequest } from "next/server";
import { ok, fail, handleError } from "@/server/api/respond";
import { requireClientWithId } from "@/server/auth/api-helpers";
import { applyWalletCreditToInvoice } from "@/server/services/credits";
import { getInvoiceDetail } from "@/server/services/invoices";
import { BadRequestError } from "@/lib/errors";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid invoice id");
  }
  return id;
}

/**
 * POST /api/invoices/[id]/apply-credit
 * Apply wallet credit to an invoice
 * CLIENT ONLY - must own the invoice
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const invoiceId = await parseId(context.params);
    const user = await requireClientWithId(request);

    // Verify invoice belongs to this client
    const invoice = await getInvoiceDetail(invoiceId);
    if (invoice.client.id !== user.clientId) {
      return fail("FORBIDDEN", "You don't have access to this invoice", 403);
    }

    // Check if invoice is eligible for credit application
    if (invoice.status === 'PAID' || invoice.balanceDue <= 0) {
      throw new BadRequestError("Invoice is already paid");
    }

    // Apply credit
    const result = await applyWalletCreditToInvoice(invoiceId);

    return ok({
      creditApplied: result.creditApplied,
      newBalanceDue: result.newBalanceDue,
      fullyPaid: result.newBalanceDue <= 0
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid invoice id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "invoices.applyCredit");
  }
}
