# Data Model & Settings Changes

This document enumerates the schema and configuration updates needed to support Payment Terms, Stripe link persistence, and PDF needs while preserving the current tech stack.

## Prisma Schema Changes

File: prisma/schema.prisma

- Invoice: add fields to persist Stripe checkout details (optional; for first-time generation and reuse)
  - `stripeSessionId String?`
  - `stripeCheckoutUrl String?`

Rationale:
- The old app renders a PDF that embeds a persistent payment link. We replicate this by generating a Checkout Session on-demand and saving the URL. This avoids regenerating a new session on every PDF build and makes the PDF deterministic.

Migration Notes:
- Create a migration adding the two nullable columns. Existing invoices remain valid.

## Settings Model Changes

File: src/lib/schemas/settings.ts

Add structured Payment Terms options to Settings:

```ts
export const paymentTermSchema = z.object({
  code: z.string().min(1),   // e.g. "COD", "7_days", "14_days", "30_days"
  label: z.string().min(1),  // e.g. "COD", "7 days", "14 days", "30 days"
  days: z.number().int().min(0), // 0 for COD, otherwise N days
});

// Inside settingsInputSchema
paymentTerms: z.array(paymentTermSchema).default(() => [
  { code: "COD", label: "COD", days: 0 },
  { code: "7_days", label: "7 days", days: 7 },
  { code: "14_days", label: "14 days", days: 14 },
  { code: "30_days", label: "30 days", days: 30 },
]),
```

Server side (src/server/services/settings.ts):
- Parse/validate `paymentTerms` from JSON like shippingOptions/calculatorConfig.
- Expose these options to the UI.

## Client Model Changes

File: src/lib/schemas/clients.ts

- Constrain `paymentTerms` to one of the configured Settings options.
  - At runtime, the UI will source options from Settings; on the server, still accept string but validate presence against Settings when updating/creating clients.

Optional stricter approach (if desired in a later iteration):
- Introduce a small table or enum for normalized codes; current approach uses Settings JSON for flexibility.

## Derived Values

### Due Date Calculation

On invoice creation (service layer):
- Read the client’s `paymentTerms` code.
- Look up days from Settings.paymentTerms; set `dueDate = issueDate + days` (days=0 for COD results in `dueDate = issueDate`).

### Job Creation Policy (no schema change)

We keep existing JobCreationPolicy in Settings. Behavior remains:
- ON_PAYMENT → create a job when invoice is paid.
- ON_INVOICE → create a job immediately on invoice creation.

Note: The transcript’s “credit terms create job immediately” aligns with ON_INVOICE. You may keep the global policy or (optional) add a per-invoice override if the business wants to key it off the client’s term. For now, we respect the global setting and document how to use it.

## Seed Changes

File: prisma/seed.ts
- Add default `paymentTerms` values to Settings on bootstrap, consistent with the schema above.

## Backward Compatibility
- Existing invoices/clients lack `stripe*` fields and structured payment terms. The system continues to work; payment links get created the first time a PDF is generated; due dates can be recomputed on edit/create.

