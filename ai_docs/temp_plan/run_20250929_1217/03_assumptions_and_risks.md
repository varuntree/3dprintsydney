# Assumptions & Risks

## Assumptions
- PLAN_PATH resolved to `docs_implementation_docs/05_ui_ux_redesign_plan.md` and supersedes older plans.
- Dashboard visual language is the canonical reference for redesign tokens and components.
- No additional backend changes are required beyond wiring existing payment term APIs/services.
- Stripe configuration/state handling already exists; redesign focuses on presentation and cues.
- PDF templates are editable within repo (likely under `src/pdf` or similar) and accept styling updates.
- Calculator logic already computes preview totals; enhancements build atop existing services.

## Risks & Mitigations
- **Scope breadth**: Touching many routes risks inconsistent rollout. → Follow part-by-part execution with heartbeats and micro-plans when needed.
- **Regression risk**: Visual refactor may break functionality. → Run smoke flows after each part and maintain quality gates.
- **Token drift**: Multiple sources of colors/spacing could diverge. → Centralise tokens early and delete legacy styles.
- **PDF mismatches**: Styling updates may regress layout. → Validate via snapshot/manual review after template edits.
- **Time overrun**: Large effort may exceed session. → Prioritise high-impact shared primitives before per-route polish; log assumptions if deferring.

## Validation Strategy
- Per part: targeted manual smoke (e.g., create term, create client, send quote, export PDF) + relevant quality gate subset.
- Final phase: run lint, typecheck, build, npm audit (or equivalent) and record results in TRACKING.md.

