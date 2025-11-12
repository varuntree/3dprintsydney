# Quick Fix Guide - High Priority Issues

## SLICE-001: Missing Support Fields (FIX IMMEDIATELY)

### Current Code - `/src/app/api/quick-order/slice/route.ts` (line 32-46)
```typescript
const supports = item.supports ?? {
  enabled: true,
  pattern: "normal" as const,
  angle: 45,
};

const result = await sliceQuickOrderFile(String(item.id), user.id, {
  layerHeight: item.layerHeight,
  infill: item.infill,
  supports: {
    enabled: Boolean(supports.enabled),
    angle: supports.angle ?? 45,
    pattern: supports.pattern === "tree" ? "tree" : "normal",
  },
});
```

### Fixed Code
```typescript
const supports = item.supports ?? {
  enabled: true,
  pattern: "normal" as const,
  angle: 45,
  style: "grid" as const,              // ADD THIS
  interfaceLayers: 2,                  // ADD THIS
};

const result = await sliceQuickOrderFile(String(item.id), user.id, {
  layerHeight: item.layerHeight,
  infill: item.infill,
  supports: {
    enabled: Boolean(supports.enabled),
    angle: supports.angle ?? 45,
    pattern: supports.pattern === "tree" ? "tree" : "normal",
    style: supports.style ?? "grid",                    // ADD THIS
    interfaceLayers: supports.interfaceLayers ?? 2,    // ADD THIS
  },
});
```

---

## VALIDATE-001: Input Validation Enhancement

### Current Code - `/src/app/api/quick-order/slice/route.ts`
```typescript
const item = body?.file;

if (!item || typeof item.id !== "string") {
  return failAuth(req, "NO_FILE", "No file provided", 400);
}
```

### Enhanced Validation
```typescript
const item = body?.file;

if (!item || typeof item.id !== "string") {
  return failAuth(req, "NO_FILE", "No file provided", 400);
}

// Add support field validation
if (!Number.isFinite(item.layerHeight) || item.layerHeight <= 0) {
  return failAuth(req, "INVALID_LAYER_HEIGHT", "Layer height must be positive", 400);
}
if (!Number.isFinite(item.infill) || item.infill < 0 || item.infill > 100) {
  return failAuth(req, "INVALID_INFILL", "Infill must be between 0 and 100", 400);
}

const supportsValid = item.supports
  ? Boolean(item.supports.enabled) &&
    Number.isFinite(item.supports.angle) &&
    ["normal", "tree"].includes(item.supports.pattern) &&
    ["grid", "organic"].includes(item.supports.style) &&
    Number.isInteger(item.supports.interfaceLayers)
  : true;

if (!supportsValid) {
  return failAuth(req, "INVALID_SUPPORTS", "Invalid support settings", 400);
}
```

---

## FORMDATA-001: Safe FormData Parsing - `/src/app/api/quick-order/orient/route.ts`

### Current Code (UNSAFE)
```typescript
const fileId = formData.get("fileId") as string;
const orientedSTL = formData.get("orientedSTL") as File;

if (!fileId || !orientedSTL) {
  return failAuth(req, "VALIDATION_ERROR", "Missing required fields", 422);
}
```

### Fixed Code (SAFE)
```typescript
const fileIdRaw = formData.get("fileId");
const orientedSTLRaw = formData.get("orientedSTL");

// Strict type checking
if (typeof fileIdRaw !== "string" || !fileIdRaw.trim()) {
  return failAuth(req, "VALIDATION_ERROR", "fileId must be a non-empty string", 422);
}

if (!(orientedSTLRaw instanceof File)) {
  return failAuth(req, "VALIDATION_ERROR", "orientedSTL must be a file", 422);
}

// Content validation
const ALLOWED_TYPES = ["application/octet-stream", "model/stl"];
if (!ALLOWED_TYPES.includes(orientedSTLRaw.type)) {
  return failAuth(req, "VALIDATION_ERROR", `File type must be one of: ${ALLOWED_TYPES.join(", ")}`, 422);
}

if (orientedSTLRaw.size > 100 * 1024 * 1024) { // 100MB max
  return failAuth(req, "FILE_TOO_LARGE", "File exceeds 100MB limit", 413);
}

const fileId = fileIdRaw.trim();
const orientedSTL = orientedSTLRaw;

// Rest of function...
```

