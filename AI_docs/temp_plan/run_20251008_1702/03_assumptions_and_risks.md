# Assumptions & Risks

## Assumptions
1. **Shipping tier granularity** — Without stakeholder input, assume Australian state-based tiers with explicit surcharge overrides. Validation: document assumption in update.md and design estimator to allow future refinement.
2. **Job status taxonomy** — Assume finalized set: PRE_PROCESSING, IN_QUEUE, PRINTING, PRINTING_COMPLETE, POST_PROCESSING, PACKAGING, OUT_FOR_DELIVERY, CANCELLED. Validation: confirm with owner in follow-up sync; keep mapping from legacy statuses for migration.
3. **Email infrastructure** — Assume SMTP credentials not yet available; implement notification hook with structured logging and feature gating via `enableEmailSend` + client opt-in. Validation: log assumption in update.md and add TODO for integration sprint.
4. **Quote acceptance UX** — Assume users expect Accept to convert immediately; convert button removed to avoid duplication. Validation: record assumption and gather feedback during review.
5. **Quick order multi-file baseline** — Existing backend already supports multiple uploads; enhancements focus on UX + invoice description.
6. **No PDF template changes** — PDFs remain as-is; new data surfaces through existing template placeholders where possible.

## Risks & Mitigations
1. **Prisma enum migration may break existing jobs**
   - *Mitigation:* Write migration that maps old values to new statuses (e.g., QUEUED -> IN_QUEUE). Take data backup before applying.
2. **Shipping estimator mispricing**
   - *Mitigation:* Provide default fallback tier, log unknown regions, expose configuration via settings UI for adjustments.
3. **Notification toggle confusion**
   - *Mitigation:* Keep defaults off, add explanatory copy, ensure logging clarifies when notifications suppressed.
4. **Scope creep / timeline overrun**
   - *Mitigation:* Track progress per part in TRACKING.md; reassess if blockers emerge.
5. **UI regressions due to large refactors**
   - *Mitigation:* Perform manual smoke per major surface (quick order, quotes, job board, client portal) after each part.
