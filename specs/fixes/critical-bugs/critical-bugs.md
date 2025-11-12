# Plan: Critical Bug Fixes

## Plan Description
Fix 5 critical production bugs blocking core workflows: "request is not defined" errors, orientation data persistence failures, multi-form submission errors, model alignment issues, and intermittent preview crashes after deployment.

## User Story
As a user (client or admin)
I want the application to work reliably without crashes or blocking errors
So that I can complete my tasks (ordering, quoting, model viewing) without interruption

## Problem Statement
Production environment has 5 critical bugs causing workflow disruptions:

1. **Bug #30**: "request is not defined" blocking create/update operations
   - ReferenceError in API routes using headers() outside request context
   - Likely violates Next.js 15 async request APIs pattern

2. **Bug #31**: "orientation data does not exist" in QuickPrint flow
   - Orientation store state not persisting between steps
   - Zustand store cleared prematurely or not initialized

3. **Bug #32**: Multi-form data submit error
   - Form validation failing on multi-step forms
   - Possibly related to FormData serialization or schema mismatch

4. **Bug #33**: Model alignment bug (halfway through box/gizmo ring)
   - 3D model rendering offset from orientation controls
   - Likely bounding box calculation or pivot point issue

5. **Bug #34**: Intermittent preview crashes after redeploy
   - Three.js context loss or stale service worker cache
   - Happens inconsistently post-deployment

## Solution Statement

### Bug #30: "request is not defined"
- **Root Cause**: Using `headers()` in non-async context or outside request scope
- **Fix**: Ensure all API route handlers are async and access headers within handler function
- **Pattern**: `/src/app/api/*/route.ts` must use async/await for all Next.js APIs

### Bug #31: Orientation data persistence
- **Root Cause**: Zustand store cleared on navigation or form reset
- **Fix**: Add sessionStorage persistence middleware to orientation store
- **Pattern**: Follow Zustand persist middleware pattern from credit store

### Bug #32: Multi-form submit error
- **Root Cause**: FormData not matching Zod schema on submit
- **Fix**: Add debug logging to identify schema mismatch, fix validation
- **Pattern**: Ensure FormData keys match schema exactly (camelCase vs snake_case)

### Bug #33: Model alignment offset
- **Root Cause**: Bounding box center calculation incorrect
- **Fix**: Recalculate pivot point after orientation changes, center model at origin
- **Pattern**: Use Three.js `Box3.getCenter()` and `Vector3.sub()` for correct centering

### Bug #34**: Intermittent crashes post-deploy
- **Root Cause**: Service worker serving stale Three.js bundles or lost WebGL context
- **Fix**: Add WebGL context loss handlers, force cache invalidation on version change
- **Pattern**: Add `webglcontextlost` event listener, clear Three.js cache on mount

## Pattern Analysis

From exploration and codebase review:

1. **Next.js 15 Async APIs** (`/src/app/api/*/route.ts`)
   - All route handlers must be async
   - `headers()`, `cookies()` only callable within request context
   - Never call in module scope or class constructors

2. **Zustand Persistence** (`/src/stores/*.ts`)
   - Credit store already uses persist middleware successfully
   - Pattern: `persist(storeFunction, { name: 'store-key', storage: sessionStorage })`

3. **Form Validation** (`/src/components/*-form.tsx`)
   - React Hook Form + Zod validation
   - FormData keys must match schema exactly (check case sensitivity)

4. **Three.js Centering** (`/src/components/3d/ModelViewer.tsx`)
   - Bounding box calculated in `useMemo` hook
   - Model position adjusted by subtracting center offset
   - Pivot point set for rotation controls

5. **WebGL Context Handling**
   - Need context loss/restore event handlers
   - Clear caches on context restore
   - Force remount on version change

## Dependencies

### External Dependencies
None - all fixes use existing libraries

### Internal Dependencies
- Must complete after **3D Preview & Orientation** plan (shares ModelViewer.tsx)
- Should coordinate with **Quality & Observability** plan for logging improvements

## Relevant Files

