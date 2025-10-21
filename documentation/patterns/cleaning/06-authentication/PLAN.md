# Phase 6: Authentication - Implementation Plan

**Created:** 2025-10-21
**Status:** Ready for Execution

---

## Executive Summary

Phase 6 will standardize authentication helper naming and consolidate auth logic to fully comply with STANDARDS.md Pattern 6. Current compliance shows **71.4% of routes using inconsistent patterns** with two competing naming conventions ("API" suffix vs no suffix). The main issue is that api-helpers.ts functions are barely used while session.ts functions dominate.

**Scope:** MEDIUM (72 API routes to update)
**Risk Level:** MEDIUM-HIGH (touches all authenticated endpoints)
**Estimated Duration:** 3-4 hours

---

## Analysis Summary

### From 3 Explore Agents:

**Agent 1 (Auth Helper Functions):**
- 28 total auth functions across 6 files
- 4 session functions (requireUser, requireAdmin) - 66 imports
- 5 API helper functions (requireAuthAPI, requireAdminAPI, etc.) - only 4 imports
- 3 permission functions (requireInvoiceAccess, etc.) - 12 imports
- **Key Finding:** Massive duplication - both session.ts and api-helpers.ts have similar role checking logic

**Agent 2 (Auth Usage Patterns):**
- 77 total API routes analyzed
- **55 routes (71.4%)** use OLD session.ts pattern (requireAdmin, requireUser)
- **Only 4 routes (5.2%)** use NEW api-helpers.ts pattern (requireAdminAPI, requireClientWithIdAPI)
- 12 routes (15.6%) use permission-based helpers (requireInvoiceAccess)
- **Key Issue:** Inconsistent naming - most routes use the "wrong" helpers for API context

**Agent 3 (Dependencies and Impact):**
- 86 total import locations for auth helpers
- session.ts is core module with 66 imports
- 72 API routes will need updates
- **High Risk:** Renaming requireAdmin affects 45 files
- **Medium Risk:** Renaming requireUser affects 14 files

---

## Current State vs STANDARDS.md

### STANDARDS.md Pattern 6 Expectation:

**File:** `/server/auth/api-helpers.ts`
**Functions:**
- `getAuthUser(req)` - Get user or null
- `requireAuth(req)` - Require authenticated user
- `requireAdmin(req)` - Require admin role
- `requireClient(req)` - Require client role

### Current Reality:

**File:** `/server/auth/session.ts` (WRONG for API routes)
**Functions:**
- `getUserFromRequest(req)` - 2 usages
- `requireUser(req)` - **14 usages in API routes** ❌
- `requireAdmin(req)` - **45 usages in API routes** ❌

**File:** `/server/auth/api-helpers.ts` (CORRECT but unused)
**Functions:**
- `requireAuthAPI(req)` - 0 usages ❌
- `requireAdminAPI(req)` - 1 usage
- `requireClientAPI(req)` - 0 usages ❌
- `requireClientWithIdAPI(req)` - 3 usages
- `getOptionalUserAPI(req)` - 0 usages ❌

### Problem:

The "API" suffix naming was added to avoid conflicts but is NOT the STANDARDS.md pattern. We need to:
1. **Remove "API" suffix** from api-helpers.ts functions
2. **Update session.ts functions** to use different names for server component context
3. **Migrate all 59 API routes** from session.ts to api-helpers.ts

---

## Goals & Success Criteria

### Goals:
1. ✅ Standardize auth helper naming to match STANDARDS.md (NO "API" suffix)
2. ✅ Consolidate auth logic - remove duplication
3. ✅ Update all 59 API routes to use correct helpers from api-helpers.ts
4. ✅ Preserve server component auth in auth-utils.ts
5. ✅ Maintain permission-based helpers (requireInvoiceAccess, etc.)
6. ✅ No functionality changes

### Success Criteria:
- [ ] All auth helpers follow STANDARDS.md Pattern 6 naming
- [ ] 100% of API routes use api-helpers.ts (not session.ts)
- [ ] Zero "API" suffix in function names
- [ ] Zero duplicate auth logic across files
- [ ] Build passes with zero TypeScript errors
- [ ] No breaking changes to auth behavior
- [ ] Review agent approval

