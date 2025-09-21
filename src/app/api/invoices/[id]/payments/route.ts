import { ok, fail, handleError } from "@/server/api/respond";
import { addManualPayment } from "@/server/services/invoices";
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
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await parseId(context.params);
    const payload = await request.json();
    const payment = await addManualPayment(id, payload);
    return ok(payment, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid payment payload", 422, {
        issues: error.issues,
      });
    }
    if (error instanceof Error && error.message === "Invalid invoice id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "invoices.payment.add");
  }
}
