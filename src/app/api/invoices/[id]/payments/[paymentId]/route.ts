import { ok, fail, handleError } from "@/server/api/respond";
import { deletePayment } from "@/server/services/invoices";

async function parsePaymentParams(
  paramsPromise: Promise<{ id: string; paymentId: string }>,
) {
  const { paymentId: paymentRaw } = await paramsPromise;
  const paymentId = Number(paymentRaw);
  if (!Number.isFinite(paymentId) || paymentId <= 0) {
    throw new Error("Invalid payment id");
  }
  return paymentId;
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; paymentId: string }> },
) {
  try {
    const id = await parsePaymentParams(context.params);
    const payment = await deletePayment(id);
    return ok(payment);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid payment id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "invoices.payment.delete");
  }
}
