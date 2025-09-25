# REDFORD – Tracking

## Overview
- Task: Integrate legacy payment terms, calculator parity, PDF layout, and Stripe flow into the new 3D Print Sydney app following docs_implementation_docs.
- Plans folder: /Users/varunprasad/Downloads/Archive/3dprintsydney/docs_implementation_docs

## Checklists

### Implementation
- [ ] Requirements mapped and gaps resolved (00_requirements_and_mapping.md)
- [ ] Data model & settings updates applied (01_data_model_and_settings_changes.md)
- [ ] Calculator & pricing logic aligned with legacy behaviour (02_calculations_and_pricing.md)
- [ ] PDF layout updated with logo and terms (03_pdf_spec_and_layout.md)
- [ ] Simplified Stripe flow with persistent link implemented (04_stripe_flow_simplification.md)
- [ ] UI/UX redesign items covered across screens (05_ui_ux_redesign_plan.md)
- [ ] Routes/services/migrations completed (06_routes_services_and_migrations.md)
- [ ] Rollout/testing/risk mitigations addressed; toggles cleaned up (07_rollout_testing_and_risks.md)
- [ ] Replace & Clean: legacy/dead code removed, docs updated

### Review
- [ ] Alignment with plans (00–07)
- [ ] Correctness & safety (no secret leakage, robust error handling)
- [ ] Simplicity & clarity of implementation
- [ ] Naming/structure coherent; cohesion high, coupling low
- [ ] Quality gates (type-check/build/lint/format/audit) all green
- [ ] No back-compat leftovers (old routes/flags/assets removed)
- [ ] Observability/logging for critical paths
- [ ] Dependencies trimmed to necessary set
- [ ] README/env guidance updated; quickstart ready

## Heartbeats
- 2025-09-22T00:50:49Z — Phase: Setup — Created tracking doc; next derive checklists & state file; blockers: none.
- 2025-09-22T00:57:13Z — Phase: Implementation — Added invoice schema fields and settings payment-term scaffolding; next align services/UI; blockers: prisma CLI non-interactive (handled via manual migration).
- 2025-09-22T01:15:45Z — Phase: Implementation — Wired payment terms into settings UI, client flows, and invoice editor auto due dates; next sync invoice services/PDF/Stripe; blockers: none.
- 2025-09-22T02:10:06Z — Phase: Implementation — Added calculator material selector, Stripe session persistence, and new PDF layouts; next integrate UI read-only states and cleanup; blockers: none.
- 2025-09-22T02:32:07Z — Phase: Implementation — Rebuilt database schema, seeded defaults, and verified production build; next propagate UI read-only views and remaining integration polish; blockers: none.


## Changes
- prisma/schema.prisma: add Stripe checkout fields for invoices
- prisma/migrations/202509220050_add_invoice_stripe_checkout_fields/: persist new columns
- prisma/seed.ts: seed default payment terms list
- src/lib/schemas/settings.ts: introduce payment term schema & validation
- src/server/services/settings.ts: parse/persist payment terms JSON and expose resolver utilities
- src/server/services/clients.ts: validate payment term selections against settings
- data/app.db, prisma/data/app.db*: reset dev database (will regenerate during tests)
- src/components/settings/settings-form.tsx: add payment term management UI
- src/components/clients/clients-view.tsx: use payment term select & defaults
- src/components/clients/client-detail.tsx: display resolved payment term label
- src/server/services/invoices.ts: compute due dates from payment terms
- src/components/invoices/invoice-editor.tsx: show payment terms badge & auto due date
- src/app/invoices/new/page.tsx: align defaults with new terms flow
- src/app/api/invoices/[id]/stripe-session/route.ts: support refreshable Stripe sessions
- src/server/services/stripe.ts: persist/reuse Stripe checkout URLs and clear on payment
- src/server/services/invoices.ts: attach payment term metadata and Stripe fields
- src/server/services/quotes.ts: expose payment terms to quote detail
- src/server/pdf/generator.ts: embed logo paths and ensure Stripe link creation on PDF
- src/server/pdf/templates/invoice.ts: rebuild invoice layout with logo, payment terms, and pay button
- src/server/pdf/templates/quote.ts: redesign quote PDF with branding and payment terms
- src/components/invoices/invoice-editor.tsx: material-aware calculator with auto due dates
- src/components/quotes/quote-editor.tsx: add material selector and numeric infill support
- src/components/invoices/invoice-actions.tsx: surface payment terms and Stripe link controls
- src/app/invoices/new/page.tsx: load materials for calculator dialog
- src/app/invoices/[id]/page.tsx: pass Stripe info and materials to editor/actions
- src/app/quotes/new/page.tsx: hydrate quote editor with materials list
- src/app/quotes/[id]/page.tsx: provide materials and payment terms to quote editor
- prisma/migrations/202509220210_add_settings_payment_terms/: add paymentTerms JSON column and default updates
- prisma/migrations/202509220212_align_schema_fields/: align Settings/Invoice/Quote/Job schema with code
- prisma/schema.prisma: reflect payment terms defaults and columns
- prisma/seed.ts: seed structured payment terms
- src/server/services/stripe.ts: reuse Stripe sessions and clear on payment
- src/server/pdf/generator.ts: ensure Stripe link creation and pass logo path
- src/server/pdf/templates/invoice.ts: modern layout with logo and Stripe button
- src/server/pdf/templates/quote.ts: updated branding and terms display
- src/server/services/settings.ts: resilience for payment-term parsing
- src/server/services/clients.ts: validate terms via settings resolver
- src/server/services/quotes.ts: expose payment term metadata
- src/components/invoices/invoice-actions.tsx: show terms and Stripe link controls
- src/app/api/invoices/[id]/stripe-session/route.ts: support refresh parameter
- prisma/migrations/202509220212_align_schema_fields/migration.sql: apply missing columns


## Quality
- Type-check: _(pending)_
- Build: _(pending)_
- Lint/Format: _(pending)_
- Dependency audit: _(pending)_

## Manual Smoke
- _(pending)_

## Done
- _(pending)_
