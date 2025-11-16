# Bug: 3D Model Rendering & Positioning in QuickOrder

## Bug Description

Critical 3D viewer issues on QuickOrder page where uploaded models don't render correctly:

1. **Model not sitting on plate**: Model appears floating or embedded "halfway through" build plate instead of sitting flat with bottom at Y=0
2. **Gizmo misaligned**: TransformControls (rotation gizmo) appear randomly positioned, don't properly enclose model
3. **Support material invisible**: Overhang highlighting (red overlay) not rendering or updating
4. **Plate limit errors**: Constant "model exceeds +X plate limit by Xmm" errors even for small models that fit
5. **Controls not affecting model**: Gizmo allows rotation but model doesn't respond correctly to transformations

## Problem Statement

3D model positioning/rendering system has fundamental flaws in transformation order, bounding box calculations after rotation, and coordinate system handling. Model transforms applied to Object3D instead of being baked into geometry, causing AABB (axis-aligned bounding box) expansion after rotation, which breaks centering, bounds checking, and gizmo attachment.

## Solution Statement

Fix transformation architecture by:
1. **Bake rotations into geometry** instead of applying to Object3D.quaternion (use `geometry.applyMatrix4`)
2. **Fix operation order**: rotate → bake → recenter → bounds check (not current: rotate → recenter → bounds check)
3. **Add space="local"** to TransformControls for proper gizmo alignment
4. **Fix recenterObjectToGround()** to handle AABB expansion after rotation
5. **Update bounds checking** to use correct world-space AABB after all transforms

## Steps to Reproduce

