# Issue 4: Quick Order UI Reordering - Exploration Summary

## Problem Statement
Reorganize Quick Order page UI to change component order and modify 3D viewer controls:
1. Change order: Files → File Settings → Orient Models (currently: Files → Orient → Settings)
2. Hide 3D controls by default, show via button
3. Remove X/Y/Z axis rotation controls completely

## Current Quick Order Page Structure

### Main File
- **Location**: `/src/app/(client)/quick-order/page.tsx`
- **Type**: Client component ("use client")
- **Size**: 1,358 lines total
- **Architecture**: Single large component with inline sections

### Current Workflow Steps
```
1. Upload     ← Visual step indicator
2. Configure
3. Orient
4. Price
5. Checkout
```

### Current UI Rendering Order

**Two-Column Layout** (lines 632-1354):

**LEFT COLUMN**:
```
1. Files Upload Section (lines 637-760)
   - Drag-drop zone
   - Uploaded files list

2. Orient Models Section (lines 763-873)
   - CONDITIONAL: currentStep === "orient"
   - File selection buttons
   - STLViewerWrapper (3D viewer)
   - RotationControls (SHOW_ROTATION_CONTROLS = true)
   - Orientation status

3. File Settings Section (lines 876-1191)
   - Material selection
   - Layer height, infill, quantity
   - Support settings
   - Calculate Price button
```

**RIGHT COLUMN**:
```
- Price Summary (if priceData exists)
- Shipping & Checkout (if priceData exists)
- Help Card (if no uploads)
```

## Component Breakdown

### 1. File Upload Component
- **Lines**: 637-760
- **Type**: Inline JSX (not extracted to separate file)
- **Features**:
  - Drag-and-drop upload area
  - File input (.stl, .3mf)
  - Uploaded files list (scrollable, max 256px)
  - "Prepare files" button
  - File status indicators

### 2. Orient Models Component
- **Lines**: 763-873
- **Type**: Inline JSX (not extracted)
- **Conditional**: Only shown when `currentStep === "orient"`
- **Features**:
  - File selection buttons with checkmarks
  - STLViewerWrapper component
  - RotationControls component
  - Status displays ("All oriented", progress tracking)
  - "Skip Orientation" button

### 3. File Settings Component
- **Lines**: 876-1191
- **Type**: Inline JSX (not extracted)
- **Features**:
  - Collapsible per-file settings
  - Material dropdown
  - Layer height (mm)
  - Infill percentage
  - Quantity input
  - Support toggle + configuration
  - Error messages
  - Fallback acceptance UI
  - "Calculate Price" button

## 3D Viewer Components Architecture

### STLViewerWrapper
- **File**: `/src/components/3d/STLViewerWrapper.tsx`
- **Lines**: 72 lines
- **Type**: ForwardRef client component
- **Purpose**: Wrapper with mobile detection and dynamic import
- **Features**:
  - Mobile detection (< 768px)
  - Dynamic import (no SSR)
  - Forwards props to STLViewer

### STLViewer
- **File**: `/src/components/3d/STLViewer.tsx`
- **Lines**: 207 lines
- **Type**: ForwardRef component with Three.js canvas
- **Dimensions**: 600px height, full width
- **Exposed Methods** (via ref):
  ```typescript
  {
    getMesh: () => THREE.Mesh | null
    resetOrientation: () => void
    centerModel: () => void
    rotateModel: (axis: "x" | "y" | "z", degrees: number) => void
  }
  ```

### RotationControls (Contains X/Y/Z Controls)
- **File**: `/src/components/3d/RotationControls.tsx`
- **Lines**: 183 lines total
- **Type**: Functional component
- **Props**:
  ```typescript
  {
    onRotate: (axis: "x" | "y" | "z", degrees: number) => void
    onReset: () => void
    onCenter: () => void
    onLockOrientation: () => void
    isLocking?: boolean
    disabled?: boolean
  }
  ```

## X/Y/Z Axis Controls - Exact Location

**File**: `/src/components/3d/RotationControls.tsx`

**Structure**:
- **Lines 40-128**: Grid container (3 columns, 1 on mobile)
  - **Lines 42-69**: X Axis (Front-Back) section
    - Label: "X Axis (Front-Back)"
    - Two buttons: -90° and +90°
  - **Lines 71-98**: Y Axis (Left-Right) section
    - Label: "Y Axis (Left-Right)"
    - Two buttons: -90° and +90°
  - **Lines 100-127**: Z Axis (Spin) section
    - Label: "Z Axis (Spin)"
    - Two buttons: -90° and +90°

**Action Buttons** (lines 131-170):
- Reset button (132-141)
- Center button (142-151)
- Lock Orientation button (152-169) - Primary blue styled

**Help Text** (lines 172-179):
- Tips about orientation best practices

## Controls Visibility Management

