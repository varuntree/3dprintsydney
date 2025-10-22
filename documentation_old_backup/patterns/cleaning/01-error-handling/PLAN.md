# Phase 1: Error Handling - Implementation Plan

**Created:** 2025-10-21
**Status:** Ready for Execution

---

## Analysis Summary

### From 3 Explore Agents:

**Agent 1 (Service Files):**
- Found: 17 service files
- Total error throws: 178 occurrences
- Pattern: 96% use `throw new Error(...)`

**Agent 2 (API Routes):**
- Found: 77 API route files
- Pattern 1: 45 files (58%) use helper functions
- Pattern 2: 31 files (40%) use direct NextResponse
- No error handling: 1 file

**Agent 3 (Auth Files):**
- Found: 4 auth-related files
- Total auth errors: 8 occurrences
- Pattern: All use `Object.assign()` pattern

---

## Implementation Plan

### Phase 1.1: Update Service Files (17 files, 178 errors)

**Order (by complexity):**

1. ✅ numbering.ts - 1 error
2. ✅ quick-order.ts - 2 errors
3. ✅ maintenance.ts - 4 errors
4. ✅ printers.ts - 5 errors
5. ✅ tmp-files.ts - 5 errors
6. ✅ settings.ts - 5 errors
7. ✅ order-files.ts - 6 errors
8. ✅ exports.ts - 6 errors
9. ✅ dashboard.ts - 7 errors
10. ✅ materials.ts - 7 errors
11. ✅ users.ts - 7 errors
12. ✅ stripe.ts - 8 errors
13. ✅ product-templates.ts - 10 errors
14. ✅ clients.ts - 16 errors
15. ✅ quotes.ts - 21 errors
16. ✅ jobs.ts - 24 errors
17. ✅ invoices.ts - 38 errors

**Changes:**
- Import: `import { NotFoundError, BadRequestError, AppError } from '@/lib/errors';`
- Replace: `throw new Error('X not found')` → `throw new NotFoundError('X', id)`
- Replace: `throw new Error('validation')` → `throw new BadRequestError('message')`
- Replace: `throw new Error('general')` → `throw new AppError('message', 'CODE', 500)`

---

### Phase 1.2: Update Auth Files (4 files, 8 errors)

**Files:**
1. ✅ src/server/auth/session.ts - 2 errors
2. ✅ src/server/auth/api-helpers.ts - 3 errors
3. ✅ src/server/auth/permissions.ts - 2 errors
4. ✅ src/server/services/tmp-files.ts - 1 error (already counted above)

**Changes:**
- Import: `import { UnauthorizedError, ForbiddenError } from '@/lib/errors';`
- Replace: `throw Object.assign(new Error('Unauthorized'), {status: 401})` → `throw new UnauthorizedError()`
- Replace: `throw Object.assign(new Error('Forbidden'), {status: 403})` → `throw new ForbiddenError('message')`

---

### Phase 1.3: Update API Helper Functions (1 file)

**File:**
1. ✅ src/server/api/respond.ts

**Changes:**
- Update `handleError()` function to check for `AppError` instances
- Extract `code`, `status`, `details` from AppError
- Return appropriate fail() response

**New Code:**
```typescript
import { AppError } from '@/lib/errors';

export function handleError(error: unknown, scope: string): NextResponse {
  logger.error({ scope, error: error as Error });

  if (error instanceof AppError) {
    return fail(error.code, error.message, error.status, error.details);
  }

  return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
}
```

---

### Phase 1.4: Update API Routes to Catch AppError (77 files)

**Priority 1 - Direct Response Pattern (31 files):**
Update these to use helper functions AND catch AppError

**Priority 2 - Helper Function Pattern (45 files):**
Update handleError() usage to work with AppError (already done in 1.3)

**Priority 3 - No Error Handling (1 file):**
- api/auth/me/route.ts - Add try/catch

**Pattern Update:**
```typescript
// OLD
catch (error) {
  const e = error as Error & { status?: number };
  return NextResponse.json({ error: e?.message }, { status: e?.status ?? 400 });
}

// NEW
catch (error) {
  if (error instanceof AppError) {
    return fail(error.code, error.message, error.status, error.details);
  }
  logger.error({ scope: 'resource.action', error });
  return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
}
```

---

## Verification Steps

After each service file:
1. Check TypeScript (no new errors)
2. Commit changes

After all services:
1. Verify all services throw typed errors
2. No generic Error throws remain

After API routes:
1. Verify all routes catch AppError
2. Verify consistent response format

---

## Success Criteria

- [x] lib/errors.ts created ✅
- [ ] All 17 services use typed errors
- [ ] All 4 auth files use UnauthorizedError/ForbiddenError
- [ ] handleError() updated to handle AppError
- [ ] All 77 API routes catch AppError
- [ ] Zero generic `throw new Error()` in services
- [ ] Zero Object.assign error patterns
- [ ] Review agent approval

---

## Files to Change

**Total:** ~95 files

**Created:**
- lib/errors.ts ✅

**Services (17):**
See Phase 1.1 list

**Auth (3):**
See Phase 1.2 list

**API Helper (1):**
- server/api/respond.ts

**API Routes (77):**
See Agent 2 report for complete list

---

**Last Updated:** 2025-10-21
**Status:** Ready for Implementation
