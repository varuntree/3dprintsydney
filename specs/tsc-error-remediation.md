# Specification: TypeScript Error Remediation Scope

## Purpose
Capture the full scope of the current TypeScript/compiler failures so a future session can execute a complete remediation plan without having to rediscover the problems. Every issue listed below is already manifested in the current `npx tsc --noEmit` output.

---

## 1. API Handler Signature Drift
- **Current behavior**: Dozens of API routes under `src/app/api/...` still reference `req`/`res` variables from older Next.js patterns. Because the functions are now module exports (`export async function GET(...)`), TypeScript flags every `req` reference as undefined.
- **Why this fails**: Next.js 15 `App Router` handlers receive `(request: NextRequest, context: { params })`. Any helper such as `okAuth`/`failAuth` expects that `request` object. When the handler still uses `req`, TypeScript throws `Cannot find name 'req'`.
- **Required outcome**:
  - Every handler must accept `request: NextRequest` and forward that exact object to `okAuth`, `failAuth`, `handleErrorAuth`, etc.
  - Response helpers shouldn’t rely on legacy names; no shadow variables.
  - Contextual params need destructuring from `context` rather than referencing global variables.
- **Files impacted**: All invoice routes (`src/app/api/invoices/**/*`), quote routes (`src/app/api/quotes/**/*`), product templates, materials, jobs (including archive/reorder), dashboard activity, maintenance, printers, order-files, etc.

## 2. Legacy Response/Body Handling
- **Current behavior**: Some handlers (e.g., `src/app/api/order-files/[id]/download/route.ts`) wrap a raw `Buffer` in `NextResponse`, and others parse arbitrary JSON without validating types. This violates the Next.js Response contract and causes TypeScript errors (TS2345) because `Buffer` isn’t assignable to `BodyInit`.
- **Required outcome**:
  - Convert buffers to `Uint8Array` (or stream) before constructing `NextResponse`.
  - Ensure request bodies are parsed once and typed via schemas.
  - Align with modern Next.js conventions (avoid mixing `req`/`res`).

## 3. OrientationGizmo / TransformControls Typing
- **Current behavior**: The React Three Fiber `TransformControls` component in `src/components/3d/OrientationGizmo.tsx` passes props (`onDraggingChange`, etc.) that are no longer part of the inferred interface. TypeScript flags the element as incompatible.
- **Required outcome**: Update the component to use the latest `@react-three/drei` typing (e.g., attach event handlers via refs or update to the correct prop names). Ensure the exported gizmo respects the store actions and matches the union of allowed props.

## 4. TanStack Query Misuse in Client Views
- **Current behavior**: Files like `src/components/client/active-projects-view.tsx` and `archived-projects-view.tsx` call `useQuery` with a bare array (`useQuery(["projects"])`). TypeScript expects an options object with `queryKey`, `queryFn`, etc., so the hook inference collapses to `UseQueryResult<unknown>` and property accesses (`filter`, `length`, etc.) fail.
- **Required outcome**:
  - Rewrite each `useQuery` call to the v5 signature: `useQuery({ queryKey: ["client-projects"], queryFn: async () => …, select: … })`.
  - Provide proper generics or schema parsing to ensure list methods compile.

## 5. ModelViewer.tsx Ordering & Scope Issues
- **Current behavior**: Helper functions such as `prepareGroup` are invoked before they’re defined, and the file mixes function/const declarations in ways that break TypeScript’s block scoping (TS2448/TS2454). Recent edits also introduced duplicated definitions when trying to fix these errors.
- **Required outcome**:
  - Reorder hooks and helpers so that functions are defined before use, or wrap them with `useCallback` hoisted appropriately.
  - Remove duplicate declarations and ensure type imports (`THREE`, etc.) match usage.

## 6. Service Layer Type Violations
- **Quotes service** (`src/server/services/quotes.ts`): expects structured objects but now receives `{}` or nullable settings, so TypeScript complains that fields like `lineType`, `modellingComplexity`, `brief`, etc., don’t exist.
- **Tmp-file service** (`src/server/services/tmp-files.ts`): casting Supabase error responses directly to `TmpFileRecord` triggers errors (`storage_key`/`user_id` missing, union vs. literal mismatches).
- **Order-files service**: similar coercion issues plus missing null guards.
- **Required outcome**: Refine the service return types, add explicit null checks, and ensure DTO construction always populates required properties.

## 7. Orientation Store Persistence Typing
- **Current behavior**: `src/stores/orientation-store.ts` adds a custom sessionStorage adapter but doesn’t satisfy the `PersistStorage` contract expected by Zustand’s `persist` middleware. TypeScript flags the adapter because `getItem` returns `string | null` instead of the serialized store type.
- **Required outcome**: Implement a proper `PersistStorage<OrientationStore>` with `StorageValue<OrientationStore>` serialization/deserialization, or use `createJSONStorage` with sessionStorage.

## 8. Domain Model Construction
- **Invoices** (`src/app/(admin)/invoices/[id]/page.tsx`, `/new/page.tsx`) and **Quotes** (`src/app/(admin)/quotes/*`) still build line items with `string | undefined` fields, missing `lineType`, and raw modelling metadata. Now that the shared types (`InvoiceLineFormValue`, `QuoteLineInput`) require precise enums and strings, the compiler rejects these objects.
- **Required outcome**: Normalize every field (default strings to `""`, ensure `lineType` is set, convert modelling complexity values to the allowed enums) before passing to editors or view models.

---

## Next Steps (for future session)
1. Use this spec as the authoritative list of remaining TypeScript blockers.
2. Recreate/extend the temp plan workspace and follow the autonomous workflow to resolve each category sequentially.
3. Only stop once `npx tsc --noEmit` and `npm run build` both succeed without errors.
