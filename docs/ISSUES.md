# Issues Tracker

## Active Issues

No active issues.

---

## Resolved Issues

### Issue #2: Quote Number Collision - Duplicate Key Constraint Violation
**Status:** ✅ RESOLVED
**Priority:** High
**Found:** 2025-11-12 during E2E admin test (after fixing Issue #1)
**Resolved:** 2025-11-13
**Test:** Admin Full Flow E2E Test (Step 24)

**Description:**
Quote creation failed with database constraint violation when numbering service generated duplicate quote number.

**Root Cause:**
The `next_document_number` PostgreSQL function incremented sequence counter without checking if generated number existed in target table. Database analysis revealed:
- `number_sequences.current` = 3 (for quote kind)
- Existing quotes: QT-0002 (id:1), QT-0003 (id:3), QT-0004 (id:4)
- Next generated number would be QT-0003 (collision!)

Sequence desynchronized with actual data, likely due to manual deletions, data imports, or sequence resets.

**Fix Applied:**
- Created migration: `supabase/migrations/20251112130000_fix_quote_number_collision.sql`
- Replaced `next_document_number` function with collision-resistant version
- New logic: Generate candidate → Check existence → Retry if collision → Return unused number
- Self-healing: automatically recovers from sequence desync
- Max 100 retries with safety check
- Backward compatible (same function signature)

**Files Changed:**
1. `supabase/migrations/20251112130000_fix_quote_number_collision.sql` - New collision-resistant function

**Validation:**
- ✅ Migration applied to production database
- ✅ Function test: `next_document_number('quote', 'QT-')` returned QT-0005
- ✅ Sequence updated: `number_sequences.current` = 5
- ✅ Quote creation successful: QT-0006 created without collision
- ✅ Admin E2E test passed: Quote → Invoice → Payment flow complete

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
