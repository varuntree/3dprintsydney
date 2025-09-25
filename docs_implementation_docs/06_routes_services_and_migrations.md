# Routes, Services, and Migrations — Implementation Steps

This document lists the precise code touch-points to implement the plan.

## Database Migration
1) Create a Prisma migration adding to `Invoice`:
   - `stripeSessionId String?`
   - `stripeCheckoutUrl String?`

2) No other tables required; Settings remains a single record with JSON fields.

## Settings
- File: `src/lib/schemas/settings.ts`
  - Add `paymentTermSchema` and `paymentTerms` array field to `settingsInputSchema`.

- File: `src/server/services/settings.ts`
  - Parse and serialize `paymentTerms` (similar to `shippingOptions` and `calculatorConfig`).
  - Expose in `getSettings()`.

- File: `src/components/settings/settings-form.tsx`
  - Add UI to manage Payment Terms (code/label/days list with add/remove, validation, and ordering).

## Clients
- File: `src/lib/schemas/clients.ts`
  - Keep `paymentTerms` as string.

- File: `src/components/clients/client-detail.tsx` and forms
  - Display a Select for `paymentTerms` populated from `settings.paymentTerms`.
  - On submit, send the selected code.

- File: `src/server/services/clients.ts`
  - On create/update, validate the provided `paymentTerms` exists in `settings.paymentTerms` (fail 422 otherwise).

## Quotes
- File: `src/components/quotes/quote-editor.tsx`
  - Display read‑only chip/label for client `paymentTerms` (from clients list).
  - No editing here.

- File: `src/components/quotes/quotes-view.tsx` (or an equivalent read-only view)
  - Ensure a read-only presentation exists after create/send, with an Edit action.

- File: `src/server/pdf/templates/quote.ts`
  - Adopt legacy layout and styling; no payment link.

## Invoices
- File: `src/server/services/invoices.ts`
  - On create: derive `dueDate` from client’s `paymentTerms` via Settings.paymentTerms.
  - Add fields to serialization so UI can display terms.

- File: `src/components/invoices/invoice-editor.tsx`
  - Show read‑only `paymentTerms` label and auto-filled due date (editable if needed).

- File: `src/server/pdf/templates/invoice.ts`
  - Update layout to match legacy design (logo, styles, payment terms footer). If `status !== PAID`, render Stripe button using `invoice.stripeCheckoutUrl`.

## Stripe
- File: `src/server/services/stripe.ts`
  - Add `ensureStripeCheckoutUrl(invoiceId: number)` that:
    - Validates Stripe configuration.
    - Returns existing `stripeCheckoutUrl` if invoice is unpaid and URL present.
    - Otherwise creates a session (like `createStripeCheckoutSession`), persists `stripeSessionId`/`stripeCheckoutUrl`, and returns it.

- File: `src/server/pdf/generator.ts`
  - In `generateInvoicePdf`, if unpaid and Stripe configured, call `ensureStripeCheckoutUrl` first; include link in rendered HTML.

- Webhook: keep as-is (`/api/stripe/webhook`). No changes needed beyond idempotency checks already present.

## Calculator Enhancements
- File: `src/components/quotes/quote-editor.tsx` and `src/components/invoices/invoice-editor.tsx`
  - In `CalculatorDialog`:
    - Add Material selector (from `templates`’ material or from Materials list when override is allowed).
    - Interpret `infill` value: numeric (0–100) → `0.3 + (percent/100)*0.8`; otherwise lookup in `settings.calculatorConfig.infillMultipliers`.
    - Persist `calculatorBreakdown` including material and all components.

## Exports & Dashboard
No required changes. Optional: include payment terms in exports for AR analysis later.

## Activity Log
Log key actions:
- Stripe checkout created
- Invoice PDF generated with link
- Settings updated (payment terms)
- Invoice status updates

## Acceptance & QA
- Verify with a seeded dataset:
  - Clients with each payment term.
  - Calculated/Fixed templates.
  - Invoices created from quotes and via editor.
  - PDFs generated with logo and Stripe link for unpaid invoices.
  - Webhook marks invoice paid; PDF no longer shows pay button.

