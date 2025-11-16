## Goal
Validate refactored QuickPrint 3D preview preserves orientation, overhang, and pricing behaviors.

## Pre-req
- Read `.claude/commands/test_e2e.md` for runner syntax and env.
- Use creds: test@tendercreator.dev / TestPass123!
- Use fixture model: `test_fixtures/models/calibration_cube_20mm.stl`

## Steps
1) Login via UI with provided credentials.
2) Navigate to QuickPrint (`/quick-order`).
3) Upload the fixture STL; wait for processing spinner to disappear.
4) Verify model renders on build plate; orbit slightly to confirm responsiveness.
5) Click “Auto-orient” (viewer menu or control panel) and wait for status to return idle; confirm orientation lock control becomes available.
6) Toggle gizmo on, drag slight rotation, then click “Reset view” (or reset control) to confirm imperative ref handles state.
7) Enable face-pick mode (if exposed) and click top face; ensure model realigns to ground and bounds warning is clear.
8) Check overhang/support indicator updates (no errors in UI); ensure no “overhang preview failed” warning.
9) Lock orientation, proceed to Configure, trigger “Calculate Price”; verify subtotal renders without error.
10) Record screenshot of the oriented preview with helpers visible.

## Expected
- Viewer stays responsive (no freezes/crashes).
- No warnings for bounds unless model is intentionally out of range.
- Pricing step reachable after orientation lock; totals display.
