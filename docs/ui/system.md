# UI System Reference (Session 2)

## Semantic Surface Tokens
- `--surface-canvas` — base page background (maps to `--background`).
- `--surface-subtle` — low elevation cards and table rows.
- `--surface-elevated` — modal shells and prominent cards.
- `--surface-overlay` — drawers, popovers, and sheets.

## Accent & Status Tokens
- `--accent-strong` — primary actions (maps to `--primary`).
- `--accent-soft` — quiet accents such as filters, tabs, segmented controls.
- `--danger-subtle`, `--warning-subtle`, `--success-subtle`, `--info-subtle` — background fills that pair with existing foreground tokens.

## Layout Primitives
- `PageHeader` — shared header structure with kicker, title, description, and meta slots plus trailing actions via `ActionRail`.
- `ActionRail` — responsive alignment wrapper for grouped controls. Defaults to end-aligned, wraps on small screens.

## Navigation Infrastructure
- `NavigationProvider` — global navigation context exposed through `useNavigation`, enabling route-level feedback, pending counts, and shared busy states.
- `NavigationLink` — semantic anchor that coordinates with the navigation provider for loading feedback while preserving default browser behaviors.
- `RouteProgressBar` — announces route changes with `role="progressbar"`; integrates with navigation context and respects reduced motion.

## Async Feedback Components
- `LoadingButton` — drop-in replacement for button variants with built-in spinner, `aria-busy`, and optional loading copy.
- `TableSkeleton` — lightweight placeholder grid for cold list loads (quotes, invoices, etc.).

Documentation stays aligned with `ai_docs/implementation_plan/session2/ui_ux_revamp_plan.md` for subsequent phases.