---

## Implementation Strategy

### Conservative Approach:

We'll use a **3-step migration strategy** to minimize risk:

**Step 1: Rename API Helpers (Remove "API" suffix)**
- Rename functions in api-helpers.ts to match STANDARDS.md
- Keep old names as deprecated aliases temporarily
- No breaking changes yet

**Step 2: Migrate API Routes (Batch by batch)**
- Update import statements (session.ts → api-helpers.ts)
- Update function calls (requireAdmin → requireAdmin from api-helpers)
- Verify build after each batch
- 10 batches of ~6 routes each

**Step 3: Cleanup (Remove old functions)**
- Remove deprecated aliases from api-helpers.ts
- Verify session.ts is only used by server components and permissions.ts
- Final build verification

**Key Principle:** Never break existing routes - use gradual migration with aliases.

---

## Step 1: Rename API Helper Functions

### Files to Change: 1 file

**File:** `/src/server/auth/api-helpers.ts`

### Renaming Plan:

```typescript
// CURRENT (with "API" suffix)
export async function requireAuthAPI(req: NextRequest): Promise<LegacyUser>
export async function requireAdminAPI(req: NextRequest): Promise<LegacyUser>
export async function requireClientAPI(req: NextRequest): Promise<LegacyUser>
export async function requireClientWithIdAPI(req: NextRequest): Promise<LegacyUser & { clientId: number }>
export async function getOptionalUserAPI(req: NextRequest): Promise<LegacyUser | null>

// NEW (STANDARDS.md compliant - no suffix)
export async function requireAuth(req: NextRequest): Promise<LegacyUser>
export async function requireAdmin(req: NextRequest): Promise<LegacyUser>
export async function requireClient(req: NextRequest): Promise<LegacyUser>
export async function requireClientWithId(req: NextRequest): Promise<LegacyUser & { clientId: number }>
export async function getAuthUser(req: NextRequest): Promise<LegacyUser | null>

// TEMPORARY ALIASES (for backwards compatibility during migration)
export const requireAuthAPI = requireAuth;  // Remove in Step 3
export const requireAdminAPI = requireAdmin;  // Remove in Step 3
export const requireClientAPI = requireClient;  // Remove in Step 3
export const requireClientWithIdAPI = requireClientWithId;  // Remove in Step 3
export const getOptionalUserAPI = getAuthUser;  // Remove in Step 3
```

### Changes:
1. Rename all 5 functions to remove "API" suffix
2. Add deprecation aliases pointing to new names
3. Update JSDoc to indicate new names

**Risk:** LOW (aliases prevent breaking changes)
**Time:** 10 minutes
**Verification:** `npm run typecheck`

---

## Step 2: Migrate API Routes from session.ts to api-helpers.ts

### Total Routes to Migrate: 59 routes

**Breakdown:**
- 45 routes using `requireAdmin` from session.ts
- 14 routes using `requireUser` from session.ts

### Migration Pattern:

```typescript
// BEFORE ❌
import { requireAdmin } from "@/server/auth/session";

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  // ...
}

// AFTER ✅
import { requireAdmin } from "@/server/auth/api-helpers";

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  // ...
}
```

**Note:** Function call stays the same, only import path changes!

---

### Batch 1: Export Routes (6 files) - LOW RISK

**Routes:**
1. `/api/export/clients/route.ts`
2. `/api/export/invoices/route.ts`
3. `/api/export/jobs/route.ts`
4. `/api/export/materials/route.ts`
5. `/api/export/payments/route.ts`
6. `/api/export/quotes/route.ts`

**Change:** Import requireAdmin from api-helpers.ts
**Time:** 10 minutes
**Verify:** `npm run typecheck && npm run build`

---

### Batch 2: Admin Routes (2 files) - LOW RISK

**Routes:**
1. `/api/admin/clients/route.ts`
2. `/api/admin/users/route.ts`
3. `/api/admin/users/[id]/route.ts`

