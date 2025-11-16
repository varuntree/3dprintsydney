# Plan: Refactor 3D Preview

## Plan Description
Completely refactor the QuickPrint 3D model preview stack (viewer, controls, state, and quick-order integration) to keep all existing capabilities—STL/3MF loading, auto/face-based orientation, overhang analysis, build-volume checks, gizmo controls, and WebGL resilience—while drastically simplifying structure, removing dead logic, and improving maintainability and performance for large models.

## User Story
As a QuickPrint customer
I want to view and manipulate my uploaded 3D models easily
So that I can confirm orientation, supports, and pricing with confidence before checkout

## Problem Statement
The current 3D preview code is monolithic and hard to maintain, mixing rendering, state, analysis, and UI concerns. Complexity increases bug risk (context loss, mis-synced orientation, overhang worker failures) and slows future changes. We need a clean, well-modularized viewer that preserves today’s behavior but is easier to reason about and extend.

## Solution Statement
Restructure the 3D preview into clear modules: loading/rendering, camera/navigation, orientation/support analysis, and quick-order data flow. Centralize state shape, remove unused code paths, and isolate worker interactions. Keep existing UX/features intact; add clearer boundaries, safer lifecycle handling, and test coverage (unit + E2E spec) to guard against regressions.

## Pattern Analysis
- `src/components/3d/ModelViewer.tsx:50` — Imperative handle pattern with @react-three/fiber, OrbitControls, and helper utilities for camera/view presets and geometry merging; sets precedent for encapsulating viewer behaviors.
- `src/components/3d/ModelViewer.tsx:400` — Scene component co-locates orientation store sync, overhang worker dispatch, and gizmo wiring; illustrates current concern mixing that should be separated.
- `src/stores/orientation-store.ts:1` — Zustand store with session persistence for quaternion/position/support flags; shows how orientation state is shared across viewer and quick-order UI.
- `src/components/3d/ViewNavigationControls.tsx:1` — Tailwind + shadcn control panel pattern for camera presets/pan/zoom/gizmo toggles; UI style to mirror after refactor.
- `src/hooks/use-webgl-context.ts:1` — Dedicated hook for WebGL context loss handling and logging; pattern to retain in new renderer lifecycle.
- `src/workers/overhang-worker.ts:3` — Worker wraps `detectOverhangs`, rebuilds BufferGeometry from serialized arrays; informs how to serialize geometry cleanly after refactor.
- `src/app/(client)/quick-order/page.tsx:2000` — Quick-order orientation step wires viewer ref, step flow, pricing triggers; integration points to preserve while simplifying props/events.
- Standards: `ai_docs/documentation/standards/coding_patterns.md:21` mandates CSS-variable design tokens; ensure any UI tweaks stay within existing design system.

## Dependencies
### Previous Plans
- `specs/3d-orientation-controls/3d-orientation-controls.md` — Introduced orientation + support controls and overhang analysis; refactor must maintain features and data contracts defined there.
- `specs/3d-model-rendering-quickorder-bug.md` — Prior fixes for quick-order model rendering; confirm refactor doesn’t reintroduce regressions noted there.

### External Dependencies
- Existing 3D stack (`three`, `@react-three/fiber`, `@react-three/drei`) and zustand; no new libraries anticipated. If new tooling is needed, document in Notes.

## Relevant Files
Use these files to implement the task:
- `src/components/3d/ModelViewer.tsx` — Current monolithic viewer; primary refactor target to split responsibilities.
- `src/components/3d/ModelViewerWrapper.tsx` — Dynamic/SSR guard wrapper; ensure interface stability.
- `src/components/3d/BuildPlate.tsx`, `src/components/3d/OrientationGizmo.tsx`, `src/components/3d/ViewNavigationControls.tsx` — Supporting UI/controls patterns to align with.
- `src/hooks/use-webgl-context.ts` — Context-loss handling to retain.
- `src/workers/overhang-worker.ts`, `src/lib/3d/overhang-detector.ts`, `src/lib/3d/orientation.ts`, `src/lib/3d/coordinates.ts` — Geometry/orientation/support analysis utilities; ensure contract consistency after refactor.
- `src/stores/orientation-store.ts` — Shared orientation/support state; may need shaping but must remain single source of truth.
- `src/app/(client)/quick-order/page.tsx` — Quick-order orientation step integration; update event flows and prop usage to match refactored viewer.
- `.claude/commands/test_e2e.md` and `.claude/commands/e2e/test_basic_query.md` — Read to follow required E2E command format before drafting the new test file.

### New Files
- `specs/refactor-3d-preview/refactor-3d-preview_implementation.log` — Running log for implementation notes.
- `.claude/commands/e2e/test_refactor-3d-preview.md` — New E2E test script to validate the refactored 3D preview flow.

## Acceptance Criteria
- All existing viewer capabilities preserved: STL/3MF loading, auto-orient, face-pick orient, gizmo rotate/translate, build-plate helpers, overhang/support estimation, bounds warnings, WebGL context loss handling.
- Responsibilities separated into clear modules (rendering, state sync, analysis, UI controls); no duplicated logic or unused branches remain.
- Quick-order orientation step continues to function end-to-end (orientation lock, price recompute, navigation controls) with backward-compatible props/events.
- Overhang worker and orientation store interfaces remain stable (or are migrated with corresponding call-site updates) and are covered by updated unit tests.
- Performance does not regress for large files (≥50 MB) and initial render still loads within existing UX expectations (spinner + skeleton).
- New E2E test steps documented in `.claude/commands/e2e/test_refactor-3d-preview.md` following repository conventions.

