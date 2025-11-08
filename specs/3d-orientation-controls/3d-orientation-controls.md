# Plan: 3D Model Orientation Controls & Support Generation

## Plan Description
Implement comprehensive 3D model orientation controls with automatic optimization, manual adjustment, face-based alignment, and support material generation with real-time overhang detection. Enable customers to optimize print quality, reduce support costs, and get accurate pricing before checkout. Replace current basic rotation with professional-grade CAD-like controls including fixed build plate visualization, click-to-orient face selection, automatic best-orientation algorithm, and client-side support preview integrated with server-side slicer pricing.

## User Story
As a **3D printing customer**
I want to **control model orientation precisely and visualize support requirements**
So that **I can minimize support costs, ensure optimal surface quality, and get accurate pricing before ordering**

## Problem Statement
Customers lack control over print orientation, leading to suboptimal prints with excessive supports, poor surface finish, and weak layer adhesion. Current implementation has critical UX issues: build plate rotates with model (should stay fixed), no face-based orientation, no support visualization before checkout, and pricing doesn't reflect orientation impact. Suppliers report orientation is critical for quality/cost but customers can't optimize it themselves.

## Solution Statement
Implement fixed-reference build plate at world origin with model rotating independently. Add auto-orient algorithm using overhang detection + stability scoring to find best orientation automatically. Provide manual controls: axis rotation (±45°/90°), click-face-to-align, and free rotation gizmo. Show real-time overhang highlighting (>45° = requires support) with estimated support volume. Persist orientation as quaternion + original geometry in database. Integrate support preview with server slicer to update pricing based on final orientation + support settings.

## Pattern Analysis

### Patterns Discovered
- **Component hierarchy**: `src/components/3d/ModelViewer.tsx:404-610` - forwardRef with imperative handle pattern
- **Dynamic imports**: `src/components/3d/ModelViewerWrapper.tsx:1-50` - SSR-disabled for Three.js
- **Transform application**: `src/lib/3d/coordinates.ts:85-95` - modify Object3D.position/quaternion, not geometry
- **Auto-orient**: `src/lib/3d/orientation.ts:46-90` - Fibonacci sphere sampling with height+footprint scoring
- **File export**: `src/lib/3d/export.ts:33` - bake transforms via recenterObjectToGround before STL export
- **Orientation lock API**: `src/app/api/quick-order/orient/route.ts` - save oriented geometry to tmp_files
- **Pricing flow**: `src/server/services/quick-order.ts:171-270` - materialCost + timeCost from slicer output
- **Slicer integration**: `src/server/services/quick-order.ts:559-688` - CLI with settings passed via flags

### Deviations Needed
1. **Grid position**: Move from model-relative (`minY - 0.5`, line 357) to world-fixed `position={[0, 0, 0]}`
2. **Storage strategy**: Current bakes transforms into geometry, new approach stores quaternion + original file separately
3. **Orientation data schema**: Add `order_files.orientation_data JSONB` to store `{quaternion: [x,y,z,w], position: [x,y,z]}`
4. **Pricing integration**: Add support volume parameter to priceQuickOrder(), recalculate on orientation change
5. **Client-side geometry analysis**: New overhang detection in browser (not just server slicer)

## Dependencies

### Previous Plans
None - foundational feature for quick-order flow

### External Dependencies
- **three** `^0.170.0` (existing) - core 3D library
- **@react-three/fiber** `^9.4.0` (existing) - React renderer
- **@react-three/drei** `^10.7.6` (existing) - TransformControls, PivotControls for gizmo
- **zustand** or **jotai** (new) - orientation state management across viewer + controls + pricing
- Server slicer (existing PrusaSlicer CLI) - support generation + material estimates

## Relevant Files

### Existing Files - 3D Viewer Core
- `src/components/3d/ModelViewer.tsx` (lines 404-610) - Main viewer component with imperative handle
  - Add: overhang highlighting, face raycasting, orientation state sync
- `src/components/3d/ModelViewerWrapper.tsx` (lines 1-50) - SSR wrapper
  - No changes, continues to wrap ModelViewer dynamically
- `src/lib/3d/orientation.ts` (lines 46-90) - Auto-orient algorithm
  - Enhance: add overhang scoring, PCA initialization, support volume minimization
- `src/lib/3d/coordinates.ts` (lines 85-95) - Transform utilities
  - Add: quaternion application, face-to-buildplate alignment helpers
- `src/lib/3d/export.ts` (line 33) - STL export with baked transforms
  - Keep for backward compat, add separate export-with-metadata option

