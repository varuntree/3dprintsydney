import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import { deletePayment } from "@/server/services/invoices";
import { requirePaymentAccess } from "@/server/auth/permissions";
import type { NextRequest } from "next/server";

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
  request: NextRequest,
  context: { params: Promise<{ id: string; paymentId: string }> },
) {
  try {
    const id = await parsePaymentParams(context.params);
    await requirePaymentAccess(request, id);
    const payment = await deletePayment(id);
    return okAuth(req, payment);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid payment id") {
      return failAuth(req, "INVALID_ID", error.message, 400);
    }
    return handleErrorAuth(req, error, "invoices.payment.delete");
  }
}