**Change:** Import requireAdmin from api-helpers.ts
**Time:** 5 minutes
**Verify:** `npm run typecheck`

---

### Batch 3: Dashboard Routes (3 files) - MEDIUM RISK

**Routes:**
1. `/api/dashboard/route.ts`
2. `/api/dashboard/activity/route.ts`
3. `/api/admin/users/[id]/messages/route.ts`

**Change:** Import requireAdmin from api-helpers.ts
**Time:** 5 minutes
**Verify:** `npm run typecheck`

---

### Batch 4: Quote Routes (9 files) - MEDIUM RISK

**Routes:**
1. `/api/quotes/route.ts`
2. `/api/quotes/[id]/route.ts`
3. `/api/quotes/[id]/lines/route.ts`
4. `/api/quotes/[id]/lines/[lineId]/route.ts`
5. `/api/quotes/[id]/client/route.ts`
6. `/api/quotes/[id]/preview/route.ts`
7. `/api/quotes/[id]/send-email/route.ts`
8. `/api/quotes/[id]/convert-to-invoice/route.ts`
9. `/api/quotes/[id]/duplicate/route.ts`

**Change:** Import requireAdmin from api-helpers.ts
**Time:** 15 minutes
**Verify:** `npm run typecheck && npm run build`

---

### Batch 5: Job Routes (6 files) - MEDIUM RISK

**Routes:**
1. `/api/jobs/route.ts`
2. `/api/jobs/board/route.ts`
3. `/api/jobs/[id]/route.ts`
4. `/api/jobs/[id]/status/route.ts`
5. `/api/jobs/bulk-update/route.ts`
6. `/api/jobs/archive/route.ts`

**Change:** Import requireAdmin from api-helpers.ts
**Time:** 10 minutes
**Verify:** `npm run typecheck`

---

### Batch 6: Material/Printer/Product Routes (7 files) - LOW RISK

**Routes:**
1. `/api/materials/route.ts`
2. `/api/materials/[id]/route.ts`
3. `/api/printers/route.ts`
4. `/api/printers/[id]/route.ts`
5. `/api/product-templates/route.ts`
6. `/api/product-templates/[id]/route.ts`
7. `/api/settings/route.ts`

**Change:** Import requireAdmin from api-helpers.ts
**Time:** 10 minutes
**Verify:** `npm run typecheck`

---

### Batch 7: Invoice Routes (7 files) - HIGH RISK

**Routes:**
1. `/api/invoices/route.ts`
2. `/api/invoices/[id]/route.ts`
3. `/api/invoices/[id]/lines/route.ts`
4. `/api/invoices/[id]/lines/[lineId]/route.ts`
5. `/api/invoices/[id]/mark-paid/route.ts`
6. `/api/invoices/[id]/send-email/route.ts`
7. `/api/invoices/[id]/jobs/route.ts`

**Change:** Import requireAdmin from api-helpers.ts
**Time:** 10 minutes
**Verify:** `npm run typecheck && npm run build`
**Note:** Test invoice operations manually after changes

---

### Batch 8: Quick Order Routes (5 files) - HIGH RISK

**Routes:**
1. `/api/quick-order/upload/route.ts`
2. `/api/quick-order/price/route.ts`
3. `/api/quick-order/slice/route.ts`
4. `/api/quick-order/orient/route.ts`
5. `/api/quick-order/checkout/route.ts`

**Change:** Import requireAuth from api-helpers.ts (was requireUser)
**Time:** 10 minutes
**Verify:** `npm run typecheck && npm run build`
**Note:** Test quick order flow manually after changes

---

### Batch 9: Client Routes (3 files) - MEDIUM RISK

**Routes:**
1. `/api/client/invoices/route.ts` (already uses api-helpers)
2. `/api/client/materials/route.ts`
3. `/api/quick-order/tmp-files/[id]/route.ts`

**Change:** Import requireAuth from api-helpers.ts
**Time:** 5 minutes
**Verify:** `npm run typecheck`

---

### Batch 10: Message and File Routes (6 files) - MEDIUM RISK

