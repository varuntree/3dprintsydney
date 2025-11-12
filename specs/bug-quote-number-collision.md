# Bug: Quote Number Collision - Duplicate Key Constraint Violation

## Bug Description

Quote creation fails with database constraint violation when the numbering service generates a quote number that already exists in the database. The error occurs at the database level when attempting to insert a new quote with a duplicate `number` field, which has a unique constraint.

**Symptoms:**
- HTTP 500 Internal Server Error returned to client
- Error message: `duplicate key value violates unique constraint "quotes_number_key"`
- Quote creation completely blocked

**Expected Behavior:**
The numbering service should generate unique sequential quote numbers that never collide with existing records, even if the sequence counter becomes out of sync with the actual data.

**Actual Behavior:**
- Service generated number: "QT-0003"
- Database rejected insertion due to existing "QT-0003" record
- Application crashes with 500 error

## Problem Statement

The `next_document_number` PostgreSQL function increments the sequence counter blindly without verifying that the generated number is actually available in the target table (quotes or invoices). When the sequence counter becomes out of sync with actual data (e.g., due to manual deletions, data imports, or sequence resets), it generates numbers that already exist, causing unique constraint violations.

**Current State:**
- `number_sequences.current` = 3 (for quote kind)
- Existing quotes in DB: QT-0002 (id:1), QT-0003 (id:3), QT-0004 (id:4)
- Next generated number would be QT-0003 (collision!)

## Solution Statement

Modify the `next_document_number` database function to be collision-resistant:
1. Generate candidate number by incrementing sequence
2. Check if the number already exists in the target table (quotes/invoices)
3. If collision detected, keep incrementing until an unused number is found
4. Update the sequence counter to match the final used number
5. Return the collision-free number

This makes the function self-healing: it automatically recovers from sequence desync without manual intervention.

## Steps to Reproduce

1. Ensure database has quotes with numbers up to QT-0004
2. Ensure `number_sequences.current` = 3 for quote kind
3. Attempt to create a new quote via admin UI
4. Observe 500 error with constraint violation

**Test Command:**
```bash
# Run admin E2E test, will fail at step 24 (Create Quote)
/test_e2e .claude/commands/e2e/admin_full_flow.md
```

## Root Cause Analysis

**Database State Analysis:**
```sql
-- Sequence counter
SELECT * FROM number_sequences WHERE kind = 'quote';
-- Result: current = 3

-- Actual quotes
SELECT id, number FROM quotes ORDER BY id;
-- Result: QT-0002, QT-0003, QT-0004
```

**Root Cause:**
The `next_document_number` function uses `INSERT ... ON CONFLICT DO UPDATE` to increment the sequence, but doesn't validate that the generated number is unused. The sequence became desynchronized (counter: 3, max quote: 4), likely due to:
- Manual data deletion without sequence reset
- Data import with pre-existing quote numbers
- Sequence manual adjustment

**Current Function Logic (Flawed):**
```sql
-- Increments blindly
on conflict (kind) do update
  set current = number_sequences.current + 1
  ...
  returning number_sequences.current into new_number;

-- Generates without checking
return effective_prefix || lpad(new_number::text, 4, '0');
```

**Problem:** No validation that `QT-0003` (or any generated number) is actually available in the quotes table before returning it.

## Relevant Files

### Existing Files

- **supabase/migrations/20251112120000_fix_next_document_number.sql**
  - Contains current implementation of `next_document_number` function
  - Needs to be replaced with collision-resistant version
  - Increments sequence but doesn't check for collisions

- **src/server/services/numbering.ts** (lines 11-25)
  - TypeScript wrapper that calls the database function
  - No changes needed - function signature remains the same
  - Already has error handling for database failures

- **src/server/services/quotes.ts** (line 422)
  - Calls `nextDocumentNumber("quote")` during quote creation
  - No changes needed - uses the function as-is

- **src/server/services/invoices.ts**
  - Similar usage for invoice numbering
  - No changes needed

