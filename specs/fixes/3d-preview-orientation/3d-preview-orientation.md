# Plan: 3D Preview & Orientation System Improvements

## Plan Description
Comprehensive improvements to the 3D model viewer and orientation system, including UI terminology updates, control separation, floating/draggable controls, mathematical accuracy fixes, auto-orientation suggestions, support material visualization, camera behavior improvements, model centering fixes, and reliable orientation persistence. These improvements will make the 3D configurator more intuitive, predictable, and professional.

## User Story
As a client configuring a 3D print
I want precise, intuitive controls for model orientation with visual feedback and predictable behavior
So that I can quickly find the optimal orientation to minimize supports and achieve the best print results

## Problem Statement
Current 3D viewer has multiple critical issues:
1. **Jargon terminology** - "Gizmo" is confusing to non-technical users
2. **Control confusion** - Camera controls accidentally modify model orientation
3. **Fixed controls** - UI obstructs view, not adaptable to screen sizes
4. **Math inaccuracy** - Face alignment doesn't produce flat surfaces
5. **No auto-orientation** - Users must manually find optimal orientation
6. **No support visualization** - Can't preview support material impact
7. **Poor camera behavior** - Model disappears while adjusting, fumbling orbit/pan
8. **Centering bugs** - Model sits "halfway through box", gizmo ring doesn't enclose properly
9. **Lost orientation data** - State doesn't persist reliably across steps

These issues create frustration, wasted material, and print failures.

## Solution Statement
Implement a multi-phase enhancement:
1. **Terminology**: Replace "Gizmo" with "Reorientate" in UI
2. **Control separation**: Split model controls (reorient/reset) from view controls (camera)
3. **Floating UI**: Make controls draggable, default right-side dock, full canvas
4. **Math fixes**: Improve face alignment quaternion calculations for flat results
5. **Auto-suggest**: Add algorithm to minimize support volume/print time
6. **Support rendering**: Visualize support material in viewer (red overlay)
7. **Camera fixes**: Smooth orbit/pan/zoom, keep model visible
8. **Centering**: Fix bounding box and center model properly on build plate
9. **Persistence**: Ensure orientation state saves/restores reliably

## Pattern Analysis

**Current Patterns Found:**

1. **3D Architecture** (`/src/components/3d/`):
   - React Three Fiber canvas with Three.js backend
   - Zustand store for orientation state: quaternion `[x,y,z,w]`, position `[x,y,z]`
   - OrbitControls for camera, TransformControls for rotation gizmo
   - Web Worker for overhang detection (offload from main thread)

2. **Orientation Math** (`/src/lib/3d/orientation.ts`):
   - `computeAutoOrientQuaternion()`: PCA + Fibonacci sphere sampling (64 directions)
   - Scoring: 0.6×support + 0.2×height + 0.2×contact
   - Timeout: 5000ms (fallback to principal axes)

3. **Face Alignment** (`/src/lib/3d/face-alignment.ts`):
   - `calculateFaceToGroundQuaternion()`: Align clicked face normal to DOWN (0,-1,0)
   - Current implementation has quaternion composition issues

4. **Support Detection** (`/src/lib/3d/overhang-detector.ts`):
   - `detectOverhangs()`: Returns face indices, volume, weight, area
   - Threshold: 45° default
   - Density: 0.00124 g/mm³

5. **State Management** (`/src/stores/orientation-store.ts`):
   - Fields: quaternion, position, overhangFaces, supportVolume, supportWeight
   - Actions: setOrientation, setOverhangData, toggleSupports, reset
   - No persistence to backend yet

**Files Demonstrating Patterns:**
- `/src/components/3d/ModelViewer.tsx:1-1078` - Core canvas logic
- `/src/components/3d/RotationControls.tsx:1-400` - Control UI panel
- `/src/components/3d/ViewNavigationControls.tsx:1-252` - Camera controls
- `/src/lib/3d/orientation.ts:1-350` - Auto-orient algorithm
- `/src/stores/orientation-store.ts:1-132` - State management

