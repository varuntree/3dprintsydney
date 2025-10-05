# Assumptions & Risks

## Assumptions
- PLAN_PATH refers to `docs/build/02_plan.md`; no newer plan overrides exist.
- Dashboard visual language is the target baseline for the rest of the routes.
- Navigation consists of ten top-level entries (5 primary + 3 catalog + 2 operations); no hidden menus need special handling.
- No new assets (icons/illustrations) are required; goal is consistency using existing tokens/components.
- Accessibility tooling remains unchanged; focus is on style/structure.

## Risks & Mitigations
- **Scope creep**: Large refactor surface. → Mitigate by executing per-part per-plan and logging heartbeats.
- **Regression risk**: UI/UX changes may break flows. → Apply per-part smoke tests + full quality gates.
- **Performance drift**: Heavier components. → Reuse lightweight primitives, avoid nested re-renders.
- **Token drift**: Divergent color/spacing usage. → Centralise primitives; document decisions.
- **Schedule overrun**: Long-running effort. → Maintain TRACKING heartbeats; adjust micro-plans quickly.

## Validation Strategy
- Per part: `npm run lint`, `npm run typecheck` or `npm run build` as appropriate, plus manual smoke aligned with feature.
- Final phase: full lint/typecheck/build/audit and documentation verification.
