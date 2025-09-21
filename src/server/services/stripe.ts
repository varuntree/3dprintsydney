import Stripe from "stripe";
import { PaymentMethod } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { getSettings } from "@/server/services/settings";
import { getInvoiceDetail, markInvoicePaid } from "@/server/services/invoices";
import { logger } from "@/lib/logger";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export type StripeEnvironment = {
  stripe: Stripe;
  publishableKey: string;
  webhookSecret: string | null;
  currency: string;
};

export async function getStripeEnvironment(): Promise<StripeEnvironment | null> {
  const settings = await getSettings();
  const secretKey = settings?.stripeSecretKey?.trim();
  const publishableKey = settings?.stripePublishableKey?.trim();
  if (!secretKey || !publishableKey) {
    return null;
  }
  const stripe = new Stripe(secretKey);
  return {
    stripe,
    publishableKey,
    webhookSecret: settings?.stripeWebhookSecret?.trim() || null,
    currency: settings?.defaultCurrency ?? "AUD",
  };
}

export async function createStripeCheckoutSession(invoiceId: number) {
  const env = await getStripeEnvironment();
  if (!env) {
    throw new Error("Stripe is not configured");
  }

  const detail = await getInvoiceDetail(invoiceId);
  const balanceDue = detail.balanceDue;
  if (balanceDue <= 0) {
    throw new Error("Invoice is already paid");
  }

  const amountInMinor = Math.round(balanceDue * 100);
  if (amountInMinor <= 0) {
    throw new Error("Invalid amount for checkout");
  }

  const successUrl = `${APP_URL}/invoices/${invoiceId}?checkout=success`;
  const cancelUrl = `${APP_URL}/invoices/${invoiceId}?checkout=cancel`;

  const session = await env.stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: env.currency.toLowerCase(),
          product_data: {
            name: `Invoice ${detail.number}`,
            description: detail.client.name,
          },
          unit_amount: amountInMinor,
        },
        quantity: 1,
      },
    ],
    metadata: {
      invoiceId: String(invoiceId),
      invoiceNumber: detail.number,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  await prisma.activityLog.create({
    data: {
      invoiceId,
      clientId: detail.client.id,
      action: "STRIPE_CHECKOUT_CREATED",
      message: `Stripe checkout session created for invoice ${detail.number}`,
      metadata: { sessionId: session.id, amount: balanceDue },
    },
  });

  logger.info({
    scope: "stripe.session.create",
    data: { invoiceId, sessionId: session.id, amount: balanceDue },
  });

  return {
    url: session.url,
    sessionId: session.id,
    publishableKey: env.publishableKey,
  };
}

export async function handleStripeEvent(event: Stripe.Event) {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const invoiceIdRaw = session.metadata?.invoiceId;
    const invoiceId = invoiceIdRaw ? Number(invoiceIdRaw) : NaN;
    if (!Number.isFinite(invoiceId)) {
      logger.error({
        scope: "stripe.webhook",
        error: new Error("Missing invoiceId metadata"),
        data: { eventId: event.id },
      });
      return;
    }

    const amountTotal = session.amount_total ?? 0;
    const amount = amountTotal / 100;

    await markInvoicePaid(invoiceId, {
      method: PaymentMethod.STRIPE,
      amount,
      processor: "stripe",
      processorId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.id,
      reference: session.id,
      note: "Stripe Checkout payment",
    });

    await prisma.activityLog.create({
      data: {
        invoiceId,
        action: "STRIPE_CHECKOUT_COMPLETED",
        message: `Stripe checkout completed for invoice ${session.metadata?.invoiceNumber ?? invoiceId}`,
        metadata: {
          sessionId: session.id,
          amount,
        },
      },
    });

    logger.info({
      scope: "stripe.session.completed",
      data: { invoiceId, sessionId: session.id, amount },
    });
  }
}