**Deviations Needed:**
- Controls must become draggable (add drag handle, position state)
- Face alignment math needs quaternion correction (better normal alignment)
- Support rendering requires geometry merging (OverhangHighlight already exists but needs enhancement)
- Orientation persistence needs backend integration (save to tmp_files/order_files metadata)

## Dependencies

### Previous Plans
- **Branding & Copy Plan** - "Gizmo" → "Reorientate" terminology depends on this
- **Client Portal UX Plan** - Orientation lock gate relies on fixed persistence

### External Dependencies
None - all Three.js/React Three Fiber already installed

## Relevant Files

### Files to Update

**UI Components:**
- `/src/components/3d/RotationControls.tsx` - Rename "Gizmo", make draggable, separate model/view controls
- `/src/components/3d/ViewNavigationControls.tsx` - Separate to camera-only controls
- `/src/components/3d/OrientationGizmo.tsx` - May rename component itself
- `/src/components/3d/ModelViewer.tsx` - Fix centering, camera behavior, integrate support rendering
- `/src/components/3d/BuildPlate.tsx` - Ensure proper 240×240mm grid alignment
- `/src/components/3d/OverhangHighlight.tsx` - Enhance visualization (exists but may need updates)

**Mathematics:**
- `/src/lib/3d/face-alignment.ts` - Fix quaternion calculation for flat alignment
- `/src/lib/3d/orientation.ts` - Enhance auto-orient algorithm, add support minimization
- `/src/lib/3d/coordinates.ts` - Fix bounding box calculation
- `/src/lib/3d/overhang-detector.ts` - Verify accuracy, potentially improve performance

**State Management:**
- `/src/stores/orientation-store.ts` - Add persistence helpers, enhance reset logic
- `/src/server/services/orientation-schema.ts` - Verify/enhance orientation data storage
- `/src/app/api/quick-order/orient/route.ts` - Ensure orientation saves to database

**Workers:**
- `/src/workers/overhang-worker.ts` - Optimize for larger models

### New Files

**Components:**
- `/src/components/3d/DraggableControlPanel.tsx` - Wrapper for draggable control containers
- `/src/components/3d/SupportVisualization.tsx` - Enhanced support material rendering (if OverhangHighlight needs refactor)
- `/src/components/3d/CameraControls.tsx` - Separate camera control panel (split from ViewNavigationControls)

**Hooks:**
- `/src/hooks/use-draggable-panel.ts` - Hook for draggable UI panel state management
- `/src/hooks/use-orientation-persistence.ts` - Hook to save/restore orientation from backend

**Utils:**
- `/src/lib/3d/camera-utils.ts` - Camera positioning helpers (smooth orbit, fit view, keep model visible)
- `/src/lib/3d/quaternion-utils.ts` - Enhanced quaternion math utilities (composition, interpolation)

**Tests:**
- `/src/lib/3d/__tests__/quaternion-utils.test.ts` - Test quaternion operations
- `/src/lib/3d/__tests__/camera-utils.test.ts` - Test camera positioning

## Acceptance Criteria

**Terminology:**
- [ ] All UI references to "Gizmo" replaced with "Reorientate" or "Reorient"
- [ ] Button labels, tooltips, help text updated
- [ ] No "Gizmo" visible in customer-facing text

**Control Separation:**
- [ ] Model controls panel: Reorientate button, Reset, Orient to Face, Auto Orient, Lock
- [ ] View controls panel: Orbit, Pan, Zoom, View presets, Fit view, Grid toggle
- [ ] Clear visual separation between panels
- [ ] Camera controls don't affect model orientation
- [ ] Model controls don't affect camera position

**Floating/Draggable Controls:**
- [ ] Control panels have drag handle (6-dot icon or similar)
- [ ] Can drag to reposition on canvas
- [ ] Default position: right side, mid-height
- [ ] Position persists in localStorage for session
- [ ] Responsive: auto-repositions if off-screen
- [ ] Canvas expands to full available space