## Step by Step Tasks

**EXECUTION RULES:**
- Execute ALL steps below in exact order
- Check Acceptance Criteria - all items are REQUIRED
- Do NOT skip UI/frontend steps if in acceptance criteria
- If blocked, document and continue other steps

### 1. Confirm scope, baseline, and prior decisions
- Re-read `CONTEXT.md`, `PRD.md`, and `coding_patterns.md` to align with product constraints and coding standards.
- Review prior specs (`3d-orientation-controls`, `3d-model-rendering-quickorder-bug`) to list must-keep behaviors and known regressions to avoid.
- Capture current viewer responsibilities, event flows, and pain points in `specs/refactor-3d-preview/refactor-3d-preview_implementation.log`.

### 2. Map current 3D preview architecture and integration points
- Trace data flow between `ModelViewer`, orientation store, overhang worker, and quick-order page (upload → render → orient → lock → price).
- Document current prop/event contracts and side effects (e.g., when pricing is triggered, when support estimates run).
- Identify dead code, duplicated logic, and interwoven concerns to be separated.

---
✅ CHECKPOINT: Steps 1-2 complete (Discovery). Continue to step 3.
---

### 3. Design refactored component/module boundaries
- Propose refactor blueprint: viewer rendering core, analysis/service layer, UI controls layer, and integration adapter for quick-order.
- Define minimal public API for `ModelViewer` ref (methods + events) and for worker/state interactions.
- Validate design against acceptance criteria and prior plans; record decisions in the implementation log.

### 4. Plan E2E coverage
- Draft the new E2E command file `.claude/commands/e2e/test_refactor-3d-preview.md` steps (upload model → orient via auto + face-pick → toggle gizmo → verify overhang + bounds messaging → lock orientation → price recalculates).
- Follow conventions from `.claude/commands/test_e2e.md` and `.claude/commands/e2e/test_basic_query.md`.

---
✅ CHECKPOINT: Steps 3-4 complete (Design & Test plan). Continue to step 5.
---

### 5. Refactor viewer core and rendering lifecycle
- Split loading/rendering concerns inside `ModelViewer` (e.g., loader selection, geometry prep, camera fitting) into dedicated helpers/hooks.
- Preserve WebGL context-loss handling and AdaptiveDpr usage; ensure cleanup paths are deterministic.
- Simplify imperative handle: expose only documented methods, ensure consistent orientation application and recentering.

### 6. Refactor analysis and state synchronization
- Isolate overhang/support analysis dispatch (worker or inline for small meshes) from render tree; ensure threshold/large-model heuristics remain.
- Normalize orientation/bounds/support updates through the store; remove redundant local state; align with quick-order expectations.
- Keep build-volume checks and face-pick alignment factored with clear entry points.

### 7. Update UI controls and quick-order integration
- Adjust `ViewNavigationControls`/gizmo wiring to use the cleaned public API.
- Update `quick-order` page to match refactored props/events; ensure orientation lock, warnings, and pricing triggers still fire.
- Remove or rewrite any legacy toggles/flags that are no longer needed after refactor.

---
✅ CHECKPOINT: Steps 5-7 complete (Implementation). Continue to step 8.
---

### 8. Add tests and hardening
- Add targeted unit tests for new helpers (geometry prep, camera fitting, orientation normalization) and worker serialization paths.
- Fill in the E2E command script specifics to validate the end-to-end preview flow.
- Update documentation/comments where behavior changed for maintainability.

### 9. Run validation and summarize
- Execute all validation commands; record outputs in the implementation log.
- Confirm acceptance criteria and definition of done; create follow-up tasks if any gaps remain.

## Testing Strategy
### Unit Tests
- Geometry merge/normalization helpers and camera fitting calculations.
- Orientation store interactions (quaternion/position persistence, helpers visibility toggles).
- Worker serialization/deserialization and overhang threshold logic.

### Edge Cases
- Large files (>50 MB) with simplified analysis path.
- Flat or degenerate geometries triggering bounds/flat-model thresholds.
- WebGL context loss/recovery during active orientation edits.
- Face-pick alignment when no face is hit or normals are inverted.

## Validation Commands
Execute every command to validate the task works correctly with zero regressions.
- `npm run lint` (expected: no lint errors).
\- `npm run typecheck` (expected: TypeScript passes with zero errors).
\- `npm run test` (expected: vitest suite green).
\- `npm run build` (expected: Next.js build succeeds).
\- Read `.claude/commands/test_e2e.md`, then execute the written `.claude/commands/e2e/test_refactor-3d-preview.md` steps to verify the refactored viewer end-to-end.

# Implementation log created at:
# specs/refactor-3d-preview/refactor-3d-preview_implementation.log

## Definition of Done
- [ ] All acceptance criteria met
- [ ] All validation commands pass with expected output
- [ ] No regressions (existing tests still pass)
- [ ] Patterns followed (documented in Pattern Analysis)
- [ ] E2E test created and passing (if UI change)

## Notes
- No new dependencies expected; document and justify if any are added during implementation.

## Research Documentation
- None yet (add entries here if new research docs are created).
