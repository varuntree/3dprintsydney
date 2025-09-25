# Stripe Flow — Simplified Handling (Legacy Parity)

> **Update (2025-09-25):** The live implementation now hard-codes the legacy Stripe keys in `src/server/config/stripe-legacy.ts` and no longer exposes settings fields for them. Treat the notes below as historical context only.

We will retain the current Stripe SDK usage and webhook, but simplify the operator experience to match the legacy flow: a single payment link is embedded in the invoice PDF and reused.

## Current (new app)
- API: `POST /api/invoices/[id]/stripe-session` creates a Checkout session and returns a URL.
- Webhook: `/api/stripe/webhook` handles `checkout.session.completed` and marks invoice as paid via `markInvoicePaid`.

## Target Behaviour
- On first PDF generation of an unpaid invoice, generate a Checkout Session and persist:
  - `invoice.stripeSessionId`
  - `invoice.stripeCheckoutUrl`
- The invoice PDF shows a “Pay $X online” button with the stored URL.
- Optional: Add a small action in the invoice screen “Generate/Refresh Stripe Link” that calls the same service.
- Keep webhook path and behaviour as-is for idempotent payment capture.

## Data
- Add `stripeSessionId` and `stripeCheckoutUrl` to `Invoice` (nullable).

## Services

src/server/services/stripe.ts (extend)
- Add helper: `ensureStripeCheckoutUrl(invoiceId: number)`
  - If already set and invoice is unpaid: return existing URL
  - Else, create session (like today’s `createStripeCheckoutSession`) with `success_url` and `cancel_url` set to `APP_URL/invoices/[id]?checkout=success|cancel`.
  - Save `stripeSessionId` and `stripeCheckoutUrl` on the invoice
  - Return URL

src/server/pdf/generator.ts
- Before rendering HTML, call `ensureStripeCheckoutUrl()` for unpaid invoices when Stripe is configured.

## Settings & Keys
- Use existing Settings model: `stripeSecretKey`, `stripePublishableKey`, `stripeWebhookSecret`.
- Provide a “Test Stripe” button (already present) in the Settings UI.

## UX Notes
- No separate “Stripe button” is required; invoice PDF is the primary path (matches legacy), but an optional action in the invoice page can be helpful for operators.
- If Stripe is not configured or invoice total is zero/paid, hide/omit the PDF payment button.

## Acceptance Criteria
- PDF generation embeds a valid Stripe checkout link for unpaid invoices when Stripe is configured (first time on demand, then reused).
- Webhook payment → Invoice status updates and payment logged; subsequent PDFs omit the payment button.
