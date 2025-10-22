# Issue 4: Quick Order UI Reordering - Implementation Plan

## Objective
Reorganize Quick Order page UI and modify 3D viewer controls:
1. Change order: Files → File Settings → Orient Models (currently: Files → Orient → Settings)
2. Hide 3D controls by default, add toggle button to show/hide
3. Remove X/Y/Z axis rotation controls completely

## Solution Approach
Simple JSX reordering and targeted component modifications. No state refactoring needed since components are loosely coupled.

---

## Implementation Steps

### Step 1: Reorder UI Sections in Quick Order Page (15-30 min)

**File**: `/src/app/(client)/quick-order/page.tsx`

**Current JSX Order** (in LEFT COLUMN, lines 632-1191):
```
1. Files Upload Section (lines 637-760)
2. Orient Models Section (lines 763-873)
3. File Settings Section (lines 876-1191)
```

**New JSX Order** (desired):
```
1. Files Upload Section (keep at top)
2. File Settings Section (move up)
3. Orient Models Section (move down)
```

**Implementation**:
1. Copy File Settings section JSX (lines 876-1191)
2. Cut and move ABOVE Orient Models section
3. Update line spacing/margins if needed

**Code Change**:
```typescript
// Around line 632, in the LEFT COLUMN div:

{/* 1. FILES UPLOAD SECTION - Keep first */}
<div>
  {/* File upload drag-drop (lines 637-760) */}
</div>

{/* 2. FILE SETTINGS SECTION - MOVED UP */}
{uploads.length > 0 && (
  <div className="mt-8">
    {/* File settings (lines 876-1191) */}
  </div>
)}

{/* 3. ORIENT MODELS SECTION - MOVED DOWN */}
{currentStep === "orient" && uploads.length > 0 && (
  <div className="mt-8">
    {/* Orient section (lines 763-873) */}
  </div>
)}
```

**Testing After This Step**:
- [ ] Files section renders first ✓
- [ ] Settings section renders second (when files uploaded) ✓
- [ ] Orient section renders third (when step = "orient") ✓
- [ ] No console errors
- [ ] Workflow still functions

---

### Step 2: Add Controls Visibility Toggle (30-45 min)

**File**: `/src/app/(client)/quick-order/page.tsx`

**Change 1: Replace Hardcoded Flag with State**

Find line 575:
```typescript
// OLD:
const SHOW_ROTATION_CONTROLS = true;

// NEW:
const [showRotationControls, setShowRotationControls] = useState(false);
```

**Change 2: Add Toggle Button**

Around line 826 (where RotationControls is rendered), add toggle button:

```typescript
{/* Orient Models Section */}
{currentStep === "orient" && uploads.length > 0 && (
  <div className="mt-8">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-2xl font-semibold">Orient Models</h2>
        <p className="text-sm text-muted-foreground mt-1">
          File {currentFileIndex + 1} of {uploads.length}
          {orientedCount > 0 && ` (${orientedCount} oriented)`}
        </p>
      </div>

      {/* NEW: Toggle Controls Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowRotationControls(!showRotationControls)}
      >
        {showRotationControls ? (
          <>
            <EyeOff className="h-4 w-4 mr-2" />
            Hide Controls
          </>
        ) : (
          <>
            <Eye className="h-4 w-4 mr-2" />
            Show Controls
          </>
        )}
      </Button>
    </div>

    {/* File Selection Buttons... */}

    {/* STL Viewer */}
    <div className="mt-4">
      <STLViewerWrapper ref={viewerRef} {...} />
    </div>

    {/* Rotation Controls - Now conditional */}
    {showRotationControls && (
      <div className="mt-4">
        <RotationControls
          onRotate={handleRotateModel}
          onReset={handleResetOrientation}
          onCenter={handleCenterModel}
          onLockOrientation={handleLockOrientation}
          isLocking={isLocking}
          disabled={!currentlyOrienting}
        />
      </div>
    )}

    {/* Rest of orient section... */}
  </div>
)}
```

**Import Icons** (add at top of file):
```typescript
import { Eye, EyeOff } from "lucide-react";
```

**Testing After This Step**:
- [ ] Controls hidden by default ✓
- [ ] Toggle button shows "Show Controls" when hidden
- [ ] Click button → controls appear
- [ ] Toggle button changes to "Hide Controls" when visible
- [ ] Click again → controls hide
- [ ] State persists while on orient step
- [ ] Rotation functionality still works when controls visible

---

### Step 3: Remove X/Y/Z Axis Controls (15-30 min)

**File**: `/src/components/3d/RotationControls.tsx`

**Current Structure**:
```
Lines 40-128: Grid with X/Y/Z axis controls
Lines 131-170: Action buttons (Reset, Center, Lock)
Lines 172-179: Help text
```

**Changes**:

**1. Delete X/Y/Z Grid Section**

Delete lines 40-128 (the entire grid containing X/Y/Z controls)

**2. Update Layout**

The action buttons were in a horizontal flex. Keep them that way:

