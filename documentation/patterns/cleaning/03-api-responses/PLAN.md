# Phase 3: API Response Format - Implementation Plan

**Created:** 2025-10-21
**Status:** Ready for Execution

---

## Executive Summary

Phase 3 will standardize API response format across ALL layers (backend routes + frontend consumers). Good news: **83% already follow the standard pattern**. The infrastructure exists (`respond.ts`), and frontend is well-architected with central HTTP wrapper. This phase focuses on **eliminating inconsistencies** in 25 routes that mix patterns.

**Scope:** LOW-MEDIUM (25 API routes + 1 type export + 1 frontend verification)
**Risk Level:** MEDIUM (touches auth and checkout flows)
**Estimated Duration:** 2-3 hours

---

## Analysis Summary

### From 3 Explore Agents:

**Agent 1 (API Routes):**
- 77 total API routes
- 67 routes (87%) use respond helpers correctly
- 21 routes (27%) mix patterns inconsistently
- 4 routes (5%) use custom NextResponse.json
- 6 routes (8%) are file exports (correct to use Response)

**Agent 2 (Frontend):**
- 30 files make API calls
- Central wrapper `http.ts` handles 77% of all calls
- Expected format: `{ data: T }` for success, `{ error: { message } }` for errors
- Only 2 files need verification: http.ts and use-stripe-status.ts
- 28 other components inherit changes automatically

**Agent 3 (Patterns & Dependencies):**
- `respond.ts` exists with ok(), fail(), handleError()
- Standard format already defined: `{ data: T, error?: undefined }` and `{ data?: undefined, error: { code, message, details } }`
- Type definitions exist but not exported
- 83% adoption rate across codebase

---

## Goals & Success Criteria

### Goals:
1. ✅ Eliminate all mixed pattern usage (21 routes)
2. ✅ Standardize remaining custom routes (4 routes)
3. ✅ Export response types for TypeScript safety
4. ✅ Verify frontend compatibility (no breaking changes)
5. ✅ Maintain special case routes (exports, PDFs) as-is

### Success Criteria:
- [ ] All JSON API routes use ok()/fail() exclusively
- [ ] Zero usage of NextResponse.json() for JSON responses
- [ ] Response types exported from respond.ts
- [ ] Frontend http.ts verified to handle format correctly
- [ ] Build passes with zero TypeScript errors
- [ ] No functionality changes (auth, checkout, etc. still work)
- [ ] Review agent approval

---

## Current State Analysis

### ✅ What's Already Good:

1. **Infrastructure Exists:**
   - `/src/server/api/respond.ts` with ok(), fail(), handleError()
   - Standard envelope: `{ data: T }` and `{ error: { code, message, details } }`
   - Type safety with Success<T> and Failure interfaces

2. **High Adoption:**
   - 67/77 routes (87%) use respond helpers
   - Pattern is well-established and understood

3. **Frontend Architecture:**
   - Central HTTP wrapper in `/src/lib/http.ts`
   - Already expects correct format (no frontend changes needed)
   - 18 components use React Query with standard pattern

4. **Special Cases Handled:**
   - Export routes correctly use Response() for file downloads
   - PDF routes correctly use NextResponse() for binary data
   - Both have proper error handling with fail()

### ❌ What Needs Fixing:

1. **Mixed Patterns (21 routes):**
   - Import respond helpers BUT also use NextResponse.json()
   - Creates inconsistency within same file
   - Categories:
     - Auth routes: 6 files
     - Quick-order routes: 5 files
     - Client routes: 3 files
     - Admin routes: 2 files
     - Message routes: 1 file
     - Other routes: 4 files

2. **Custom Patterns (4 routes):**
   - Use NextResponse.json() without importing respond helpers
   - Admin routes with custom error handling
   - Categories:
     - Admin routes: 4 files

3. **Types Not Exported:**
   - Success<T> and Failure interfaces only in respond.ts
   - Not available for client-side TypeScript

---

## Implementation Strategy

### Conservative Approach:

**No breaking changes to response format** - it's already correct. Focus on:
1. Replace inconsistent NextResponse.json() calls with fail()
2. Add missing respond helper imports
3. Export types for TypeScript
4. Verify frontend compatibility
5. Keep special case routes (exports, PDFs) unchanged

