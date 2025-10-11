# Planning Brief

## Task Understanding
- **Current vs. desired:** Modernize the client/admin workflows captured in the latest meeting by updating quick order UX, shipping logic, quote/invoice lifecycle, client payment terms, dashboards, and job visibility—while leaving existing PDF templates untouched.
- **Acceptance Criteria**
  - Quick Order screen highlights the primary CTA per transcript (solid blue button, outlined upload icon) and still functions across browsers.
  - A user can upload multiple parts in one quick order, configure each independently, and see those configurations reflected on the resulting invoice (line descriptions + persisted breakdown attachments).
  - Shipping costs are estimated from client-provided location (state/postcode tiering at minimum; extensible to interstate surcharges) and surfaced during pricing/checkout.
  - Client payment terms remain assignable per client with defaults, enforced in UI + backend validation (already partly present) and reflected on new invoices/quotes, including due date text.
  - Quote “Accept” converts directly into an invoice (with redirection) and quote “Decline” changes status without deleting history; quotes list defaults newest-first.
  - Admin client dashboard removes unused KPI widgets; client portal adds job status visibility and optional email notification toggle aligning with meeting guidance.
  - Job flow supports expanded status taxonomy (pre-processing → packaging → etc.) with runtime validation and client-facing display; email notifications gateable and default-off.
  - Product catalog covers reusable service items (e.g., modeling hourly rates) for manual line items.
  - Stripe auto-mark-paid logic still works; bank-transfer manual pay remains unaffected.
  - Documentation (update.md, relevant READMEs) updated except for PDF template work.
- **Assumptions to confirm**
  - Location granularity for postage estimator (state vs. postcode vs. country) — confirm with product owner.
  - Desired list of extended job statuses and their order.
  - Email provider/config already available (Settings.enableEmailSend exists but no SMTP creds) — determine integration expectations.
  - Whether Quick Order shipping tiers should remain in Settings or move to dedicated matrix.

## Constraints & Context
- **Schemas/APIs:** Prisma schemas (SQLite), Next.js App Router, API routes secured via `requireUser/requireAdmin`. Shipping/payment terms stored in `Settings` JSON; invoices auto-create jobs depending on `jobCreationPolicy`.
- **Feature flags/env:** `enableEmailSend` toggle; Stripe keys hard-coded (legacy config); Quick Order relies on slicer CLI optional fallback.
- **Runtime limits:** Local-first app, no external network for estimator unless pre-configured; email sending likely via existing infra (needs clarifying).
- **Dependencies:** TanStack Query on client, React Hook Form, Zod schemas mirrored on server.

## Option Set
1. **Option A – Iterative Enhancement (Preferred)**
   - Layer new behavior into current structures: extend Settings for shipping regions, adjust Quick Order, mutate existing quote/invoice services, expand job enums, and wire client portal visibility.
   - **Pros:** Minimal re-architecture, reuse existing forms/components, lower risk.
   - **Cons:** Requires careful migration for enum changes; Quick Order code becomes denser.
   - **Risks:** Enum update touches DB & UI simultaneously; shipping estimator accuracy depends on data quality.
   - **Effort:** Medium-high (multiple slices).
2. **Option B – Introduce dedicated Quick Order service & shipping micro-logic**
   - Build new server module storing quick-order carts, shipping calculators w/ external API.
   - **Pros:** Cleaner separation, future extensibility.
   - **Cons:** Redo significant flows; more migrations; higher time.
   - **Risks:** Larger blast radius; more testing.
3. **Option C – Defer shipping & job visibility, focus on UX tweaks only**
   - Quick wins but leaves key transcript requests unresolved.
   - **Pros:** Low effort.
   - **Cons:** Doesn’t meet acceptance; not viable.

## Recommendation
- **Choose Option A**: Enhances existing code paths while fulfilling stakeholder needs and keeping scope contained.
- **Impact radius:** High (touches quick order, invoices, quotes, clients, settings, jobs, notifications, UI/UX).
- **Likely blast areas:** Prisma enums + migrations, API routes (`quick-order`, `quotes`, `jobs`), client portal components, email sending pipeline.

## Implementation Plan
1. **Confirm Requirements**
   - Sync with product on shipping tiers, job status list, and email expectations (update `docs_implementation_docs/workspace./update.md` once confirmed).
2. **Schema & Seed Updates**
   - Extend Settings model: add structured shipping rules (e.g., state → surcharge), possibly `shippingRegions` JSON.
   - Add enum values for job statuses (e.g., PRE_PROCESSING, QUEUED, PRINTING, PRINTING_COMPLETE, POST_PROCESSING, PACKAGING, OUT_FOR_DELIVERY).
   - Migration to drop unused Stripe template toggles if any and adjust related schema.
   - Update seeds with new shipping data and default job statuses.
3. **Settings & Clients**
   - Update settings schema (`src/lib/schemas/settings.ts`) and form to manage shipping tiers & job status email toggle (per client? global?). 
   - Ensure client form stores payment terms (already), plus optionally default notification preference.
