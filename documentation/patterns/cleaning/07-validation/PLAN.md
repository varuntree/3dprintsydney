# Phase 7: Validation - Implementation Plan

**Created:** 2025-10-21
**Status:** Ready for Execution

---

## Executive Summary

Phase 7 will standardize validation patterns to ensure 100% consistency. The explore agents found that the validation architecture is **already well-organized** but has **critical anti-patterns from Phase 5** and **inconsistent error handling** that need fixing.

**Key Finding:** All 10 Zod schema files are already in `/lib/schemas/` (100% correctly organized), but 4 services still perform validation (should have been fixed in Phase 5).

**Scope:** MEDIUM (4 service files + 26 routes with error handling standardization)
**Risk Level:** LOW-MEDIUM (fixing Phase 5 violations + standardization)
**Estimated Duration:** 2-3 hours

---

## Analysis Summary from 3 Explore Agents

### Agent 1: Schema Organization
- **10 schema files**, all in `/lib/schemas/` ✅
- **540 lines** of schema code total
- **0 scattered schemas** ✅
- **1 cross-file dependency** (acceptable - invoices → quotes)
- **Missing:** index.ts barrel export (opportunity)

### Agent 2: Validation Patterns
- **27 routes** using `.parse()` at API boundary ✅ GOOD
- **4 services** using `.parse()` ❌ ANTI-PATTERN (Phase 5 violation)
- **26 routes** with ZodError handling (some inconsistent)
- **5+ routes** with manual validation (should use Zod)
- **1 route** using `.safeParse()` (inconsistent)

### Agent 3: Validation Usage
- **26 API routes** with Zod validation
- **51 routes** without validation (mostly GET/DELETE - OK)
- **6 services** import schema types (good)
- **1 service** performs validation (bad - Phase 5 violation)
- **9 components** use Zod via react-hook-form (good)

---

## Current State Assessment

### ✅ What's Working Well:

1. **Schema organization:**
   - All schemas in `/lib/schemas/` (100% organized)
   - Logical file grouping (auth, clients, invoices, etc.)
   - Consistent naming (`*InputSchema`, `*Input` types)
   - Minimal cross-file dependencies

2. **Most routes validate correctly:**
   - 27 routes use `.parse()` at API boundary
   - Most catch `ZodError` properly
   - Return `VALIDATION_ERROR` with `issues`

3. **Clean type usage:**
   - Services import types, not Zod itself
   - Components use `zodResolver` for forms

### ❌ What Needs Fixing:

1. **CRITICAL: Phase 5 Violations (4 services still validate):**
   - `settings.ts` - Calls `settingsInputSchema.parse()` (line 117, 190)
   - `product-templates.ts` - Calls `productCalculatorSchema.parse()` (line 57)
   - These should validate at API boundary, not in services

2. **Inconsistent ZodError handling (26 routes):**
   - Some: `import { ZodError } from "zod"`
   - Others: `import { z } from "zod"` then `z.ZodError`
   - Some use `.format()` instead of `.issues`
   - Need standardization

3. **Manual validation in routes (5 routes):**
   - `invoices/[id]/void` - Manual reason validation
   - `quick-order/slice` - Manual type checks
   - Should use Zod schemas

4. **Missing index.ts:**
   - No barrel export for easier imports
   - Would simplify consumer code

---

## Goals & Success Criteria

### Goals:
1. ✅ Fix Phase 5 violations (move validation from services to routes)
2. ✅ Standardize ZodError handling across all routes
3. ✅ Create index.ts for easier schema imports
4. ✅ Optional: Replace manual validation with Zod
5. ✅ Maintain 100% build success
6. ✅ No functionality changes

### Success Criteria:
- [ ] ZERO services perform validation (all at API boundary)
- [ ] 100% consistent ZodError handling pattern
- [ ] index.ts created for clean imports
- [ ] Build passes with zero TypeScript errors
- [ ] Review agent approval
- [ ] All routes follow STANDARDS.md Pattern 7

---

## Implementation Strategy

**Conservative Approach:** Fix violations + standardize handling + improve imports

