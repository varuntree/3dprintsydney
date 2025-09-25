# 3D Print Sydney — Requirements Mapping (Old → New)

This document consolidates Ellen’s requirements from the transcript and maps each item to the current Next.js/Prisma implementation, identifying gaps and the design direction for parity with the old Flask app while keeping the new stack intact.

## Goals (from transcript)
- Payment Terms
  - Manage a list of payment terms in Settings (e.g., COD, 7 days, 14 days, 30 days).
  - When creating/editing a client, select one of these terms. The client’s term becomes the source of truth.
  - On quotes/invoices, display the client’s payment terms read-only; do not edit there.

- Calculator & Pricing
  - Product Templates can be Fixed or Calculated.
  - Calculated line items open a calculator to compute unit price using: material, quality, infill, hours and weight (grams).
  - The pricing logic comes from the old app: time- and material-based with quality/infill multipliers and setup/minimum rules.
  - Line‑level discounts and a global document discount are supported.

- Invoice & PDF Format
  - Match the old invoice PDF layout and formatting, including Ellen’s logo.
  - Display payment terms/due text, item breakdowns, shipping, discount, tax, totals, and (when applicable) “Pay online” link.

- Stripe Handling (simplified)
  - Generating an invoice PDF should also (first time only) generate a Stripe Checkout Session and embed the link in the PDF (“Pay $X online”).
  - No separate “Stripe button” is strictly required in the UI (may still provide an admin action for convenience).
  - Keep Stripe keys in Settings (and/or env) as in the new app; honor existing webhook for idempotent payment capture.

- Quote UX
  - After creation, quote view should default to a read‑only presentation (with an edit action) rather than immediately showing an editor.

## Current Implementation (new app)
- Next.js 15, Prisma (SQLite), Stripe SDK, Puppeteer (HTML→PDF).
- Product Templates: Fixed or Calculated; Calculator dialog exists; Materials include cost/gram.
- Calculations: `src/lib/calculations.ts` provides line and document totals (discounts, shipping, tax).
- Settings: includes calculator config (hourlyRate, setup, minimum, quality and infill multipliers), shipping options, job creation policy, Stripe keys; no structured “payment terms options” yet.
- Stripe: Session generation and webhook exist (`/api/invoices/[id]/stripe-session`, `/api/stripe/webhook`).
- PDF: Puppeteer templates (`src/server/pdf/templates/*`), not yet matching the old style/logo.

## Gaps
- No Settings-managed Payment Terms options; client payment terms is a free-text string.
- Quotes/Invoices don’t show payment terms read-only.
- PDF template/layout does not match the old format and lacks the embedded Stripe payment link.
- Stripe URL is not stored on the invoice; Checkout session is created on demand via API.
- Calculator is close to the old logic but lacks the exact infill/quality rule set from the old app; material selection appears but needs to drive pricing exactly like before.
- Quote “lock/read-only view” is not enforced by default.

## Non-Goals / Constraints
- Do not change the stack (keep Next.js, Prisma, Puppeteer, Stripe SDK).
- Do not import Python/reportlab code; replicate formatting with the existing HTML→PDF pipeline.

## High-Level Direction
1. Add Payment Terms options to Settings; bind Client.paymentTerms to those options; show read‑only on quotes/invoices; compute invoice due date from terms on create.
2. Align Calculator logic with old app behavior using existing primitives:
   - Labor = hourlyRate × hours × qualityMultiplier × infillMultiplier
   - Material = grams × material.costPerGram
   - Setup fee when hours below threshold; Minimum price floor.
   - Provide material selection when the template defines/permits it; persist breakdown per line.
3. Rebuild PDF HTML templates to match the old format and include logo and a “Pay online” Stripe link when available; on first generation, create and persist Checkout session URL.
4. Simplify Stripe UX: link in PDF as the primary path; optional admin/UI action to (re)generate the link; webhook remains authoritative for payment capture.
5. Improve Quote UX flow: after creation and once “sent”, default to a read-only view with an Edit action.

See companion documents for detailed specs and implementation steps.