4. **Quick Order UX & Pricing**
   - Update `QuickOrderPage` for CTA styling, outline icon.
   - Integrate location input into pricing (state/postcode) and push to `/price` + `/checkout`.
   - Enhance `priceQuickOrder` to compute shipping using new rules; return applied rule.
   - Update invoice line descriptions to include per-file settings (material, infill, layer height), ensuring persisted breakdown attachments remain.
5. **Quote Lifecycle**
   - Adjust actions so Accept triggers conversion (reuse `convertQuoteToInvoice` or merge logic into single service).
   - Ensure converted invoice uses `createInvoice` path to respect payment terms and due date.
   - Remove redundant “Convert to invoice” button if Accept handles conversion, or keep both but coordinate.
   - Change decline endpoint to set status without deleting; ensure UI messaging aligns.
   - Update quotes list default sorting to newest-first.
6. **Job Status Expansion & Client Visibility**
   - Propagate new enum through Prisma client, Zod schemas, job services, UI components (`job-board`, status badges).
   - Update job board to display new statuses.
   - Expose job status in client portal (dashboard + orders detail) and create optional email notifications triggered in job status service when `enableEmailSend` AND client opted-in toggle.
7. **Notifications**
   - Add client preference toggle (global or per-client) accessible via client portal header.
   - Implement backend check in job status update to enqueue/send email (likely placeholder sending or integrate with existing mail service if available; otherwise structure for upcoming integration).
8. **Admin & Client Dashboard Cleanup**
   - Remove “Total Clients/Outstanding Balance” cards on admin clients page.
   - Add CTA styling updates to client dashboard Quick Order card per guidance.
9. **Product Catalog Enhancements**
   - Ensure `products-view` allows creating service templates and surfaces them in quote/invoice editors (verify already supported; adjust copy/docs if needed).
10. **Docs & Housekeeping**
    - Update `docs_implementation_docs/workspace./update.md` and relevant README/START_HERE to reflect new behavior.
    - Ensure no PDF template edits occur; confirm unaffected.

## Quality Gates
- **Static:** `npm run lint`, `npm run typecheck`, `npm run build`.
- **Code health:** No TODO/FIXME left; remove unused imports/components; run Prettier formatting as per repo scripts.
- **Manual Smoke**
  1. Create client via admin UI, set payment terms to 14 days & enable email notifications.
  2. Login as client, run quick order with two files (set distinct infill/material), verify CTA styling, shipping calculation changes when state toggles.
  3. Complete checkout (Stripe fallback or manual) and open resulting invoice: check line descriptions, due date, payment terms.
  4. Accept quote and ensure auto-created invoice is reachable and quote status updated; Decline another quote to ensure status “DECLINED” remains in list.
  5. Update job status through admin (walk through new statuses) and confirm client portal shows status progression; toggle notifications to ensure email stub logs fire when on.
  6. Confirm admin clients page no longer shows deprecated widgets.

## Observability & Ops
- Add structured log entries when shipping estimator applies a tier and when job-status notifications send.
- If email dispatch implemented, ensure errors surface via logger with actionable info.
- Consider metric counters (if existing infra) for quick order conversions and job status transitions (optional, align with current logging style).

## Rollout & Cutover
- Apply Prisma migration (enum + settings changes) before deploy.
- Deploy code once migrations succeed; environment should run `npm run prisma` or equivalent.
- Post-deploy verification: run manual smoke tests; inspect logs for notification events.
- Fallback: revert to previous commit + rollback migration via backup snapshot (SQLite file) if smoke fails.

## Legacy Cleanup
- Remove admin dashboard widgets/components tied to old metrics.
- Delete unused shipping code references (flat shipping fields) replaced by new estimator.
- Remove redundant quote convert endpoints/buttons if superseded.
- Update documentation to drop references to removed widgets/flows.

## Risks & Mitigations
- **Enum migration breaks existing data:** Ensure migration maps existing statuses to new equivalents; add script to set default (e.g., QUEUED → PRE_PROCESSING?). Mitigate with snapshot before migration.
- **Shipping estimator complexity:** Start with simple tiering to avoid blocking; log unrecognized regions to refine data.
- **Email infrastructure unknown:** If no SMTP, stub notifications with log + TODO but mark as assumption (validate early). Alternatively, gate behind `enableEmailSend`.
- **Quick Order multi-file edge cases:** Add unit tests for price calculation service; ensure attachments handle renamed files.

## Open Questions
- Desired shipping tier spec (states vs postcode ranges).
- Complete list/ordering of job statuses the business wants visible to clients.
- Confirmation on whether Accept should automatically redirect to invoice and remove manual “Convert” option.
- Email provider availability and template copy.

## Ready-to-Implement Checklist
- [ ] Acceptance criteria matched to plan items.
- [ ] Quality gates defined (static commands + smoke).
- [ ] Observability additions noted (logs for shipping + notifications).
- [ ] Single cutover & migration steps recorded.
- [ ] Legacy cleanup targets identified.
- [ ] Assumptions documented with validation steps (shipping tiers, job statuses, email setup, quote conversion UX).