**Priority Order:**
1. **CRITICAL:** Fix Phase 5 violations (services validating)
2. **HIGH:** Standardize ZodError handling
3. **MEDIUM:** Create index.ts
4. **OPTIONAL:** Replace manual validation

We will NOT:
- ❌ Reorganize schema files (already perfect)
- ❌ Change validation logic (only move location)
- ❌ Break existing functionality

We WILL:
- ✅ Move `.parse()` from services to API routes
- ✅ Standardize error handling patterns
- ✅ Create barrel export for schemas
- ✅ Optional: Add schemas for manual validation

---

## Detailed Implementation Plan

### Task 1: Fix Phase 5 Violations - Move Validation to Routes (1 hour)

**CRITICAL:** 4 service files violate Phase 5 requirement

#### File 1: `src/server/services/settings.ts`

**Current (Lines 117, 190):**
```typescript
// IN SERVICE - WRONG!
const parsed = settingsInputSchema.parse(payload);
```

**Fix:**
1. Remove `.parse()` from service
2. Move to `/src/app/api/settings/route.ts` (PUT handler)
3. Pass pre-validated object to service

**API Route Update:**
```typescript
// /src/app/api/settings/route.ts
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = settingsInputSchema.parse(body); // ✓ At boundary
    const settings = await updateSettings(validated);  // Pass validated
    return ok(settings);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid settings", 422, {
        issues: error.issues,
      });
    }
    return handleError(error, "settings.update");
  }
}
```

#### File 2: `src/server/services/product-templates.ts`

**Current (Line 57):**
```typescript
// IN SERVICE - WRONG!
return productCalculatorSchema.parse(config) as Record<string, unknown>;
```

**Fix:**
1. Remove `.parse()` from service helper
2. Validate in API route before calling service
3. Trust that config is already validated

**Service Update:**
```typescript
// Service no longer validates
function normalizeCalculatorConfig(config: unknown): Record<string, unknown> {
  // Remove parse, trust input is valid
  return config as Record<string, unknown>;
}
```

**Routes to Update:**
- `/src/app/api/product-templates/route.ts` (POST, PUT)
- Already validates `productTemplateInputSchema` which includes calculator config

---

### Task 2: Standardize ZodError Handling (1 hour)

**Standard Pattern (from STANDARDS.md):**
```typescript
import { ZodError } from "zod"; // Always use this import

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = schema.parse(body);
    const result = await serviceFunction(validated);
    return ok(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid [entity] payload", 422, {
        issues: error.issues,  // NOT .format()
      });
    }
    return handleError(error, "scope.action");
  }
}
```

**Routes to Update (26 total):**

#### Group 1: Already Correct (11 routes)
These follow the standard pattern:
- `/api/auth/login`
- `/api/clients` (POST)
- `/api/invoices` (POST)
- `/api/invoices/[id]/payments`
- `/api/quotes` (POST)
- `/api/jobs/[id]` (PATCH)
- `/api/jobs/reorder`
- `/api/quotes/[id]/status`
- `/api/settings` (PUT)
- Several others...

#### Group 2: Minor Fixes Needed (15 routes)
Import inconsistencies or message differences:

1. **Using `z.ZodError` instead of `ZodError`:**
   - `/api/auth/signup`
   - `/api/auth/change-password`
   - `/api/messages`
   - `/api/materials`
   - `/api/printers`
   - `/api/product-templates`

   **Fix:** Change `import { z } from "zod"` → `import { ZodError } from "zod"`
   **Fix:** Change `error instanceof z.ZodError` → `error instanceof ZodError`

2. **Using `.format()` instead of `.issues`:**
   - `/api/invoices/[id]/mark-paid`

   **Fix:** Change `error.format()` → `error.issues`

3. **Wrong error code:**
   - `/api/invoices/[id]/mark-paid` - Uses `INVALID_BODY`

   **Fix:** Change to `VALIDATION_ERROR`

---

### Task 3: Create Schema Index File (15 minutes)

**New File:** `/src/lib/schemas/index.ts`

