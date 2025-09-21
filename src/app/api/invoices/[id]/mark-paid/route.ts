import { ok, fail, handleError } from "@/server/api/respond";
import { markInvoicePaid } from "@/server/services/invoices";
import { paymentInputSchema } from "@/lib/schemas/invoices";
import type { PaymentMethod } from "@prisma/client";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id } = await paramsPromise;
  const parsed = Number(id);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Invalid invoice id");
  }
  return parsed;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const invoiceId = await parseId(context.params);

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
