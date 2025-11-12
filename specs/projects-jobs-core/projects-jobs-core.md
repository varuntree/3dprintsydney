# Plan: projects-jobs-core

## Issue Checklist
- [x] Backend status counters, client status mapping, transition guards, and project counters
- [x] Client-facing APIs for projects list, reorder, and archive/unarchive actions
- [x] Client portal CTA, project badge/card, new list views/pages, navigation, and design token updates
- [x] E2E test description covering dashboard counters, active/history/archived flows, reorder, and archive/restore

## Plan Description
Deliver the client-facing project/job lifecycle experience described in `specs/fixes/projects-jobs-core/projects-jobs-core.md`. We will surface the simplified client status model, dashboard counters, and project views (active, history, completed, archived) while keeping existing admin workflows intact. The updated `/client` portal will feel polished, trust-inspiring, and match the TenderCreator-inspired design.

## User Story
As a client
I want to see where each project stands (pending print, pending payment, completed) and instantly repeat successes
So that I can focus on my work, know what requires my attention, and reorder without rebuilding quotes from scratch.

## Problem Statement
The current client portal only exposes invoices, not jobs, and lacks client-friendly statuses, filters, repeat ordering, and bulk archive controls. Clients cannot tell which prints are live, what still needs payment, or reuse successful projects, which increases support overhead and slows reorders.

## Solution Statement
Extend the backend and frontend so clients see a dedicated status model (Pending Print / Pending Payment / Completed) with counters and consistent badges, allow filtering of active/completed/archived projects, provide a “Print Again” workflow (duplicate quote + activity log + redirect), and surface transition guards/bulk archive controls. Keep admin-side workflows untouched while wiring the new client API routes into the existing Next/React patterns and design system.

## Pattern Analysis
- `/src/lib/constants/enums.ts:38-77` contains the definitive invoice/job status constants; add a new `ClientProjectStatus` enum (pending print/payment/completed) there or in a companion file so client code maps cleanly to existing job/invoice statuses without breaking other consumers.
- `/src/server/services/jobs.ts:96-512` currently maps job cards and exposes `listJobsForClient`; reuse its query + `mapClientJob` structure as a reference for the new `listClientProjects` + client status mapping/filtering logic.
- `/src/app/api/client/jobs/route.ts:1-20` and `/src/app/api/client/dashboard/route.ts:1-14` show the standard auth/response pattern (`requireClientWithId` + `okAuth`); keep the same structure for the new `/api/client/projects` and `projects/[id]/reorder` endpoints.
- `/src/components/client/client-dashboard.tsx:47-200` and `/src/app/(client)/client/orders/page.tsx:1-189` demonstrate how client pages fetch data on mount, show cards/tables via `StatusBadge`, and handle loading states; the new components should follow the same `useQuery`/fetch + `StatusBadge` styling.
- `/src/components/layout/client-shell.tsx:32-134` + `/src/lib/navigation.ts:42-57` define the sidebar/header layout; add the new project views to `CLIENT_NAV_SECTIONS` and keep the `NavigationLink` helpers untouched.
- `/src/components/ui/status-badge.tsx:1-39` and `/src/lib/design-system.ts:21-120` centralize badge colors; register client statuses there so badges stay consistent with existing tokens.
- `/src/server/services/dashboard.ts:387-479` is where dashboard counters currently come from; we will reuse this pattern to compute `projectCounters` (pending print/payment/completed/available credit) and merge into the API response.
- `/specs/fixes/projects-jobs-core/projects-jobs-core.md` defines the new component hierarchy (status badge, project card, views) and the validation checklist; it is authoritative for acceptance criteria.

## Dependencies
### Previous Plans
- **Client Portal UX Plan** – the `/src/components/client/client-home-cta.tsx` component and the general portal layout were defined there; reuse the CTA structure and navigation intent from that plan.
- **Branding & Copy Plan** – ensures terminology (e.g., “projects” vs “jobs”) remains consistent; follow any naming conventions referenced there when wiring UI copy.

### External Dependencies
- None beyond the existing dependencies already in `package.json`.