```typescript
// Central export for all validation schemas
// Simplifies imports: from '@/lib/schemas' instead of '@/lib/schemas/auth'

// Auth schemas
export * from "./auth";

// Catalog schemas (materials, printers, product templates)
export * from "./catalog";

// Client schemas
export * from "./clients";

// Invoice schemas  
export * from "./invoices";

// Job schemas
export * from "./jobs";

// Message schemas
export * from "./messages";

// Quick order schemas
export * from "./quick-order";

// Quote schemas
export * from "./quotes";

// Settings schemas
export * from "./settings";

// User schemas
export * from "./users";
```

**Benefit:** Simpler imports
```typescript
// Before
import { clientInputSchema } from "@/lib/schemas/clients";
import { invoiceInputSchema } from "@/lib/schemas/invoices";

// After (optional migration)
import { clientInputSchema, invoiceInputSchema } from "@/lib/schemas";
```

**Note:** Existing imports will still work - this is additive only

---

### Task 4: Optional - Replace Manual Validation (30 minutes)

**5 routes using manual validation that could use Zod:**

#### 1. `/api/invoices/[id]/void/route.ts` (Line 17-18)
**Current:**
```typescript
const reason = typeof body?.reason === "string" ? body.reason : undefined;
```

**Should use:**
```typescript
const validated = invoiceVoidSchema.parse(body);
const reason = validated.reason;
```

#### 2. `/api/invoices/[id]/mark-paid/route.ts` (Line 42-46)
**Current:**
```typescript
const parsed = paymentInputSchema.partial().safeParse(payload);
if (!parsed.success) {
  return fail("INVALID_BODY", ...);
}
```

**Should be:**
```typescript
// Either use full schema or create explicit partial schema
const validated = paymentInputSchema.parse(payload);
// OR
const markPaidSchema = paymentInputSchema.partial();
const validated = markPaidSchema.parse(payload);
```

#### 3-5. Quick-order routes
**Decision:** Skip for Phase 7 (complex FormData handling, low priority)

---

## Implementation Order

### Step 1: Fix Phase 5 Violations (1 hour)
1. Update `settings.ts` service - Remove `.parse()` calls
2. Update `/api/settings/route.ts` - Add `.parse()` at boundary
3. Update `product-templates.ts` service - Remove `.parse()` helper
4. Verify both route handlers validate properly
5. Run build verification

### Step 2: Standardize ZodError Handling (1 hour)
1. Create checklist of 26 routes with validation
2. Update imports: `z.ZodError` → `ZodError`
3. Fix error codes: `INVALID_BODY` → `VALIDATION_ERROR`
4. Fix error details: `.format()` → `.issues`
5. Verify consistent pattern across all routes
6. Run build verification

### Step 3: Create Index File (15 minutes)
1. Create `/src/lib/schemas/index.ts`
2. Add barrel exports for all schema files
3. Test import works correctly
4. Run build verification

### Step 4: Optional - Manual Validation (30 minutes)
1. Update void route to use schema
2. Update mark-paid route to use consistent pattern
3. Run build verification

### Step 5: Final Verification (30 minutes)
1. Run full build
2. Deploy review agent
3. Fix any issues found
4. Update workspace
5. Commit changes

**Total Estimated Time: 2.5-3 hours**

---

## Files to Change

### Modified Files (Core):
1. `src/server/services/settings.ts` - Remove validation
2. `src/server/services/product-templates.ts` - Remove validation
3. `src/app/api/settings/route.ts` - Add validation at boundary

### Modified Files (Error Handling - 15 routes):
4. `src/app/api/auth/signup/route.ts`
5. `src/app/api/auth/change-password/route.ts`
6. `src/app/api/messages/route.ts`
7. `src/app/api/materials/route.ts`
8. `src/app/api/materials/[id]/route.ts`
9. `src/app/api/printers/route.ts`
10. `src/app/api/printers/[id]/route.ts`
11. `src/app/api/product-templates/route.ts`
12. `src/app/api/product-templates/[id]/route.ts`
13. `src/app/api/invoices/[id]/mark-paid/route.ts`
... (15 total)

