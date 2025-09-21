# 3D Print Sydney — Merged Product Specification

## 1. Vision & Context

- Build a local-only internal operations tool for a sole proprietor running a 3D printing business.
- Provide end-to-end workflow from quotation through invoicing, payments, job scheduling, printer queue management, client records, and reporting.
- Single tenant, single user, no authentication; prioritize simplicity, reliability, and low maintenance.
- Runs locally with one command; data stored in local SQLite DB plus file directories under `data/`.

## 2. Target Users

- **Owner/Operator** (primary user): prepares quotes and invoices, manages payments, monitors and updates print jobs, maintains client info, reviews performance metrics.
- **Technician (optional)**: may update print job statuses if delegated (still using same UI). No distinct permission model is required.

## 3. Core Domains & Entities

- **Settings**: Business identity, tax rate, numbering prefixes, payment terms, bank details, shipping options, calculator defaults, job creation policy, Stripe keys (optional).
- **Number Sequences**: Maintains monotonically increasing values for quotes/invoices numbering.
- **Clients**: Contact details, ABN, addresses, tags, payment terms, internal notes, activity timeline.
- **Materials**: Catalog of materials with cost per gram, color, category, notes.
- **Product Templates**: Reusable line items (fixed price or calculator-driven) referencing materials.
- **Quotes** & **Quote Items**: Draft offers containing line items, discounts, shipping, tax; states include draft/pending/accepted/declined/converted.
- **Invoices** & **Invoice Items**: Billable documents with numbering, line items, payment status, balance tracking, conversion linkage to quotes.
- **Payments**: Records of received payments (manual, Stripe, other) with metadata and processor IDs.
- **Jobs**: Auto-created work orders tied to invoices, assigned to printers, prioritized/queued with lifecycle status and timestamps.
- **Printers**: Catalog of printers including status and notes, with per-printer queues.
- **Attachments**: Internal files tied to invoices (size up to ~200MB) with preview metadata.
- **Activity Log**: Audit trail for key actions (quote/invoice creation, payments, job updates, file uploads, settings changes).

## 4. Functional Requirements

### 4.1 Settings & Configuration

- Wizardless but clear settings screen grouped by tabs: Business Identity, Tax & Numbering, Payments, Shipping, Calculator, Job Policies, Integrations.
- Numbering prefixes configurable separately for quotes and invoices; system enforces uniqueness.
- Calculator defaults: hourly rate, setup fee, material multipliers, quality/infill adjustments.
- Job creation policy toggles between “on payment” and “on invoice creation (credit terms)”.
- Stripe keys optional; when absent, Stripe-related UI should degrade gracefully.
- Clearly communicate that all data lives under the `data/` folder so operators can copy it manually if desired.

### 4.2 Catalog Management

- Materials CRUD table with inline filter/search, detail drawer for editing.
- Product templates CRUD with pricing type switch, supports linking to materials and storing calculator overrides.
- Printers CRUD with queue overview metrics (jobs count, total queued hours), status toggle, notes.

### 4.3 Client Management