**To Update:**
- `/src/app/api/clients/route.ts` - Fix headers() usage (Bug #30)
- `/src/app/api/jobs/route.ts` - Fix headers() usage (Bug #30)
- `/src/stores/orientation-store.ts` - Add sessionStorage persist (Bug #31)
- `/src/components/quick-order/quick-order-form.tsx` - Fix multi-form submit (Bug #32)
- `/src/components/3d/ModelViewer.tsx` - Fix alignment + context loss (Bug #33, #34)
- `/src/lib/3d/geometry.ts` - Fix bounding box calculations (Bug #33)

**New Files:**
- `/src/lib/3d/webgl-context.ts` - WebGL context loss utilities
- `/src/hooks/use-webgl-context.ts` - Hook for context monitoring

## Acceptance Criteria

**Bug #30:**
- [ ] No "request is not defined" errors in production logs
- [ ] All API routes use async handlers
- [ ] headers() called only within request scope

**Bug #31:**
- [ ] Orientation data persists across QuickPrint navigation
- [ ] Zustand store survives page refresh
- [ ] sessionStorage cleared on order completion

**Bug #32:**
- [ ] Multi-step forms submit without validation errors
- [ ] FormData keys match schema exactly
- [ ] Clear error messages if validation fails

**Bug #33:**
- [ ] 3D model centered correctly in viewport
- [ ] Orientation controls align with model center
- [ ] No offset after orientation changes

**Bug #34:**
- [ ] Preview doesn't crash after deployment
- [ ] WebGL context loss handled gracefully
- [ ] Service worker cache invalidated on version change

## Step by Step Tasks

**EXECUTION RULES:**
- Execute ALL steps below in exact order
- Test each bug fix independently before moving to next
- Add error logging for all fixes to aid future debugging
- Check Acceptance Criteria - all items are REQUIRED
- If blocked, document and continue other steps

### 1. Fix Bug #30: "request is not defined"

**Find all instances:**
```bash
grep -r "headers()" src/app/api --include="*.ts"
```

**Pattern to fix:**
```typescript
// BEFORE (WRONG - synchronous handler)
export function GET() {
  const headersList = headers(); // ERROR: headers() requires async context
  // ...
}

// AFTER (CORRECT - async handler)
export async function GET(request: Request) {
  const headersList = headers(); // OK: inside async request handler
  // ...
}
```

**Files to update:**
- `/src/app/api/clients/route.ts` - Make GET/POST async
- `/src/app/api/jobs/route.ts` - Make GET/POST async
- `/src/app/api/invoices/route.ts` - Make GET/POST async
- Any other routes using headers() or cookies()

**Validation:**
```bash
npm run build
# EXPECTED: No "request is not defined" errors during build
```

### 2. Fix Bug #31: Orientation data persistence

**Update `/src/stores/orientation-store.ts`:**
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OrientationState {
  orientation: number[];
  setOrientation: (orientation: number[]) => void;
  resetOrientation: () => void;
}

export const useOrientationStore = create<OrientationState>()(
  persist(
    (set) => ({
      orientation: [0, 0, 0, 1],
      setOrientation: (orientation) => set({ orientation }),
      resetOrientation: () => set({ orientation: [0, 0, 0, 1] }),
    }),
    {
      name: 'quickprint-orientation', // sessionStorage key
      storage: {
        getItem: (name) => {
          const item = sessionStorage.getItem(name);
          return item ? JSON.parse(item) : null;
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          sessionStorage.removeItem(name);
        },
      },
    }
  )
);
```

**Clear on order completion:**
- Update `/src/components/quick-order/confirmation-step.tsx`
- Call `sessionStorage.removeItem('quickprint-orientation')` on mount

**Validation:**
```bash
# Test QuickPrint flow
# 1. Upload model, set orientation
# 2. Navigate to next step
# 3. Go back
# EXPECTED: Orientation preserved
```

### 3. Fix Bug #32: Multi-form submit error

**Add debug logging to identify mismatch:**

Update `/src/components/quick-order/quick-order-form.tsx`:
```typescript
const onSubmit = async (data: FormData) => {
  // Debug: Log form data vs schema
  console.log('Form data keys:', Object.keys(data));
  console.log('Schema keys:', Object.keys(quickOrderSchema.shape));

  try {
    const validated = quickOrderSchema.parse(data);
    // Submit...
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.errors);
      // Show user-friendly errors
      error.errors.forEach((err) => {
        toast.error(`${err.path.join('.')}: ${err.message}`);
      });
    }
  }
};
```

**Common mismatch fixes:**
- Ensure FormData uses camelCase (e.g., `deliveryPostcode` not `delivery_postcode`)
- Check date fields are strings, not Date objects (Zod expects ISO strings)
- Verify nested objects serialized correctly (e.g., address as JSON string)

**Validation:**
```bash
# Test multi-step form submit
# EXPECTED: Detailed error messages if validation fails
# EXPECTED: Successful submit if data valid
```

### 4. Fix Bug #33: Model alignment offset

**Update `/src/lib/3d/geometry.ts`:**
```typescript
import * as THREE from 'three';

/**
 * Calculate bounding box and center point for a mesh
 * Returns center offset to apply to model position
 */
export function calculateModelCenter(mesh: THREE.Mesh): THREE.Vector3 {
  const box = new THREE.Box3().setFromObject(mesh);
  const center = new THREE.Vector3();
  box.getCenter(center);
  return center;
}

/**
 * Center a mesh at world origin by offsetting position
 */
export function centerMeshAtOrigin(mesh: THREE.Mesh): void {
  const center = calculateModelCenter(mesh);
  mesh.position.sub(center); // Move mesh so center is at (0,0,0)
}
```

**Update `/src/components/3d/ModelViewer.tsx`:**
```typescript
useEffect(() => {
  if (model) {
    // Center model at origin for correct rotation pivot
    centerMeshAtOrigin(model);

    // Update camera to frame centered model
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    camera.position.set(maxDim * 1.5, maxDim * 1.5, maxDim * 1.5);
    camera.lookAt(0, 0, 0); // Look at origin (model center)
  }
}, [model, camera]);
```

**Validation:**
```bash
# Load 3D model in QuickPrint
# EXPECTED: Model centered in viewport
# EXPECTED: Orientation gizmo aligns with model center
# Rotate model
# EXPECTED: Rotates around center point, no offset
```

### 5. Fix Bug #34: Intermittent crashes post-deploy

**Create `/src/lib/3d/webgl-context.ts`:**
```typescript
/**
 * WebGL context loss/restore utilities
 */

export function handleContextLoss(
  renderer: THREE.WebGLRenderer,
  onLoss: () => void,
  onRestore: () => void
): () => void {
  const canvas = renderer.domElement;

  const handleLoss = (event: Event) => {
    event.preventDefault();
    console.warn('[WebGL] Context lost, attempting restore...');
    onLoss();
  };

  const handleRestore = () => {
    console.log('[WebGL] Context restored');
    onRestore();
  };

  canvas.addEventListener('webglcontextlost', handleLoss);
  canvas.addEventListener('webglcontextrestored', handleRestore);

  // Return cleanup function
  return () => {
    canvas.removeEventListener('webglcontextlost', handleLoss);
    canvas.removeEventListener('webglcontextrestored', handleRestore);
  };
}
```

**Create `/src/hooks/use-webgl-context.ts`:**
```typescript
import { useEffect } from 'react';
import * as THREE from 'three';
import { handleContextLoss } from '@/lib/3d/webgl-context';

export function useWebGLContext(renderer: THREE.WebGLRenderer | null) {
  useEffect(() => {
    if (!renderer) return;

    const cleanup = handleContextLoss(
      renderer,
      () => {
        // On context loss: clear state, show loading indicator
        console.warn('WebGL context lost, waiting for restore...');
      },
      () => {
        // On context restore: force re-render, clear caches
        console.log('WebGL context restored, reloading...');
        window.location.reload(); // Force full reload to clear stale state
      }
    );

    return cleanup;
  }, [renderer]);
}
```

**Update `/src/components/3d/ModelViewer.tsx`:**
```typescript
import { useWebGLContext } from '@/hooks/use-webgl-context';

export function ModelViewer({ url }: ModelViewerProps) {
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Add WebGL context monitoring
  useWebGLContext(rendererRef.current);

  // ... rest of component
}
```

**Force cache invalidation on deploy:**

Update `next.config.js`:
```javascript
module.exports = {
  // ... existing config
  generateBuildId: async () => {
    // Use timestamp to force new build ID
    return `build-${Date.now()}`;
  },
};
```

**Validation:**
```bash
npm run build
npm run dev

# Simulate context loss:
# 1. Open DevTools > Rendering > Emulate WebGL context loss
# 2. Trigger loss while viewing 3D model
# EXPECTED: Page reloads gracefully, no crash

# Test post-deploy:
# 1. Deploy new version
# 2. Load 3D preview in old tab
# EXPECTED: No crash, cache cleared on reload
```

### 6. Add Error Logging for All Fixes

**Update `/src/lib/logger.ts`** to capture bug-specific errors:
```typescript
export const bugLogger = {
  logBug30: (error: unknown) => {
    logger.error({
      scope: 'bug.30.request-undefined',
      message: 'headers() called outside request context',
      error,
    });
  },

  logBug31: (error: unknown) => {
    logger.error({
      scope: 'bug.31.orientation-missing',
      message: 'Orientation data not found in store',
      error,
    });
  },

  logBug32: (error: unknown, formData: unknown) => {
    logger.error({
      scope: 'bug.32.multi-form-validation',
      message: 'Multi-form submit validation failed',
      error,
      formData,
    });
  },

  logBug33: (modelBounds: unknown) => {
    logger.error({
      scope: 'bug.33.model-alignment',
      message: 'Model alignment offset detected',
      modelBounds,
    });
  },

  logBug34: (context: unknown) => {
    logger.error({
      scope: 'bug.34.preview-crash',
      message: 'WebGL context loss or preview crash',
      context,
    });
  },
};
```

**Add try/catch blocks to all bug fixes with appropriate logging**

### 7. Run Comprehensive Validation

```bash
# Build check
npm run build
# EXPECTED: No errors, no warnings about async handlers

# Type check
npx tsc --noEmit
# EXPECTED: No type errors

# Run dev server
npm run dev

# Bug #30 Test: Create/Update operations
# - Create new client
# - Update existing job
# EXPECTED: No "request is not defined" errors in console/logs

# Bug #31 Test: QuickPrint orientation persistence
# - Upload model, set orientation, navigate away, return
# EXPECTED: Orientation preserved

# Bug #32 Test: Multi-form submit
# - Complete QuickPrint multi-step form
# EXPECTED: Submits successfully, no validation errors

# Bug #33 Test: Model alignment
# - Load 3D model, check centering
# EXPECTED: Model centered, gizmo aligned

# Bug #34 Test: Post-deploy stability
# - Deploy, load preview in old tab
# EXPECTED: No crashes, graceful reload
```

### 8. Monitor Production Logs

After deployment:
```bash
# Check for bug recurrence
grep "bug\." logs/production.log

# EXPECTED: No new errors for fixed bugs
# If errors found: Review fix, add more defensive checks
```

## Testing Strategy

### Unit Tests
- Test `calculateModelCenter()` with known mesh bounds
- Test Zustand persist middleware with mock sessionStorage
- Test form validation with known invalid data

### Integration Tests
- Test full QuickPrint flow end-to-end
- Test API routes with async headers() usage
- Test WebGL context loss simulation

### Manual Testing
- QuickPrint flow: Upload → Orient → Navigate → Back → Orient preserved
- 3D Preview: Model centered, controls aligned, no crashes
- Forms: Multi-step submit works, clear error messages

## Definition of Done
- [ ] All 5 bugs fixed and verified
- [ ] All acceptance criteria met
- [ ] No "request is not defined" errors in logs
- [ ] Orientation persists across navigation
- [ ] Forms submit successfully
- [ ] Models align correctly
- [ ] No preview crashes post-deploy
- [ ] Error logging added for all fixes
- [ ] All validation commands pass
- [ ] Production monitoring confirms fixes

# Implementation log: specs/fixes/critical-bugs/critical-bugs_implementation.log