**Key Principle:** Every JSON API response must use ok() or fail() exclusively.

---

## Files to Change

### New Files (1):
- None - respond.ts already exists

### Files to Update (26 total):

#### Priority 1 - Auth Routes (6 files) - HIGH RISK
1. `/src/app/api/auth/login/route.ts`
2. `/src/app/api/auth/signup/route.ts`
3. `/src/app/api/auth/me/route.ts`
4. `/src/app/api/auth/change-password/route.ts`
5. `/src/app/api/auth/forgot-password/route.ts`
6. `/src/app/api/auth/logout/route.ts`

**Changes:**
- Replace `NextResponse.json({ error: "..." })` with `fail("ERROR_CODE", "message", status)`
- Keep existing ok() and handleError() usage
- Ensure all error paths use fail()

#### Priority 2 - Quick Order Routes (5 files) - HIGH RISK
7. `/src/app/api/quick-order/upload/route.ts`
8. `/src/app/api/quick-order/checkout/route.ts`
9. `/src/app/api/quick-order/price/route.ts`
10. `/src/app/api/quick-order/slice/route.ts`
11. `/src/app/api/quick-order/orient/route.ts`

**Changes:**
- Replace validation `NextResponse.json({ error: "..." })` with `fail("VALIDATION_ERROR", "message", 422)`
- Keep existing ok() and handleError() usage

#### Priority 3 - Admin Routes (4 files) - MEDIUM RISK
12. `/src/app/api/admin/clients/route.ts`
13. `/src/app/api/admin/users/route.ts`
14. `/src/app/api/admin/users/[id]/route.ts`
15. `/src/app/api/admin/users/[id]/messages/route.ts`

**Changes:**
- Add import: `import { ok, fail, handleError } from '@/server/api/respond';`
- Replace custom error handling with fail()
- Replace success responses with ok()

#### Priority 4 - Client Routes (3 files) - MEDIUM RISK
16. `/src/app/api/client/invoices/route.ts`
17. `/src/app/api/client/jobs/route.ts`
18. `/src/app/api/client/preferences/route.ts`

**Changes:**
- Replace `NextResponse.json()` with ok() or fail()

#### Priority 5 - Message Route (1 file) - LOW RISK
19. `/src/app/api/messages/route.ts`

**Changes:**
- Replace `NextResponse.json()` success responses with ok()
- Keep fail() for errors

#### Priority 6 - Other Routes (4 files) - LOW RISK
20. `/src/app/api/invoices/[id]/activity/route.ts`
21. `/src/app/api/invoices/[id]/messages/route.ts`
22. `/src/app/api/invoices/[id]/files/route.ts`
23. `/src/app/api/order-files/[id]/route.ts`

**Changes:**
- Replace `NextResponse.json()` with ok() or fail()

#### Priority 7 - Type Export (1 file) - LOW RISK
24. `/src/server/api/respond.ts`

**Changes:**
- Export Success and Failure types for client-side use

#### Priority 8 - Frontend Verification (2 files) - LOW RISK
25. `/src/lib/http.ts`
26. `/src/hooks/use-stripe-status.ts`

**Changes:**
- Verify (no changes needed - already expects correct format)

---

## Implementation Order

### Step 1: Export Response Types (5 minutes, LOW RISK)

**File:** `/src/server/api/respond.ts`

**Changes:**
```typescript
// Add exports
export type { Success, Failure };
```

**Verification:** TypeScript check passes

---

### Step 2: Fix Auth Routes (30 minutes, HIGH RISK)

**Files:** 6 auth routes

**Pattern to replace:**
```typescript
// OLD ❌
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });

// NEW ✅
return fail("UNAUTHORIZED", "Unauthorized", 401);
return fail("INVALID_CREDENTIALS", "Invalid credentials", 400);
```

**Implementation:**
1. Update login/route.ts
2. Update signup/route.ts
3. Update me/route.ts
4. Update change-password/route.ts
5. Update forgot-password/route.ts
6. Update logout/route.ts

**After each file:** `npm run typecheck`

