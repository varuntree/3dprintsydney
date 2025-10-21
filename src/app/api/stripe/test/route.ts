import { ok, fail } from "@/server/api/respond";
import { getStripeEnvironment } from "@/server/services/stripe";
import { requireAuth } from "@/server/auth/api-helpers";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  await requireAuth(request);
  try {
    const env = await getStripeEnvironment();
    // Basic sanity checks — avoid brittle SDK shape assertions across versions
    if (!env || !env.stripe) {
      throw new Error("Stripe client not available");
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
