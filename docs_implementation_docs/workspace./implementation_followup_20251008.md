# Implementation Follow-up Tasks — October 8, 2025

This document consolidates (a) the features already shipped during the current implementation cycle and (b) the outstanding work called out from the latest review plus the original meeting notes. Use it as the single checklist going forward.

> Current run tracker: see `progress_plan_20251008.md` for status, validation steps, and QA checklist (linked from this workspace on 2025-10-08).

## ✅ Completed Items
- **Client payment terms pipeline** — Settings now manage COD/7/14/30-day options, client forms persist the selection, invoices derive due dates/text, and PDFs show the correct terms.
- **Quote acceptance flow** — “Accept” converts directly to an invoice, “Decline” marks the quote as lost without deleting it, and list pages default to newest-first.
- **Shipping estimator foundation** — Location-aware shipping regions (state/postcode) drive Quick Order, quotes, and invoices with default region fallback and logging.
- **Job status visibility & notifications** — Admin board actions use the new status ladder, client invoices display progress timelines, and clients can opt-in/out of status emails (toggle default off).
- **Client dashboard CTA refresh** — “Quick Order” and “View All Orders” cards now appear beneath the welcome header with primary/secondary styling, matching transcript guidance.
- **Quick Order redesign** — Multi-file uploads support removal, outlined uploader icon, materials info link, refreshed layout, and animated pricing button while preserving attachments.
- **Stripe visibility improvements** — Checkout API revalidates admin/client lists, client API exposes Stripe metadata, and orders list/detail show a reusable pay button that refreshes Stripe sessions.
- **PDF export simplification** — Single “Generate PDF” action replaces the style dropdown in invoice/quote views.
- **Client picker modal** — Invoice and quote editors use a searchable modal instead of long dropdowns.
- **Messaging loader polish** — Admin messages sidebar shows an instant loader instead of a brief “No users” flash.
- **Notification copy alignment** — Client portal copy clarifies dependency on email notifications being enabled.
- **Documentation & tracking** — Workspace docs (including this file and `update.md`) reference the latest progress plan and QA expectations.

## 🔄 Outstanding — Client Portal
*None for this run (all tracked portal items completed). Future feedback will be captured in the progress plan.*

## 🔄 Outstanding — Admin Console
*None for this run (latest action items delivered).* 

## 🔄 Outstanding — Cross-cutting Items from Transcript
1. **Invoice & quote PDFs**: Ensure legacy layout parity (eye-level totals, Google review link, “PAID” badge) remains in place alongside the single “Generate PDF” entry.
2. **Product catalog flexibility**: Confirm admins can quickly add reusable service products (e.g., 3D modelling hourly items) for manual line insertion.
3. **Future finishing options (deferred)**: Keep a placeholder in the Quick Order redesign for adding finishing/surface treatment choices later.
4. **Portal sign-up journey**: Maintain the minimal email+password flow and ensure the quick-order button on the marketing site routes cleanly into the portal login.

## 📝 Notes & Next Steps
- Manual smoke still pending: client toggle persistence, quick order multi-file UX, and end-to-end order reflection on the admin side (tracked in `progress_plan_20251008.md`).
- When the remaining cross-cutting items are addressed, update this document, `progress_plan_20251008.md`, and `update.md` so future sessions know the precise cutover point.

