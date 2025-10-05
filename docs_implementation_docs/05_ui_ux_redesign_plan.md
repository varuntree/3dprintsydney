# UI/UX Redesign Plan — Legacy Functionality in New Shell

This plan aligns the user-facing flows with the old app’s behaviour while using the new components and patterns.

## Settings
- Payment Terms tab/section (within Settings form):
  - Manage a list of terms: code, label, days.
  - Validation: unique codes; nonnegative days.
  - Surfaces in Clients form as a dropdown.

## Clients
- Client form: `paymentTerms` becomes a Select populated from Settings.
- Client detail: display the selected payment term.

## Quotes
- New Quote: display the client’s payment terms (read‑only chip/label near the top). Not editable here.
- After creation and especially after “Send”, present a read‑only “Quote view” by default (like invoice view). Keep an Edit button.
- Quote PDF: match legacy layout; no payment button.

## Invoices
- New/Edited Invoice Editor: display client payment terms (read‑only) and derived Due Date suggestion (set on create). Allow manual due date edits if needed (keep current flexibility).
- Invoice View: show status, due date, payment terms, and an Attachments/Notes section (already present). Optionally a small “Regenerate Stripe Link” action.
- Invoice PDF: legacy layout, logo, terms footer, and a “Pay $X online” link for unpaid invoices.

## Calculator Dialog (Quotes & Invoices)
- Add Material selection when template has a materialId; allow override with a dropdown populated from Materials.
- Keep fields: Hours, Grams, Quality, Infill.
- Interpret Infill as either preset keys or numeric percentage (percentage → legacy formula to compute multiplier).
- Show a live “Preview” price as currently implemented.
- On Apply: set unitPrice, quantity=1, discountType=NONE, discountValue=0; persist `calculatorBreakdown` (labor, material, setup, hours, grams, quality, infill, materialId/materialName).

## Job Creation UX Note
- Keep existing Jobs board and Settings’ `jobCreationPolicy` control. Document to set ON_INVOICE for terms-based immediate job creation or ON_PAYMENT otherwise.

## Navigation/Actions (small additions)
- Invoices list: add a small badge if a Stripe link already exists for the invoice.
- Invoice View: action to “Generate Stripe Link” (optional) → helpful for operators; not strictly required by owner.

## Empty States & Errors
- Stripe not configured → PDF omits payment link; invoice view shows a subtle warning badge or tooltip in actions.
- No payment terms (edge) → default to COD in UI and due date logic.

## Acceptance Criteria
- User can manage payment terms in Settings and assign them to clients.
- Quotes/Invoices display payment terms read‑only; Invoices compute due date from terms.
- Calculator produces expected totals and persists breakdown.
- PDF matches legacy layout with logo and payment link handling.


## Implementation Notes
- 2025-09-29: Dashboard tokens propagated across navigation, settings, clients, quotes, invoices, calculator dialog, reports.
- Stripe status hook added to disable payment actions when not configured; invoice PDFs now monochrome with terms badge.
- Remaining next steps tracked in ai_docs/temp_plan/run_20250929_1217.
