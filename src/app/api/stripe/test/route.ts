import { ok, fail } from "@/server/api/respond";
import { getStripeEnvironment } from "@/server/services/stripe";

export async function POST() {
  try {
    const env = await getStripeEnvironment();
    if (!env?.stripe) {
      throw new Error("Stripe client not available");
    }
    // Access a benign property to ensure instance constructed
    if (typeof env.stripe.accounts !== "function") {
      throw new Error("Stripe SDK not initialised correctly");
    }
    return ok({ ok: true });
  } catch (error) {
    return fail(
      "STRIPE_NOT_CONFIGURED",
      error instanceof Error ? error.message : "Stripe test failed",
      422,
    );
  }
}
