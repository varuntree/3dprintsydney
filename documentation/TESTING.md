# Testing Documentation

Concise reference for 3D Print Sydney E2E testing setup.

---

## Overview

**Approach:** E2E tests only (no unit/integration)
**Environment:** Production Supabase (no local setup)
**Tool:** Playwright MCP via Claude
**Tests:** 2 flows (admin + client)

---

## Architecture

```
/test_e2e [test_file]
  ↓
.claude/commands/test_e2e.md (runner)
  ↓
.claude/commands/e2e/[test].md (test steps)
  ↓
Playwright MCP (browser automation)
  ↓
Screenshots → test_results/[test_name]/
```

**Flow:** Claude reads test markdown → executes steps via Playwright → captures screenshots → runs cleanup SQL via Supabase MCP

---

## Test Users (Hardcoded)

**Admin:**
- Email: `admin@test.3dprintsydney.com`
- Password: `TestPass123!`
- Auth ID: `9b3182d8-e8e3-4b33-bf13-9664289d1a06`
- Users Table ID: `5`
- Role: `ADMIN`

**Client:**
- Email: `client@test.3dprintsydney.com`
- Password: `TestPass123!`
- Auth ID: `2846ccc2-611b-4e3a-84d9-ced4021574c5`
- Users Table ID: `6`
- Client ID: `9`
- Role: `CLIENT`
- Wallet: `$100.00` (reset after each test)

**Created:** Manually via Supabase MCP in production DB
**Persist:** Never deleted, reused across all tests

---

## Test Files

### Admin Full Flow
**File:** `.claude/commands/e2e/admin_full_flow.md`
**Steps:**
1. Login as admin
2. Create client (TEST_Corporation_[timestamp])
3. Create quote with line items
4. Send quote (DRAFT → PENDING)
5. Convert to invoice
6. Mark paid (creates job)
7. Verify job created
8. Cleanup via Supabase MCP

### Client Full Flow
**File:** `.claude/commands/e2e/client_full_flow.md`
**Steps:**
1. Login as client
2. Upload STL (test_cube_[timestamp].stl from /tmp/)
3. Configure order (material, quantity)
4. Get price quote
5. Checkout with wallet ($100)
6. Verify invoice created
7. Verify job created
8. Verify wallet updated
9. Cleanup via Supabase MCP + reset wallet to $100

---

## Running Tests

**Command:**
```bash
/test_e2e .claude/commands/e2e/admin_full_flow.md
/test_e2e .claude/commands/e2e/client_full_flow.md
```

**Prerequisites:**
- Dev server running on port 3000 (`npm run dev`)
- Production Supabase accessible
- Playwright MCP configured in `.mcp.json`

**Output:**
- JSON report (passed/failed)
- Screenshots in `test_results/[test_name]/`
- Errors with step number if failed

---

## Test Data Strategy

**Naming:**
- Clients: `TEST_Corporation_[timestamp_ms]`
- Files: `test_cube_[timestamp_ms].stl`
- Use current timestamp (ms) for uniqueness

**Why Timestamps:**
- Avoids conflicts between parallel/sequential runs
- Easy to identify in DB
- Cleanup targets exact timestamps

**Pattern:**
```javascript
const ts = Date.now(); // e.g., 1699876543210
const clientName = `TEST_Corporation_${ts}`;
const filename = `test_cube_${ts}.stl`;
```

---

## Cleanup Strategy

**Goal:** Remove test data, preserve credentials/shared data

**Executed:** Via Supabase MCP at end of each test

**Admin Test Cleanup:**
```sql
-- Delete in order (respect foreign keys)
DELETE FROM invoice_items WHERE invoice_id = [TEST_INVOICE_ID];
DELETE FROM quote_items WHERE quote_id = [TEST_QUOTE_ID];
DELETE FROM jobs WHERE invoice_id = [TEST_INVOICE_ID];
DELETE FROM invoices WHERE id = [TEST_INVOICE_ID];
DELETE FROM quotes WHERE id = [TEST_QUOTE_ID];
DELETE FROM clients WHERE id = [TEST_CLIENT_ID];
```

