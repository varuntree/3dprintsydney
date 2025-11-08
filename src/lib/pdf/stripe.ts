import { mutateJson } from "@/lib/http";
import { logger } from "@/lib/logger";

export async function ensureInvoiceStripeCheckoutUrl(
  invoiceId: number,
  currentUrl: string | null,
): Promise<string | null> {
  if (currentUrl) {
    return currentUrl;
  }

  try {
    const result = await mutateJson<{ url: string | null }>(
      `/api/invoices/${invoiceId}/stripe-session`,
      { method: "POST" },
    );
    return result.url ?? null;
  } catch (error) {
    logger.warn({
      scope: "stripe.checkout",
      message: "Failed to create Stripe checkout session for invoice",
      error,
      data: { invoiceId },
    });
    return null;
  }
}