**Routes:**
1. `/api/messages/route.ts`
2. `/api/order-files/route.ts`
3. `/api/order-files/[id]/route.ts`
4. `/api/invoices/[id]/files/route.ts`
5. `/api/tmp-files/[id]/route.ts`
6. `/api/invoices/[id]/attachments/route.ts`

**Change:** Import requireAuth or requireAdmin from api-helpers.ts
**Time:** 10 minutes
**Verify:** `npm run typecheck && npm run build`

---

### Routes Already Using api-helpers.ts (No Changes Needed)

**Routes (4 total):**
1. `/api/client/dashboard/route.ts` - uses requireClientWithIdAPI
2. `/api/client/jobs/route.ts` - uses requireClientWithIdAPI
3. `/api/client/preferences/route.ts` - uses requireClientWithIdAPI
4. `/api/invoices/[id]/activity/route.ts` - uses requireAdminAPI

**Action:** Update to use new function names without "API" suffix
**Time:** 5 minutes

---

## Step 3: Cleanup and Finalization

### Files to Update: 2 files

**File 1:** `/src/server/auth/api-helpers.ts`
- Remove deprecated aliases (requireAuthAPI, requireAdminAPI, etc.)
- Keep only new function names
- Update JSDoc to reflect standard naming

**File 2:** `/src/server/auth/permissions.ts`
- Verify it still imports from session.ts (for `getUserFromRequest`)
- This is acceptable - permissions need raw session access

**Verification:**
- Ensure session.ts is ONLY imported by:
  - auth-utils.ts (server components)
  - permissions.ts (resource-level auth)
  - middleware.ts (session management)
- Ensure NO API routes import from session.ts
- Run full build: `npm run build`

**Time:** 10 minutes
**Risk:** LOW (all routes already migrated)

---

## Dependencies & Side Effects

### Files That Will NOT Change:

**1. /src/server/auth/session.ts**
- Keep all functions as-is
- Used by: auth-utils.ts, permissions.ts, middleware.ts
- Purpose: Server component auth and session management

**2. /src/server/auth/permissions.ts**
- Keep requireInvoiceAccess, requireAttachmentAccess, requirePaymentAccess
- No changes needed - already follows correct pattern

**3. /src/lib/auth-utils.ts**
- Keep requireAuth, requireAdmin, requireClient for server components
- No changes needed - different context (redirects vs API)

**4. middleware.ts**
- No changes - uses session.ts correctly

### Type Dependencies:

**LegacyUser type** - NO changes needed
- All auth helpers return this type
- Defined in `/lib/types/user.ts`
- Used across all auth functions

---

## Risk Assessment

### HIGH RISK Areas:

1. **Quick Order Routes (5 files)**
   - Impact: Could break customer checkout (revenue)
   - Mitigation: Test checkout flow manually after migration
   - Rollback: Batch 8 commit can be reverted

2. **Invoice Routes (7 files)**
   - Impact: Could break invoice operations
   - Mitigation: Test invoice create/update manually
   - Rollback: Batch 7 commit can be reverted

### MEDIUM RISK Areas:

3. **Quote Routes (9 files)**
   - Impact: Could break quote operations
   - Mitigation: Test quote create/convert manually

4. **Job Routes (6 files)**
   - Impact: Could break job board
   - Mitigation: Test job updates manually

### LOW RISK Areas:

5. **Export Routes (6 files)**
   - Impact: Export operations only
   - Mitigation: Standard verification

6. **Admin/Material/Printer Routes (9 files)**
   - Impact: Admin-only features
   - Mitigation: Standard verification

---

## Rollback Plan

If issues arise:

1. **Immediate Rollback:**
   ```bash
   git reset --hard [last-working-commit]
   ```

2. **Partial Rollback:**
   - Each batch is a separate commit
   - Can rollback specific batches: `git revert [commit-hash]`

3. **Forward Fix:**
   - Keep deprecation aliases in api-helpers.ts
   - Fix individual routes as needed

---

## Testing Strategy

### After Each Batch:
```bash
npm run typecheck
```

### After Batches 4, 7, 8 (High-risk):
```bash
npm run build
```