## Relevant Files
- `/specs/fixes/projects-jobs-core/projects-jobs-core.md` – authoritative spec for every acceptance criterion, data requirement, and UI flow.
- `/ai_docs/documentation/CONTEXT.md` & `/ai_docs/documentation/PRD.md` – provide the high-level vision, tech stack decisions, and UX rationale that must guide every trade-off.
- `/ai_docs/documentation/standards/coding_patterns.md` – explains required design-token usage, component structure, and API response patterns we must follow.
- `/ai_docs/documentation/standards/system-architecture.md` & `/ai_docs/documentation/standards/data-schema.sql` – reference when adding indexes/queries (e.g., `(client_id, archived_at, status)` indexes) to keep database changes aligned with architecture.
- `/src/lib/constants/enums.ts` – base statuses; we will import from here (or from a new companion file) when computing client-facing statuses.
- `/src/lib/constants/client-project-status.ts` *(new)* – central location for the simplified client status enum so both frontend and backend share the same values.
- `/src/lib/types/jobs.ts` & `/src/lib/types/dashboard.ts` – extend DTOs so the new API payloads can carry client status, project counters, and project metadata.
- `/src/server/services/jobs.ts` – add `mapToClientStatus`, `listClientProjects`, `listClientProjectCounters`, bulk archive, transition guards, orientation/payment validation, and reuse existing logging patterns.
- `/src/server/services/dashboard.ts` – extend `getClientDashboardStats` (or create helpers) so project counters are computed from jobs/invoices and included in client dashboard payloads.
- `/src/app/api/client/dashboard/route.ts` + `/src/app/api/client/jobs/route.ts` – extend to include new counters/data or reuse new services.
- `/src/app/api/client/projects/route.ts` *(new)* – provide paginated, filtered project data for active/history/archived tabs and searches.
- `/src/app/api/projects/[id]/reorder/route.ts` & `/src/app/api/projects/archive/route.ts` *(new)* – new client-friendly endpoints, patterning after existing `/jobs` APIs.
- `/src/components/client/client-dashboard.tsx` – consume new counters + CTA links; update to display `pendingPrint`, `pendingPayment`, and `availableCredit` (via `ClientHomeCTA` or cards).
- `/src/components/client/client-home-cta.tsx` *(create/update)* – show the three CTA cards that link to quick order, active projects, and print again, using new status badges/counts.
- `/src/components/projects/project-status-badge.tsx` *(new)* – reusable badge for the simplified statuses; follow `Badge` + token styling.
- `/src/components/projects/project-card.tsx` *(new)* – central card component consumed by active/history/archived lists.
- `/src/components/projects/reorder-button.tsx` *(new)* – handles UI for the “Print Again” workflow (loading state, toast, redirect).
- `/src/components/client/active-projects-view.tsx`, `/src/components/client/print-again-view.tsx`, `/src/components/client/completed-projects-view.tsx`, `/src/components/client/archived-projects-view.tsx` *(new)* – each view is a client-tailored list that follows existing data-fetching/empty state patterns (use `useQuery`, `Button`, etc.).
- `/src/app/(client)/client/projects/active/page.tsx`, `/src/app/(client)/client/projects/history/page.tsx`, `/src/app/(client)/client/projects/completed/page.tsx`, `/src/app/(client)/client/projects/archived/page.tsx` *(new)* – page entrypoints that wrap the views, reuse the portal layout, and keep messaging consistent.
- `/src/lib/navigation.ts` – add navigation entries for the new project routes so the client sidebar links to them.
- `/src/components/ui/status-badge.tsx` + `/src/lib/design-system.ts` – add token mappings for the new client statuses and ensure the badge component uses them.
- `.claude/commands/test_e2e.md` & `.claude/commands/e2e/test_basic_query.md` – required reading to understand the format/expectations for the new E2E test document we will create.

