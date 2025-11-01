# Plan: Quick Order UI refinements (2025-11-01)

## Objectives
- Rework the Quick Order workflow header and content to emphasize the active step while allowing navigation between steps.
- Ensure each step only exposes the relevant inputs, without altering existing data handling or business logic.
- Keep the workflow responsive and accessible across desktop and mobile breakpoints.
- Expose the 3D view/rotation controls by default in the orientation step, removing the toggle icon while keeping mobile usability.

## Implementation Steps
1. **Audit current step logic**
   - Review the `steps` configuration in `src/app/(client)/quick-order/page.tsx` and identify all UI sections tied to each step.
   - Map existing state transitions (`setCurrentStep`, navigation buttons) and confirm which sections should render per step.

2. **Refactor step navigation UI**
   - Introduce a compact progress header that highlights the current step, hides future step details, and allows clicking completed/active steps to navigate backward.
   - Ensure keyboard accessibility (aria-current, buttons) and preserve sticky behavior with responsive layout adjustments.

3. **Segment step content**
   - Wrap existing sections (upload, configure, orient, price, checkout) into discrete render functions or conditional blocks keyed to `currentStep`.
   - Add “Back” and “Continue” controls where appropriate to drive `setCurrentStep`, respecting prerequisites (e.g., uploads required before moving forward).
   - Maintain existing side calculations, price summaries, and error handling with minimal logic changes.

4. **Persistent 3D controls**
   - Remove the show/hide toggle for `RotationControls` and render them directly beneath the `ModelViewerWrapper` on all viewports.
   - Adjust layout so controls stack naturally on mobile (full-width, scrollable) without modal sheets for visibility.
   - Ensure view navigation helpers remain accessible without the floating icon toggle, adapting layout if necessary.

5. **Responsive polish & regression checks**
   - Verify spacing and stacking across breakpoints (use Tailwind responsive classes as needed).
   - Run project lint/test commands if available, and manually inspect orientation workflow state transitions.

6. **Documentation & assets**
   - Capture desktop and mobile screenshots for each step and the always-visible controls once implementation is complete.
   - Prepare PR summary noting UI-only changes.

