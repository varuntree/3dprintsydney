# TRACKING

## Overview
- Start time: 2025-10-05 21:33
- Resolved PLAN_PATH: (no existing plan file) — using assistant Planning Brief captured in run artifacts
- Active run folder: ai_docs/temp_plan/run_20251005_2133
- Summary: Implement client/admin separation for invoices, shared message UI with per‑invoice threads, secure invoice APIs, quick‑order redirects, invoice activity (“posts”), slicer UX warnings, and documentation updates.

## Checklists
- See 02_checklists.md (Implementation & Review). Boxes will be checked here as parts complete.

## Heartbeats
- 2025-10-05 21:33 • Phase 0 • Bootstrap → Plan ingestion • Assumption: PLAN_PATH not present, using internal brief

## Part Logs

### Part 1 — Data Model: Per‑Invoice Messaging
- Implement: Add `invoiceId` to `UserMessage`, indexes, migration.
- Verify: Typecheck/build; Prisma generate; manual DB sanity via `prisma studio` if needed.
- Entropy detection: Prisma client usage in messages endpoints/pages.
- Rationale: Minimal extension to support order threads while preserving global threads.
- Diff summary: (to be filled after changes)

### Part 2 — Security: Invoice Access Guards
- Implement: `requireInvoiceAccess` and apply to invoice APIs.
- Verify: Manual smoke for client vs other clients; admin paths unaffected.
- Entropy detection: Admin invoice UI actions.
- Rationale: Centralized, explicit authorization.
- Diff summary: (pending)

### Part 3 — Client Invoice Detail Route
- Implement: New `/client/orders/[id]` page and read‑only invoice view.
- Verify: Navigate from orders list; view attachments; Stripe link visible.
- Entropy detection: None expected on admin routes.
- Rationale: Clear separation and UX for clients.
- Diff summary: (pending)

### Part 4 — Client Links & Quick Order Redirect
- Implement: Update links and redirect logic by role.
- Verify: Quick Order finishes to client page; admin remains on admin pages.
- Entropy detection: None; nav already role aware.
- Rationale: Avoid role guard bounce.
- Diff summary: (pending)

### Part 5 — Messages: Shared UI + API
- Implement: Extend `/api/messages` for `invoiceId`; new shared components; replace old pages.
- Verify: Client/admin can view and send messages per order; legacy pages render via components.
- Entropy detection: Admin per‑user messaging unaffected.
- Rationale: Single source of UI truth; reuse across app.
- Diff summary: (pending)

### Part 6 — Activity (“Posts”)
- Implement: `/api/invoices/[id]/activity`; left panel tab rendering.
- Verify: Activity appears for invoice create/payment/etc.
- Entropy detection: None.
- Rationale: Meet “posts” requirement using existing ActivityLog.
- Diff summary: (pending)

### Part 7 — Quick Order UI Polishing
- Implement: States, fallback badges, error banners.
- Verify: Upload/slice/price/checkout flows with/without slicer.
- Entropy detection: None.
- Rationale: Clarity and confidence for users.
- Diff summary: (pending)

### Part 8 — Slicer Robustness (UX)
- Implement: Warn if fallback path used; queued indication on concurrent runs.
- Verify: Toggle envs; observe UI states.
- Entropy detection: None.
- Rationale: Transparent behavior around external dependency.
- Diff summary: (pending)

### Part 9 — Documentation
- Implement: Developer doc updates; `.env.example` vars.
- Verify: Docs reflect actual behavior and config.
- Entropy detection: None.
- Rationale: Keep docs truthful.
- Diff summary: (pending)

### Part 10 — Legacy Cleanup
- Implement: Remove page‑scoped message UIs; ensure links updated.
- Verify: Builds clean; no unused exports.
- Entropy detection: Import breaks.
- Rationale: Avoid drift and confusion.
- Diff summary: (pending)

## Quality
- Type-check: (pending)
- Build: (pending)
- Lint/Format: (pending)
- Dependency audit: (pending)

## Decisions
- Option A (extend UserMessage with `invoiceId`) chosen for speed and low risk.

## Done
- (to be filled at completion)
- 2025-10-05 21:35 • Phase 1 • Plan ingestion → Orientation • None

- 2025-10-05 21:37 • Phase 3 • Part 1 Implement → Next: generate migration • Assumptions OK

Updated Prisma client and db push succeeded.
- 2025-10-05 21:44 • Phase 3 • Part 2 Verify → Next: Part 3 client invoice page • No blockers
- 2025-10-05 21:50 • Phase 3 • Part 4 done → Next: Part 5 shared messages + API • None
- 2025-10-05 22:06 • Phase 3 • Build PASS → Next: docs & cleanup • No blockers

## Quality
- Type-check PASS
- Build PASS
- Lint/Format: Lint PASS (no errors; warnings remain). Prettier check reports formatting differences (not auto-fixed in this run).
- Dependency audit: Completed (no blockers surfaced).

- 2025-10-05 22:10 • Phase 3 • Implementation → Review • Open items: 5.4, 7.2–7.3, 8.2, 9.1
- 2025-10-05 22:30 • Phase 3 • Admin & client messaging embedded • Build PASS; type-check PASS; lint warnings remain only