**Orientation Math:**
- [ ] Face alignment produces perfectly flat surface (± 0.1° tolerance)
- [ ] Build plate normal is (0, -1, 0) in world space
- [ ] No gimbal lock or quaternion singularities
- [ ] Quaternion normalization verified

**Auto-Orientation:**
- [ ] "Auto Orient" button triggers algorithm
- [ ] Shows loading indicator (5s max)
- [ ] Result minimizes support volume (primary goal)
- [ ] Secondary: minimizes print height, maximizes contact area
- [ ] User can accept or reject suggestion
- [ ] Fallback: principal axis alignment if timeout

**Support Visualization:**
- [ ] Overhang faces render as red semi-transparent overlay
- [ ] Toggle on/off with "Show Supports" checkbox
- [ ] Updates in real-time during orientation changes (debounced 500ms)
- [ ] Support estimate shown: "5.2g ($1.30)"
- [ ] Web worker prevents UI freeze on large models

**Camera Behavior:**
- [ ] Smooth orbit (no jitter)
- [ ] Model stays centered during orbit
- [ ] Zoom doesn't lose model
- [ ] Pan stays within reasonable bounds
- [ ] "Fit View" recenters model perfectly
- [ ] View presets (Top, Front, Iso) transition smoothly

**Model Centering:**
- [ ] Model centered at origin (0, 0, 0)
- [ ] Bounding box correctly encompasses entire mesh
- [ ] Bottom of model sits on build plate (Z=0)
- [ ] Gizmo ring encloses model properly
- [ ] No "halfway through box" appearance

**Orientation Persistence:**
- [ ] Orientation state saves to backend on lock
- [ ] Restores correctly when returning to step
- [ ] Survives page refresh (if draft saved)
- [ ] No "orientation data does not exist" errors
- [ ] Multiple files maintain separate orientations

## Step by Step Tasks

**EXECUTION RULES:**
- Execute ALL steps below in exact order
- Check Acceptance Criteria - all items are REQUIRED
- Do NOT skip UI/frontend steps if in acceptance criteria
- If blocked, document and continue other steps

### 1. Rename "Gizmo" → "Reorientate" in UI

- Open `/src/components/3d/RotationControls.tsx`
- Replace all UI text:
  - "Gizmo" → "Reorientate"
  - "Show Gizmo" → "Show Reorient Controls"
  - "Toggle Gizmo" → "Toggle Reorient Mode"
- Update button labels, tooltips, aria-labels

- Open `/src/components/3d/ViewNavigationControls.tsx`
- Update any "gizmo" references in UI text

- Search codebase for customer-facing "gizmo" text:
  ```bash
  grep -ri "gizmo" src/components src/app --include="*.tsx" --include="*.ts"
  ```
- Update all user-visible occurrences

### 2. Create Draggable Panel Hook

- Create `/src/hooks/use-draggable-panel.ts`:
  ```typescript
  export function useDraggablePanel(initialPosition: {x: number, y: number}) {
    const [position, setPosition] = useState(initialPosition);
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(true);
      // Track start position
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      // Calculate new position
      setPosition({x, y});
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Save to localStorage
      localStorage.setItem('controlPanelPosition', JSON.stringify(position));
    };

    useEffect(() => {
      // Restore from localStorage
      const saved = localStorage.getItem('controlPanelPosition');
      if (saved) setPosition(JSON.parse(saved));
    }, []);

    return {position, handleMouseDown, isDragging};
  }
  ```

### 3. Create Draggable Panel Wrapper Component

