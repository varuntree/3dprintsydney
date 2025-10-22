# Phase 8: Logging - Implementation Plan

**Created:** 2025-10-21
**Status:** Ready for Execution

---

## Executive Summary

Phase 8 will standardize logging patterns to ensure 100% consistency with Pattern 8. The explore agents found that the logging architecture is **well-implemented** but has **inconsistent scope naming** and **missing message parameters** in error logs.

**Key Finding:** Logger implementation is solid (41 files, 120 calls), but ~40 violations of scope naming conventions and error message patterns need fixing.

**Scope:** MEDIUM (40 violations across 20-25 files)
**Risk Level:** LOW (mostly string updates, no logic changes)
**Estimated Duration:** 2-3 hours

---

## Analysis Summary from 3 Explore Agents

### Agent 1: Logger Implementation
- **Logger location:** `/lib/logger.ts` with 3 methods (info, warn, error)
- **Structured format:** JSON output with scope, message, data, error
- **41 files** use the logger with **120 total calls**
- **No direct console.log** in server-side (.ts) files ✅
- **Missing:** `debug()` method (not critical for Phase 8)

### Agent 2: Logger Usage Patterns
- **Service files:** 18 files with heavy usage (quotes.ts: 18 calls, jobs.ts: 13 calls)
- **API routes:** 20 files use logger
- **Scope naming:** Generally follows `resource.action` pattern
- **Structured data:** All logs include scope + context (data/error)
- **Client-side:** 6 console.log instances in .tsx files (out of scope)

### Agent 3: Pattern Violations
- **Scope naming violations:** 10 scopes use camelCase/underscores (should be kebab-case)
- **Missing messages:** 26 error log calls lack descriptive message parameter
- **Variable scope:** 1 instance in respond.ts uses variable instead of literal
- **Scope nesting:** Some 3-level scopes (should be 2 levels max)

---

## Current State Assessment

### ✅ What's Working Well:

1. **Logger implementation:**
   - Clean structured logging API
   - JSON output ready for log aggregation
   - Consistent across 41 files

2. **Server-side logging:**
   - ZERO direct console calls in .ts files
   - All services use structured logger
   - Rich context (IDs, counts, timestamps)

3. **Scope organization:**
   - Mostly follows `resource.action` pattern
   - Good coverage across services

### ❌ What Needs Fixing:

1. **Inconsistent Scope Naming (10 violations):**
   ```typescript
   // WRONG - camelCase
   orderFiles.save → order-files.save
   tmpFiles.delete → tmp-files.delete
   invoices.markPaid → invoices.mark-paid
   
   // WRONG - underscores
   export.ar_aging → export.ar-aging
   export.material_usage → export.material-usage
   
   // WRONG - mixed case
   settings.shippingRegions.parse → settings.shipping-regions.parse
   ```

2. **Missing Message Parameters (26 violations):**
   ```typescript
   // WRONG - No message in error log
   logger.error({ scope: 'stripe.webhook', error: error as Error });
   
   // CORRECT
   logger.error({ 
     scope: 'stripe.webhook',
     message: 'Webhook processing failed',
     error 
   });
   ```

3. **Variable Scope in respond.ts (1 violation):**
   ```typescript
   // WRONG - scope is a variable
   export function handleError(error: unknown, scope: string) {
     logger.error({ scope, error });  // Needs static scope
   }
   ```

---

## Goals & Success Criteria

### Goals:
1. ✅ Standardize all scope names to kebab-case format
2. ✅ Add message parameters to all error logs
3. ✅ Fix variable scope usage
4. ✅ Maintain 100% build success
5. ✅ No functionality changes

### Success Criteria:
- [ ] ALL scopes use `resource.action` kebab-case format
- [ ] ALL error logs include descriptive message parameter
- [ ] ZERO variable scopes (all literal strings)
- [ ] Build passes with zero TypeScript errors
- [ ] Review agent approval
- [ ] All logs follow STANDARDS.md Pattern 8

---

## Implementation Strategy

**Conservative Approach:** Fix scope names + add messages, no API changes

**Priority Order:**
1. **HIGH:** Fix scope naming inconsistencies
2. **HIGH:** Add messages to error logs
3. **MEDIUM:** Fix variable scope in respond.ts
4. **OPTIONAL:** Reduce 3-level scope nesting

We will NOT:
- ❌ Change logger API structure
- ❌ Add debug() method (out of scope)
- ❌ Change client-side console usage (out of scope)

We WILL:
- ✅ Standardize scope string literals to kebab-case
- ✅ Add message parameters to error logs
- ✅ Replace variable scope with literal strings where possible
- ✅ Document scope naming conventions

---

## Detailed Implementation Plan

### Task 1: Fix Scope Naming Inconsistencies (1 hour)

#### Group 1: camelCase → kebab-case (6 scopes)

**File:** `src/server/services/order-files.ts`
```typescript
// Lines to fix
'orderFiles.save' → 'order-files.save'
'orderFiles.delete' → 'order-files.delete'
```

