import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import { createStripeCheckoutSession } from "@/server/services/stripe";
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
    const url = new URL(request.url);
    const refresh = url.searchParams.get("refresh") === "true";
    const session = await createStripeCheckoutSession(invoiceId, { refresh });
    return okAuth(req, session);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid invoice id") {
      return failAuth(req, "INVALID_ID", error.message, 400);
    }
    if (error instanceof Error && error.message === "Stripe is not configured") {
      return failAuth(req, "STRIPE_NOT_CONFIGURED", error.message, 400);
    }
    if (error instanceof Error && error.message === "Invoice is already paid") {
      return failAuth(req, "INVOICE_PAID", error.message, 409);
    }
    return handleErrorAuth(req, error, "invoices.stripe.session");
  }
}
