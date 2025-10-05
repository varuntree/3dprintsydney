# Expanded Execution Plan — UI/UX Redesign Parity Rollout

## Part 1 · Design System Foundation
1.1 Inventory current dashboard tokens, typography, spacing, interaction patterns.
1.2 Extract/update central token file(s) (tailwind config, css variables, shadcn themes) to serve as single source of truth.
1.3 Align layout primitives (`app/layout.tsx`, shell wrappers, container components) to use shared tokens.
1.4 Define standard loading/empty state components referencing shared spinner/placeholder primitives.

## Part 2 · Settings — Payment Terms Experience
2.1 Rework settings layout sections to match new shell (cards, spacing, headers).
2.2 Implement payment terms management UI (list, add/edit drawer) using new shared components; enforce validations.
2.3 Ensure CRUD interactions reuse loading states and success/error feedback patterns.
2.4 Surface payment terms availability through documented hooks/services for other routes.

## Part 3 · Clients Route Alignment
3.1 Update client list/detail layout to shared primitives; integrate payment term select in forms.
3.2 Ensure detail view surfaces selected payment term with consistent badges/labels.
3.3 Smoke test client create/edit/view flows for loading, validation, and navigation behaviour.

## Part 4 · Quotes Route Alignment
4.1 Refresh quote list/editor UI to match tokens; add read-only payment term display in editors and view mode.
4.2 Ensure post-create default view is read-only with Edit affordance; align action bar styling.
4.3 Verify quote PDF styling parity (logo, layout, absence of payment button) via template adjustments.
4.4 Validate calculator + timeline interactions adopt shared loaders and feedback.

## Part 5 · Invoices Route Alignment
5.1 Apply shared layout to invoice list/editor/view surfaces; embed payment term badge and due date suggestion UI.
5.2 Ensure due date auto-calculation logic triggers on term selection while allowing manual override.
5.3 Update invoice view actions (regenerate Stripe link) to consistent button styles and loading cues.
5.4 Confirm invoice PDF layout includes logo, terms footer, conditional Stripe payment link.

## Part 6 · Calculator Dialog Enhancements
6.1 Introduce material selector tied to templates with `materialId`; default/override flows clarified.
6.2 Retain core fields (hours, grams, quality, infill) with improved layout and token usage.
6.3 Implement infill interpretation logic (preset or numeric percentage) and ensure preview pricing updates live.
6.4 On apply, persist calculator breakdown object with expected fields; ensure downstream forms consume it.

## Part 7 · Navigation & Global Actions
7.1 Iterate sidebar navigation (10 entries) to match dashboard style including active states and spacing.
7.2 Standardise top header/title bar components and action rails across routes.
7.3 Add invoices list badge for existing Stripe link and optional regenerate action in invoice view.
7.4 Audit loading spinners/feedback triggered on navigation/primary actions for consistency.

## Part 8 · Empty States, Errors, Job Policy Note
8.1 Implement conditional UI for Stripe-not-configured (warning badges/tooltips) across invoices/PDF export.
8.2 Handle missing payment terms edge case (default COD) across clients, quotes, invoices.
8.3 Review job creation policy surfaces ensuring documentation and settings wiring remain intact.

## Part 9 · Documentation, Quality Gates, Cleanup
9.1 Update relevant docs (README, IMPLEMENTATION notes) describing new shared components and payment terms flows.
9.2 Remove/deprecate legacy styles/components replaced by shared primitives.
9.3 Execute quality gates: lint, typecheck, build, dependency audit.
9.4 Conduct manual smoke tests per primary route (settings, clients, quotes, invoices, calculator, navigation).
9.5 Final tracking updates, decisions log, and completion notes.