**File:** `src/server/services/tmp-files.ts`
```typescript
// Lines to fix
'tmpFiles.save' → 'tmp-files.save'
'tmpFiles.delete' → 'tmp-files.delete'
```

**File:** `src/server/services/invoices.ts`
```typescript
// Find and fix
'invoices.markPaid' → 'invoices.mark-paid'
```

**File:** `src/server/services/settings.ts`
```typescript
// Lines 70, 89
'settings.shippingRegions.parse' → 'settings.shipping-regions.parse'
'settings.paymentTerms.parse' → 'settings.payment-terms.parse'
```

#### Group 2: underscores → hyphens (3 scopes)

**File:** `src/app/api/export/ar-aging/route.ts`
```typescript
'export.ar_aging' → 'export.ar-aging'
```

**File:** `src/app/api/export/material-usage/route.ts`
```typescript
'export.material_usage' → 'export.material-usage'
```

**File:** `src/app/api/export/printer-utilization/route.ts`
```typescript
'export.printer_utilization' → 'export.printer-utilization'
```

---

### Task 2: Add Message Parameters to Error Logs (1 hour)

**Pattern to apply:**
```typescript
// BEFORE
logger.error({ scope: 'resource.action', error: error as Error });

// AFTER
logger.error({ 
  scope: 'resource.action',
  message: '[Descriptive message about what failed]',
  error 
});
```

**Files to update (26 instances in ~20 files):**

1. `src/app/api/stripe/webhook/route.ts` - "Webhook processing failed"
2. `src/app/api/client/jobs/route.ts` - "Failed to fetch client jobs"
3. `src/app/api/client/preferences/route.ts` - "Failed to fetch/update preferences" (2 instances)
4. `src/app/api/auth/forgot-password/route.ts` - "Password reset failed"
5. `src/app/api/auth/me/route.ts` - "Failed to fetch user profile"
6. `src/app/api/auth/logout/route.ts` - "Logout failed"
7. `src/app/api/quick-order/upload/route.ts` - "File upload failed"
8. `src/app/api/quick-order/price/route.ts` - "Price calculation failed"
9. `src/app/api/quick-order/checkout/route.ts` - "Checkout failed"
10. `src/app/api/quick-order/slice/route.ts` - "Slicing failed"
11. `src/app/api/quick-order/orient/route.ts` - "Orientation failed"
12. `src/app/api/export/jobs/route.ts` - "Jobs export failed"
13. `src/app/api/export/material-usage/route.ts` - "Material usage export failed"
14. `src/app/api/export/ar-aging/route.ts` - "AR aging export failed"
15. `src/app/api/export/invoices/route.ts` - "Invoices export failed"
16. `src/app/api/export/printer-utilization/route.ts` - "Printer utilization export failed"
17. `src/app/api/export/payments/route.ts` - "Payments export failed"
18. `src/app/api/invoices/[id]/files/route.ts` - "File operation failed"
19. `src/app/api/tmp-file/[...id]/route.ts` - "Temp file retrieval failed"
20. `src/app/api/order-files/[id]/route.ts` - "Order file retrieval failed"

---

### Task 3: Fix Variable Scope in respond.ts (15 minutes)

**File:** `src/server/api/respond.ts`

**Current:**
```typescript
export function handleError(error: unknown, scope: string) {
  logger.error({ scope, error });
  // ... error handling
}
```

**Issue:** `scope` is passed as a variable, making it hard to track in logs.

**Solution:** Document that this is acceptable for the handleError utility, OR add message parameter:
```typescript
export function handleError(error: unknown, scope: string) {
  logger.error({ 
    scope,
    message: 'Request handler error',
    error 
  });
  // ... error handling
}
```

---

### Task 4: Optional - Reduce Scope Nesting (30 minutes)

Some scopes have 3 levels which could be simplified:

**Current:**
- `jobs.ensure.activity` (3 levels)
- `jobs.status.activity` (3 levels)
- `invoices.revert.cleanup` (3 levels)

**Recommendation:** Keep as-is for Phase 8 (not breaking, just verbose)

---

## Implementation Order

### Step 1: Fix Scope Naming (1 hour)
1. Fix camelCase scopes in services (order-files, tmp-files, invoices, settings)
2. Fix underscore scopes in export routes (ar-aging, material-usage, printer-utilization)
3. Run grep to verify no violations remain
4. Build verification

### Step 2: Add Error Messages (1 hour)
1. Update all 20 API route files with missing error messages
2. Use descriptive messages that explain what operation failed
3. Maintain consistent message format
4. Build verification

### Step 3: Fix Variable Scope (15 minutes)
1. Update respond.ts handleError function
2. Add message parameter
3. Build verification

### Step 4: Final Verification (30 minutes)
1. Run full build
2. Deploy review agent
3. Fix any issues found
4. Update workspace
5. Commit changes

**Total Estimated Time: 2.5-3 hours**

---

## Files to Change

