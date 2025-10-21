import type Stripe from "stripe";
import { handleStripeEvent, getStripeEnvironment } from "@/server/services/stripe";
import { logger } from "@/lib/logger";
import { fail, ok } from "@/server/api/respond";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const env = await getStripeEnvironment();
    const bodyBuffer = Buffer.from(await request.arrayBuffer());
    let event: Stripe.Event;
    if (env.webhookSecret) {
      const signature = request.headers.get("stripe-signature");
      if (!signature) {
        throw new Error("Missing Stripe signature header");
      }
      event = env.stripe.webhooks.constructEvent(bodyBuffer, signature, env.webhookSecret);
    } else {
      event = JSON.parse(bodyBuffer.toString("utf8")) as Stripe.Event;
    }
    await handleStripeEvent(event);

    return ok({ received: true });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'stripe.webhook', message: 'Webhook processing failed', error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