### Before Final Commit:
```bash
# Full clean build
rm -rf .next
npm run build

# Start dev server
npm run dev
```

### Manual Testing Checklist:
- [ ] Login works
- [ ] Admin dashboard loads
- [ ] Quote create/update works
- [ ] Invoice create/update works
- [ ] Quick order checkout works
- [ ] Job board loads and updates
- [ ] Export operations work
- [ ] Client dashboard loads

---

## Success Metrics

### Quantitative:
- **Routes migrated:** 59/59 (100%)
- **Auth helpers standardized:** 5/5 functions
- **"API" suffix removed:** 5 functions
- **Import path updates:** ~59 statements
- **Build errors:** 0
- **Pattern compliance:** 5.2% → 100%

### Qualitative:
- ✅ All API routes use api-helpers.ts
- ✅ Zero "API" suffix in auth helper names
- ✅ Naming matches STANDARDS.md Pattern 6
- ✅ Clear separation: API routes use api-helpers.ts, server components use auth-utils.ts
- ✅ No duplicate auth logic
- ✅ No functionality changes

---

## Commit Strategy

**Granular commits for safety:**

```bash
# Step 1
git commit -m "Phase 6: Rename auth helpers to remove API suffix (add aliases)"

# Step 2 (10 batches)
git commit -m "Phase 6 Batch 1: Migrate export routes to use api-helpers"
git commit -m "Phase 6 Batch 2: Migrate admin routes to use api-helpers"
git commit -m "Phase 6 Batch 3: Migrate dashboard routes to use api-helpers"
git commit -m "Phase 6 Batch 4: Migrate quote routes to use api-helpers"
git commit -m "Phase 6 Batch 5: Migrate job routes to use api-helpers"
git commit -m "Phase 6 Batch 6: Migrate material/printer/product routes to use api-helpers"
git commit -m "Phase 6 Batch 7: Migrate invoice routes to use api-helpers"
git commit -m "Phase 6 Batch 8: Migrate quick-order routes to use api-helpers"
git commit -m "Phase 6 Batch 9: Migrate client routes to use api-helpers"
git commit -m "Phase 6 Batch 10: Migrate message/file routes to use api-helpers"

# Step 3
git commit -m "Phase 6: Remove deprecated API suffix aliases"

# Final
git commit -m "Phase 6 Complete: Auth helper standardization"
```

---

## Notes for Implementation

1. **Only change import paths** - Function calls stay the same
2. **Test HIGH RISK batches manually** (quotes, invoices, quick-order)
3. **Verify build after each batch** - Don't skip typecheck
4. **Keep aliases until all routes migrated** - Don't remove too early
5. **Update workspace.md** after each batch completion
6. **Document any deviations** from plan in workspace.md

---

## Estimated Timeline

| Step | Task | Duration | Cumulative |
|------|------|----------|------------|
| 1 | Rename API helpers + add aliases | 10 min | 10 min |
| 2.1 | Batch 1: Export routes | 10 min | 20 min |
| 2.2 | Batch 2: Admin routes | 5 min | 25 min |
| 2.3 | Batch 3: Dashboard routes | 5 min | 30 min |
| 2.4 | Batch 4: Quote routes | 15 min | 45 min |
| 2.5 | Batch 5: Job routes | 10 min | 55 min |
| 2.6 | Batch 6: Material/Printer/Product | 10 min | 65 min |
| 2.7 | Batch 7: Invoice routes | 10 min | 75 min |
| 2.8 | Batch 8: Quick-order routes | 10 min | 85 min |
| 2.9 | Batch 9: Client routes | 5 min | 90 min |
| 2.10 | Batch 10: Message/File routes | 10 min | 100 min |
| 2.11 | Update routes with old aliases | 5 min | 105 min |
| 3 | Cleanup + remove aliases | 10 min | 115 min |
| Final | Review & verification | 20 min | 135 min |
| **TOTAL** | | **2.25 hours** | |

**Note:** Add 30-45 minutes for manual testing of critical flows (checkout, invoices, quotes)

---

**Ready to Execute:** Yes ✅
**Last Updated:** 2025-10-21
