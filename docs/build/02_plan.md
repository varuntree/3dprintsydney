# Build Plan — 3D Print Sydney

## Principles

- Deliver vertical slices that cover data → logic → UI for each domain.
- After each slice, update status files and ensure no dead code remains.
- Maintain glassy monochrome UI consistently.

## Milestones & Slices

1. **Foundation & Tooling** – ✅ Completed
   - Tailwind theme tokens, shadcn primitives, layout shell, navigation, Prisma migrations, seeds, logging utilities.
2. **Settings Slice** – ✅ Completed
   - `GET/PUT /api/settings`, calculator + numbering config, shipping options, job policy, Stripe keys, activity logging.
3. **Catalog Slice (Materials, Products, Printers)** – ✅ Completed (metrics refresh pending jobs integration)
   - CRUD services/APIs, React tables & drawers, calculator integration, printer summaries.
4. **Client Slice** – ✅ Completed
   - Directory, detail timeline, notes, activity feed, aggregate stats.
5. **Quote Slice** – ✅ Completed (further polish: job auto-creation once jobs slice lands)
   - CRUD APIs, totals, status transitions, duplicate/convert, calculator, PDF generation.
6. **Invoice Slice** – ✅ Completed
   - List/editor, manual payments, balance recompute, attachments, PDF export, Stripe checkout hooks, quick mark paid/unpaid, revert to quote.
7. **Stripe & Payment Integration** – ✅ Completed
   - Stripe checkout session, webhook handling, quick mark paid/unpaid, revert to quote.
8. **Attachments Slice** – ✅ Completed (quotes invoices share storage service)
   - Local file storage, upload/download/delete, activity logging, UI grids.
9. **Jobs & Queue Slice** – ✅ Completed
   - Auto-create jobs per settings, queue ordering APIs, drag/drop board UI, printer metrics, status transitions.
10. **Dashboard & Reporting Slice** – ✅ Completed
    - Metrics cards, charts, activity feed integration, CSV export endpoints and UI controls.
11. **Hardening & Cleanup** – ⏳ Final pass
    - Run full quality gates (lint/typecheck/build/audit done so far), smoke checklist, remove dead assets, finalize docs.

## Replace & Clean Checklist

- Remove `app/page.tsx` demo page replaced by dashboard.
- Remove sample global styles once theme established.
- Delete default favicon assets as replaced with monochrome version.
- Ensure no leftover unused shadcn components (only include needed ones).
- Clear sample API routes/config from Next scaffold if unused.
- Remove placeholder test data after seeding real examples.

## Dependencies & Tools

- Additional packages to install during slices as needed: `@dnd-kit/core`, `@dnd-kit/sortable`, `@headlessui/react` (if required). Remove if unused.

## Validation Strategy

- After each slice, run `prisma migrate dev`, `npm run lint`, `npm run typecheck` to catch regressions early.
- Update `/status/state.json` with current milestone and pending tasks.
- Append to `/status/progress.md` heartbeat 10–15 min intervals.
