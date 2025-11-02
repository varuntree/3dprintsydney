import { mutateJson } from "@/lib/http";

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
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to create Stripe checkout session for invoice", invoiceId, error);
    }
    return null;
  }
}
