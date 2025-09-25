# Legacy Stripe Checkout & PDF Restoration Plan

## Objectives
1. Mirror the legacy Flask behaviour for Stripe checkout links: reuse the same hard-coded keys, generate checkout sessions exactly when invoices/quotes produce PDFs, and embed the URL directly in the exported document and UI actions.
2. Replace the current Puppeteer HTML for quotes/invoices with pixel-perfect markup that matches the old ReportLab layout (logo placement, tables, footer text, payment panel).
3. Ensure the PDF logo/assets come from the same files as the legacy implementation and that export flows remain functional out of the box.

## Scope
- Identify the original checkout-link logic in the legacy app (`app.py`, `utils/pdf_generator.py`) and port it into the new Next.js/Prisma stack.
- Hard-code the Stripe publishable & secret keys exactly as they appear in the old codebase; avoid settings-based configuration for this pass.
- Modify server-side services (`src/server/services/stripe.ts`, `src/server/services/invoices.ts`, `src/server/pdf/generator.ts`) and any UI triggers needed so the checkout link is produced and reused consistently.
- Rebuild the PDF templates with legacy layout (tables, fonts, margins). Validate against sample outputs.
- Update documentation to note the new behaviour and limitations.

## Non-Goals
- No attempt to improve security or configuration hygiene—the goal is feature parity with the old code.
- No redesign of other flows (jobs, calculator, dashboard) beyond what’s required for checkout/PDF.

## Acceptance Criteria
- Exporting a quote or invoice PDF results in HTML that visually matches the legacy PDF (logo, header, tables, footer text, payment instructions).
- The generated PDF includes a working Stripe checkout link using the hard-coded keys; clicking it completes checkout as in the old app.
- UI actions that rely on the checkout link reuse the same URL without reconfiguration.
- Documentation highlights that Stripe keys are embedded and how operators should use the payment link.