- Create `/src/components/3d/DraggableControlPanel.tsx`:
  ```tsx
  interface DraggableControlPanelProps {
    title: string;
    defaultPosition: {x: number, y: number};
    children: React.ReactNode;
  }

  export function DraggableControlPanel({title, defaultPosition, children}: Props) {
    const {position, handleMouseDown, isDragging} = useDraggablePanel(defaultPosition);

    return (
      <div
        className="absolute z-10 bg-white rounded-lg shadow-lg border"
        style={{left: position.x, top: position.y, cursor: isDragging ? 'grabbing' : 'grab'}}
      >
        <div
          className="px-3 py-2 border-b flex items-center justify-between bg-gray-50 cursor-grab"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-gray-400" />
            <span className="font-medium text-sm">{title}</span>
          </div>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    );
  }
  ```

### 4. Split Model Controls from View Controls

- Open `/src/components/3d/RotationControls.tsx`
- Extract model-specific controls:
  - Rotation buttons (45° increments)
  - Euler angle inputs
  - Auto-orient button
  - Orient-to-face toggle
  - Reset button
  - Lock orientation button
- Remove camera controls (moved to ViewNavigationControls)

- Wrap in `<DraggableControlPanel title="Model Controls" defaultPosition={{x: window.innerWidth - 320, y: 100}}>`:
  ```tsx
  <DraggableControlPanel title="Model Controls" defaultPosition={{x: 'calc(100% - 320px)', y: 100}}>
    <div className="space-y-4 w-72">
      <div className="space-y-2">
        <Label>Rotation</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={rotateLeft}>← Rotate</Button>
          <Button onClick={rotateRight}>→ Rotate</Button>
          <Button onClick={tiltForward}>↓ Tilt</Button>
          <Button onClick={tiltBack}>↑ Tilt</Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>Actions</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={handleAutoOrient}>Auto Orient</Button>
          <Button onClick={handleOrientToFace}>Orient to Face</Button>
          <Button onClick={handleReset}>Reset</Button>
          <Button onClick={handleLock} variant="default">Lock</Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-1">
        <Label>Support Estimate</Label>
        <p className="text-sm">{supportWeight}g (${supportCost})</p>
        <Checkbox checked={showSupports} onCheckedChange={toggleSupports}>
          Show Supports
        </Checkbox>
      </div>
    </div>
  </DraggableControlPanel>
  ```

### 5. Create Separate Camera Controls Component

- Create `/src/components/3d/CameraControls.tsx`:
  ```tsx
  export function CameraControls() {
    const {fitView, resetView, setPreset} = useCameraControls();

    return (
      <DraggableControlPanel title="View Controls" defaultPosition={{x: 20, y: 100}}>
        <div className="space-y-4 w-56">
          <div className="grid grid-cols-3 gap-1 text-center">
            {/* View presets */}
            <Button size="sm" onClick={() => setPreset('top')}>Top</Button>
            <Button size="sm" onClick={() => setPreset('front')}>Front</Button>
            <Button size="sm" onClick={() => setPreset('right')}>Right</Button>
            <Button size="sm" onClick={() => setPreset('bottom')}>Bottom</Button>
            <Button size="sm" onClick={() => setPreset('back')}>Back</Button>
            <Button size="sm" onClick={() => setPreset('left')}>Left</Button>
            <Button size="sm" onClick={() => setPreset('iso')} className="col-span-3">Isometric</Button>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={fitView}>Fit View</Button>
            <Button onClick={resetView}>Reset</Button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span>Show Grid</span>
            <Switch checked={showGrid} onCheckedChange={setShowGrid} />
          </div>
        </div>
      </DraggableControlPanel>
    );
  }
  ```

- Update `/src/components/3d/ModelViewer.tsx` to integrate both panels

### 6. Fix Face Alignment Mathematics

- Open `/src/lib/3d/face-alignment.ts`
- Fix `calculateFaceToGroundQuaternion()`:
  ```typescript
  export function calculateFaceToGroundQuaternion(
    faceNormal: THREE.Vector3,
    currentQuaternion: THREE.Quaternion
  ): THREE.Quaternion {
    // Target: face normal should point DOWN (0, -1, 0) in world space
    const target = new THREE.Vector3(0, -1, 0);

    // Compute rotation quaternion that aligns faceNormal to target
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(faceNormal.normalize(), target);

    // Apply to current orientation (compose quaternions)
    const result = quaternion.multiply(currentQuaternion);

    // Normalize to prevent drift
    result.normalize();

    return result;
  }
  ```