### New Files
- `.claude/commands/e2e/test_projects-jobs-core.md` – documents the hands-on validation steps for dashboard counters, active/history/archived lists, reorder workflow, and archive guards.
- `/src/lib/constants/client-project-status.ts` – exports the three client statuses and helper utilities.
- `/src/server/services/project-reorder.ts` – encapsulates the reorder logic, duplicate quote creation, and activity logging.
- `/src/app/api/projects/[id]/reorder/route.ts` – endpoint for clients to rerun completed projects.
- `/src/app/api/projects/archive/route.ts` – bulk archive/unarchive endpoint.
- `/src/app/api/client/projects/route.ts` – new endpoint that supports status filters, pagination, and search.
- `/src/components/projects/project-status-badge.tsx` – new badge component for client statuses.
- `/src/components/projects/project-card.tsx` – reusable card used across all project views.
- `/src/components/projects/reorder-button.tsx` – UI for the Print Again action.
- `/src/components/client/active-projects-view.tsx` – active projects list with tabs and filtering.
- `/src/components/client/print-again-view.tsx` – history list with search, pagination, and reorder button.
- `/src/components/client/completed-projects-view.tsx` – completed bucket (per spec) with bulk archive CTA.
- `/src/components/client/archived-projects-view.tsx` – archived bucket with unarchive controls.
- `/src/app/(client)/client/projects/active/page.tsx` *(and history/completed/archived route pages)* – entrypoints that pull in the new views.
- `/src/components/client/client-home-cta.tsx` *(if not already created by the Client Portal UX plan)* – CTA trio that surfaces counters and links to the new views.

## Acceptance Criteria
1. Client dashboard surfaces pending print/pending payment/completed counters plus available credit and links to the new project views.
2. Active projects page (`/client/projects/active`) lists non-completed jobs, offers tabs + filters, uses the new `ProjectStatusBadge`, and shows a friendly empty state with a “New Project” CTA.
3. Print Again/history view (`/client/projects/history`) lists completed/paid projects, supports search/pagination, and each row has a working “Print Again” button that duplicates the quote and redirects to the draft.
4. Reorder flow logs a `QUOTE_REORDERED` activity entry, preserves line items/calculations, leaves the new quote in draft, and surfaces a toast/loading state in the UI.
5. Client-facing statuses derive from invoices + jobs: pending payment (unpaid invoice); pending print (paid invoice, job not started); completed (job done, invoice paid).
6. Backend transition guards prevent PRINTING without orientation-locked files and COMPLETED without satisfying the payment policy. Errors are surfaced as `BadRequestError` with the messages defined in the spec.
7. Bulk archive/unarchive actions exist for completed and archived lists, with confirmation dialogs and counters reflecting changes.
8. `/api/client/projects` exposes filters for `active|completed|archived`, search, pagination, and returns the mapped client status plus invoice metadata.
9. Status badges reuse the shared design tokens (per `status-badge.tsx` and `design-system.ts`) so colors match the spec.
10. Empty states (active/history/archived) follow the same CTA/typography patterns described in the spec.
11. Manual validation steps from section 4+ of the spec (Active Projects list, Print Again, reorder, status mapping, transition guards, bulk archive, archived view, empty states) pass.

## Step by Step Tasks
**EXECUTION RULES:**
- Execute ALL steps below in exact order
- Check Acceptance Criteria - all items are REQUIRED
- Do NOT skip UI/frontend steps if in acceptance criteria
- If blocked, document and continue other steps

### 1. Harden the backend status model + counters
- Add `/src/lib/constants/client-project-status.ts` to centralize Pending Print, Pending Payment, Completed values (use the same constants/interfaces pattern from `src/lib/constants/enums.ts:38-77`).
- Extend `src/lib/types/jobs.ts`/`src/lib/types/dashboard.ts` so DTOs can carry `clientStatus`, `projectCounters`, and relevant invoice metadata (amounts, invoiceId).
- Implement `mapToClientStatus(jobStatus, invoiceStatus, balanceDue)` and `getClientProjectCounters(clientId)` inside `src/server/services/jobs.ts` using the existing supabase patterns (`listJobsForClient` at `jobs.ts:484-512`) plus the index recommendation `(client_id, archived_at, status)`.
- Update `src/server/services/dashboard.ts` (`getClientDashboardStats` at lines 387-479) to call the new counters helper and include `projectCounters` in the payload (merge with wallet data).
- Ensure any new database queries reuse `getServiceSupabase()`/logging, and wrap errors in `AppError` (matching existing patterns in `jobs.ts` and `dashboard.ts`).
- Document the operation in `specs/projects-jobs-core/projects-jobs-core_implementation.log` as backend groundwork completes.