**Client Test Cleanup:**
```sql
-- Delete test data
DELETE FROM invoice_items WHERE invoice_id = [TEST_INVOICE_ID];
DELETE FROM jobs WHERE invoice_id = [TEST_INVOICE_ID];
DELETE FROM order_files WHERE filename LIKE 'test_cube_[timestamp]%';
DELETE FROM tmp_files WHERE filename LIKE 'test_cube_[timestamp]%';
DELETE FROM invoices WHERE id = [TEST_INVOICE_ID] AND client_id = 9;

-- Reset wallet
UPDATE clients SET wallet_balance = 100.00 WHERE id = 9;
```

**Safety Rules:**
1. ❌ Never delete test users (admin@test, client@test)
2. ❌ Never delete client record (id: 9)
3. ❌ Never delete materials/printers/settings
4. ✅ Only delete rows with TEST_ prefix or test timestamp
5. ✅ Always reset wallet to $100 after client test
6. ✅ Verify counts before DELETE (use SELECT COUNT)

---

## Supabase MCP Usage

**Purpose:** Execute cleanup SQL directly in production DB

**Tool:** `mcp__supabase__execute_sql`

**Project ID:** `dgroxwhoqdkqqqfcymrf` (from `.env`)

**Example:**
```typescript
mcp__supabase__execute_sql({
  project_id: "dgroxwhoqdkqqqfcymrf",
  query: "DELETE FROM clients WHERE id = 123;"
})
```

**Configured:** `.mcp.json` with Supabase access token

**When Used:**
- End of test (step 8 in both flows)
- Cleanup even if test fails (finally block)
- Wallet reset (client test only)

---

## File Map

**Test Runner:**
- `.claude/commands/test_e2e.md` - Main runner, credentials, instructions

**Test Definitions:**
- `.claude/commands/e2e/admin_full_flow.md` - Admin workflow test
- `.claude/commands/e2e/client_full_flow.md` - Client workflow test

**Test Fixtures:**
- `/tmp/test_cube.stl` - 10mm cube STL for client uploads

**MCP Config:**
- `.mcp.json` - Playwright + Supabase MCP servers

**Environment:**
- `.env` - Supabase project URL, keys, access token

**Results:**
- `test_results/[test_name]/` - Screenshots per test

**Stale Files (ignore):**
- `.claude/commands/e2e/test_*.md` - Old tests from different project

---

## Quick Reference

**Run admin test:**
```bash
/test_e2e .claude/commands/e2e/admin_full_flow.md
```

**Run client test:**
```bash
/test_e2e .claude/commands/e2e/client_full_flow.md
```

**Check test users exist:**
```sql
SELECT email, role FROM users
WHERE email IN ('admin@test.3dprintsydney.com', 'client@test.3dprintsydney.com');
```

**Check client wallet:**
```sql
SELECT wallet_balance FROM clients WHERE id = 9;
```

**Manual cleanup (if test fails):**
```sql
-- Find test data
SELECT * FROM clients WHERE name LIKE 'TEST_Corporation_%';
SELECT * FROM tmp_files WHERE filename LIKE 'test_cube_%';

-- Delete (get IDs from above)
DELETE FROM clients WHERE id = [ID];
DELETE FROM tmp_files WHERE filename LIKE 'test_cube_[timestamp]%';

-- Reset wallet
UPDATE clients SET wallet_balance = 100.00 WHERE id = 9;
```

---

## Troubleshooting

**Test fails at login:**
- Check test users exist in auth.users + users table
- Verify passwords: TestPass123!
- Check dev server running on port 3000

**Cleanup fails:**
- Get IDs from test output/screenshots
- Run cleanup SQL manually via Supabase dashboard
- Always reset wallet: `UPDATE clients SET wallet_balance = 100.00 WHERE id = 9;`

**Playwright errors:**
- Check `.mcp.json` has Playwright MCP configured
- Verify browser can reach localhost:3000
- Check screenshots in test_results/ for visual debugging

**Supabase MCP errors:**
- Verify access token in `.env`: `SUPABASE_ACCESS_TOKEN`
- Check project ID: `dgroxwhoqdkqqqfcymrf`
- Test connection: `/list_projects` should show "interior" project

---

**Last Updated:** 2025-11-12
**Version:** 1.0 (Simplified)
