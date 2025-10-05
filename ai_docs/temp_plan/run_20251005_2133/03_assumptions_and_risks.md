# Assumptions & Risks

## Assumptions
- A1: "Posts" in the left pane refers to `ActivityLog` entries related to the current order (invoice).
- A2: Per-order messaging is desired in addition to the existing global user thread.
- A3: Clients should be able to view and download their attachments on an invoice; upload from the client invoice page is not required initially.
- A4: Stripe redirect (if available) remains the preferred client payment flow; otherwise present the invoice detail page with a pay link.
- A5: Quick Order is primarily a client feature; admin usage is rare but supported.
- A6: External slicer CLI may be absent; fallbacks are acceptable as long as UI communicates estimates.

Validation plan: Verify with stakeholders after first end-to-end smoke; adjust threading scope or UI labeling if A1–A3 differ.

## Risks & Mitigations
- R1: Access control regressions on invoice APIs.
  - Mitigation: Centralize guard helper; add manual smoke covering client cannot access other clients’ invoices.
- R2: Prisma migration on `UserMessage` breaks admin threads.
  - Mitigation: `invoiceId` is optional; existing admin endpoints remain unchanged.
- R3: Slicer runtime variance (timeouts, missing binary).
  - Mitigation: Clear fallback states; configurable timeouts; small concurrency; no hard failures.
- R4: UI duplication and drift.
  - Mitigation: Introduce shared conversation and thread panel components; replace usages.
- R5: Scope creep adding quote/job threads.
  - Mitigation: Keep Option B (Conversations) in reserve; ship minimal Option A now.
