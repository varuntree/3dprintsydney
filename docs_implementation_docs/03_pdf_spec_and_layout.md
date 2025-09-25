# PDF Spec & Layout — Match Legacy Format

We will rebuild the HTML templates used by Puppeteer to match the old invoice/quote PDF design, including logo and payment terms/due text, and embed a Stripe checkout link (“Pay $X online”).

## Assets
- Place the business logo at `public/logo.png` (or `public/images/logo.png` if we want a subfolder). Path referenced in templates with `<img src="/logo.png" ...>`.

## Templates to Update
- `src/server/pdf/templates/invoice.ts`
- `src/server/pdf/templates/quote.ts`

General Style
- Typography/colors to match legacy PDF (as per sample PDFs from WhatsApp).
- Header layout: Logo on the left; document title and meta (number, date, due/expiry) on the right.
- Client block.
- Line item table: Description, Notes, Qty, Unit, Unit Price, Discount, Less, Line Total (already similar).
- Summary: Subtotal, Shipping, Tax, Total; for invoices add Balance Due.
- Footer: Terms & conditions; include a concise payment terms/due summary (e.g., COD → “due immediately”; 7 days → “due Oct 20, 2025”).

### Dynamic Fields
- Payment Terms (read‑only) and Due Date logic: derived at generation time using the client’s terms and invoice status.
- Stripe Link: When an invoice is not paid and Stripe is configured, we show a prominent button/link:
  - Label: `Pay $<balanceDue or total> online`
  - Link: `invoice.stripeCheckoutUrl` if present; otherwise, create a session and persist it, then use the URL.

### Stripe Link Lifecycle
1) On `generateInvoicePdf(id)` in `src/server/pdf/generator.ts`:
   - If `invoice.stripeCheckoutUrl` is empty AND `invoice.status !== PAID` AND Stripe keys exist:
     - Call a server service to create a Checkout Session and save `stripeSessionId` + `stripeCheckoutUrl` on the invoice.
   - Use the stored `stripeCheckoutUrl` to render the PDF button.

2) On payment completion (webhook), we mark the invoice PAID and the PDF will naturally stop showing the button.

### Quote PDF
- Same visual style without payment button; show expiry (“valid until …”), notes, and terms.

## Terms & Conditions Copy
Replicate the legacy text tone but keep concise and on-brand:
- Quotes: “Quote valid until expiry date. Prices include GST. Payment required in full before production begins. We print to specification; ensure models are fit for purpose.”
- Invoices: If PAID, show “PAID”; otherwise, derive “due immediately/7 days/14 days/30 days” per Settings.

## Accessibility & Robustness
- Avoid external resources (fonts via system stack) so Puppeteer runs offline.
- Table widths defined to avoid wrapping issues.

## Acceptance Criteria
- PDF visual parity with the supplied legacy PDFs (layout, logo placement, typographic scale).
- Stripe link appears exactly once for unpaid invoices when Stripe is configured, linking to a valid session.

