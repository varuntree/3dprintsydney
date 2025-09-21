import { ok, fail } from "@/server/api/respond";
import { getStripeEnvironment } from "@/server/services/stripe";

export async function POST() {
  const env = await getStripeEnvironment();
  if (!env) return fail("STRIPE_NOT_CONFIGURED", "Stripe keys are not configured", 422);
  try {
    // minimal call to ensure client is usable (no network call here)
    if (!env.publishableKey || !env.stripe) throw new Error("Invalid Stripe env");
    return ok({ ok: true });
  } catch (error) {
    return fail(
      "STRIPE_TEST_FAILED",
      error instanceof Error ? error.message : "Stripe test failed",
      400,
    );
  }
}