```typescript
export function RotationControls({
  onRotate,  // NOTE: No longer used, but keep for backward compatibility
  onReset,
  onCenter,
  onLockOrientation,
  isLocking = false,
  disabled = false,
}: RotationControlsProps) {
  return (
    <div className="space-y-4">
      {/* Action Buttons - Keep existing layout */}
      <div className="flex gap-2">
        {/* Reset Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          disabled={disabled}
          className="flex-1"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>

        {/* Center Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onCenter}
          disabled={disabled}
          className="flex-1"
        >
          <Maximize className="h-4 w-4 mr-2" />
          Center
        </Button>

        {/* Lock Orientation Button - Primary action */}
        <Button
          size="sm"
          onClick={onLockOrientation}
          disabled={disabled || isLocking}
          className="flex-1"
        >
          {isLocking ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Locking...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Lock Orientation
            </>
          )}
        </Button>
      </div>

      {/* Help Text - Keep existing */}
      <div className="rounded-lg bg-muted/50 p-3">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Tip:</strong> Orient your model to minimize support material.
          The bottom surface will be printed directly on the build plate.
        </p>
      </div>
    </div>
  );
}
```

**3. Keep Props Interface**

Keep `onRotate` prop for backward compatibility even though it's not used:

```typescript
interface RotationControlsProps {
  onRotate: (axis: "x" | "y" | "z", degrees: number) => void;  // Keep but unused
  onReset: () => void;
  onCenter: () => void;
  onLockOrientation: () => void;
  isLocking?: boolean;
  disabled?: boolean;
}
```

**Testing After This Step**:
- [ ] X/Y/Z axis controls completely removed ✓
- [ ] Reset button still works
- [ ] Center button still works
- [ ] Lock Orientation button still works
- [ ] Help text still shows
- [ ] Layout looks clean (no empty space)
- [ ] Manual rotation via viewer still possible (three.js OrbitControls)

---

### Step 4: Verify Manual Rotation Still Works

The STL viewer uses Three.js OrbitControls which allows manual rotation with mouse/touch.

**File**: `/src/components/3d/STLViewer.tsx`

**No changes needed** - OrbitControls is independent of RotationControls component.

**Testing**:
- [ ] Can still rotate model with mouse drag
- [ ] Can still zoom with scroll wheel
- [ ] Can still pan with right-click drag
- [ ] Model responds to touch gestures on mobile

---

## Complete Testing Checklist

### UI Order
- [ ] Files section appears first
- [ ] File Settings section appears second (after upload)
- [ ] Orient Models section appears third (when step = "orient")
- [ ] Layout is visually balanced
- [ ] No awkward spacing or gaps

### Controls Visibility
- [ ] Controls hidden by default when entering orient step
- [ ] "Show Controls" button visible
- [ ] Click shows controls with smooth transition
- [ ] Button changes to "Hide Controls"
- [ ] Click hides controls
- [ ] State persists while on orient step
- [ ] Controls reset to hidden when switching files

### Removed Controls
- [ ] X Axis section completely gone
- [ ] Y Axis section completely gone
- [ ] Z Axis section completely gone
- [ ] No broken UI elements
- [ ] No console errors
- [ ] Reset, Center, Lock buttons still present
- [ ] Help text still visible

### Functionality
- [ ] File upload works
- [ ] File settings (material, layer height, etc.) work
- [ ] Model loads in 3D viewer
- [ ] Manual rotation with mouse/touch works
- [ ] Reset button resets orientation
- [ ] Center button centers model
- [ ] Lock Orientation saves oriented file
- [ ] Workflow progresses to next step
- [ ] Price calculation still works
- [ ] Checkout still works

### Responsive Design
- [ ] Mobile layout (< 768px) works
- [ ] Tablet layout works
- [ ] Desktop layout works
- [ ] Controls toggle button visible on all screen sizes

---

## Files Modified Summary

### Modified
- `/src/app/(client)/quick-order/page.tsx`
  - Reorder JSX sections (Files → Settings → Orient)
  - Replace `SHOW_ROTATION_CONTROLS` flag with state
  - Add toggle button for controls visibility

- `/src/components/3d/RotationControls.tsx`
  - Remove X/Y/Z axis grid (lines 40-128)
  - Keep action buttons (Reset, Center, Lock)
  - Keep help text
  - Keep props interface for backward compatibility

### No Changes Needed
- `/src/components/3d/STLViewer.tsx` - Manual rotation works independently
- `/src/components/3d/STLViewerWrapper.tsx` - No changes needed
- `/src/lib/3d/coordinates.ts` - No changes needed
- `/src/lib/3d/export.ts` - No changes needed

---

## Estimated Effort
- UI reordering: 15-30 minutes
- Controls toggle: 30-45 minutes
- Remove X/Y/Z controls: 15-30 minutes
- Testing: 30 minutes
- **Total**: 1.5-2.5 hours

---

## Success Criteria
✅ Files section renders first
✅ Settings section renders second
✅ Orient section renders third
✅ Controls hidden by default
✅ Toggle button shows/hides controls
✅ X/Y/Z axis controls completely removed
✅ Reset, Center, Lock buttons still work
✅ Manual rotation (mouse drag) still works
✅ Workflow progresses correctly
✅ No console errors or warnings
✅ Responsive design maintained

---

## Rollback Plan

If issues arise, changes are isolated and easy to revert:

### Revert UI Order
Copy/paste sections back to original positions in page.tsx

### Revert Controls Toggle
Change state back to:
```typescript
const SHOW_ROTATION_CONTROLS = true;
```

### Revert X/Y/Z Removal
Restore deleted lines from git history in RotationControls.tsx

---

## Future Enhancements
- [ ] Add keyboard shortcuts for rotation (Arrow keys)
- [ ] Add preset orientations (Top, Front, Side)
- [ ] Add rotation angle input (manual entry)
- [ ] Add "Auto-Orient" button (optimal orientation suggestion)
- [ ] Add multiple views (quad view like CAD software)
- [ ] Add measurement tools
- [ ] Add cross-section view