### New Files:
14. `src/lib/schemas/index.ts` - Barrel export

### Optional Files:
15. `src/app/api/invoices/[id]/void/route.ts` - Use schema
16. `src/app/api/invoices/[id]/mark-paid/route.ts` - Fix pattern

**Total: 17-19 files**

---

## Risk Assessment

### MEDIUM RISK:
- **Settings service validation removal**
  - Impact: Could break settings update if not moved correctly
  - Mitigation: Thorough testing of settings API
  - Rollback: Per-file commits allow granular rollback

### LOW RISK:
- **ZodError handling standardization**
  - Impact: Minimal - just import/error message changes
  - Mitigation: Pattern is proven to work in existing routes

- **Product templates validation removal**
  - Impact: Low - routes already validate
  - Mitigation: Verify calculator config validation

### NEGLIGIBLE RISK:
- **Creating index.ts**
  - Impact: None - additive only
  - No existing code changes required

- **Manual validation replacement**
  - Impact: Low - optional task

---

## Testing Strategy

### Build Verification:
```bash
npm run typecheck  # Must pass
npm run build      # Must pass
npm run lint       # Must pass
```

### Manual Testing Required:
- **Settings update** - Test PUT /api/settings with valid and invalid payloads
- **Product template** - Test POST/PUT with calculator configurations
- **Routes with updated error handling** - Test validation failures return correct format

### Test Cases:
1. Valid settings payload → Should save
2. Invalid settings payload → Should return 422 with `issues`
3. Valid product template → Should save
4. Invalid calculator config → Should return 422 with `issues`
5. Any validation error → Should have `VALIDATION_ERROR` code
6. Schema imports from index → Should work

---

## Success Metrics

**Quantitative:**
- 4 service validation violations fixed (100% Phase 5 compliance)
- 26 routes with standardized error handling
- 1 index.ts created
- 0-2 manual validations replaced with Zod
- 0 build errors
- 100% pattern compliance

**Qualitative:**
- ✅ All validation at API boundary (no service validation)
- ✅ Consistent ZodError handling everywhere
- ✅ Easier schema imports via index
- ✅ Clear error responses with `issues` array
- ✅ Improved developer experience

---

## Commit Strategy

```bash
# Commit 1: Fix Phase 5 violations
git commit -m "Phase 7: Fix service validation violations (Phase 5)

- Move validation from settings service to API route
- Move validation from product-templates service to API route
- Services now trust pre-validated input
- All validation at API boundary

Files: services/settings.ts, services/product-templates.ts, api/settings/route.ts"

# Commit 2: Standardize error handling
git commit -m "Phase 7: Standardize Zod error handling

- Use consistent ZodError import
- Fix error codes (INVALID_BODY → VALIDATION_ERROR)
- Use .issues instead of .format()
- Standard error message format

Files: 15 API routes"

# Commit 3: Create index
git commit -m "Phase 7: Create schema barrel export

- Add lib/schemas/index.ts
- Re-export all schemas from single location
- Simplifies imports across codebase

Files: lib/schemas/index.ts"

# Commit 4 (Optional): Manual validation
git commit -m "Phase 7: Replace manual validation with Zod

- Use invoiceVoidSchema in void route
- Fix mark-paid validation pattern

Files: api/invoices/[id]/void/route.ts, api/invoices/[id]/mark-paid/route.ts"

# Final commit message format
git commit -m "Phase 7: Standardize validation patterns

Summary of all changes...

Pattern compliance: 100%
Phase 5 violations fixed: 4
Routes standardized: 26
Build verified: ✅

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Notes for Implementation

1. **Settings service** is complex - test thoroughly
2. **Product templates** calculator config needs validation preserved
3. **Keep existing imports working** - index.ts is additive
4. **ZodError changes** are import-only, no logic changes
5. **Test validation errors** to ensure `issues` format is correct
6. **Mark-paid route** has unusual `.partial().safeParse()` - standardize

---

**Ready to Execute:** Yes ✅
**Estimated Duration:** 2.5-3 hours
**Risk Level:** LOW-MEDIUM
**Last Updated:** 2025-10-21
