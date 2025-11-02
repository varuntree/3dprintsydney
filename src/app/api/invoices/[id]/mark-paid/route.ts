import { ZodError } from "zod";
import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import { markInvoicePaid } from "@/server/services/invoices";
import { paymentInputSchema } from "@/lib/schemas/invoices";
import type { PaymentMethod } from "@/lib/constants/enums";
import { requireInvoiceAccess } from "@/server/auth/permissions";
import { parseNumericId } from "@/lib/utils/api-params";
import type { NextRequest } from "next/server";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id } = await paramsPromise;
  try {
    return parseNumericId(id);
  } catch {
    throw new Error("Invalid invoice id");
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const invoiceId = await parseId(context.params);
    await requireInvoiceAccess(request, invoiceId);

    let payload: unknown = undefined;
    if (request.headers.get("content-type")?.includes("application/json")) {
      const text = await request.text();
      if (text.trim().length > 0) {
        payload = JSON.parse(text);
      }
    }

    let amount: number | undefined;
    let method: PaymentMethod | undefined;
    let reference: string | undefined;
    let processor: string | undefined;
    let processorId: string | undefined;
    let note: string | undefined;

    if (payload) {
      const parsed = paymentInputSchema.partial().parse(payload);
      amount = parsed.amount;
      method = parsed.method as PaymentMethod | undefined;
      reference = parsed.reference ?? undefined;
      processor = parsed.processor ?? undefined;
      processorId = parsed.processorId ?? undefined;
      note = parsed.notes ?? undefined;
    }

    await markInvoicePaid(invoiceId, {
      amount,
      method: method,
      reference,
      processor,
      processorId,
      note,
    });

    return okAuth(req, { success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return failAuth(req, "VALIDATION_ERROR", "Invalid payment payload", 422, {
        issues: error.issues,
      });
    }
    if (error instanceof Error && error.message === "Invalid invoice id") {
      return failAuth(req, "INVALID_ID", error.message, 400);
    }
    return handleErrorAuth(req, error, "invoices.markPaid");
  }
}
