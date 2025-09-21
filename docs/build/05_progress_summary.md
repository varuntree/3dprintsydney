# Progress Summary — 3D Print Sydney

_Last updated: 2025-09-20 12:05 UTC_

## Completed Slices
- **Foundation & Tooling:** Next.js + shadcn scaffolding, Prisma migrations/seeding, logging utilities, app shell, layout/navigation, Query providers.
- **Settings:** Multi-tab configuration UI (business identity, numbering, tax, shipping, calculator defaults, job policy, Stripe keys), activity logging, persisted sequences.
- **Catalog:** Materials, product templates (fixed/calculated pricing), and printers with CRUD APIs, calculator integration, and UI drawers.
- **Clients:** Directory view, stats, detail timeline, internal notes, linked documents, activity feed.
- **Quotes:** CRUD APIs, totals calculations, editor with calculator, status transitions, duplicate, convert to invoice, PDF export, REST endpoints and React views.
- **Invoices:** Editor mirroring quotes with template/calculator support, manual and Stripe payments, attachments (upload/download/delete), PDF export, quick status toggles, revert to quote.
- **Attachments & PDFs:** Local storage service, Puppeteer HTML templates for quotes/invoices, download streaming endpoints.
- **Jobs & Queue:** Auto-create per settings, queue APIs, drag/drop board with printer metrics, status transitions, inline editing.
- **Dashboard & Reporting:** Metrics KPIs, revenue trend, activity feed, outstanding invoices, printer load overview, CSV export endpoints + UI.
- **Quality Gates:** `lint`, `format`, `typecheck`, `build`, `audit` passing as of the latest run.
- **Documentation & QA:** README/README_RUN finalized with Stripe + data guidance, scripted smoke test documented (`node --import tsx scripts/smoke.ts`).

## In Progress
- _None_ – hardening pass completed.

## Not Started / Upcoming
- Capture release notes once packaging work begins.

## Next Recommended Steps
- Prep deployment packaging or release checklist when ready to ship.

Keeping this file up to date ensures we can resume quickly if the conversation context resets.
