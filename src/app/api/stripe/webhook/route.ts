import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { handleStripeEvent, getStripeEnvironment } from "@/server/services/stripe";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await getStripeEnvironment();
    const bodyBuffer = Buffer.from(await request.arrayBuffer());
    const event = JSON.parse(bodyBuffer.toString("utf8")) as Stripe.Event;
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