**After all 6:** `npm run build` + manual test login flow

---

### Step 3: Fix Quick Order Routes (30 minutes, HIGH RISK)

**Files:** 5 quick-order routes

**Pattern to replace:**
```typescript
// OLD ❌
return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
return NextResponse.json({ error: "Missing required field" }, { status: 422 });

// NEW ✅
return fail("INVALID_FILE_TYPE", "Invalid file type", 400);
return fail("VALIDATION_ERROR", "Missing required field", 422);
```

**Implementation:**
1. Update upload/route.ts
2. Update checkout/route.ts
3. Update price/route.ts
4. Update slice/route.ts
5. Update orient/route.ts

**After each file:** `npm run typecheck`

**After all 5:** `npm run build` + manual test quick order flow

---

### Step 4: Fix Admin Routes (20 minutes, MEDIUM RISK)

**Files:** 4 admin routes

**Pattern to replace:**
```typescript
// OLD ❌
return NextResponse.json({ data: users });
return NextResponse.json({ error: e?.message ?? "Failed" }, { status: e?.status ?? 400 });

// NEW ✅
return ok(users);
return fail("OPERATION_FAILED", e?.message ?? "Failed", e?.status ?? 400);
```

**Implementation:**
1. Add imports to all 4 files
2. Update admin/clients/route.ts
3. Update admin/users/route.ts
4. Update admin/users/[id]/route.ts
5. Update admin/users/[id]/messages/route.ts

**After each file:** `npm run typecheck`

**After all 4:** `npm run build`

---

### Step 5: Fix Client Routes (15 minutes, MEDIUM RISK)

**Files:** 3 client routes

**Pattern to replace:**
```typescript
// OLD ❌
return NextResponse.json({ data: invoices });

// NEW ✅
return ok(invoices);
```

**Implementation:**
1. Update client/invoices/route.ts
2. Update client/jobs/route.ts
3. Update client/preferences/route.ts

**After all 3:** `npm run typecheck && npm run build`

---

### Step 6: Fix Message Route (10 minutes, LOW RISK)

**File:** 1 message route

**Implementation:**
1. Update messages/route.ts - replace success NextResponse.json() with ok()

**After:** `npm run typecheck && npm run build`

---

### Step 7: Fix Other Routes (15 minutes, LOW RISK)

**Files:** 4 other routes

**Implementation:**
1. Update invoices/[id]/activity/route.ts
2. Update invoices/[id]/messages/route.ts
3. Update invoices/[id]/files/route.ts
4. Update order-files/[id]/route.ts

**After all 4:** `npm run typecheck && npm run build`

---

### Step 8: Verify Frontend Compatibility (10 minutes, LOW RISK)

**Files to verify:** 2 files

**Check http.ts:**
```typescript
// Verify this code extracts data correctly
return body.data as T;  // ✅ Expects { data: T }

// Verify this code handles errors
const error = body?.error ?? { message: "Unknown error" };  // ✅ Expects { error: { message } }
```

**Check use-stripe-status.ts:**
- Verify it handles response format correctly

**No changes needed** - just verification

---

### Step 9: Document Special Cases (5 minutes)

**Files to leave unchanged:**
- Export routes (6 files) - correctly use Response() for file downloads
- PDF routes (2 files) - correctly use NextResponse() for binary data

**Rationale:** These are not JSON APIs, special handling is appropriate

---

## Dependencies & Side Effects

### Cross-Route Dependencies:
None - each route is independent

### Frontend Dependencies:
- http.ts expects `{ data: T }` for success ✅ Already correct
- http.ts expects `{ error: { message } }` for errors ✅ Already correct
- No frontend changes needed

### Type Dependencies:
- Exporting Success<T> and Failure types enables better TypeScript on client
- No breaking changes

### Auth Flow Dependencies:
- Login/signup must maintain exact error messages for UX
- Test authentication after changes

### Quick Order Flow Dependencies:
- Checkout flow is critical revenue path
- Test end-to-end after changes

---

## Risk Assessment

### HIGH RISK Areas:

1. **Auth Routes (6 files)**
   - Impact: Could break login/signup flow
   - Mitigation: Test authentication manually after changes
   - Rollback: Keep git commits granular