1. Navigate to `/quick-order` page
2. Upload any 3D model (STL/3MF file)
3. Wait for preview to load
4. **Observe**: Model not sitting flat on plate, gizmo floating randomly
5. Enable "Show Supports" checkbox
6. **Observe**: No red overlay visible (or doesn't update on rotation)
7. Try rotating model with gizmo or rotation buttons
8. **Observe**: "Model exceeds plate limit" errors appear
9. Try to lock orientation
10. **Observe**: Button disabled due to out-of-bounds error

## Root Cause Analysis

### Issue 1: Model not sitting on plate

**File**: `src/lib/3d/coordinates.ts:85-95` (`recenterObjectToGround`)

**Problem**:
- Function uses `Box3.setFromObject()` which computes world-space AABB
- After quaternion rotation applied to Object3D, AABB expands to stay axis-aligned
- `workingBox.min.y` is NOT the actual geometry bottom, but expanded AABB bottom
- Centering calculation: `object.position.y -= workingBox.min.y` places wrong surface at Y=0

**Example**:
```
Original cube: 50mm³ at origin
After 45° rotation: AABB expands to ~70mm (diagonal)
min.y shifts from 0 to -10mm (expanded envelope)
Centering places AABB min at Y=0 → model appears embedded
```

### Issue 2: Gizmo misaligned

**File**: `src/components/3d/OrientationGizmo.tsx:53-56`

**Problem**:
- TransformControls defaults to `space="world"` (missing explicit setting)
- Attaches to Object3D.position which may not match visual/geometric center after rotation
- Model geometry has arbitrary origin from STL file, not centered at (0,0,0)
- Gizmo centers on mesh.position, not mesh bounding box center

**Research finding**:
> "TransformControls centers on mesh's local origin (0,0,0), not geometric center. Must recenter geometry before attaching controls."

### Issue 3: Support material invisible

**Files**:
- `src/lib/3d/overhang-detector.ts` - Detection algorithm
- `src/components/3d/OverhangHighlight.tsx` - Rendering component

**Problem**:
- Overhang detection runs on geometry with quaternion applied
- But rendered geometry may not have same transform (Object3D vs geometry mismatch)
- OverhangHighlight component receives face indices but geometry reference may be stale
- Faces extracted from merged geometry don't update after rotation

### Issue 4: Plate limit errors

**File**: `src/lib/3d/build-volume.ts` + `ModelViewer.tsx:computeBoundsStatus`

**Problem**:
- Bounds check uses `Box3.setFromObject()` on rotated Object3D
- AABB expansion after rotation makes bounds appear larger than actual geometry
- Example: 220mm cube rotated 45° → AABB = 311mm (√2 × 220) → exceeds 240mm plate
- But actual diagonal footprint may fit within 240mm circle

### Issue 5: Wrong transformation order

**File**: `src/lib/3d/coordinates.ts:126-144` (`rotateObject`)

**Current flow**:
```typescript
1. object.rotateX/Y/Z(radians)  // Applies to Object3D.quaternion
2. recenterObjectToGround()     // Uses expanded AABB
```

**Should be**:
```typescript
1. Build rotation matrix from quaternion
2. geometry.applyMatrix4(matrix) // Bake into vertices
3. geometry.computeBoundingBox() // Accurate local bbox
4. Translate geometry to center
5. Reset Object3D transforms to identity
```

**Research finding**:
> "Mixing Object3D.quaternion (runtime) with geometry transforms (baked) - pick one approach. For final export/orientation workflow, bake transforms into geometry."

## Relevant Files

### Core transformation files (MUST FIX):

- **src/lib/3d/coordinates.ts** - Contains `recenterObjectToGround()` (lines 85-95), `rotateObject()` (lines 126-144), `alignGeometryToHorizontalPlane()` (lines 58-70). Need to fix AABB handling and operation order.

- **src/components/3d/OrientationGizmo.tsx** - TransformControls wrapper. Missing `space="local"` on line 53-56. Need to add for proper gizmo alignment.

- **src/components/3d/ModelViewer.tsx** - Main 3D viewer with model loading, transform application. Need to verify correct use of `recenterObjectToGround()`, fix transform flow on load.

### Supporting files (REVIEW):

- **src/lib/3d/build-volume.ts** - Bounds checking logic `describeBuildVolume()`. May need adjustment for AABB vs actual geometry bounds.

- **src/components/3d/OverhangHighlight.tsx** - Support material rendering. Verify geometry reference stays synced with rotations.

- **src/lib/3d/overhang-detector.ts** - Overhang detection algorithm. Verify receives correct transformed geometry.

- **src/stores/orientation-store.ts** - Orientation state management. Verify quaternion/position storage correct.

## Step by Step Tasks

IMPORTANT: Execute every step in order, top to bottom.

### 1. Fix recenterObjectToGround() AABB handling

**File**: `src/lib/3d/coordinates.ts`

**Changes**:
- Update `recenterObjectToGround()` at lines 85-95
- Calculate offset correctly accounting for AABB expansion
- Use position deltas instead of absolute values

**Code**:
```typescript
export function recenterObjectToGround(object: THREE.Object3D): void {
  object.updateMatrixWorld(true); // CRITICAL: update before setFromObject

  workingBox.setFromObject(object);
  if (!isFinite(workingBox.min.x) || !isFinite(workingBox.min.y) || !isFinite(workingBox.min.z)) {
    return;
  }

  workingBox.getCenter(workingCenter);

  // Calculate offsets as deltas from current position
  const offsetX = workingCenter.x - object.position.x;
  const offsetY = workingBox.min.y - object.position.y;
  const offsetZ = workingCenter.z - object.position.z;

  // Apply deltas (not absolute positions)
  object.position.x -= offsetX;
  object.position.y -= offsetY;
  object.position.z -= offsetZ;

  object.updateMatrixWorld(true);
}
```

**Why**: Current code uses `object.position -= workingCenter`, but workingCenter is world-space AABB center which doesn't match Object3D origin after rotation. Using deltas preserves rotation while centering correctly.

### 2. Add space="local" to TransformControls

**File**: `src/components/3d/OrientationGizmo.tsx`

**Changes**:
- Add `space="local"` prop to TransformControls at line 53

**Code**:
```typescript
return (
  <TransformControls
    object={target}
    enabled={enabled}
    mode={mode}
    space="local" // ← ADD THIS LINE
    translationSnap={mode === "translate" ? translationSnap ?? 1 : undefined}
    showX
    showY
    showZ
    onMouseDown={handleMouseDown}
    onMouseUp={handleMouseUp}
    onObjectChange={handleObjectChange}
  />
);
```

**Why**: Defaults to world space, causing gizmo axes to not align with rotated model. Local space makes gizmo follow model orientation.

### 3. Verify ModelViewer.tsx transform flow

**File**: `src/components/3d/ModelViewer.tsx`

**Review** (don't change unless needed):
- Check model load flow calls `recenterObjectToGround()` AFTER any quaternion application
- Verify `updateMatrixWorld(true)` called before bounds checks
- Ensure geometry has valid bounding box before operations

**Find pattern**:
```bash
# Search for recenterObjectToGround calls
grep -n "recenterObjectToGround" src/components/3d/ModelViewer.tsx
```

**Verify**:
- Always called after quaternion changes
- Called after `group.updateMatrixWorld(true)`
- Not called in tight loop (debounced)

### 4. Fix rotateObject operation order

**File**: `src/lib/3d/coordinates.ts`

**Changes**: Update `rotateObject()` at lines 126-144

**Code**:
```typescript
export function rotateObject(
  object: THREE.Object3D,
  axis: "x" | "y" | "z",
  degrees: number
): void {
  const radians = THREE.MathUtils.degToRad(degrees);

  // Build rotation quaternion for this increment
  const rotQuat = new THREE.Quaternion();
  const axisVec =
    axis === "x" ? new THREE.Vector3(1, 0, 0) :
    axis === "y" ? new THREE.Vector3(0, 1, 0) :
                   new THREE.Vector3(0, 0, 1);
  rotQuat.setFromAxisAngle(axisVec, radians);

  // Apply to current quaternion (compound rotation)
  object.quaternion.multiplyQuaternions(rotQuat, object.quaternion).normalize();

  // CRITICAL: update world matrix before recentering
  object.updateMatrixWorld(true);

  // Now recenter using updated AABB
  recenterObjectToGround(object);
}
```

**Why**:
- Current code uses `rotateX/Y/Z` which modifies Euler angles (gimbal lock risk)
- Missing `updateMatrixWorld()` before recenter causes stale AABB
- Quaternion multiplication preserves rotation accuracy

### 5. Test bounds checking with rotated models

**File**: `src/lib/3d/build-volume.ts` (review only)

**Verify**:
- `describeBuildVolume()` receives Box3 that was computed AFTER `updateMatrixWorld(true)`
- No changes needed if fixes above work correctly
- If still seeing false positives, may need OBB (oriented bounding box) instead of AABB

**Test case**:
- Upload 220mm cube
- Rotate 45°
- Should NOT exceed 240mm plate (diagonal = 311mm but footprint fits)
- If error persists, add debug logging to see actual AABB dimensions

### 6. Verify support material rendering

**File**: `src/components/3d/OverhangHighlight.tsx`

**Review**:
- Check `overhangFaces` prop updates when model rotated
- Verify `geometry` reference matches current model state
- Ensure `BufferGeometryUtils.mergeGeometries()` receives correct face indices

**Test**:
- Enable "Show Supports"
- Rotate model
- Red overlay should update to show new overhangs

**If broken**: Check overhang-detector receives transformed geometry, not original

### 7. Add build plate coordinate validation

**File**: `src/components/3d/BuildPlate.tsx`

**Verify**:
- Grid at position `[0, 0, 0]` (line 25)
- Build volume box at `position={[0, BUILD_HEIGHT/2, 0]}` (line 28)
- Coordinate system: Y-up (confirmed in coordinates.ts line 4)

**No changes needed** - just validate model coordinates match plate coordinates

### 8. Run validation commands

Execute all commands in Validation Commands section below

## Validation Commands

Execute every command to validate the bug is fixed.

```bash
# 1. TypeScript compilation
npm run build
# EXPECTED: Build succeeds with 0 errors

# 2. Type checking
npm run typecheck
# EXPECTED: No type errors in coordinates.ts, OrientationGizmo.tsx, ModelViewer.tsx

# 3. Start dev server
npm run dev
# Navigate to http://localhost:3000/quick-order

# 4. Test model positioning
# - Upload test STL (any model)
# - EXPECTED: Model sits flat on build plate (no floating/embedding)
# - EXPECTED: Bottom surface at Y=0 (check grid alignment)
# - EXPECTED: Model centered at origin in XZ plane

# 5. Test gizmo alignment
# - Enable rotation gizmo
# - EXPECTED: Gizmo rings enclose model properly
# - EXPECTED: Gizmo axes align with model orientation (if rotated)
# - EXPECTED: Can grab and rotate smoothly

# 6. Test support visualization
# - Upload model with overhangs
# - Enable "Show Supports"
# - EXPECTED: Red overlay appears on overhang faces
# - Rotate model
# - EXPECTED: Red overlay updates to show new overhangs (debounced ~300ms)

# 7. Test rotation controls
# - Click rotation buttons (X/Y/Z ±45°)
# - EXPECTED: Model rotates correctly
# - EXPECTED: Stays centered on plate after each rotation
# - EXPECTED: No "halfway through box" appearance

# 8. Test bounds checking
# - Upload 220mm cube (within plate limits)
# - Rotate 45°
# - EXPECTED: No "exceeds plate limit" errors (fits in 240mm circle)
# - Upload 250mm cube (too large)
# - EXPECTED: "exceeds plate limit" error shown
# - Error should be accurate (no false positives)

# 9. Test QuickOrder workflow
# - Upload model
# - Orient using gizmo/buttons
# - Enable supports
# - Click "Lock Orientation"
# - EXPECTED: Can proceed to next step
# - Navigate back
# - EXPECTED: Orientation preserved

# 10. Visual regression check
# Open browser DevTools → 3D view tab (if available)
# Inspect model position in scene hierarchy:
# - Group position should be near (0, 0, 0)
# - Group quaternion should match applied rotation
# - Build plate at (0, 0, 0)
# - Model AABB min.y ≈ 0 (± 0.1mm tolerance)
```

## Notes

### Research Findings Applied

From open-source 3D slicers (ProtoUV, MinceSlicer):
- **Always call `updateMatrixWorld(true)` before `Box3.setFromObject()`** - critical for accurate bounds
- **Use `geometry.applyMatrix4()` for one-time orientations** - bakes transform into vertices, makes bbox accurate again
- **TransformControls space modes**: world (default) vs local - local follows object rotation
- **AABB expansion is expected** - rotated AABBs grow to stay axis-aligned, this is correct Three.js behavior

### Why Not Use Geometry Baking Everywhere?

**Current hybrid approach** (Object3D quaternion + geometry transforms):
- ✅ Allows runtime rotation without modifying vertices
- ✅ Stores quaternion in state for server export
- ❌ AABB becomes inaccurate after rotation
- ❌ Centering/bounds checking complicated

**Pure geometry baking** (applyMatrix4):
- ✅ AABB always accurate (local space)
- ✅ Simpler centering logic
- ❌ Loses original vertex positions (can't "undo" easily)
- ❌ More expensive (modifies all vertices)

**Recommendation**: Keep hybrid but fix AABB handling with `updateMatrixWorld()` + delta-based centering

### Performance Considerations

- `updateMatrixWorld(true)` forces scene graph update - expensive in tight loops
- Already debounced in overhang detection (300ms)
- Bounds checking should cache result, not recompute every frame
- TransformControls has built-in optimization (only updates on drag)

### Alternative: Oriented Bounding Box (OBB)

If AABB issues persist after fixes:
- Implement OBB using local-space bounding box + world transform
- Check plate bounds using rotated box corners, not AABB
- More accurate for rotated geometry but slower to compute

**Not needed for initial fix** - AABB should work with correct update order

### Browser Console Debugging

Add to ModelViewer.tsx for diagnosis:
```typescript
console.log('Model debug:', {
  position: group.position.toArray(),
  quaternion: group.quaternion.toArray(),
  aabbMin: box.min.toArray(),
  aabbMax: box.max.toArray(),
  aabbSize: box.getSize(new THREE.Vector3()).toArray()
});
```

### Build Plate Coordinate System

Confirmed from BuildPlate.tsx + coordinates.ts:
- **Y-up**: Vertical axis is Y (0,1,0)
- **Ground plane**: XZ (horizontal)
- **Build plate**: Fixed at world origin (0,0,0)
- **Grid**: 240mm × 240mm, 24 divisions = 10mm squares
- **Height limit**: 240mm (Y-axis positive direction)

Model should have:
- `position.y >= 0` (on or above plate)
- `position.x, position.z` near 0 (centered on plate)
- AABB: `min.y ≈ 0`, `max.y <= 240`

## Definition of Done

- [x] All validation commands pass with expected output
- [x] Model sits flat on build plate (Y=0)
- [x] Gizmo properly aligned and encloses model
- [x] Support material renders and updates on rotation
- [x] Bounds checking accurate (no false positives)
- [x] Rotation controls work smoothly
- [x] No TypeScript errors
- [x] QuickOrder workflow completes without errors
- [ ] E2E test added (optional but recommended)
