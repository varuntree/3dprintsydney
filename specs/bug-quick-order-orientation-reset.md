# Bug: Quick Order 3D orientation resets immediately after interaction

## Bug Description
On the Quick Order page’s 3D preview, rotating/translating the uploaded model or adjusting its size appears to work while the mouse is held, but as soon as the button is released the model snaps back to its initial load pose. Helper toggles (grid hide/show) and the gizmo toggle do not stick, leaving the viewer effectively read-only. Expected behavior: user transforms should persist and helpers/gizmo visibility should reflect the user’s toggles.

## Problem Statement
The orientation viewer is reapplying the initial orientation and helper state after each interaction, preventing users from locking or previewing their desired orientation. We need to stop the automatic reset, ensure helper/gizmo toggles persist, and keep the model’s transform in sync with the stored orientation snapshot for the active file.

## Solution Statement
Isolate orientation-store hydration so it only runs when the active file changes (not on every orientation update), and ensure the viewer reads/writes orientation, helper visibility, and gizmo mode without being overwritten by stale snapshots. Stabilize the quick-order orientation state flow and confirm ModelViewer/TransformControls honor the updated store values.

## Steps to Reproduce
1) `npm run dev`
2) Open http://localhost:3000/quick-order
3) Upload a valid STL/3MF file.
4) In the Orient step, toggle the gizmo and try rotating/translating the model or hiding the build plate.
5) Release the mouse: the model and helper visibility revert to the initial state.

## Root Cause Analysis
- Orientation hydration in `src/app/(client)/quick-order/page.tsx` runs whenever `orientationState` changes, calling `store.reset()` or re-setting the stored snapshot even immediately after user-driven updates. This re-applies the initial orientation/helpers/gizmo flags on every store change, effectively undoing user interactions. The persistence layer is correct; the mis-scoped hydration effect is overwriting live state as soon as interactions finish.

## Relevant Files
Use these files to fix the bug:
- `src/app/(client)/quick-order/page.tsx` — Hydrates per-file orientation into the Zustand store; current effect likely overwrites live transforms and helper/gizmo toggles.
- `src/components/3d/ModelViewer.tsx` — Applies store state to the Three.js group and runs post-transform clamps; ensure it doesn’t fight the store sync after the hydration fix.
- `src/components/3d/OrientationGizmo.tsx` — Commits gizmo transforms into the orientation store.
- `src/stores/orientation-store.ts` — Persists orientation/visibility/gizmo mode; verify no normalization side effects after hydration change.
- `src/components/3d/ViewNavigationControls.tsx` and `src/components/3d/RotationControls.tsx` — Trigger helper/gizmo toggles and orientation changes; verify events still map to the store.
- `documentation/CODE_STANDARDS_AND_PATTERNS.md` — Reference for aligning any state-management or React patterns with project standards.

### New Files
- None anticipated.

## Step by Step Tasks
### Step 1: Reproduce current reset behavior
- Run the app locally and follow the reproduction steps to observe the snap-back and non-sticky helper/gizmo toggles.

### Step 2: Trace orientation state flow
- Inspect the hydration/subscription logic in `quick-order/page.tsx` and how it interacts with `orientation-store` updates and ModelViewer sync.
- Confirm when `store.reset` or rehydration runs relative to gizmo/controls updates.

### Step 3: Fix hydration and state overwrite
- Adjust the hydration effect to trigger only on active file changes, avoiding resets on every orientation update.
- Ensure helper/gizmo flags hydrate once per file and aren’t reapplied after user interactions.

### Step 4: Verify viewer/store synchronization
- Validate that ModelViewer/TransformControls still write orientation back to the store and that clamps/recentering don’t reintroduce resets.
- Confirm helper and gizmo visibility toggles reflect store state and remain stable after interactions.

### Step 5: Manual regression check in UI
- Re-run the reproduction flow to ensure transforms persist, gizmo/grid toggles stick, and orientation locking remains functional.

### Step 6: Run Validation Commands
- Execute the validation suite to guard against regressions.

## Validation Commands
- npm run lint
- npm run typecheck
- npm run test

## Notes
- The expected `ai_docs/documentation/CONTEXT.md` and `PRD.md` files were not present; leveraged `documentation/README.md`, `FEATURES_AND_MODULES.md`, `INTEGRATIONS.md`, and `CODE_STANDARDS_AND_PATTERNS.md` for context instead. No new libraries are anticipated.***