### Current Implementation
- **Location**: `page.tsx`, line 575
- **Variable**: `const SHOW_ROTATION_CONTROLS = true;`
- **Usage**: Line 826 - Conditional rendering
  ```typescript
  {SHOW_ROTATION_CONTROLS ? (
    <RotationControls ... />
  ) : null}
  ```
- **Status**: Always visible (hardcoded `true`)

### Entire Orient Section Conditional
- **Condition**: `currentStep === "orient" && uploads.length > 0`
- **Location**: Line 763
- When step changes, section hides automatically

## State Management Analysis

### Quick Order State (page.tsx)
```typescript
// Step navigation
const [currentStep, setCurrentStep] = useState<Step>("upload")

// File uploads
const [uploads, setUploads] = useState<Upload[]>([])

// Settings per file
const [settings, setSettings] = useState<Record<string, FileSettings>>({})

// 3D orientation tracking
const [orientedFileIds, setOrientedFileIds] = useState<Record<string, string>>({})
const [currentlyOrienting, setCurrentlyOrienting] = useState<string | null>(null)
const viewerRef = useRef<STLViewerRef>(null)

// Pricing
const [priceData, setPriceData] = useState<{...} | null>(null)

// Loading states
const [loading, setLoading] = useState(false)
const [pricing, setPricing] = useState(false)
```

### Component Dependencies
**Analysis**: Components are loosely coupled
- Upload section: Independent file handling
- Orient section: Uses viewerRef callback pattern
- Settings section: Direct state management
- **Conclusion**: CAN BE REORDERED without breaking dependencies

### Step Navigation Flow
```
upload → (manual advance)
orient → (optional, can skip)
configure → (prices computed)
price → (checkout info)
checkout → (payment)
```

## Required Changes Summary

### Change 1: Reorder UI Components
**Current Order**: Files → Orient → Settings
**Desired Order**: Files → Settings → Orient

**Implementation**:
1. Move Settings section JSX (lines 876-1191) before Orient section (lines 763-873)
2. No state dependencies between these sections
3. Both are conditionally rendered based on different criteria
4. Simple copy/paste reordering

### Change 2: Hide Controls by Default
**Current**: `const SHOW_ROTATION_CONTROLS = true;`
**Desired**: Toggle button to show/hide

**Implementation**:
1. Add state: `const [showControls, setShowControls] = useState(false);`
2. Replace hardcoded `true` with `showControls`
3. Add toggle button above RotationControls
4. Button shows "Show Controls" / "Hide Controls" based on state

### Change 3: Remove X/Y/Z Axis Controls
**Location**: `/src/components/3d/RotationControls.tsx`, lines 40-128

**Options**:
1. **Option A - Delete from component**:
   - Remove grid section (lines 40-128)
   - Keep only action buttons (Reset, Center, Lock)

2. **Option B - Conditional rendering**:
   - Add prop: `showAxisControls?: boolean`
   - Wrap grid in conditional
   - Pass `false` from page.tsx

**Recommendation**: Option A (permanent removal) since requirement is "remove completely"

## Files to Modify

### Primary File
- `/src/app/(client)/quick-order/page.tsx`
  - Reorder JSX sections
  - Add `showControls` state
  - Add toggle button

### Component File
- `/src/components/3d/RotationControls.tsx`
  - Remove lines 40-128 (X/Y/Z grid)
  - Keep action buttons (Reset, Center, Lock)
  - Update layout to vertical stack instead of grid

### No Changes Needed
- `/src/components/3d/STLViewer.tsx` - Keep as is
- `/src/components/3d/STLViewerWrapper.tsx` - Keep as is
- `/src/lib/3d/coordinates.ts` - Keep as is

## Implementation Complexity

### Reordering (Low Complexity)
- **Effort**: 15-30 minutes
- **Risk**: Very low
- **Testing**: Visual verification only

### Hide Controls Toggle (Low Complexity)
- **Effort**: 30-45 minutes
- **Risk**: Low
- **Testing**: Click functionality, state persistence

### Remove X/Y/Z Controls (Low Complexity)
- **Effort**: 15-30 minutes
- **Risk**: Low (isolated component change)
- **Testing**: Ensure Lock Orientation still works

### Total Estimated Effort: 1-2 hours

## Testing Checklist
- [ ] Files section renders first
- [ ] Settings section renders second
- [ ] Orient section renders third (when step = "orient")
- [ ] Controls hidden by default
- [ ] Toggle button shows/hides controls
- [ ] X/Y/Z axis buttons removed
- [ ] Reset, Center, Lock buttons still functional
- [ ] Orientation locking still works
- [ ] Workflow progression unchanged
- [ ] Mobile layout still responsive

## Files Referenced
- `/src/app/(client)/quick-order/page.tsx` (1,358 lines)
- `/src/components/3d/STLViewerWrapper.tsx` (72 lines)
- `/src/components/3d/STLViewer.tsx` (207 lines)
- `/src/components/3d/RotationControls.tsx` (183 lines)
- `/src/lib/3d/coordinates.ts` (110 lines)
- `/src/lib/3d/export.ts` (55 lines)