### Modified Files (Scope Naming - 9 files):
1. `src/server/services/order-files.ts` - Fix 2 scopes
2. `src/server/services/tmp-files.ts` - Fix 2 scopes
3. `src/server/services/invoices.ts` - Fix 1 scope
4. `src/server/services/settings.ts` - Fix 2 scopes
5. `src/app/api/export/ar-aging/route.ts` - Fix 1 scope
6. `src/app/api/export/material-usage/route.ts` - Fix 1 scope
7. `src/app/api/export/printer-utilization/route.ts` - Fix 1 scope
8. `src/server/api/respond.ts` - Add message parameter

### Modified Files (Error Messages - 20 files):
9. `src/app/api/stripe/webhook/route.ts`
10. `src/app/api/client/jobs/route.ts`
11. `src/app/api/client/preferences/route.ts`
12. `src/app/api/auth/forgot-password/route.ts`
13. `src/app/api/auth/me/route.ts`
14. `src/app/api/auth/logout/route.ts`
15. `src/app/api/quick-order/upload/route.ts`
16. `src/app/api/quick-order/price/route.ts`
17. `src/app/api/quick-order/checkout/route.ts`
18. `src/app/api/quick-order/slice/route.ts`
19. `src/app/api/quick-order/orient/route.ts`
20. `src/app/api/export/jobs/route.ts`
21. `src/app/api/export/material-usage/route.ts` (also has scope fix)
22. `src/app/api/export/ar-aging/route.ts` (also has scope fix)
23. `src/app/api/export/invoices/route.ts`
24. `src/app/api/export/printer-utilization/route.ts` (also has scope fix)
25. `src/app/api/export/payments/route.ts`
26. `src/app/api/invoices/[id]/files/route.ts`
27. `src/app/api/tmp-file/[...id]/route.ts`
28. `src/app/api/order-files/[id]/route.ts`

**Total: 28 files (8 scope fixes + 20 error messages + 1 respond.ts)**

---

## Risk Assessment

### LOW RISK:
- **Scope name changes**
  - Impact: Minimal - only affects log search queries
  - Mitigation: String literals, easy to verify
  - Rollback: Simple string reverts

- **Adding message parameters**
  - Impact: None - only adds context to logs
  - Mitigation: No logic changes, just additional data
  - Rollback: Can be reverted individually

- **respond.ts update**
  - Impact: Low - adds message to all handleError calls
  - Mitigation: Utility function used everywhere
  - Rollback: Single file revert

### NEGLIGIBLE RISK:
- **Build impact:** ZERO - all changes are strings
- **Functionality:** NO changes to business logic
- **Tests:** NO test changes needed

---

## Testing Strategy

### Build Verification:
```bash
npm run typecheck  # Must pass
npm run build      # Must pass
npm run lint       # Must pass
```

### Manual Verification:
- **Grep for old scopes** - Verify no camelCase/underscore scopes remain
- **Check error logs** - Verify all include message parameter
- **Review respond.ts** - Verify message added

### Test Cases:
1. Trigger error in API route → Should log with message
2. Grep for old scope names → Should find zero matches
3. Check log output format → Should include message field

---

## Success Metrics

**Quantitative:**
- 10 scope naming violations fixed (100% kebab-case compliance)
- 26 error logs updated with messages
- 1 variable scope fixed
- 0 build errors
- 100% pattern compliance

**Qualitative:**
- ✅ All scopes follow `resource.action` kebab-case format
- ✅ All error logs include descriptive messages
- ✅ Improved log searchability and debugging
- ✅ Consistent logging pattern across codebase
- ✅ Better observability

---

## Commit Strategy

```bash
# Commit 1: Fix scope naming
git commit -m "Phase 8: Standardize log scope naming

- Fix camelCase scopes to kebab-case
- Replace underscores with hyphens in export scopes
- Standardize settings service scope names

Files: 7 service/route files"

# Commit 2: Add error messages
git commit -m "Phase 8: Add descriptive messages to error logs

- Add message parameter to 26 error log calls
- Improve debugging context for all API route errors
- Consistent error message format

Files: 20 API route files"

# Commit 3 (if needed): Fix respond.ts
git commit -m "Phase 8: Add message to handleError utility

- Add descriptive message to handleError logger call
- Improves error context across all API handlers

Files: respond.ts"

# Final commit message format
git commit -m "Phase 8: Standardize logging patterns

Summary of all changes...

Pattern compliance: 100%
Scopes fixed: 10
Error messages added: 26
Build verified: ✅

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Notes for Implementation

1. **Scope naming** is purely cosmetic - safe to batch update
2. **Error messages** should be clear and action-oriented
3. **respond.ts** is used by all error handlers - verify impact
4. **No logic changes** - only string/parameter additions
5. **Build should pass** with zero new errors
6. **Grep verification** ensures no violations remain

---

**Ready to Execute:** Yes ✅
**Estimated Duration:** 2.5-3 hours
**Risk Level:** LOW
**Last Updated:** 2025-10-21

