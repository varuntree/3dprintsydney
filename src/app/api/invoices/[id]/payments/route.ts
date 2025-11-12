import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import { addManualPayment } from "@/server/services/invoices";
import { paymentInputSchema } from "@/lib/schemas/invoices";
import { requireInvoiceAccess } from "@/server/auth/permissions";
import type { NextRequest } from "next/server";
import { ZodError } from "zod";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid invoice id");
  }
  return id;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await parseId(context.params);
    await requireInvoiceAccess(request, id);
    const body = await request.json();
    const validated = paymentInputSchema.parse(body);
    const payment = await addManualPayment(id, validated);
    return okAuth(request, payment, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return failAuth(request, "VALIDATION_ERROR", "Invalid payment payload", 422, {
        issues: error.issues,
      });
    }
    if (error instanceof Error && error.message === "Invalid invoice id") {
      return failAuth(request, "INVALID_ID", error.message, 400);
    }
    return handleErrorAuth(request, error, "invoices.payment.add");
  }
}