- **docs/ISSUES.md**
  - Issue tracker where this bug (Issue #2) is documented
  - Update with resolution details after fix

### New Files

- **supabase/migrations/20251112130000_fix_quote_number_collision.sql**
  - New migration to replace `next_document_number` function
  - Implements collision detection and retry logic
  - Uses dynamic SQL to check quotes/invoices tables

## Step by Step Tasks

### 1. Create Collision-Resistant Database Function

Create migration file `supabase/migrations/20251112130000_fix_quote_number_collision.sql` with:

- Drop and recreate `next_document_number` function
- Add loop to retry on collision (max 100 attempts)
- Use dynamic SQL to check existence in quotes/invoices tables
- Update sequence to final used number
- Raise exception if no unused number found after retries

**Key Logic:**
```sql
LOOP
  -- Generate candidate number
  -- Check if EXISTS in target table
  -- If not exists, return it
  -- Else increment and retry
END LOOP;
```

### 2. Validate Migration Syntax

- Check SQL syntax with `supabase db lint` (if available)
- Verify function signature matches existing: `next_document_number(p_kind text, p_default_prefix text) returns text`
- Ensure backward compatibility with existing callers

### 3. Document the Fix

Update `docs/ISSUES.md`:
- Mark Issue #2 as RESOLVED
- Add resolution timestamp
- Document root cause and fix applied
- List migration file created

### 4. Run Validation Commands

Execute validation commands to ensure:
- Migration file is syntactically valid
- Function can be applied without errors
- TypeScript compilation still passes
- Application builds successfully

## Validation Commands

Execute every command to validate the bug is fixed.

```bash
# 1. Verify migration file exists
ls -la supabase/migrations/20251112130000_fix_quote_number_collision.sql

# 2. Check TypeScript compilation
npx tsc --noEmit

# 3. Build application
npm run build

# 4. Verify no syntax errors in migration (visual inspection)
cat supabase/migrations/20251112130000_fix_quote_number_collision.sql
```

**NOTE:** The migration will NOT be applied in this task. The main agent will apply it during test continuation using Supabase MCP.

**Post-Migration Validation (to be done by main agent):**
```sql
-- Test the function generates non-colliding numbers
SELECT next_document_number('quote', 'QT-');  -- Should return QT-0005
SELECT next_document_number('quote', 'QT-');  -- Should return QT-0006

-- Verify sequence was updated
SELECT current FROM number_sequences WHERE kind = 'quote';  -- Should be >= 5
```

## Notes

**Critical Constraints:**
- ⚠️ **NO DATABASE CHANGES**: This sub-agent must NOT apply the migration. Only create the migration file.
- ⚠️ The main agent will apply the migration using Supabase MCP after reviewing it.
- ⚠️ If a migration file is absolutely needed, create it but DO NOT execute `supabase db push` or any database commands.

**Function Requirements:**
- Must maintain exact same signature: `next_document_number(p_kind text, p_default_prefix text) returns text`
- Must work for both 'quote' and 'invoice' kinds
- Must handle edge cases: empty tables, sequence at 0, very high numbers
- Must be transaction-safe (multiple concurrent calls shouldn't generate duplicates)

**Testing Strategy:**
After the main agent applies migration:
1. Continue admin E2E test from step 24 (Create Quote)
2. Verify quote creation succeeds
3. Check generated number is collision-free
4. Complete full admin test flow

**Performance Considerations:**
- Loop with existence check may be slower than direct increment
- Acceptable tradeoff for correctness
- Max 100 iterations prevents infinite loops
- Most cases will succeed on first attempt (when sequence is in sync)

**Alternative Approaches Considered:**
1. ❌ **Reset sequence to max(id)**: Doesn't handle custom numbers or gaps
2. ❌ **Lock table during generation**: Too heavyweight, affects concurrency
3. ✅ **Retry loop with existence check**: Simple, robust, self-healing
