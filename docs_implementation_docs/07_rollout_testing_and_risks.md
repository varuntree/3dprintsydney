# Rollout, Testing, and Risks

## Rollout Plan
1) Migrations
   - Add `stripeSessionId` and `stripeCheckoutUrl` to `Invoice`.
   - Deploy migration in a dev branch, then merge after validation.

2) Settings UI
   - Introduce Payment Terms management; set defaults (COD, 7 days, 14 days, 30 days).

3) Clients UI
   - Switch payment terms field to dropdown from Settings; validate on save.

4) Calculator Enhancements
   - Add Material selector and infill percentage interpretation; persist breakdown consistently.

5) PDF Templates
   - Update Quote/Invoice templates to legacy layout, add logo, terms footer.
   - Implement Stripe link embed on unpaid invoices.

6) Stripe Service
   - Implement `ensureStripeCheckoutUrl` and integrate with PDF generator.
   - Confirm webhook path and success/cancel URLs.

7) Quote UX
   - Default to read-only view after create/send, with edit action available.

## Testing Matrix

Functional
- Settings
  - Create/update/delete payment terms.
- Clients
  - Assign payment term; verify it appears read-only on quote/invoice.
- Calculator
  - Hours/grams/material/quality/infill variations; line and global discounts; totals must match `src/lib/calculations.ts`.
- Invoices
  - Due date derivation from terms; PDF shows correct due/due immediately copy.
  - Stripe link appears only when unpaid and configured; clicking goes to Checkout with correct amount.
- Stripe Webhook
  - On completion, invoice marked paid; subsequent PDF omits button.

Non-Functional
- Puppeteer PDF generation performance and stability (no external font dependencies).
- Idempotency: repeat PDF generation does not create multiple sessions once URL is stored.

## Risks & Mitigations
- Stripe session reuse: Old sessions can expire in rare cases; provide a small “Regenerate Stripe Link” action in Invoice view (admin only) that reissues a session and updates the stored URL.
- Payment terms drift: Operators might change Settings after clients were created. We display the client’s stored term; updates require editing the client explicitly.
- Calculator parity: Slight numerical differences may arise; document the new defaults and allow Ellen to tune multipliers and setup/minimum values in Settings.

## Acceptance Criteria (Owner Review)
- PDF matches the legacy look with the logo and clearly shows a single “Pay online” link for unpaid invoices.
- Payment terms flow matches expectations: terms managed centrally; displayed (not edited) on documents; due date calculated for invoices.
- Stripe flow feels simple (link in PDF, webhook reconciles) and reliable.

