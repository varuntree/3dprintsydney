# Feature Blueprint

This blueprint lists the essential features grouped by area. It describes each feature’s purpose, essential behaviors, and key dependencies. It intentionally avoids UI mockups and low-level schema details.

## 1) Quotes

1.1 Create Quote

- Purpose: Prepare priced offers quickly, consistently.
- Behaviors: Add line items from product templates or free‑form. Support quantities, units, per‑line discounts (fixed/percent), global discount (fixed/percent), shipping selection/cost, tax rate. Auto-calc totals. Persist draft/quote states.
- Dependencies: Products, Settings (tax, numbering), Materials (for 3D print calculator), Clients.

  1.2 Quote Numbering and PDF

- Purpose: Issue professional documents and maintain traceability.
- Behaviors: Generate unique quote numbers with prefix; produce a clean PDF including business details, client details, items, taxes, totals, terms.
- Dependencies: Settings (business identity, numbering), PDF service.

  1.3 Convert or Generate Invoice from Quote

- Purpose: Turn accepted work into billable documents.
- Behaviors: Convert (changes status to “converted”, creates linked invoice) or generate an invoice copy while keeping the original quote active. Preserve items, discounts, and notes.
- Dependencies: Invoices, Settings, Clients.

## 2) Invoices

2.1 Create/Edit Invoice

- Purpose: Bill clients accurately with minimal friction.
- Behaviors: Same pricing model as quotes. Track status: pending, paid, overdue. Allow editing unless constraints apply (e.g., strong warning on editing paid invoices). Compute totals with shipping, discount, and tax.
- Dependencies: Clients, Settings, Products, Materials (if calculator used).

  2.2 Payment Handling (Stripe + Bank Transfer)

- Purpose: Get paid and reflect accurate status automatically.
- Behaviors: Create Stripe checkout session or store bank transfer details on invoice. Mark as paid automatically via webhook/sync or manually with date/method/reference. Persist payment metadata (method, date, reference, processor IDs).
- Dependencies: Stripe integration, Webhooks/Background sync, Settings.

  2.3 Internal Files and Notes

- Purpose: Keep relevant artifacts attached to the work.
- Behaviors: Upload internal files (images, PDFs, CAD, ZIP, etc.) to the invoice; preview common types (image/PDF), download/delete. Maintain internal rich-text notes separate from customer-facing fields.
- Dependencies: File storage, Access control, Virus/type validation (basic).

  2.4 Revert to Quote

- Purpose: Allow flexible editing when an invoice needs revision before payment.
- Behaviors: Convert an invoice back to a quote (copy/move essential data, preserve history linkage).
- Dependencies: Quotes, Audit trail.

  2.5 Invoice Numbering and PDF

- Purpose: Produce auditable, branded invoices.
- Behaviors: Unique numbering with prefix; PDF including payment terms, status (e.g., PAID), items/totals, and bank details.
- Dependencies: Settings, PDF service.

## 3) Jobs & Print Queue

3.1 Job Creation from Invoice

- Purpose: Ensure paid work is scheduled without manual steps.
- Behaviors: Auto-create a job when invoice is paid. For clients with credit terms, optionally create job upon invoice creation (configurable policy). Deduplicate if job already exists for invoice.
- Dependencies: Invoices, Clients (payment terms), Settings.

  3.2 Job Fields and Lifecycle

- Purpose: Track print work through to completion.
- Behaviors: Job includes reference to invoice (and quote if applicable), client, title/description, printer assignment (optional), queue position, priority (normal/fast_track/urgent), status (queued/printing/paused/completed/cancelled), estimated hours and actual timestamps.
- Dependencies: Printers catalog, Clock/time service (for timestamps).

  3.3 Queue Management

- Purpose: Allow operators to order work and manage capacity.
- Behaviors: Per‑printer queues; drag/drop reorder; update queue positions; move job between printers; calculate estimated start/finish times based on position/estimates; basic statistics per printer (job count, total hours).
- Dependencies: Printers, Jobs store.

  3.4 Status Updates

- Purpose: Provide simple “start/stop/complete” flow.
- Behaviors: Transition job status with minimal input; set actual start/completion timestamps automatically; optional notes for transitions.
- Dependencies: Jobs store.

## 4) Printers

4.1 Printer Catalog

- Purpose: Maintain a list of printers and availability.
- Behaviors: Add/edit/delete printers with name/model/build volume; status (active/maintenance/offline); show queue metrics per printer.
- Dependencies: Jobs (for queue metrics).

## 5) Products & Materials

5.1 Product Templates

