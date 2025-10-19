import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { handleStripeEvent, getStripeEnvironment } from "@/server/services/stripe";
import { logger } from "@/lib/logger";

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

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error({ scope: "stripe.webhook", error });
    return NextResponse.json(
      { error: { message: "Webhook processing failed" } },
      { status: 500 },
    );
  }
}
