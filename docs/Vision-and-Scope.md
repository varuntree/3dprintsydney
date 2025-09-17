# Vision and Scope

## Purpose
An internal tool to run a small‑to‑mid 3D printing business end‑to‑end: from quoting to invoicing to job queue management, with basic client tracking and lightweight reporting. It optimizes owner/operator workflows, reduces manual reconciliation, and provides a reliable single source of truth.

## Goals (What Success Looks Like)
- Reduce quoting/invoicing time and mistakes; produce consistent documents fast.
- Automatically move paid work into a clear, actionable print queue.
- Track job progress across printers with minimal clicks and sane defaults.
- Keep client context (notes, history) close to quotes/invoices/jobs.
- Simple, dependable payment flow (Stripe/bank transfer) with clear status.
- Exportable records and PDFs that look professional and are auditable.

## Primary Users and Context
- Owner/Operator: creates quotes/invoices, manages the queue, updates statuses.
- Technician (optional): operates printers, updates job statuses/notes.
- Admin/Finance (optional): reconciles payments, reviews reports.

This is not a public product. No customer portal is required initially. Admins access the tool on desktop; mobile use is a nice‑to‑have.

## Scope (In)
- Quoting and invoicing, with taxes, discounts, shipping, and PDF generation.
- Payment integration (Stripe) and bank transfer support; mark‑as‑paid flow.
- Auto‑creation of jobs from paid invoices (configurable for credit terms).
- Job queue: per‑printer queues, priorities, reordering, status updates.
- Basic client records with notes and activity history.
- Product templates and materials catalog for 3D print pricing calculator.
- File attachments on invoices (internal only) with previews and downloads.
- Dashboard: high‑level metrics and recent activity.
- Settings: business identity, tax, bank details, numbering prefixes, shipping.

## Scope (Out / Later)
- Public client portal, online approvals, or customer self‑service.
- Deep accounting integration (Xero/QuickBooks) beyond CSV/exports.
- Inventory management, full CRM, or marketing automation.
- Real‑time printer telemetry or slicer integration.
- Multi‑tenant architecture; this is single‑tenant for now.
- Granular permissions/RBAC beyond simple admin/operator roles.

## Operating Principles
- Opinionated defaults; optimize for the owner’s common flows.
- Minimal friction: few screens, low data entry, strong presets.
- Reliability over novelty; predictable behavior and clear error states.
- Privacy/security: keep customer/payment data safe and access‑controlled.

## Non‑Goals
- Pixel‑perfect public UI design; internal tool first.
- Over‑engineering: avoid microservices unless there’s a clear win.

## Constraints and Assumptions
- Single organization, small concurrent usage.
- Internet access available during operations (for Stripe, optional).
- File storage must handle images/CAD/PDF up to a practical limit (e.g., 50–200MB each) with previews for common types.

## Success Metrics (Internal)
- Time to issue a quote/invoice.
- Time from payment to job creation/queueing.
- Number of jobs completed per week per printer.
- Invoice collection rate and outstanding aging visibility.

---

## High‑Level Capabilities (One‑Liners)
- Quotes: build from products, apply discounts/tax/shipping, produce PDF, convert to invoice or generate an invoice copy.
- Invoices: edit, track status, take payment (Stripe/bank), attach internal files, revert to quote when needed.
- Jobs: auto‑spawn from invoices, assign to printers, reorder, update status, and track estimated/actual times.
- Printers: simple catalog with status, per‑printer queue and basic capacity notes.
- Clients: central store with notes, payment terms, and document history.
- Config: business identity, tax, payment terms, numbering, shipping options.
- Dashboard: metrics and activity feed; light reporting (CSV export later).