2. **Quick Order Routes (5 files)**
   - Impact: Could break customer checkout (revenue)
   - Mitigation: Test checkout flow manually
   - Rollback: One commit per route

### MEDIUM RISK Areas:

3. **Admin Routes (4 files)**
   - Impact: Could break admin user management
   - Mitigation: Test admin pages after changes

4. **Client Routes (3 files)**
   - Impact: Could break client portal
   - Mitigation: Test client dashboard after changes

### LOW RISK Areas:

5. **Other Routes (4 files)**
   - Impact: Specific features only
   - Mitigation: Standard verification

6. **Type Export (1 file)**
   - Impact: None (additive only)
   - Mitigation: None needed

---

## Rollback Plan

If issues arise:

1. **Immediate Rollback:**
   ```bash
   git reset --hard [last-working-commit]
   ```

2. **Partial Rollback:**
   - Each priority group is a separate commit
   - Can rollback specific groups: `git revert [commit-hash]`

3. **Forward Fix:**
   - If issue is minor, fix in place
   - Document in workspace.md

---

## Testing Strategy

### After Each Route:
```bash
npm run typecheck
```

### After Each Priority Group:
```bash
npm run build
```

### Before Final Commit:
```bash
# Full clean build
rm -rf .next
npm run build

# Manual smoke tests
npm run dev
```

### Manual Testing Checklist:
- [ ] Login works
- [ ] Signup works
- [ ] Quick order checkout works
- [ ] Admin user management works
- [ ] Client dashboard loads
- [ ] Invoice list loads
- [ ] Error messages display correctly

---

## Success Metrics

### Quantitative:
- **Routes standardized:** 25 routes
- **Types exported:** 2 types (Success, Failure)
- **Frontend files verified:** 2 files
- **Build errors:** 0
- **Pattern consistency:** 100% (all JSON routes use ok/fail)

### Qualitative:
- ✅ All JSON API routes use respond helpers exclusively
- ✅ Zero NextResponse.json() for JSON responses
- ✅ Error codes consistent across all routes
- ✅ TypeScript types available for client code
- ✅ No functionality changes

---

## Pattern Examples

### Before (Mixed Pattern) ❌:
```typescript
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validation error - uses NextResponse.json
    if (!body.email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const result = await someService(body);

    // Success - uses ok()
    return ok(result);
  } catch (error) {
    // Error - uses handleError()
    return handleError(error, 'route.post');
  }
}
```

### After (Consistent Pattern) ✅:
```typescript
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validation error - uses fail()
    if (!body.email) {
      return fail("VALIDATION_ERROR", "Email required", 422);
    }

    const result = await someService(body);

    // Success - uses ok()
    return ok(result);
  } catch (error) {
    // Error - uses handleError()
    return handleError(error, 'route.post');
  }
}
```

---

## Notes for Implementation

1. **Keep error messages exact** - Don't change user-facing messages
2. **Add error codes** - Every fail() needs a code (VALIDATION_ERROR, UNAUTHORIZED, etc.)
3. **Maintain status codes** - Keep existing HTTP status codes
4. **One route at a time** - Verify build after each change
5. **Test critical flows** - Auth and checkout must work
6. **Update workspace.md** - Track progress for each priority group

---

## Estimated Timeline

| Step | Task | Duration | Cumulative |
|------|------|----------|------------|
| 1 | Export response types | 5 min | 5 min |
| 2 | Fix auth routes (6 files) | 30 min | 35 min |
| 3 | Fix quick-order routes (5 files) | 30 min | 65 min |
| 4 | Fix admin routes (4 files) | 20 min | 85 min |
| 5 | Fix client routes (3 files) | 15 min | 100 min |
| 6 | Fix message route (1 file) | 10 min | 110 min |
| 7 | Fix other routes (4 files) | 15 min | 125 min |
| 8 | Verify frontend | 10 min | 135 min |
| 9 | Document special cases | 5 min | 140 min |
| 10 | Review & final verification | 20 min | 160 min |
| **TOTAL** | | **2.7 hours** | |

---

**Ready to Execute:** Yes ✅
**Last Updated:** 2025-10-21
