import { ok, fail, handleError } from "@/server/api/respond";
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
  } catch (error) {
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
      const parsed = paymentInputSchema.partial().safeParse(payload);
      if (!parsed.success) {
        return fail("INVALID_BODY", "Invalid payment payload", 422, {
          issues: parsed.error.format(),
        });
      }
      amount = parsed.data.amount;
      method = parsed.data.method as PaymentMethod | undefined;
      reference = parsed.data.reference ?? undefined;
      processor = parsed.data.processor ?? undefined;
      processorId = parsed.data.processorId ?? undefined;
      note = parsed.data.notes ?? undefined;
    }

    await markInvoicePaid(invoiceId, {
      amount,
      method: method,
      reference,
      processor,
      processorId,
      note,
    });

    return ok({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid invoice id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "invoices.markPaid");
  }
}
