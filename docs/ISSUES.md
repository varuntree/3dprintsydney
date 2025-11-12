# Issues Tracker

## Active Issues

---

## Resolved Issues

### Issue #1: Quote Creation Returns 500 Internal Server Error
**Status:** ✅ RESOLVED
**Priority:** High
**Found:** 2025-11-12 during E2E admin test
**Resolved:** 2025-11-12
**Test:** Admin Full Flow E2E Test (Step 24)

**Description:**
Quote creation failed with 500 Internal Server Error when attempting to create quote with valid data.

**Root Cause:**
Bug in `createQuote` function in `src/server/services/quotes.ts`. Service was constructing `calculator_breakdown` object for ALL line items, even manual entry lines. For manual PRINT lines without calculator data, it created `{ lineType: "PRINT" }` instead of `null`, violating database constraints.

**Fix Applied:**
- Modified `src/server/services/quotes.ts` lines 450-488 (createQuote)
- Modified `src/server/services/quotes.ts` lines 576-614 (updateQuote)
- Implemented conditional logic: only construct breakdown when calculator data exists
- Manual lines now properly store `null` instead of empty object
- Added error logging to `src/app/api/quotes/route.ts`

**Files Changed:**
1. `src/server/services/quotes.ts` - Fixed calculator_breakdown logic
2. `src/app/api/quotes/route.ts` - Added error logging

**Validation:**
- ✅ TypeScript compilation passed
- ✅ Build successful
- ✅ Logic tests passed (3/3 cases)
- ✅ createQuote and updateQuote now consistent