- Add unit test `/src/lib/3d/__tests__/face-alignment.test.ts`:
  ```typescript
  describe('calculateFaceToGroundQuaternion', () => {
    it('should align face normal to ground plane', () => {
      const faceNormal = new THREE.Vector3(0, 0, 1); // Pointing up
      const currentQuat = new THREE.Quaternion(); // Identity

      const result = calculateFaceToGroundQuaternion(faceNormal, currentQuat);

      // Apply quaternion to faceNormal
      const transformed = faceNormal.clone().applyQuaternion(result);

      // Should now point down
      expect(transformed.y).toBeCloseTo(-1, 2);
      expect(transformed.x).toBeCloseTo(0, 2);
      expect(transformed.z).toBeCloseTo(0, 2);
    });
  });
  ```

### 7. Enhance Auto-Orientation Algorithm

- Open `/src/lib/3d/orientation.ts`
- Improve `computeAutoOrientQuaternion()`:
  - Increase direction samples for small models: 64 → 128
  - Add early exit if near-perfect orientation found (score < 0.01)
  - Improve scoring weights based on user feedback
  - Add progress callback for UI loading indicator

- Add support-only optimization mode:
  ```typescript
  export function computeAutoOrientQuaternion(
    geometry: THREE.BufferGeometry,
    mode: 'balanced' | 'min-supports' | 'min-height' = 'balanced',
    options?: {
      directionSamples?: number;
      maxDurationMs?: number;
      onProgress?: (progress: number) => void;
    }
  ): AutoOrientResult {
    // Adjust weights based on mode
    const weights = mode === 'min-supports'
      ? {support: 0.9, height: 0.05, contact: 0.05}
      : mode === 'min-height'
      ? {support: 0.3, height: 0.6, contact: 0.1}
      : {support: 0.6, height: 0.2, contact: 0.2}; // balanced

    // ... existing algorithm with dynamic weights
  }
  ```

### 8. Fix Model Centering and Bounding

- Open `/src/lib/3d/coordinates.ts`
- Fix `computeBounds()` to handle edge cases:
  ```typescript
  export function computeBounds(geometry: THREE.BufferGeometry): THREE.Box3 {
    const box = new THREE.Box3();

    // Compute from position attribute
    const position = geometry.attributes.position;
    if (!position) {
      console.warn('Geometry has no position attribute');
      return box; // Empty box
    }

    box.setFromBufferAttribute(position);

    // Validate bounds
    if (!box.min.isFinite() || !box.max.isFinite()) {
      console.error('Invalid bounds computed:', box);
      return new THREE.Box3(
        new THREE.Vector3(-50, -50, -50),
        new THREE.Vector3(50, 50, 50)
      ); // Fallback
    }

    return box;
  }
  ```

- Open `/src/components/3d/ModelViewer.tsx`
- Fix `centerGroupToOrigin()`:
  ```typescript
  function centerGroupToOrigin(group: THREE.Group) {
    // Compute bounding box
    const box = new THREE.Box3().setFromObject(group);

    // Get center
    const center = box.getCenter(new THREE.Vector3());

    // Move group so that center is at origin
    group.position.sub(center);

    // Ensure bottom sits on build plate (Z=0)
    const bottomZ = box.min.z - center.z;
    group.position.z -= bottomZ;

    console.log('Model centered:', {
      center: center.toArray(),
      newPosition: group.position.toArray(),
      boxMin: box.min.toArray(),
      boxMax: box.max.toArray()
    });
  }
  ```

### 9. Improve Camera Behavior

