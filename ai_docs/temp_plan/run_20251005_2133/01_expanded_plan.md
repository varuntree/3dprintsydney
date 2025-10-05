# Expanded Implementation Plan

This expands the approved plan into concrete parts and subparts with clear outcomes and touch-points in the repo.

## Part 1 — Data Model: Per‑Invoice Messaging (minimal extension)
- 1.1 Add `invoiceId Int?` column to `UserMessage` in `prisma/schema.prisma`.
- 1.2 Add composite indexes: `(userId, invoiceId, createdAt)` and `(invoiceId, createdAt)`.
- 1.3 Generate migration and Prisma client.
- 1.4 Backfill not required (existing rows remain global threads with `invoiceId = null`).

## Part 2 — Security: Invoice Access Guards
- 2.1 Add helper `requireInvoiceAccess(req, invoiceId)` that:
  - ADMIN → allow.
  - CLIENT → fetch invoice; allow only if `invoice.clientId === user.clientId`.
- 2.2 Apply guard to `/api/invoices/[id]` (GET/PUT/DELETE).
- 2.3 Apply guard to critical invoice subroutes used by clients: attachments (list/get/upload/delete), payments (list/add/delete), mark‑paid/mark‑unpaid, stripe‑session (read/generate).

## Part 3 — Client Invoice Detail Route & View
- 3.1 New route: `src/app/client/orders/[id]/page.tsx` (server component, auth‑gated for CLIENT).
- 3.2 Read‑only invoice view: shows header, amounts, due/paid status, attachments (download‑only), Stripe pay link (if present).
- 3.3 Right‑side panel hosts thread UI (Part 5) and activity (Part 6).

## Part 4 — Client Navigations & Redirects
- 4.1 Change client Orders list links to `/client/orders/[id]` (from `/invoices/[id]`).
- 4.2 Quick Order redirect: after checkout, if role=CLIENT → `/client/orders/[id]`; if ADMIN → `/invoices/[id]`; if Stripe URL returned → navigate to it.

## Part 5 — Messages: Shared UI + API Extension
- 5.1 API: Extend `/api/messages` GET to accept `?invoiceId=…` (optional) and scope results accordingly.
- 5.2 API: Extend `/api/messages` POST to accept `{ content, invoiceId? }` and attach to the order thread when provided. Enforce permissions via Part 2 guards.
- 5.3 UI components:
  - `src/components/messages/conversation.tsx` — right‑pane boxy chat using design tokens, virtualized list optional (not required initially).
  - `src/components/messages/thread-panel.tsx` — left‑pane tabs: “Messages” (the same conversation summarized) and “Activity” (from Part 6); provides thread selection if needed later.
- 5.4 Replace current ad‑hoc message grids in client/admin pages to use the shared components.

## Part 6 — Activity (“Posts”) for Orders
- 6.1 New API: `/api/invoices/[id]/activity` with paging; returns `ActivityLog` rows by `invoiceId` (permission checked).
- 6.2 Display the activity list in the left panel tab; boxy cards consistent with design system.

## Part 7 — Quick Order UI Polishing (targeted)
- 7.1 Clear progress states: Upload → Slice → Price → Checkout (button disabled states, inline helpers).
- 7.2 Fallback badge when slicer metrics are estimates; error banners for slice failures.
- 7.3 Ensure address + shipping UX is consistent with design tokens.

## Part 8 — Slicer Robustness (UX + config only)
- 8.1 Surface warnings when `SLICER_BIN` missing (using fallback) or `SLICER_DISABLE=1`.
- 8.2 Respect `SLICER_CONCURRENCY`; show “queued” state when busy.

## Part 9 — Documentation
- 9.1 Update `ai_docs/DEVELOPER_DOCUMENTATION.md` (auth model, client/admin separation, quick order, slicer envs).
- 9.2 Update `.env.example` with slicer env vars.

## Part 10 — Legacy Cleanup
- 10.1 Remove ad‑hoc message UI code paths in:
  - `src/app/client/messages/page.tsx`
  - `src/app/admin/messages/page.tsx`
  - `src/app/admin/users/[id]/page.tsx` (conversation section)
- 10.2 Ensure all client links to invoices point to `/client/orders/[id]`.

