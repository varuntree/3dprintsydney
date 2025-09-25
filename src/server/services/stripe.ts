import Stripe from "stripe";
import { InvoiceStatus, PaymentMethod } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { getInvoiceDetail, markInvoicePaid } from "@/server/services/invoices";
import { logger } from "@/lib/logger";
import {
  LEGACY_STRIPE_SECRET_KEY,
  LEGACY_STRIPE_CANCEL_URL,
  LEGACY_STRIPE_SUCCESS_URL,
  LEGACY_STRIPE_CURRENCY,
  assertLegacyStripeConfigured,
} from "@/server/config/stripe-legacy";

assertLegacyStripeConfigured();

const stripeClient = new Stripe(LEGACY_STRIPE_SECRET_KEY);

export type StripeEnvironment = {
  stripe: Stripe;
  currency: string;
};

export async function getStripeEnvironment(): Promise<StripeEnvironment> {
  return {
    stripe: stripeClient,
    currency: LEGACY_STRIPE_CURRENCY,
  };
}

export async function createStripeCheckoutSession(
  invoiceId: number,
  options?: { refresh?: boolean },
) {
  const env = await getStripeEnvironment();

  const invoiceRecord = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      status: true,
      stripeSessionId: true,
      stripeCheckoutUrl: true,
    },
  });

  if (!invoiceRecord) {
    throw new Error("Invoice not found");
  }

  if (invoiceRecord.status === InvoiceStatus.PAID) {
    throw new Error("Invoice is already paid");
  }

  if (!options?.refresh && invoiceRecord.stripeCheckoutUrl) {
    return {
      url: invoiceRecord.stripeCheckoutUrl,
      sessionId: invoiceRecord.stripeSessionId ?? null,
    };
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
    success_url: LEGACY_STRIPE_SUCCESS_URL,
    cancel_url: LEGACY_STRIPE_CANCEL_URL,
  });

  if (!session.url) {
    throw new Error("Stripe checkout session missing URL");
  }

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        stripeSessionId: session.id,
        stripeCheckoutUrl: session.url ?? null,
      },
    });

    await tx.activityLog.create({
      data: {
        invoiceId,
        clientId: detail.client.id,
        action: "STRIPE_CHECKOUT_CREATED",
        message: `Stripe checkout session created for invoice ${detail.number}`,
        metadata: { sessionId: session.id, amount: balanceDue },
      },
    });
  });

  logger.info({
    scope: "stripe.session.create",
    data: { invoiceId, sessionId: session.id, amount: balanceDue },
  });

  return {
    url: session.url,
    sessionId: session.id,
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

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        stripeSessionId: null,
        stripeCheckoutUrl: null,
      },
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
