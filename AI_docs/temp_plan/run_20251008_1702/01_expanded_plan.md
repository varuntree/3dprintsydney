# Expanded Implementation Plan

## Part A — Requirement Confirmation & Baseline
1. Document outstanding assumptions (shipping tiers, job status taxonomy, email provider, quote acceptance UX) and capture interim decisions in `docs_implementation_docs/workspace./update.md`.
2. Snapshot current SQLite DB / data folder prior to migrations.
3. Inventory existing Settings schema usage (shippingOptions, paymentTerms, enableEmailSend) to understand integration points.

## Part B — Data Model & Migration Work
1. Extend Prisma `Settings` model with `shippingRegions` JSON and optional `defaultShippingRegion`.
2. Expand `JobStatus` enum with statuses: `PRE_PROCESSING`, `IN_QUEUE`, `PRINTING`, `PRINTING_COMPLETE`, `POST_PROCESSING`, `PACKAGING`, `OUT_FOR_DELIVERY`, retaining `CANCELLED`.
3. Generate Prisma migration(s) applying schema updates and seeding defaults.
4. Update `prisma/seed.ts` to populate shipping regions and align job status expectations.

## Part C — Shared Schema & Service Adjustments
1. Update Zod schemas (`settings`, `jobs`, others) to reflect new fields/enums.
2. Adjust Settings service serialization/validation to surface shipping regions and default selections.
3. Update clients service & schemas to support notification preference storage.
4. Extend job service logic to accommodate new statuses and enforce valid transitions.

## Part D — Settings UI Enhancements
1. Add shipping-region management UI (CRUD) within `settings-form` Payments/Shipping sections.
2. Surface job-status notification toggle in settings (global) and expose to client creation defaults.
3. Ensure validation, help text, and persistence align with new schema.

## Part E — Client Management Updates
1. Modify admin client forms to include per-client notification preference (default from settings).
2. Ensure payment terms dropdown still works with updated defaults.
3. Update client listing view to remove legacy KPI DataCards.
4. Adjust backend create/update flows for new preference field.

## Part F — Quick Order UX & Pricing Engine
1. Update client quick order page styling: solid blue primary CTA, outlined upload icon, clearer state progression.
2. Add shipping address/location capture (state + postcode) and integrate into pricing flow.
3. Extend `/api/quick-order/price` & service to compute shipping via new rules and return selected tier metadata.
4. Update `/api/quick-order/checkout` to persist shipping metadata, enrich invoice line descriptions (include material, infill, layer height) and attach structured JSON.
5. Add server logging when fallback shipping is applied.

## Part G — Quote Workflow Overhaul
1. Update quote view actions so “Accept” converts to invoice via `createInvoice`, redirecting on success.
2. Remove or repurpose “Convert to invoice” button to avoid duplication.
3. Ensure “Decline” only changes status (no data deletion) and capture optional note.
4. Set quotes list default ordering to newest-first and reflect new status transitions in UI.

## Part H — Job Status Visibility & Notifications
1. Update job board UI to display new statuses and provide transitions consistent with service logic.
2. Add client-portal job status indicators (dashboard and order detail) reflecting server data.
3. Implement email notification hook (placeholder logging if SMTP unavailable) triggered when job status changes and client opted-in; respect global enable flag.
4. Add structured logs for notification attempts/success/failure.

## Part I — Client Portal UX Adjustments
1. Update client dashboard quick-action cards per UX guidance (highlight quick order).
2. Provide toggle for email notifications in client portal header/settings, persisting preference.
3. Ensure quick order CTA mirrors admin styling changes where applicable.

## Part J — Documentation & Cleanup
1. Update `docs_implementation_docs/workspace./update.md` with implementation status and assumptions resolved.
2. Refresh top-level docs (README/START_HERE) with new shipping + job status behavior summaries.
3. Remove dead code/configurations superseded by new logic (legacy widgets, unused shipping structures, redundant quote endpoints).
4. Verify no PDF template changes were made.

## Part K — Quality Gates & Finalization
1. Run `npm run lint`, `npm run typecheck`, `npm run build`.
2. Run `npm run format` or `npm run format:write` if required by repo.
3. Perform manual smoke tests enumerated in the planning brief.
4. Document results, decisions, and next steps in `TRACKING.md` and `.agent_state.json`.
