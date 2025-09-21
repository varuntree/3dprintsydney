import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { handleStripeEvent, getStripeEnvironment } from "@/server/services/stripe";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const env = await getStripeEnvironment();
    const bodyBuffer = Buffer.from(await request.arrayBuffer());
    const signature = request.headers.get("stripe-signature");

    let eventPayload: unknown;

    if (env?.webhookSecret && signature) {
      try {
        eventPayload = env.stripe.webhooks.constructEvent(
          bodyBuffer,
          signature,
          env.webhookSecret,
        );
      } catch (error) {
        logger.error({ scope: "stripe.webhook.verify", error });
        return NextResponse.json(
          { error: { message: "Invalid Stripe signature" } },
          { status: 400 },
        );
      }
    } else {
      eventPayload = JSON.parse(bodyBuffer.toString("utf8"));
    }

    const event = eventPayload as Stripe.Event;
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
