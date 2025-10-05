# Expanded Execution Plan — Navigation & Route Modernisation

## Part 1 · Navigation Shell Modernisation
1.1 Audit existing layout primitives (`app/layout.tsx`, `components/layout/app-shell.tsx`, sidebar, header) and map design deltas.
1.2 Refine layout structure: consistent spacing, typography, surface tokens, responsive breakpoints.
1.3 Rebuild sidebar navigation list (top 5 primary routes, catalog trio, operations duo) with timeline-inspired styling and active indicators.
1.4 Harmonise top header (title bar, action rail) with new dashboard aesthetic; remove redundant wrappers.
1.5 Validate navigation behaviour (active states, collapsed variants, keyboard focus).

## Part 2 · Shared UI Infrastructure Updates
2.1 Centralise shared card/grid primitives to match dashboard refinements (cards, section wrappers, timeline base).
2.2 Update global tokens/styles if required (ensuring backwards compatibility with dashboard).
2.3 Document reusable section components (executive summary, list cards, timelines) to be reused across routes.

## Part 3 · Core Operational Routes Refresh
3.1 Clients route — apply new layout, rebuild list + detail cards with consistent surfaces.
3.2 Quotes route — align table, editors, dialogs with refined styling, ensure status badges + timeline use shared components.
3.3 Invoices route — match quotes treatment; ensure Stripe controls align with new button styles.
3.4 Jobs route — refresh board shell, column cards, modals to new design language.
3.5 Dashboard adjustments (if necessary) for shared components integration post-refactor.

## Part 4 · Catalog Routes Refresh
4.1 Materials page — rework list + drawer to updated surfaces.
4.2 Products page — align calculators, template cards, dialogs.
4.3 Printers page — refresh list, queue controls, modals.

## Part 5 · Settings & Reports
5.1 Settings form — align section cards, form controls, timeline.
5.2 Reports page — refresh data cards, exports section.

## Part 6 · Polish, Cleanup, Quality Gates
6.1 Sweep for leftover legacy styles/components; remove or replace.
6.2 Update documentation/readme snippets referencing navigation/UX.
6.3 Final quality gates (lint, typecheck, build, audit) + targeted smoke tests per route.