- Clients list with quick stats (#quotes, #invoices, outstanding balance).
- Detail view containing editable contact info, payment terms, internal notes, timeline of related activities (quotes, invoices, jobs, payments).
- Ability to add ad-hoc activity notes tied to client.

### 4.4 Quotes Workflow

- Create quote from scratch or duplicating existing; add line items via product template picker or manual entry.
- Line item fields: name, description, quantity, unit, unit price, per-line discount (percent/fixed).
- Global discount (percent/fixed), shipping selection, tax rate (override default), automatic subtotal/tax/total calculation (clamped ≥ 0).
- Status transitions: Draft → Pending → Accepted/Declined; conversion to invoice sets status “Converted”.
- Generate PDF with business details, client details, line items, terms; store generated PDF in `data/pdfs` (regenerate on demand).
- Convert or duplicate quote to invoice preserving items and metadata; allow revert invoice back to quote.

### 4.5 Invoices & Payments

- Auto-generate invoice number using configured prefix and sequence.
- Editable fields similar to quotes plus payment terms, internal notes.
- PDF generation with watermark for PAID status.
- Manual payment entry: capture amount, method, reference, processor ID, notes, paid date.
- Stripe integration (when configured): create checkout session, open external payment page, handle webhook or manual confirmation to mark paid.
- Mark as unpaid / delete payment with confirmation; recalc balance.
- Revert invoice to quote (if unpaid) while preserving history.

### 4.6 Attachments

- Upload file(s) to invoice (drag/drop or button). Store under `data/files/<invoiceId>/` with metadata in DB.
- Preview images/PDF inline (generate thumbnail via Sharp for images; embed PDF viewer) and allow download/delete.
- Enforce size and mime-type whitelist; show friendly errors.

### 4.7 Jobs & Queue

- Auto-create job when invoice is marked paid (or immediately if policy = on invoice for specific payment terms).
- Job fields: title (default from invoice/client), description, priority (normal/fast-track/urgent), status (queued/printing/paused/completed/cancelled), est hours, actual hours, printer assignment.
- Queue board view grouped by printer, showing draggable cards; unassigned jobs column.
- Drag-and-drop reorder updates queue positions; moving between printers allowed.
- Status changes update timestamps (start, pause, complete) automatically; allow manual adjustments via dialog if needed.
- Activity log entries for transitions.

### 4.8 Dashboard & Reporting

- Dashboard cards: total revenue (period filter), outstanding invoices, quotes awaiting action, jobs summary, printers status, recent activity feed.
- Graph of monthly revenue trend (12 months) and job throughput (completed per week).
- Light reporting/export interface: CSV export for invoices, payments, jobs; allow selecting date range.

### 4.9 Activity Log & Notifications

- Record key events with timestamp, actor (“System” or “Operator”), entity refs.
- Surface recent activity on dashboard and entity detail pages.
- Use toasts for confirmations/errors; ensure logs avoid sensitive data.

### 4.10 File & Data Management

- Data directories created automatically; ensure relative paths from project root.
- Document that copying the `data/` folder is sufficient for manual backups/restores.

## 5. Non-Functional Requirements

- One-command startup: `npm install` then `npm run dev` (runs pending migrations automatically or instruct user to run `prisma migrate deploy`).
- Works offline after dependencies installed; only Stripe interactions require internet.
- Responsive layout for desktop & large tablet; basic mobile support optional but ensure components stack gracefully.
- UI style: monochrome with glass effects, consistent radius scale (8/12/16), 8-pt spacing grid, accessible focus states, minimal motion.
- Logging: server-side route handlers log structured events for payments, job transitions, file uploads.
- Error handling: user-friendly toast/dialog with remediation steps; server errors return JSON with `code`, `message`, `details`.

## 6. Acceptance Checklist & Progress

### Current Status Overview

| Area                                  | Status         | Notes                                                                                 |
| ------------------------------------- | -------------- | ------------------------------------------------------------------------------------- |
| Local setup & scripts                 | ✅ Done        | `npm install` + `npm run dev` working; quality gates scripted.                        |
| Settings                              | ✅ Done        | All sections implemented with persistence and logging.                                |
| Catalog (materials/products/printers) | ✅ Done        | CRUD + calculators live; printer metrics will reflect jobs once implemented.          |
| Clients                               | ✅ Done        | Directory, detail timeline, notes, activity feed.                                     |
| Quotes                                | ✅ Done        | Editor, status actions, duplicate/convert, PDFs.                                      |
| Invoices                              | ✅ Complete    | Editor, payments (manual/Stripe), attachments, PDF export, quick status shortcuts.    |
| Payments (Stripe)                     | ✅ Complete    | Checkout session, webhook handler, manual overrides, activity logging.               |
| Attachments                           | ✅ Done        | Upload/download/delete with activity logging.                                         |
| Jobs & queue                          | ✅ Complete    | Auto-creation from policies, printer board with drag/drop, metrics, status actions.   |
| Dashboard & reporting                 | ✅ Complete    | Metrics KPIs, charts, activity feed, CSV export endpoints & UI.                      |
| Documentation & smoke tests           | 🚧 In progress | Build docs tracking progress; README/OPERATIONS/smoke plan to be finalized.           |

### Checklist Detail

1. App installs and runs locally with documented one-shot setup; data directories auto-created. **⚠️ README refresh underway.**
2. Settings screen covers all configuration groups and persists to DB. **✅**
3. Materials, product templates, printers management screens fully functional. **✅**
4. Quotes lifecycle (create/edit, statuses, PDF generation, conversion to invoice) implemented. **✅**
5. Invoices lifecycle with numbering, PDF, manual and Stripe payments, revert to quote, balance tracking. **✅**
6. Attachments upload/preview/download/delete with size/type validation. **✅**
7. Jobs auto-creation and queue management with drag-and-drop, statuses, timestamps. **✅**
8. Dashboard shows accurate metrics, charts, outstanding lists, and activity feed. **✅**
9. Clients pages show summary and timeline; CRUD works. **✅**
10. CSV export functionality delivered and accessible. **✅**
11. Activity log visible and populated across relevant actions. **✅ Base events logged; expand with remaining slices.**
12. Quality gates (lint, format, type-check, build, audit) pass. **✅ Ongoing; latest runs clean.**
13. Manual smoke checklist documented and all pathways validated. **⏳ To complete post-feature build.**
14. Documentation (README, README_RUN, OPERATIONS, build docs) complete and up-to-date. **🚧 Updating now.**
15. No unused code, legacy assets, or TODO markers remain. **🚧 Final cleanup pass after remaining slices.**