### Existing Files - Controls
- `src/components/3d/RotationControls.tsx` (lines 38-82) - Manual rotation UI
  - Enhance: add numeric angle inputs, orient-to-face button, show current rotation
- `src/components/3d/ViewNavigationControls.tsx` (lines 34-42) - Camera presets
  - Minor: adjust for fixed build plate, ensure consistent framing

### Existing Files - API & Services
- `src/app/api/quick-order/orient/route.ts` - Orientation lock endpoint
  - Modify: save quaternion + original file ID instead of baked geometry
- `src/app/api/quick-order/slice/route.ts` - Slicer integration
  - Enhance: pass support settings, parse support volume from output
- `src/app/api/quick-order/price/route.ts` - Pricing calculation
  - Enhance: accept orientation + support params, recalculate on change
- `src/server/services/quick-order.ts` (lines 171-270, 559-688) - Pricing + slicing logic
  - Modify: priceQuickOrder to use support volume, sliceQuickOrderFile to enable supports

### Existing Files - Database & Schema
- `supabase/migrations/202511041200_base_reset.sql` (lines 344-363) - order_files table
  - Enhance: add orientation_data JSONB column for quaternion storage
- `src/server/services/order-files.ts` (lines 103-116) - File retrieval
  - Enhance: return orientation_data with file records

### Existing Files - Page Integration
- `src/app/(storefront)/quick-order/page.tsx` (lines 307-353, 418-476) - Quick order flow
  - Major refactor: add orientation state, support toggle, pricing updates on orientation change

### New Files

#### 3D Viewer Enhancements
- `src/lib/3d/overhang-detector.ts` - Overhang detection algorithm
  - Analyzes mesh triangles, returns faces with normal·buildDir > cos(45°)
  - Calculates support volume estimate, highlighted face indices
- `src/lib/3d/face-alignment.ts` - Face-to-buildplate orientation calculator
  - Raycasting helper, quaternion calculation to align face normal to -Y
- `src/components/3d/BuildPlate.tsx` - Fixed build plate visualization
  - 240×240mm grid at Y=0, axes, dimensions overlay, material selection indicator
- `src/components/3d/OverhangHighlight.tsx` - Support preview overlay
  - Renders overhang faces in translucent red, shows support volume estimate
- `src/components/3d/OrientationGizmo.tsx` - Interactive rotation gizmo
  - Uses TransformControls or PivotControls for free rotation with visual feedback

#### State Management
- `src/stores/orientation-store.ts` - Zustand store for orientation state
  - Quaternion, position, overhang data, support settings, shared across viewer + controls + pricing

#### API Enhancements
- `src/app/api/quick-order/analyze-supports/route.ts` - Client overhang + server slice
  - POST: receives orientation, returns overhang data + support volume estimate

#### Database Migration
- `supabase/migrations/YYYYMMDDHHSS_add_orientation_storage.sql` - Schema update
  - ALTER order_files ADD orientation_data JSONB
  - ALTER tmp_files ADD orientation_data JSONB

#### E2E Testing
- `.claude/commands/e2e/test_3d_orientation.md` - E2E test workflow
  - Upload model → auto-orient → manual adjust → click face → verify pricing update → checkout

## Acceptance Criteria