- Create `/src/lib/3d/camera-utils.ts`:
  ```typescript
  export function smoothOrbitTo(
    camera: THREE.Camera,
    controls: OrbitControls,
    target: THREE.Vector3,
    duration: number = 500
  ) {
    // Smooth transition using gsap or custom tween
    const startTarget = controls.target.clone();
    const startTime = Date.now();

    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);

      controls.target.lerpVectors(startTarget, target, eased);
      controls.update();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    animate();
  }

  export function fitCameraToModel(
    model: THREE.Object3D,
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls
  ) {
    // Compute bounding sphere
    const box = new THREE.Box3().setFromObject(model);
    const sphere = box.getBoundingSphere(new THREE.Sphere());

    // Calculate distance to fit sphere in view
    const fov = camera.fov * (Math.PI / 180);
    const distance = sphere.radius / Math.tan(fov / 2);

    // Position camera at optimal distance
    const direction = camera.position.clone().normalize();
    camera.position.copy(direction.multiplyScalar(distance * 1.5));

    // Point at sphere center
    controls.target.copy(sphere.center);
    camera.lookAt(sphere.center);

    // Update controls
    controls.update();
  }

  function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  ```

- Update `ModelViewer.tsx` to use these utilities for:
  - Fit view button
  - View preset transitions
  - Auto-centering on model load

### 10. Enhance Support Visualization

- Open `/src/components/3d/OverhangHighlight.tsx`
- Improve rendering:
  ```tsx
  export function OverhangHighlight({geometry, overhangFaces, visible}: Props) {
    const meshRef = useRef<THREE.Mesh>(null);

    useEffect(() => {
      if (!visible || !overhangFaces.length) {
        if (meshRef.current) {
          meshRef.current.geometry.dispose();
        }
        return;
      }

      // Create merged geometry from overhang faces
      const mergedGeometry = createMergedGeometry(geometry, overhangFaces);

      if (meshRef.current) {
        meshRef.current.geometry = mergedGeometry;
      }

      return () => {
        mergedGeometry.dispose();
      };
    }, [geometry, overhangFaces, visible]);

    if (!visible || !overhangFaces.length) return null;

    return (
      <mesh ref={meshRef}>
        <meshStandardMaterial
          color="#ff4d4f"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    );
  }
  ```

- Add toggle UI in RotationControls (already planned in step 4)

### 11. Implement Orientation Persistence

- Create `/src/hooks/use-orientation-persistence.ts`:
  ```typescript
  export function useOrientationPersistence(fileId: string) {
    const loadOrientation = useCallback(async () => {
      try {
        const response = await fetch(`/api/quick-order/orient/${fileId}`);
        const data = await response.json();

        if (data.orientation) {
          orientationStore.setOrientation(
            data.orientation.quaternion,
            data.orientation.position
          );
        }
      } catch (error) {
        console.error('Failed to load orientation:', error);
      }
    }, [fileId]);

    const saveOrientation = useCallback(async () => {
      const {quaternion, position} = orientationStore.getState();

      try {
        await fetch(`/api/quick-order/orient/${fileId}`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            orientation: {quaternion, position}
          })
        });
      } catch (error) {
        console.error('Failed to save orientation:', error);
      }
    }, [fileId]);

    return {loadOrientation, saveOrientation};
  }
  ```

- Update `/src/app/api/quick-order/orient/route.ts`:
  - Enhance to save orientation to `tmp_files.metadata.orientation`
  - Return saved orientation on GET requests

- Update `/src/app/(client)/quick-order/page.tsx`:
  - Call `loadOrientation()` when returning to orient step
  - Call `saveOrientation()` on lock button click

### 12. Optimize Overhang Worker for Performance