- Purpose: Speed up consistent item creation.
- Behaviors: Create templates with name/description/unit/price. Support two pricing types: fixed price and calculated (3D printing). Allow custom fields for per-line notes.
- Dependencies: Settings.

  5.2 3D Printing Calculator

- Purpose: Standardize pricing inputs without slicer dependency.
- Behaviors: Given time, filament weight, quality (layer height), infill %, and material, compute a total price based on configurable rules (hourly base, multipliers, material cost per gram, minimum setup fee). Return a concise breakdown (labor/material/setup).
- Dependencies: Materials catalog, Pricing config in settings.

  5.3 Materials Catalog

- Purpose: Centralize material cost and metadata.
- Behaviors: Manage materials with name, cost per gram, and optional labeling (color/category). Used by the calculator and product templates.
- Dependencies: None.

## 6) Clients

6.1 Client Records

- Purpose: Keep essential contact and terms information.
- Behaviors: Create/edit clients with name, contact info, optional company/ABN, address, tags, payment terms (e.g., COD/14 days/30 days), and internal notes. View their invoices, quotes, totals, and a simple timeline of activity.
- Dependencies: Quotes, Invoices, Jobs.

## 7) Dashboard & Reporting

7.1 Dashboard

- Purpose: Quick situational awareness.
- Behaviors: Show totals (clients, invoices, revenue, quotes), outstanding invoices, basic jobs metrics (completed, queued/unassigned), recent activity (payments, new invoices/quotes, job completions), and monthly revenue trend.
- Dependencies: Quotes, Invoices, Jobs, Clients.

  7.2 Exports (Later)

- Purpose: Support finance/admin processes.
- Behaviors: Export CSV for invoices, payments, jobs (basic columns). Optional summary reports (monthly revenue, job throughput).
- Dependencies: Data access layer.

## 8) Settings

8.1 Business Identity & Billing Config

- Purpose: Central place for org‑wide settings.
- Behaviors: Business name/address/contact, ABN, tax rate, numbering prefixes for quotes/invoices, bank details for transfers, shipping options, default payment terms, and calculator parameters (hourly rate, setup fee, material defaults).
- Dependencies: Quotes, Invoices, PDF, Calculator, Numbering.

## 9) Files & Storage

9.1 Internal Attachments

- Purpose: Keep artifacts tied to the relevant invoice.
- Behaviors: Upload, list, preview (image/PDF), download, delete; store metadata (original name, size, uploaded date, type). Files are internal only (no public links).
- Dependencies: File storage backend, access control.

## 10) Security & Access (Right‑Sized for Internal Tool)

10.1 Authentication

- Purpose: Ensure only authorized staff use the tool.
- Behaviors: Simple admin/operator accounts; session‑based login (SSO optional later). Password reset/admin invite flow.

  10.2 Authorization

- Purpose: Prevent accidental misuse.
- Behaviors: Light role model: admin (all), operator (jobs/quotes/invoices except destructive settings). Logging of critical events (payments, deletions, conversions).

## 11) Reliability & Ops (Essentials Only)

11.1 Data Residence & Manual Copy

- Purpose: Ensure operators know where data lives.
- Behaviors: All state persists under the `data/` folder (SQLite DB, PDFs, attachments). Operators can copy this folder manually if they want an offline backup.

  11.2 Observability (Lean)

- Purpose: Debug production issues quickly.
- Behaviors: Centralized logs, basic error alerts; capture webhook failures and retry states.

## 12) Migration Considerations (From Current State)

- Import existing clients, quotes, invoices, printers, products, materials, and jobs from JSON files into the new store.
- Normalize document numbers and preserve created/paid dates.
- Re‑link jobs to invoices where invoice ID or document number matches.
- For internal files, preserve per‑invoice folder organization and metadata.

## 13) Nice‑to‑Haves (Not Required for First Cut)

- Client‑facing payment page branding tweak (already covered by Stripe Checkout).
- Email send of PDFs with one click (templated message).
- Job templates (common setups with default estimates).
- Basic SLA/ETA communication.

---

## Cross‑Feature Rules (Summary)

- Numbering: quotes and invoices use distinct prefixes and unique sequences.
- Taxes: one configurable default tax; per‑document override allowed.
- Discounts: line‑level and global; negative totals are clamped to zero.
- Payments: invoice becomes “paid” by webhook/sync/manual; job creation policy configurable per payment terms.
- Files: internal‑only; enforce max size/type list and preview for common formats.
- Statuses: keep small, explicit state machines (quotes: pending/accepted/declined/converted; invoices: pending/paid/overdue; jobs: queued/printing/paused/completed/cancelled).