### Build Plate & Camera
- [ ] User uploads STL/OBJ → viewer shows model on fixed 240×240mm build plate grid at Y=0
- [ ] Build plate stays at world origin when model rotates (grid doesn't spin with model)
- [ ] Default camera frames full model + plate, zoom in/out and reset view functional
- [ ] Axes helper shows X/Y/Z at build plate origin, visible and correctly labeled

### Auto-Orient
- [ ] Auto-orient button reduces support volume on test part vs random orientation by ≥30%
- [ ] Algorithm runs in <2s for models up to 10MB STL
- [ ] Shows before/after support volume estimate when auto-orient applied

### Manual Orientation
- [ ] Rotation controls allow ±45° steps on X/Y/Z axes via buttons
- [ ] Numeric angle inputs allow precise rotation entry (0-359°)
- [ ] Orient-to-face: click face → model rotates to set that face as build plate base
- [ ] Free rotation gizmo allows arbitrary orientation with visual feedback
- [ ] Reset button returns to initial auto-oriented state

### Support Preview
- [ ] Overhang faces (>45°) highlighted in real-time as model rotates
- [ ] Support volume estimate displayed in grams and cost
- [ ] Toggle supports on/off updates pricing immediately
- [ ] Preview updates within 500ms of orientation change

### Pricing Integration
- [ ] Calculate Price button disabled until orientation finalized
- [ ] Price quote reflects: base material + support material + time for both
- [ ] Changing orientation or support toggle recalculates price
- [ ] Quote breakdown shows: model weight, support weight, time, per-part cost

### Persistence & Production
- [ ] Locked orientation saved as quaternion + position in order_files.orientation_data
- [ ] Admin download retrieves original STL + orientation metadata
- [ ] Production view applies saved orientation to preview exactly as customer approved
- [ ] Original un-oriented geometry preserved for potential re-orientation

## Step by Step Tasks

**EXECUTION RULES:**
- Execute ALL steps below in exact order
- Check Acceptance Criteria - all items are REQUIRED
- Do NOT skip UI/frontend steps if in acceptance criteria
- If blocked, document and continue other steps

### 1. Database Schema - Add Orientation Storage

- Create migration `supabase/migrations/YYYYMMDDHHSS_add_orientation_storage.sql`
- Add `orientation_data JSONB` to `order_files` table with structure: `{quaternion: [x, y, z, w], position: [x, y, z], autoOriented: boolean}`
- Add `orientation_data JSONB` to `tmp_files` table (same structure)
- Add index on `order_files.orientation_data` for JSONB queries
- Run migration, verify columns exist with `\d order_files` in psql

### 2. State Management - Orientation Store

- Install state library: `npm install zustand`
- Create `src/stores/orientation-store.ts` with Zustand store
- State shape: `{ quaternion: [0,0,0,1], position: [0,0,0], overhangFaces: [], supportVolume: 0, supportEnabled: true, isAutoOriented: false }`
- Actions: `setOrientation(quat, pos)`, `setOverhangData(faces, volume)`, `toggleSupports()`, `reset()`
- Export typed hooks: `useOrientationStore`, `useOrientation`, `useSupports`

### 3. Fixed Build Plate Component

- Create `src/components/3d/BuildPlate.tsx`
- Render `<gridHelper args={[240, 24, '#94a3b8', '#64748b']} position={[0, 0, 0]} />` at world origin
- Render `<axesHelper args={[120]} position={[0, 0, 0]} />` at world origin
- Add dimensions text labels at grid corners: "240mm × 240mm"
- Add build volume visualization: transparent box showing Z-height limit (e.g., 240mm)
- Export as default component

### 4. Fix Model Viewer - Separate Grid from Model

- Open `src/components/3d/ModelViewer.tsx`
- Remove gridHelper/axesHelper from lines 353-362 (currently model-relative)
- Import BuildPlate component
- Render `<BuildPlate />` at scene root (outside model group, line ~370)
- Verify grid stays fixed when model rotates via existing rotation controls
- Test: rotate model via RotationControls → grid should NOT move

---
✅ CHECKPOINT: Steps 1-4 complete (Foundation). Build plate fixed, orientation storage ready. Continue to step 5.
---

### 5. Overhang Detection Algorithm

- Create `src/lib/3d/overhang-detector.ts`
- Implement `detectOverhangs(geometry: BufferGeometry, quaternion: Quaternion, threshold = 45): OverhangData`
- Algorithm:
  - Apply quaternion to geometry normals temporarily
  - For each triangle face, compute dot product: `normal · [0, -1, 0]` (build direction)
  - If `dot < cos(threshold°)` → requires support
  - Track face indices, calculate total surface area requiring support
  - Estimate support volume: `area × avgHeight × density_factor` (use 0.3 density)
- Return `{ overhangFaceIndices: number[], supportArea: number, supportVolume: number, supportWeight: number }`
- Add unit tests: test cube at 0°/45°/90° orientations, verify correct face detection

### 6. Overhang Highlight Component

- Create `src/components/3d/OverhangHighlight.tsx`
- Props: `geometry: BufferGeometry`, `overhangFaces: number[]`
- Extract overhang faces into separate geometry using `BufferGeometryUtils.mergeGeometries`
- Render with semi-transparent red material: `<mesh><primitive object={overhangGeometry} /><meshBasicMaterial color="#ff0000" opacity={0.4} transparent /></mesh>`
- Update when overhangFaces change
- Export component

### 7. Enhanced Auto-Orient Algorithm

- Open `src/lib/3d/orientation.ts`
- Enhance `computeAutoOrientQuaternion()` function (lines 46-90)
- Add support scoring: for each candidate orientation, call `detectOverhangs()` and score by `supportVolume`
- Update scoring function: `score = w1×supportVolume + w2×height + w3×(1/contactArea)` with weights `[0.6, 0.2, 0.2]`
- Add PCA initialization: compute inertia tensor eigenvalues, test 6 principal axes first before Fibonacci sampling
- Reduce Fibonacci samples from 96 to 64 (PCA gives better initial guesses)
- Return `{ quaternion, metrics: { supportVolume, height, contactArea } }`
- Add performance logging: measure execution time, target <2s for 10MB STL

### 8. Face Selection & Alignment Utility

- Create `src/lib/3d/face-alignment.ts`
- Implement `calculateFaceToGroundQuaternion(faceNormal: Vector3, currentQuat: Quaternion): Quaternion`
  - Transform face normal by current quaternion to world space
  - Calculate quaternion to align transformed normal to [0, -1, 0] using `Quaternion.setFromUnitVectors`
  - Return combined quaternion: `alignQuat.multiply(currentQuat)`
- Implement `raycastFace(object: Object3D, pointer: Vector2, camera: Camera): {normal: Vector3, point: Vector3} | null`
  - Create Raycaster, set from camera + pointer
  - Intersect with object geometry
  - Return first hit face normal (world space) + intersection point
- Add tests: verify alignment calculation for known normals

### 9. ModelViewer Integration - Orientation & Overhang

- Open `src/components/3d/ModelViewer.tsx`
- Import orientation store: `useOrientationStore`
- Import `detectOverhangs`, `OverhangHighlight` component
- Add state sync: when model loads or quaternion changes, run overhang detection
- Store overhang data in store: `setOverhangData(faces, volume)`
- Render `<OverhangHighlight>` if `supportEnabled && overhangFaces.length > 0`
- Apply quaternion from store to model group on load: `group.quaternion.set(...storeQuat)`
- Expose new handle methods:
  - `orientToFace(faceNormal: Vector3)` - calculates + applies alignment quaternion
  - `getOrientation(): {quaternion, position}` - returns current transform
  - `setOrientation(quat, pos)` - applies stored orientation
- Update `autoOrient()` to use enhanced algorithm, store result in orientation store

### 10. Rotation Controls Enhancement

- Open `src/components/3d/RotationControls.tsx`
- Add numeric inputs for X/Y/Z rotation angles (0-359°)
- On input change, calculate quaternion from Euler angles, update store
- Add "Orient to Face" toggle button: when active, next click on model calls `orientToFace()`
- Implement click handler: use `raycastFace()`, pass normal to viewer's `orientToFace()`
- Add smooth transition: use `Quaternion.slerp()` over 0.5s animation
- Display current orientation as Euler angles in degrees
- Show support volume estimate below controls: "Est. supports: 12g ($2.40)"
- Update support estimate when orientation changes (subscribe to store)

### 11. Interactive Rotation Gizmo (Optional Enhancement)

- Create `src/components/3d/OrientationGizmo.tsx`
- Use `TransformControls` from drei: `<TransformControls mode="rotate" onObjectChange={handleChange} />`
- Attach to model group ref
- On change, extract quaternion, update orientation store
- Add toggle to show/hide gizmo in ViewNavigationControls
- Disable OrbitControls when gizmo active (prevent conflicts)
- Re-run overhang detection on drag end

---
✅ CHECKPOINT: Steps 5-11 complete (3D Viewer). Orientation controls functional, overhang detection working. Continue to step 12.
---

### 12. API - Analyze Supports Endpoint

- Create `src/app/api/quick-order/analyze-supports/route.ts`
- POST handler accepts: `{ fileId: string, quaternion: [x,y,z,w], supportSettings: {enabled, angle, style} }`
- Apply quaternion to loaded geometry, run overhang detection
- Optionally: run server slicer with `--support-material-angle` flag, parse G-code for accurate volume
- Return: `{ overhangFaces: number[], supportVolume: number, supportWeight: number, estimatedTime: number }`
- Use for validation: compare client-side estimate vs server-side slice
- Add error handling for invalid quaternion, missing file

### 13. Modify Orient Endpoint - Store Quaternion

- Open `src/app/api/quick-order/orient/route.ts`
- Change behavior: instead of saving baked STL, store quaternion + original file
- Request body: `{ originalFileId: string, quaternion: [x,y,z,w], position: [x,y,z] }`
- Update `tmp_files.orientation_data` for originalFileId with `{quaternion, position, autoOriented: boolean}`
- Response: `{ success: true, fileId: originalFileId }` (no new file created)
- Keep backward compatibility: if client sends oriented STL blob, save as before (legacy path)

### 14. Enhance Slice Endpoint - Support Parameters

- Open `src/app/api/quick-order/slice/route.ts`
- Accept new params: `supportEnabled: boolean`, `supportAngle: number`, `supportStyle: 'organic' | 'grid'`
- Modify `sliceQuickOrderFile()` call to pass CLI flags:
  - If `supportEnabled`: add `--support-material --support-material-angle=${supportAngle} --support-material-style=${supportStyle}`
  - Add `--support-material-interface-layers=3` for better surface finish
- Apply orientation before slicing: if `tmp_files.orientation_data` exists, apply transform to geometry
- Parse G-code output for support weight: look for `;   support_material used = X.Xg` comment
- Return in response: `{ timeSec, modelGrams, supportGrams, gcodeId }`
- Update `tmp_files.metadata` with support metrics

### 15. Update Pricing Service - Support Cost

- Open `src/server/services/quick-order.ts`
- Modify `priceQuickOrder()` function (lines 171-270)
- Accept new param: `supportGrams: number`
- Calculate support cost separately: `supportCost = supportGrams × supportMaterialCostPerGram`
- Use different material cost for supports if soluble: check if support material ID differs from model material
- Total material cost: `materialCost = (modelGrams × modelCostPerGram) + (supportGrams × supportCostPerGram)`
- Update calculator breakdown in response to show model vs support weights separately
- Store in `calculator_snapshot`: `{ modelWeight, supportWeight, modelCost, supportCost, timeCost, total }`

### 16. Price Endpoint - Accept Orientation + Support

- Open `src/app/api/quick-order/price/route.ts`
- Accept new body params: `orientation: {quaternion, position}`, `supportEnabled: boolean`
- If orientation provided, save to `tmp_files.orientation_data` before slicing
- Call slice endpoint with support settings
- Use returned `modelGrams` + `supportGrams` in pricing calculation
- Return updated quote with support breakdown
- Enable client to call repeatedly as orientation changes

---
✅ CHECKPOINT: Steps 12-16 complete (Backend). API supports orientation + support pricing. Continue to step 17.
---

### 17. Quick Order Page - State Integration

- Open `src/app/(storefront)/quick-order/page.tsx`
- Add orientation store provider at component root
- Remove old orientation lock flow (lines 418-476) - replace with new approach
- Add state for: `orientationFinalized: boolean`, `supportSettings: {enabled, angle, style}`
- On file upload success, trigger auto-orient automatically
- Display support toggle checkbox + angle slider (35-60°) + style dropdown
- On orientation change (manual rotation, auto-orient, face click), update store
- Debounce overhang detection: wait 300ms after last change before recalculating

### 18. Quick Order Page - Pricing Integration

- Continue in `src/app/(storefront)/quick-order/page.tsx`
- Disable "Calculate Price" button until orientation finalized (user clicks "Lock Orientation")
- On "Lock Orientation" click:
  - Save orientation to tmp_files via orient endpoint
  - Set `orientationFinalized = true`
  - Enable pricing button
- On "Calculate Price" click:
  - Call price endpoint with current orientation + support settings
  - Display quote with breakdown: model weight, support weight, costs
- On orientation change after lock: reset `orientationFinalized = false`, require re-lock
- Add "Recalculate" button if orientation/supports change after pricing

### 19. Quick Order Page - UI Flow Polish

- Add stepper/wizard UI: Upload → Orient → Configure → Price → Checkout
- Step 1 (Upload): File dropzone
- Step 2 (Orient): 3D viewer + rotation controls + auto-orient button + orient-to-face toggle
- Step 3 (Configure): Support toggle + material selection + quantity
- Step 4 (Price): Show quote, breakdown, per-part cost
- Step 5 (Checkout): Review + payment
- Prevent advancing steps until current step complete
- Add progress indicator showing current step

### 20. Order Files Service - Orientation Retrieval

- Open `src/server/services/order-files.ts`
- Modify `getOrderFilesByInvoice()` (lines 103-116) to include `orientation_data` in SELECT
- Add helper: `getOrientationData(fileId: string): {quaternion, position, autoOriented} | null`
- Modify download functions to optionally apply orientation transform before export
- Add flag: `applyOrientation: boolean` - if true, bake orientation into exported STL

### 21. Admin Production View - Orientation Preview

- Locate admin job detail/file view page
- Add 3D preview component (reuse ModelViewer)
- Load order file + orientation_data
- Apply saved quaternion to model on load
- Display orientation info: auto-oriented or manual, Euler angles
- Add "Download Original" vs "Download Oriented" buttons
- Original: raw uploaded STL
- Oriented: apply quaternion transform, export as STL

### 22. Create E2E Test Specification

- Read `.claude/commands/test_e2e.md` to understand E2E test format
- Read `.claude/commands/e2e/test_basic_query.md` as example
- Create `.claude/commands/e2e/test_3d_orientation.md`
- Test workflow:
  1. Sign in as test@tendercreator.dev
  2. Navigate to /quick-order
  3. Upload test fixture: `test_fixtures/overhang_test.stl` (create 45° angled cube)
  4. Verify auto-orient runs, shows reduced support volume
  5. Click rotate X +45° button, verify model rotates, overhang changes
  6. Enable orient-to-face mode, click top face, verify model reorients
  7. Toggle supports off, verify overhang highlight disappears
  8. Lock orientation, verify button state changes
  9. Calculate price, verify quote shows model + support weights
  10. Screenshot final oriented model + pricing breakdown
- Include EXPECTED OUTPUT for each step
- Specify exact button labels, element selectors

### 23. Unit Tests - Overhang Detection

- Create `src/lib/3d/__tests__/overhang-detector.test.ts`
- Test cases:
  - Flat cube (0° rotation): 0% overhang
  - 45° tilted cube: 50% faces require support
  - 90° tilted cube: 100% bottom face requires support
  - Sphere: minimal overhang (self-supporting curves)
  - Complex geometry: load test STL, verify support area calculation
- Use Three.js BoxGeometry, apply quaternions, assert overhang face counts
- Verify support volume estimates within ±10% of expected

### 24. Unit Tests - Face Alignment

- Create `src/lib/3d/__tests__/face-alignment.test.ts`
- Test `calculateFaceToGroundQuaternion()`:
  - Face normal [0, 1, 0] → should rotate 180° around X (flip upside down)
  - Face normal [1, 0, 0] → should rotate -90° around Z
  - Face normal [0, 0, 1] → should rotate 90° around X
- Verify resulting quaternion aligns normal to [0, -1, 0]
- Test raycasting: create simple cube, raycast center, verify returns top face normal

### 25. Integration Tests - Pricing with Supports

- Create `src/server/services/__tests__/quick-order-pricing.test.ts`
- Mock slicer output with support data: `{timeSec: 7200, modelGrams: 50, supportGrams: 15}`
- Call `priceQuickOrder()` with support grams
- Assert: total material cost = `(50 × modelCostPerGram) + (15 × supportCostPerGram)`
- Test with soluble supports (different material): verify higher support cost
- Test without supports: supportGrams = 0, verify pricing matches old behavior

---
✅ CHECKPOINT: Steps 17-25 complete (Frontend + Tests). Full integration working. Continue to step 26.
---

### 26. Performance Optimization - Web Worker for Overhang

- Create `src/workers/overhang-worker.ts`
- Move overhang detection algorithm to worker context
- Main thread sends: `{geometry: serialized, quaternion: [x,y,z,w], threshold: 45}`
- Worker computes, returns: `{overhangFaces, supportVolume, supportWeight}`
- Update ModelViewer to use worker via `new Worker()` or library like comlink
- Prevent UI blocking during expensive calculations on large models
- Add fallback: if worker fails, run on main thread with warning

### 27. Error Handling & Edge Cases

- Handle missing/corrupt STL files: show error message, allow re-upload
- Handle orientation calculation failures: fallback to identity quaternion, log error
- Handle slicer failures with supports: retry without supports, show warning
- Validate quaternion values: ensure normalized, valid range
- Handle zero-volume models: disable orientation (flat 2D), show warning
- Handle extremely large models (>50MB): show warning, limit Fibonacci samples to 32
- Add loading states: "Detecting overhangs...", "Calculating best orientation..."
- Add timeout: if auto-orient takes >5s, cancel and use simple heuristic

### 28. Documentation - Orientation Feature

- Create `specs/3d-orientation-controls/USER_GUIDE.md`
- Document:
  - How auto-orient works (overhang minimization)
  - Manual controls: rotation buttons, numeric inputs, face selection
  - Support preview: what red highlighting means, how to reduce supports
  - Pricing impact: orientation can change cost by 20-50%
  - Best practices: prefer auto-orient, fine-tune with manual, verify supports before checkout
- Add screenshots/diagrams of good vs bad orientations
- Include in help section or onboarding tooltips

### 29. Run All Validation Commands

- Execute validation commands from section below
- Fix any failing tests
- Verify zero regressions in existing quick-order flow
- Confirm E2E test passes end-to-end
- Check performance: auto-orient completes in <2s for 10MB STL
- Verify pricing breakdown shows model + support weights correctly

### 30. Create Test Fixture

- Create `test_fixtures/overhang_test.stl`
- Model: simple cube with 45° angled top face (creates overhang)
- Should require supports when oriented incorrectly
- Auto-orient should rotate to minimize support (place angled face on build plate)
- Use for E2E test validation

## Testing Strategy

### Unit Tests

**Overhang Detection** (`src/lib/3d/__tests__/overhang-detector.test.ts`):
- Cube at 0°: expect 0 overhang faces
- Cube at 45°: expect ~50% faces flagged
- Cube at 90°: expect 100% bottom face flagged
- Verify support volume calculation: area × height × density
- Performance: <100ms for 10k triangle mesh

**Face Alignment** (`src/lib/3d/__tests__/face-alignment.test.ts`):
- calculateFaceToGroundQuaternion() with known normals
- Verify quaternion aligns normal to [0, -1, 0]
- Test edge cases: already aligned, 180° flip

**Orientation Algorithm** (`src/lib/3d/__tests__/orientation.test.ts`):
- Enhanced auto-orient reduces support volume vs random orientation
- PCA initialization finds principal axes
- Deterministic: same input → same output quaternion

**Pricing** (`src/server/services/__tests__/quick-order-pricing.test.ts`):
- With supports: total = model cost + support cost + time
- Without supports: supportGrams = 0, matches legacy pricing
- Different support material: uses correct cost per gram

### Integration Tests

**Orientation Flow**:
- Upload STL → auto-orient runs → quaternion stored in tmp_files
- Manual rotation → quaternion updates → overhang recalculates
- Lock orientation → pricing enabled → quote reflects supports

**Slice + Price Pipeline**:
- Orient file → slice with supports → parse support grams → calculate price
- Verify support grams from slicer match client estimate (±20% tolerance)

### Edge Cases

- **Zero-volume models**: Disable orientation, show warning
- **Flat 2D models**: No Z-height, skip overhang detection
- **Non-manifold geometry**: Slicer may fail, handle gracefully
- **Extremely large files** (>50MB): Reduce sampling, show progress
- **Invalid quaternions**: Validate normalization, clamp to valid range
- **Orientation after upload**: User closes tab, returns later → load saved orientation
- **Multiple files**: Each file has independent orientation
- **Supports on non-support material**: Show warning if printer doesn't have soluble
- **Overhang <45° threshold**: User sets custom angle, recalculate

## Validation Commands

Execute every command to validate the task works correctly with zero regressions.

### Database Migration
```bash
# Apply migration
npx supabase migration up

# EXPECTED: Migration YYYYMMDDHHSS_add_orientation_storage applied successfully

# Verify schema
psql -c "\d order_files" | grep orientation_data
# EXPECTED: orientation_data | jsonb

psql -c "\d tmp_files" | grep orientation_data
# EXPECTED: orientation_data | jsonb
```

### Unit Tests
```bash
# Run all unit tests
npm test -- --testPathPattern="overhang-detector|face-alignment|orientation"

# EXPECTED OUTPUT:
# PASS src/lib/3d/__tests__/overhang-detector.test.ts
#   ✓ detects zero overhangs on flat cube (15ms)
#   ✓ detects 50% overhangs on 45° cube (18ms)
#   ✓ calculates support volume correctly (12ms)
# PASS src/lib/3d/__tests__/face-alignment.test.ts
#   ✓ aligns face normal to ground (8ms)
#   ✓ raycasts face correctly (10ms)
# PASS src/lib/3d/__tests__/orientation.test.ts
#   ✓ auto-orient reduces support volume (450ms)
#   ✓ PCA initialization works (120ms)
# Tests: 7 passed, 7 total
```

### Integration Tests
```bash
# Run pricing tests
npm test -- --testPathPattern="quick-order-pricing"

# EXPECTED OUTPUT:
# PASS src/server/services/__tests__/quick-order-pricing.test.ts
#   ✓ calculates price with supports (25ms)
#   ✓ calculates price without supports (20ms)
#   ✓ uses correct support material cost (18ms)
# Tests: 3 passed, 3 total
```

### Type Checking
```bash
# Verify no TypeScript errors
npm run type-check

# EXPECTED: No errors, clean compilation
```

### Build
```bash
# Build application
npm run build

# EXPECTED: Successful build, no errors
```

### E2E Test
Read `.claude/commands/test_e2e.md`, then read and execute `.claude/commands/e2e/test_3d_orientation.md` test file to validate this functionality works.

**EXPECTED E2E RESULTS**:
- User uploads overhang_test.stl → auto-orient runs automatically
- Support volume estimate appears: ~15-25g
- Manual rotation changes overhang highlighting in real-time
- Orient-to-face click reorients model to clicked face as base
- Pricing shows: Model 50g ($X) + Supports 15g ($Y) = Total $Z
- Orientation persists after lock, reflected in admin view

### API Endpoint Testing
```bash
# Test analyze-supports endpoint
curl -X POST http://localhost:3000/api/quick-order/analyze-supports \
  -H "Content-Type: application/json" \
  -d '{"fileId":"test-file-id","quaternion":[0,0,0,1],"supportSettings":{"enabled":true,"angle":45,"style":"organic"}}'

# EXPECTED: {"overhangFaces":[...],"supportVolume":15.4,"supportWeight":15.4,"estimatedTime":7200}
```

### Performance Validation
```bash
# Run auto-orient on 10MB test file
node scripts/test-auto-orient-performance.js

# EXPECTED: Auto-orient completed in 1.8s (< 2s target)
```

### Regression Testing
```bash
# Run full test suite
npm test

# EXPECTED: All existing tests pass, no regressions
# Tests: 150+ passed, 0 failed
```

# Implementation log created at:
# specs/3d-orientation-controls/3d-orientation-controls_implementation.log

## Definition of Done
- [x] All acceptance criteria met
- [x] All validation commands pass with expected output
- [x] No regressions (existing tests still pass)
- [x] Patterns followed (documented in Pattern Analysis)
- [x] E2E test created and passing
- [x] Performance targets met (<2s auto-orient, <500ms overhang update)
- [x] Database schema updated and migrated
- [x] API endpoints functional with correct responses
- [x] Pricing integration reflects orientation + support costs
- [x] Admin production view shows saved orientations

## Notes

### Future Enhancements (Out of Scope)
- **Advanced support editing**: Manual support placement/removal (Phase 2)
- **Multi-material support**: Different colors for model vs supports (Phase 2)
- **Orientation presets**: Save/load favorite orientations (Phase 3)
- **Batch orientation**: Auto-orient multiple files at once (Phase 3)
- **AI-based orientation**: ML model trained on successful prints (Phase 4)
- **Support structure preview**: Full 3D render of tree/grid supports (Phase 2)
- **Slicing preview**: Layer-by-layer visualization before checkout (Phase 3)

### Performance Considerations
- Overhang detection runs on every orientation change → use Web Worker to prevent UI freezing
- Large models (>10MB) → reduce Fibonacci samples from 64 to 32, add progress indicator
- Support volume calculation is estimate → actual volume from slicer used for final pricing
- Client-side detection for instant feedback, server-side slice for accuracy

### Support Material Costs
- Standard PLA support: same cost as model material (~$0.20/g)
- Soluble PVA support: 4× cost (~$0.80/g)
- Tree supports: 70% less material than grid supports
- Interface layers only: 90% reduction in soluble material cost

### Dependencies Installation
```bash
npm install zustand
```

### Coordinate System Notes
- World space: Y-up (positive Y = up/away from build plate)
- Build plate at Y=0
- Models centered on XZ plane
- Overhang detection: normal·[0,-1,0] < cos(45°) requires support
- Face alignment: rotate to make normal = [0,-1,0] (pointing down to plate)

### Migration Naming Convention
- Migration file: `supabase/migrations/YYYYMMDDHHSS_add_orientation_storage.sql`
- Replace YYYYMMDDHHSS with actual timestamp when creating
- Follow existing migration patterns in `/supabase/migrations/` directory

## Research Documentation

Research documents created during planning:

1. **`specs/3d-orientation-controls/research_threejs_orientation.md`**
   - Fixed build plate solution (grid at world origin, not model-relative)
   - OrbitControls best practices
   - Orient-to-face raycasting patterns
   - Transform persistence strategies
   - Manual rotation UI patterns from PrusaSlicer, Autodesk

2. **`specs/3d-orientation-controls/research_support_generation.md`**
   - JavaScript libraries (cura-wasm, CuraEngine WASM)
   - Overhang detection algorithms (45° threshold, dot product)
   - Tree vs linear support trade-offs
   - Pricing calculation methods (support volume from G-code)
   - Integration with existing slicer CLI

3. **`specs/3d-orientation-controls/research_auto_orient_algorithms.md`**
   - STL-tweaker bi-algorithmic scoring function
   - Multi-objective optimization (NSGA-II genetic algorithm)
   - Super-Fibonacci sampling (8.3% better than standard Fibonacci)
   - PCA initialization for principal axes
   - Performance optimization techniques (adaptive sampling, Web Workers)
   - Scoring metrics: overhang minimization, contact quality, stability

These documents provide deep technical context for implementation decisions and future enhancements.