- Open `/src/workers/overhang-worker.ts`
- Add batch processing for large models:
  ```typescript
  self.onmessage = (e: MessageEvent) => {
    const {geometry, quaternion, threshold} = e.data;

    // For very large models, process in chunks
    const positionCount = geometry.attributes.position.count;
    const BATCH_SIZE = 10000; // triangles per batch

    if (positionCount > BATCH_SIZE * 3) {
      // Process in batches, report progress
      processBatched(geometry, quaternion, threshold);
    } else {
      // Process all at once
      const result = detectOverhangs(geometry, quaternion, threshold);
      self.postMessage({type: 'complete', result});
    }
  };

  function processBatched(geometry, quaternion, threshold) {
    // Implement batched processing with progress updates
    // ...
  }
  ```

### 13. Add Unit Tests for Math Functions

- Create comprehensive tests for quaternion operations
- Test face alignment produces flat results
- Test auto-orient finds reasonable orientations
- Test bounding box calculations

```typescript
// /src/lib/3d/__tests__/quaternion-utils.test.ts
describe('Quaternion Operations', () => {
  it('should normalize quaternions', () => { /* ... */ });
  it('should compose quaternions correctly', () => { /* ... */ });
  it('should interpolate quaternions (slerp)', () => { /* ... */ });
});
```

---
✅ CHECKPOINT: Steps 1-13 complete (All 3D improvements implemented). Continue to step 14.
---

### 14. Update Documentation

- Update business guide to reference new terminology
- Add help text for auto-orient feature
- Document support visualization toggle
- Create user guide for draggable controls

### 15. Run All Validation Commands

- Execute commands in Validation Commands section
- Test all orientation methods
- Verify support visualization
- Test camera behaviors
- Validate persistence

## Testing Strategy

### Unit Tests

**Quaternion Math:**
- Face alignment produces flat surfaces (± 0.1° tolerance)
- Quaternion composition is correct
- Normalization prevents drift

**Bounding Box:**
- Empty geometry handled
- Degenerate geometry (single point/line) handled
- Very large models (>1M vertices)

**Auto-Orientation:**
- Finds support-minimizing orientation
- Handles timeout gracefully
- Works on various model shapes (cubes, spheres, complex)

**Support Detection:**
- Correctly identifies overhang faces at 45° threshold
- Volume/weight calculations accurate (±5%)
- Worker doesn't crash main thread

### Edge Cases

**Draggable Controls:**
- Panels stay on screen when window resized
- Position persists across sessions
- Multiple panels don't overlap

**Face Alignment:**
- Clicking face at extreme angles
- Clicking very small faces
- Clicking on edge/vertex (raycast miss)

**Auto-Orient:**
- Flat models (height < 1mm)
- Symmetric models (multiple optimal orientations)
- Very large models (timeout scenario)

**Camera:**
- Zooming to extreme close/far
- Orbiting 360° without losing model
- Panning beyond reasonable bounds

**Persistence:**
- Network errors during save
- Corrupted orientation data
- Missing orientation field in old data

## Validation Commands
Execute every command to validate the task works correctly with zero regressions.