### 2. Build client APIs for filtering, reorder, and archive
- Create `/src/app/api/client/projects/route.ts` that parses `status`, `limit`, `offset`, and `q` query params and calls the new `listClientProjects` service (pattern after `src/app/api/client/jobs/route.ts:1-20`).
- In `jobs.ts`, implement `listClientProjects` with filtering (`active` vs `completed` vs `archived`), search (`or` with `ilike` on title/description), pagination, and mapping to `projects`/`total` (mirror spec’s example snippet).
- Create `/src/server/services/project-reorder.ts` (reuse patterns from `invoices.ts` for duplicating invoices and `activity_logs` for logging) and expose `reorderProject(projectId, clientId)`.
- Add `/src/app/api/projects/[id]/reorder/route.ts` & `/src/app/api/projects/archive/route.ts` using the existing `requireClientWithId` guard, returning `ok()`/`handleError()` to keep consistent with other routes.
- Extend `jobs.ts` with bulk archive helpers that operate on `jobs` rows (similar to `bulkArchiveJobs` at lines 929-964) so the client archives & unarchives projects safely; capture activity logs.
- Add the transition guards inside `jobs.ts` (or a dedicated `updateJobStatus` helper) that check orientation locks and payment policy before moving to `PRINTING` or `COMPLETED` per spec; reuse `BadRequestError` for messaging (`orientation must be locked...`, `invoice must be paid`).
- Update `/src/app/api/client/dashboard/route.ts` to pull in project counters alongside existing stats (per spec snippet in section 3).

---
✅ CHECKPOINT: Steps 1-2 complete (Backend). Continue to step 3.
---

### 3. Build frontend components + navigation for project views
- Create/extend `src/components/client/client-home-cta.tsx` so the home page shows three CTA cards (New Project, Active Projects, Print Again) using the new counters (pending print/payment) and linking to `/client/projects/active` and `/client/projects/history`.
- Add `ProjectStatusBadge` and `ProjectCard` components (`src/components/projects/project-status-badge.tsx` and `/project-card.tsx`) that follow the `Badge`/`Card` patterns from `client-dashboard.tsx:47-200`, applying CSS-defined colors for each status.
- Add new views (`active-projects-view.tsx`, `print-again-view.tsx`, `completed-projects-view.tsx`, `archived-projects-view.tsx`) that rely on `useQuery`/`fetch` (per the existing `client/orders/page.tsx` pattern), include loading/empty states, and surface the `ProjectCard` + `ReorderButton` (in history) and bulk archive controls (in completed/archived lists).
- Hook each view into a page under `/src/app/(client)/client/projects/` (active/history/completed/archived) that exports the view wrapped with the usual header copy (breadcrumb, h1, description).
- Update navigation (`src/lib/navigation.ts:42-57`) to add a “Projects” section that links to the new routes (New Project, Active, Print Again, Archived). Ensure `ClientShell` continues to highlight the active route without additional code.
- Update `src/components/ui/status-badge.tsx` + `src/lib/design-system.ts` to cover the new client statuses so the badges (Active Projects tabs, `ProjectStatusBadge`, CTA badges) reuse the same tokens.
- Wire the `ClientDashboard` to pass the enriched stats to `ClientHomeCTA` (or render them inline) so active project counts and available credit show in the cards.
- Ensure empty states match the spec’s text (e.g., “No active projects”, “No completed projects”, “No archived projects”) with consistent CTAs and spacing.

### 4. Finalize reorder/archive UI & document E2E expectations
- Implement `ReorderButton` (`src/components/projects/reorder-button.tsx`) that calls the new reorder API, shows the “Reordering...” state, displays success/error toasts (reuse `sonner`), and reroutes to the draft quote.
- Build the completed and archived views’ bulk archive/restore controls: multi-select checkboxes, confirmation dialogs, toast on completion, call `/api/projects/archive` (POST with ids + action), and refresh the list (reuse React Query’s invalidation pattern from `job-board.tsx`).
- Add any reusable empty-state components (Copy text + CTA) to keep all screens consistent.
- Read `.claude/commands/test_e2e.md` and `.claude/commands/e2e/test_basic_query.md` so the new E2E test file matches the documented structure; create `.claude/commands/e2e/test_projects-jobs-core.md` describing manual validation steps for counters, active/history/archived views, reorder flow, and transition guards; include screenshot prompts per spec.
- Capture implementation notes (API endpoints, client guard behavior, any new indexes) in `specs/projects-jobs-core/projects-jobs-core_implementation.log` so testers know what was done.

