# Expanded Implementation Plan — run_20251008_2105

## Part A — Workspace Bootstrap & Orientation
- A1. Resolve PLAN_PATH, record repo summary, and set up run folder artifacts (progress tracker skeleton, checklists, assumptions file).
- A2. Perform quick orientation sweep to reconfirm target modules and note legacy code earmarked for replacement.

## Part B — Progress Tracking & Documentation Prep
- B1. Draft `progress_plan_20251008.md` in `docs_implementation_docs/workspace.` reflecting outstanding tasks, owners (self), acceptance notes, and validation steps.
- B2. Update `implementation_followup_20251008.md` to link/ reference the new progress plan and reflect any assumptions.

## Part C — Client Portal CTA & Quick Order UX
- C1. Reposition “Quick Order” and “View All Orders” components at the top of `client-dashboard.tsx`; ensure styling matches transcript (quick order primary, view orders secondary).
- C2. Redesign quick order upload experience:
  - Introduce removable multi-file list with red “X”, auto-expand new entries.
  - Replace upload icon with outlined variant and add material info link.
  - Refresh layout with clearer sections, responsive behavior, and per-file setting sync on removal.
  - Implement animated, prominent blue “Calculate Price” button and loading effect.
- C3. Verify Quick Order state persistence and invoice attachment behavior remain intact.

## Part D — Data Propagation & Client Orders Payments
- D1. Ensure client-created invoices immediately surface on admin dashboards by invoking cache revalidation (or equivalent) post-checkout.
- D2. Enhance `/api/client/invoices` payload to expose Stripe link eligibility and status metadata.
- D3. Update client orders list/detail views to show status badges and a primary “Pay Online” button that refreshes Stripe Checkout sessions when necessary.

## Part E — PDF Actions & Client Selection UX
- E1. Replace `PDFStyleDropdown` with a simplified single-action PDF button across invoice/quote views; remove obsolete styles code.
- E2. Implement modal-based client picker for invoice and quote editors (recent-first, searchable) and retire long dropdowns.

## Part F — Messaging Loader & Notification UX
- F1. Introduce proper loading skeleton/indicator in `Conversation` and admin messages sidebar to eliminate the “no users” flash.
- F2. Confirm client notification toggle copy aligns with `enableEmailSend`; adjust helper text or conditional states as required.

## Part G — Docs, Quality Gates, and Review
- G1. Update documentation (`implementation_followup_20251008.md`, README/other touched docs) summarizing completed work and guidance for QA.
- G2. Run quality gates (lint, typecheck, build, dep audit) and document manual smoke results.
- G3. Complete review checklist, finalize `TRACKING.md` (including Done section), and persist `.agent_state.json`.