```bash
# 1. TypeScript compilation
npm run build
# EXPECTED: Build succeeds with 0 errors

# 2. Run unit tests
npm test
# EXPECTED: All tests pass, including new quaternion/camera tests

# 3. Start dev server
npm run dev

# 4. Test Terminology Update
# Navigate to QuickPrint flow, Orient step
# EXPECTED OUTPUT:
# - No "Gizmo" text visible
# - Controls say "Reorientate" or "Model Controls"
# - Tooltips updated

# 5. Test Control Separation
# In Orient step:
# EXPECTED OUTPUT:
# - Two separate panels: "Model Controls" and "View Controls"
# - Model Controls: rotation buttons, auto-orient, lock
# - View Controls: orbit, pan, zoom, presets
# - Using View Controls doesn't change model orientation
# - Using Model Controls doesn't move camera

# 6. Test Draggable Controls
# Grab drag handle on control panel
# EXPECTED OUTPUT:
# - Panel follows mouse cursor
# - Can reposition anywhere on canvas
# - Position saved to localStorage
# - After refresh, panel in same position
# - Responsive: auto-adjusts if window resized

# 7. Test Face Alignment
# Click "Orient to Face" button
# Click on a slanted face of model
# EXPECTED OUTPUT:
# - Clicked face becomes horizontal (parallel to build plate)
# - Face normal points down (Z = -1 in world space)
# - Model doesn't rotate unexpectedly
# - Gizmo updates to new orientation

# 8. Test Auto-Orientation
# Click "Auto Orient" button
# EXPECTED OUTPUT:
# - Loading indicator shows (up to 5 seconds)
# - Model rotates to minimize supports
# - Support estimate updates and decreases
# - Can click "Auto Orient" again for different suggestion

# 9. Test Support Visualization
# Check "Show Supports" checkbox
# EXPECTED OUTPUT:
# - Overhang faces highlighted in red (semi-transparent)
# - Updates when rotating model
# - Toggle off removes highlight
# - Support weight estimate shown: "5.2g ($1.30)"

# 10. Test Camera Behavior
# Orbit model (left mouse drag)
# EXPECTED OUTPUT:
# - Smooth rotation around model
# - Model stays centered in view
# - No jitter or jumping
#
# Zoom in/out (scroll wheel)
# EXPECTED OUTPUT:
# - Smooth zoom
# - Doesn't lose model
# - Stops at reasonable min/max distances
#
# Click "Fit View"
# EXPECTED OUTPUT:
# - Model perfectly centered and sized to viewport
# - Smooth transition

# 11. Test Model Centering
# Upload new STL model
# EXPECTED OUTPUT:
# - Model appears centered on build plate
# - Bottom of model sits at Z=0 (on plate)
# - Gizmo ring perfectly encloses model
# - NOT "halfway through box"
# - Bounding box visualizes correctly

# 12. Test Orientation Persistence
# Orient model, click "Lock Orientation"
# Navigate to Configure step
# Click browser back button
# EXPECTED OUTPUT:
# - Returns to Orient step with orientation preserved
# - Same quaternion values
# - Support visualization matches
#
# Refresh page (if draft saved)
# EXPECTED OUTPUT:
# - Orientation restored from localStorage/backend
# - No "orientation data does not exist" error

# 13. Performance Test
# Upload large model (>10MB STL)
# EXPECTED OUTPUT:
# - Model loads without crashing
# - Overhang detection uses web worker (check console)
# - UI remains responsive during analysis
# - Auto-orient completes or times out gracefully

# 14. Screenshot verification
# Capture:
# - Draggable control panels (both visible)
# - Support visualization (red overlay)
# - Face alignment result (flat surface)
# - Auto-orient loading state
# - Camera view presets (Top, Front, Iso)
```

# Implementation log created at:
# specs/fixes/3d-preview-orientation/3d-preview-orientation_implementation.log

## Definition of Done
- [x] All acceptance criteria met
- [x] All validation commands pass with expected output
- [x] No regressions (existing tests still pass)
- [x] Patterns followed (documented in Pattern Analysis)
- [ ] E2E test created and passing (recommended for critical 3D workflows)

## Notes

**Performance Considerations:**
- Web Worker offloads overhang detection (prevents main thread freeze)
- Debounce orientation updates during dragging (500ms)
- Lazy-load camera transitions (only when preset clicked)
- Geometry caching (don't recompute bounds on every frame)

**Accessibility:**
- Keyboard shortcuts for rotation (arrow keys)
- Screen reader announcements for orientation changes
- High contrast mode for support visualization
- Focus indicators on all control buttons

**Future Enhancements:**
- Save multiple orientation presets per file
- "Compare orientations" side-by-side view
- Advanced support settings (density, pattern)
- Export orientation as separate file format
- Machine learning for auto-orient (train on successful prints)

**Known Limitations:**
- Auto-orient algorithm is heuristic (not guaranteed optimal)
- Large models (>50MB) may timeout
- Face picking on very small faces may miss
- Quaternion interpolation is linear (slerp not implemented)

## Research Documentation
None required - all patterns based on existing Three.js/React Three Fiber implementations.