---
✅ CHECKPOINT: Steps 3-4 complete (Frontend + E2E doc). Continue to step 5.
---

### 5. Run Validation Commands
- Execute the validation commands listed in the spec (e.g., `npm run build`, `npm test`, optionally `npm run dev`) and confirm the expected outputs (build success, all tests passing, manual validation instructions).  Document any manual checks (dashboard counters, active/history/archived views, reorder flow, transition guard responses) in the implementation log.
- Once automated and manual checks pass, rerun the relevant React Query or Supabase data flows to ensure pagination, filters, and reorder work as expected.

## Testing Strategy
### Unit Tests
- Status mapping utility: test every invoice/job combination so `mapToClientStatus` yields Pending Print, Pending Payment, or Completed (including edge cases like missing invoices).
- Transition guards: ensure PRINTING fails without orientation locked, COMPLETED fails when invoices remain unpaid under the `ON_PAYMENT` policy, and the guard passes when requirements are met.
- Reorder logic: assert that quote duplication copies line items/calculations, sets the `notes` value, and inserts a `QUOTE_REORDERED` activity log.
- API services: mock Supabase responses to confirm pagination/filtering/search/paging logic in `listClientProjects` and ensure archive/reorder endpoints respond with the expected shape.

### Edge Cases
- Empty portal (no jobs/invoices) renders the specified empty states and zero counters.
- Search queries or filters that match zero projects still render the correct empty message without throwing.
- Reordering a project whose invoice/mats have been deleted should fail gracefully with an informative message (per spec).
- Bulk archiving the same project twice, or mixing archived/unarchived items, should skip already archived items and surface a toast identifying how many were archived/unarchived.
- Rapid status changes: ensure React Query caches are invalidated after reorder/archive actions so the UI reflects current data.

## Validation Commands
```bash
# 1. TypeScript compilation
npm run build
# EXPECTED: Build succeeds with 0 errors

# 2. Run unit tests
npm test
# EXPECTED: All tests pass, including the new client status/reorder suites

# 3. (Optional) Start dev server for manual verification
npm run dev
# EXPECTED: Server starts without errors so we can hit /client/projects/active and history
```
Files to verify manually (per spec):
- Dashboard home: counters, available credit, CTA badges.
- `/client/projects/active`: tabs, filters, empty state, new project CTA.
- `/client/projects/history`: search, pagination, “Print Again” button.
- `/client/projects/archived` & completed: bulk archive/unarchive flows.
- Reorder flow: toast, redirect, quote content, activity log entry.
- Status transitions: PRINTING guard message, COMPLETED guard message.

**E2E Testing Strategy:**
- Read `.claude/commands/test_e2e.md` then the new `.claude/commands/e2e/test_projects-jobs-core.md` and follow its steps (use the provided client credentials). Capture screenshots for dashboard cards, active list, history view, reorder loading state, archive confirmation, and empty states as described in the spec.
- Use `test@tendercreator.dev / TestPass123!` for authentication, align with the existing flows described in the E2E doc, and reference absolute fixtures from `test_fixtures/` if needed.

# Implementation log created at:
# specs/projects-jobs-core/projects-jobs-core_implementation.log

## Definition of Done
- [ ] All acceptance criteria met
- [ ] All validation commands pass with expected output
- [ ] No regressions (existing tests still pass)
- [ ] Patterns followed (documented in Pattern Analysis)
- [ ] E2E test created and passing (recommended for project lifecycle)

## Notes
- Add an index on `(client_id, archived_at, status)` during any schema change to keep filters fast (per spec’s performance note).
- Cache the project counters for ~5 minutes if real-time data becomes expensive, aligning with the design-system pattern around context caching.
- Keep CTA badges dynamic (counts change as `projectCounters` updates) to emphasize the live status of client work.

## Research Documentation
None