---

## ORIENT-001: Preserve Client Orientation in Slice Request

### Option A: Pass orientation in request body (RECOMMENDED)

**Client Side** (when calling slice API):
```typescript
const orientation = useOrientationStore((s) => ({
  quaternion: s.quaternion,
  position: s.position,
}));

const sliceResponse = await fetch("/api/quick-order/slice", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    file: {
      id: fileId,
      layerHeight,
      infill,
      supports,
      orientation,  // ADD THIS
    },
  }),
});
```

**Server Side** - Update `/src/app/api/quick-order/slice/route.ts`:
```typescript
const item = body?.file;
const clientOrientation = item?.orientation;

const result = await sliceQuickOrderFile(String(item.id), user.id, {
  layerHeight: item.layerHeight,
  infill: item.infill,
  supports: { /* ... */ },
  clientOrientation,  // Pass to service
});
```

### Option B: Update service to accept orientation parameter

Update `sliceQuickOrderFile()` signature in `/src/server/services/quick-order.ts`:
```typescript
export async function sliceQuickOrderFile(
  fileId: string,
  userId: number,
  settings: { /* ... */ },
  clientOrientation?: OrientationData,  // ADD THIS
): Promise<{ /* ... */ }> {
  // ...
  
  const sourceBuffer = clientOrientation
    ? applyOrientationToModel(buffer, record.filename, clientOrientation)
    : record.orientation_data
    ? applyOrientationToModel(buffer, record.filename, record.orientation_data)
    : buffer;
```

---

## 3D-001: Hydration Mismatch Prevention

### Current Code - `/src/components/3d/ModelViewerWrapper.tsx`
```typescript
const [isClient, setIsClient] = useState(false);

useEffect(() => {
  setIsClient(true);
  // ...
}, []);

if (!isClient) {
  return <Skeleton className="h-[480px] w-full rounded-lg" />;
}
```

### Issue
On redeploy, old client bundle renders ModelViewer while new server renders Skeleton.

### Solution - Don't double-wrap
The dynamic import already handles SSR prevention. Remove the useState wrapper:

```typescript
"use client";

import { forwardRef } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { ModelViewerHandle } from "./ModelViewer";
import type * as THREE from "three";

const ModelViewer = dynamic(() => import("./ModelViewer"), {
  ssr: false,
  loading: () => <Skeleton className="h-[480px] w-full rounded-lg" />,
});

interface ModelViewerWrapperProps {
  url: string;
  filename?: string;
  fileSizeBytes?: number;
  onTransformChange?: (matrix: THREE.Matrix4) => void;
  onLoadComplete?: () => void;
  onError?: (error: Error) => void;
  facePickMode?: boolean;
  onFacePickComplete?: () => void;
  overhangThreshold?: number;
}

const ModelViewerWrapper = forwardRef<ModelViewerHandle, ModelViewerWrapperProps>(
  (props, ref) => (
    <div className="w-full">
      <ModelViewer ref={ref as any} {...props} />
    </div>
  )
);

ModelViewerWrapper.displayName = "ModelViewerWrapper";
export default ModelViewerWrapper;
export type { ModelViewerHandle as ModelViewerRef };
```

The dynamic() with ssr: false already prevents hydration mismatch.

---

## Testing Checklist

- [ ] Fix SLICE-001: Test slice with various support patterns
- [ ] Add VALIDATE-001: Test with invalid input (negative layer height, etc)
- [ ] Fix FORMDATA-001: Test orient with wrong file types
- [ ] Fix ORIENT-001: Test slice right after orientation change
- [ ] Remove 3D-001: Verify no hydration errors on hot reload
- [ ] Regression: Test quick-order complete flow

