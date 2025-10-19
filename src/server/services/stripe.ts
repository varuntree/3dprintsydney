import Stripe from "stripe";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { getInvoiceDetail, markInvoicePaid } from "@/server/services/invoices";
import { PaymentMethod, InvoiceStatus } from "@/lib/constants/enums";
import { logger } from "@/lib/logger";
import {
  getStripeSecretKey,
  getStripeSuccessUrl,
  getStripeCancelUrl,
  getStripeCurrency,
  getStripeWebhookSecret,
} from "@/lib/env";

type StripeConfig = {
  secretKey: string;
  successUrl: string;
  cancelUrl: string;
  currency: string;
  webhookSecret: string | null;
};

let cachedConfig: StripeConfig | null = null;
let cachedStripe: Stripe | null = null;

function resolveStripeConfig(): StripeConfig | null {
  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    return null;
  }

  const successUrl = getStripeSuccessUrl();
  const cancelUrl = getStripeCancelUrl();
  const currency = getStripeCurrency();
  const webhookSecret = getStripeWebhookSecret();

  return {
    secretKey,
    successUrl,
    cancelUrl,
    currency,
    webhookSecret,
  };
}

function getStripeConfigOrThrow(): StripeConfig {
  const config = resolveStripeConfig();
  if (!config) {
    throw new Error("Stripe is not configured");
  }
  if (!cachedConfig || cachedConfig.secretKey !== config.secretKey) {
    cachedStripe = new Stripe(config.secretKey);
    cachedConfig = config;
  }
  return config;
}

export type StripeEnvironment = {
  stripe: Stripe;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  webhookSecret: string | null;
};

export async function getStripeEnvironment(): Promise<StripeEnvironment> {
  const config = getStripeConfigOrThrow();
  if (!cachedStripe) {
    cachedStripe = new Stripe(config.secretKey);
  }
  return {
    stripe: cachedStripe,
    currency: config.currency,
    successUrl: config.successUrl,
    cancelUrl: config.cancelUrl,
    webhookSecret: config.webhookSecret,
  };
}

export async function createStripeCheckoutSession(
  invoiceId: number,
  options?: { refresh?: boolean },
) {
  const env = await getStripeEnvironment();

  const supabase = getServiceSupabase();
  const { data: invoiceRecord, error } = await supabase
    .from("invoices")
    .select("id, status, stripe_session_id, stripe_checkout_url")
    .eq("id", invoiceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load invoice: ${error.message}`);
  }
  if (!invoiceRecord) {
    throw new Error("Invoice not found");
  }

  if ((invoiceRecord.status ?? InvoiceStatus.PENDING) === InvoiceStatus.PAID) {
    throw new Error("Invoice is already paid");
  }

  if (!options?.refresh && invoiceRecord.stripe_checkout_url) {
    return {
      url: invoiceRecord.stripe_checkout_url,
      sessionId: invoiceRecord.stripe_session_id ?? null,
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
    success_url: env.successUrl,
    cancel_url: env.cancelUrl,
  });

  if (!session.url) {
    throw new Error("Stripe checkout session missing URL");
  }

  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      stripe_session_id: session.id,
      stripe_checkout_url: session.url ?? null,
    })
    .eq("id", invoiceId);
  if (updateError) {
    throw new Error(`Failed to store Stripe session: ${updateError.message}`);
  }

  const { error: activityError } = await supabase.from("activity_logs").insert({
    invoice_id: invoiceId,
    client_id: detail.client.id,
    action: "STRIPE_CHECKOUT_CREATED",
    message: `Stripe checkout session created for invoice ${detail.number}`,
    metadata: { sessionId: session.id, amount: balanceDue },
  });
  if (activityError) {
    logger.warn({
      scope: "stripe.session.create",
      message: "Failed to record checkout creation activity",
      error: activityError,
      data: { invoiceId, sessionId: session.id },
    });
  }

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
  const supabase = getServiceSupabase();

  // Idempotency check: Has this event already been processed?
  const { data: existingEvent } = await supabase
    .from("webhook_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (existingEvent) {
    logger.info({
      scope: "stripe.webhook",
      message: "Event already processed (idempotency)",
      data: { eventId: event.id, eventType: event.type },
    });
    return; // Skip processing
  }

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

    const supabase = getServiceSupabase();

    const { error: clearError } = await supabase
      .from("invoices")
      .update({
        stripe_session_id: null,
        stripe_checkout_url: null,
      })
      .eq("id", invoiceId);
    if (clearError) {
      logger.error({
        scope: "stripe.session.completed",
        error: clearError,
        data: { invoiceId, sessionId: session.id, message: "Failed to clear Stripe session fields" },
      });
    }

    const { error: activityError } = await supabase.from("activity_logs").insert({
      invoice_id: invoiceId,
      action: "STRIPE_CHECKOUT_COMPLETED",
      message: `Stripe checkout completed for invoice ${session.metadata?.invoiceNumber ?? invoiceId}`,
      metadata: {
        sessionId: session.id,
        amount,
      },
    });
    if (activityError) {
      logger.warn({
        scope: "stripe.session.completed",
        message: "Failed to record checkout completion activity",
        error: activityError,
        data: { invoiceId, sessionId: session.id },
      });
    }

    logger.info({
      scope: "stripe.session.completed",
      data: { invoiceId, sessionId: session.id, amount },
    });

    // Record event as processed (idempotency)
    await supabase.from("webhook_events").insert({
      stripe_event_id: event.id,
      event_type: event.type,
      metadata: { invoiceId, sessionId: session.id, amount },
    });
  }
}
