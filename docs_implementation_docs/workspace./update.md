# Meeting Action Items — Client Portal & Operations (Transcript Dated October 2025)

## High-Priority (Next Iteration)
- **Client quick order CTA**: Make the `Quick Order` button the primary focal point (solid bright blue, largest contrast element); change the upload icon to outline-only so the CTA draws the eye.
- **Multi-file ordering**: Allow a single quick-order session to upload multiple STL files, each with independent settings, aggregating into one order/quote/invoice.
- **Order pricing breakdown**: Persist per-line settings (material, infill, hours, etc.) and ensure invoices list all parts with their unique configuration in the PDF.
- **Postage estimator**: Add location-based shipping cost estimation, with explicit handling for interstate/remote regions (Sydney baseline, higher tiers for Brisbane/Canberra/Tasmania).
- **Client payment terms**: Support per-client payment term selection (COD, 7/14/30/60 days) during client creation/editing; default online signups to COD.
- **Quote → Invoice flow**: Update `Accept` to convert quote to invoice and redirect to the new invoice view; prevent data loss on `Decline` by marking as `Lost` instead of deleting.
- **Invoice/quote PDFs**: Match legacy layout exactly, including top-level totals (`Due immediately`/`Due in X days`), payment terms messaging, Google review footer link, and paid status badge.
- **Dashboard cleanup**: Remove irrelevant widgets (`Outstanding Balances`, `Total Clients` blocks) from the clients screen to keep focus on search/new client actions.

## Medium Priority
- **Sign-up simplicity**: Keep client portal registration minimal (email + password) but confirm user journey from marketing site → portal login is frictionless.
- **Product catalog enhancements**: Ensure admin can create reusable products (e.g., 3D Modelling hourly services, scanning) and add them as free-form line items to quotes/invoices.
- **Quote list sorting**: Default quote list ordering to newest-first to surface recently created entries.
- **Terms-driven copy**: Vary terms & conditions text on quotes/invoices based on the client's payment terms (e.g., COD vs 7-day net wording).
- **Stripe payment state**: When Stripe payment completes, automatically mark invoice as paid so printed invoices show `PAID` in green. Manual bank payments should remain editable to adjust status.
- **Job status vocabulary**: Expand job workflow statuses (e.g., Pre-processing → In Queue → Printing → Printing Complete → Post-processing → Packaging → Out for Delivery) and reflect changes visually when operators update status.
- **Client visibility of job status**: Surface job/invoice status updates in the client portal so customers can track progress.

## Lower Priority / Future Considerations
- **Finishing options**: Plan for optional finishing/ surface treatment selections in quick order, but defer until core flow stabilizes.
- **Configuration fee model**: Decide whether to keep per-object configuration fee as its own line item or bake fee into pricing rules; align with calculator once shipping updates land.
- **Email notifications**: Provide client-facing email notifications for job status changes with a simple toggle (default off) in the client portal header.
- **Material info link-out**: Add info icon next to filament selector that opens the public materials page (or a refreshed materials guide) in a new tab.
- **Hosting & domain**: Integrate portal under `3dprintsydney.com` (e.g., `/client` subpath) once domain access is granted; coordinate DNS and Wix-hosted landing page to preserve SEO.

## Dependencies & Notes
- Stripe keys remain hard-coded (legacy parity) until configuration story is revisited.
- Ensure PDFs generated for shipping include invoices marked paid and inserted into shipments.
- Keep all historic quotes/invoices; never delete on decline—rely on status for reporting.

## Progress Log — 2025-10-08
- Initiated comprehensive implementation cycle (run_20251008_1702). Outstanding assumptions: AU shipping tiers by state, expanded job status list, email infrastructure availability, quote acceptance UX expectations.
- Plan artifacts recorded under `AI_docs/temp_plan/run_20251008_1702/` with tracking and checklists.
- Parts A–I complete (schema migrations, settings UI, quick order shipping overhaul, quote accept workflow, job visibility, client portal polish). Remaining focus: Part J (documentation/cleanup) and Part K (quality gates + smoke tests).
- 19:10 — Part H wrapped: job board now uses `getJobActions`, invoice detail exposes job metadata, client order view shows staged timeline, and `/api/client/jobs` feeds dashboard; notification hook remains gated behind `enableEmailSend` with structured logging.
- 19:20 — Part I wrapped: client dashboard promotes quick order CTA with primary styling, introduces persisted job-status email toggle via `/api/client/preferences`, and fetches preference state during load.
- 19:35 — Part K complete: recorded lint/typecheck/build passes after addressing shipping region references and logger payloads; manual UI smoke on client notifications/timeline queued for next session.
- 21:15 — New run (`run_20251008_2105`) executed: quick order UX, Stripe visibility, PDF export, client picker modal, messaging loader, and notification copy updates delivered. Progress tracked in `progress_plan_20251008.md`; outstanding work limited to cross-cutting PDF parity/product catalog follow-ups and final smoke tests.
