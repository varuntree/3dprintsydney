# Testing Guide

Complete guide to testing the 3D Print Sydney application.

## Table of Contents

1. [Overview](#overview)
2. [Testing Strategy](#testing-strategy)
3. [Setup](#setup)
4. [Running Tests](#running-tests)
5. [Writing Tests](#writing-tests)
6. [Test Data Management](#test-data-management)
7. [Troubleshooting](#troubleshooting)
8. [CI/CD Integration](#cicd-integration)

---

## Overview

### Testing Philosophy

We follow a **focused E2E testing approach**:
- ✅ **E2E Tests**: Comprehensive tests of critical user flows
- ❌ **Unit Tests**: Skipped initially (can add later if needed)
- ❌ **Integration Tests**: Skipped initially (E2E covers this)

### Why E2E Only?

- Small team with manual QA workflow
- Tests real user experience end-to-end
- Catches both backend AND frontend bugs
- Simpler to maintain (one test suite vs multiple)
- Playwright MCP integrates with existing Claude workflow

### Test Coverage

We have **2 comprehensive E2E tests**:

1. **Admin Full Flow** - Tests complete admin workflow:
   - Login → Create client → Create quote → Send quote → Convert to invoice → Mark paid → Verify job created

2. **Client Full Flow** - Tests complete client workflow:
   - Signup → Upload STL → Configure order → Checkout → Payment → Verify order/invoice/job

These 2 tests cover **all critical business operations**.

---

## Testing Strategy

### What We Test

**Admin Flow Covers:**
- ✅ Authentication (admin login)
- ✅ Client management (CRUD)
- ✅ Quote creation with line items
- ✅ Quote workflow (draft → sent)
- ✅ Quote to invoice conversion
- ✅ Invoice payment processing
- ✅ Job auto-creation
- ✅ Database operations
- ✅ Business calculations (totals, tax)

**Client Flow Covers:**
- ✅ Authentication (signup, login)
- ✅ File upload (STL files)
- ✅ 3D model preview/rendering
- ✅ Order configuration (material, quantity)
- ✅ Pricing calculations
- ✅ Checkout process
- ✅ Payment methods (wallet credit)
- ✅ Order tracking
- ✅ Invoice generation
- ✅ Job creation

### What We Don't Test

- ❌ Individual utility functions (not critical)
- ❌ UI component variations (not revenue-critical)
- ❌ Edge cases (handle manually if discovered)
- ❌ Performance/load testing (not needed yet)

---

## Setup

### Prerequisites

1. **Docker Desktop** - Required for local Supabase
   - Download: https://docs.docker.com/desktop/
   - Install and start Docker Desktop

2. **Supabase CLI** - Already installed via Homebrew
   ```bash
   which supabase  # Should show /opt/homebrew/bin/supabase
   ```

3. **Node.js & npm** - Already installed (project dependencies)

### One-Time Setup

#### 1. Start Local Supabase

```bash
# Start local Supabase (first time will download Docker images)
npx supabase start

# This will output:
# - API URL: http://127.0.0.1:54321
# - DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
# - anon key: eyJhbG...
# - service_role key: eyJhbG...
```

**Save these credentials!** The cleanup script uses them.

#### 2. Apply Migrations

```bash
# Reset database and apply all migrations
npx supabase db reset
```

This creates all tables (clients, quotes, invoices, jobs, etc.).

#### 3. Create Test Users

**Method A: Via Supabase Dashboard**

1. Open Supabase Studio: http://127.0.0.1:54323
2. Go to **Authentication** → **Users**
3. Click **Add User** → **Create new user**

**Admin User:**
- Email: `admin@test.local`
- Password: `TestPass123!`
- Confirm email: ✅ (checked)

**Client User:**
- Email: `client@test.local`
- Password: `TestPass123!`
- Confirm email: ✅ (checked)

4. Go to **SQL Editor**, run:

```sql
-- Get admin user ID from auth.users
SELECT id, email FROM auth.users WHERE email = 'admin@test.local';
-- Copy the ID

-- Create admin user record
INSERT INTO users (id, email, name, role, created_at, updated_at)
VALUES (
  '[PASTE_ADMIN_UUID_HERE]',
  'admin@test.local',
  'Test Admin',
  'Admin',
  NOW(),
  NOW()
);

-- Get client user ID
SELECT id, email FROM auth.users WHERE email = 'client@test.local';
-- Copy the ID

-- Create client record first
INSERT INTO clients (name, email, wallet_balance, created_at, updated_at)
VALUES (
  'Test Client',
  'client@test.local',
  100.00,  -- $100 wallet balance for testing
  NOW(),
  NOW()
)
RETURNING id;
-- Copy the client ID

-- Create client user record
INSERT INTO users (id, email, name, role, client_id, created_at, updated_at)
VALUES (
  '[PASTE_CLIENT_UUID_HERE]',
  'client@test.local',
  'Test Client',
  'Client',
  '[PASTE_CLIENT_ID_HERE]',
  NOW(),
  NOW()
);
```

**Method B: Via SQL Script** (Future enhancement - create a seed script)

#### 4. Seed Catalog Data

Ensure materials, printers, and settings are populated:

```bash
# Check if seed file exists
npx supabase db seed

# Or manually via SQL Editor:
```

```sql
-- Insert test material if not exists
INSERT INTO materials (name, cost_per_gram, density, created_at, updated_at)
VALUES ('PLA', 0.05, 1.24, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO materials (name, cost_per_gram, density, created_at, updated_at)
VALUES ('ABS', 0.06, 1.04, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Insert test printer if not exists
INSERT INTO printers (name, model, status, created_at, updated_at)
VALUES ('Test Printer 1', 'Prusa i3 MK3S+', 'IDLE', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Insert settings if not exists
INSERT INTO settings (tax_rate, default_payment_terms, created_at, updated_at)
VALUES (0.10, 'NET_7', NOW(), NOW())
ON CONFLICT DO NOTHING;
```

#### 5. Update Environment Variables

Create `.env.local` with local Supabase credentials:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

**Note:** These are default local keys, safe to commit for local testing.

---

## Running Tests

### Daily Workflow

#### 1. Start Environment

```bash
# Terminal 1: Start local Supabase (if not running)
npx supabase start

# Terminal 2: Start dev server
npm run dev
```

#### 2. Run All Tests

```bash
# In Claude (via chat interface)
/test_all_e2e
```

This runs both tests sequentially and provides a comprehensive report.

#### 3. Run Individual Tests

**Admin Flow Only:**
```bash
/test_e2e .claude/commands/e2e/admin_full_flow.md
```

**Client Flow Only:**
```bash
/test_e2e .claude/commands/e2e/client_full_flow.md
```

### Test Results

Tests generate:
- **JSON report** with pass/fail status
- **Screenshots** saved to `test_results/<test_name>/`
- **Error details** if any step fails

Example output:
```json
{
  "test_name": "Admin Full Flow",
  "status": "passed",
  "screenshots": [
    "test_results/admin_full_flow/01_cleanup_complete.png",
    "test_results/admin_full_flow/02_login_page.png",
    ...
  ],
  "error": null
}
```

### When to Run Tests

**✅ Always run before:**
- Pushing code to production
- Deploying to VM
- Major feature releases
- Bug fix verification

**⚠️ Optional (run if relevant):**
- Small UI changes
- Documentation updates
- Non-critical feature additions

**Estimated Time:** ~5-10 minutes for both tests

---

## Writing Tests

### Test File Structure

Tests are markdown files in `.claude/commands/e2e/`:

```markdown
# E2E Test: [Test Name]

[Description]

## User Story
As a [role]
I want to [action]
So that [benefit]

## Prerequisites
- [Requirement 1]
- [Requirement 2]

## Test Steps
1. [Setup step]
2. Navigate to [URL]
3. **Verify** [condition]
4. [Action]
5. Take screenshot: `filename.png`
6. **Verify** [result]

## Success Criteria
- ✅ [Criterion 1]
- ✅ [Criterion 2]

## Expected Screenshots
1. `01_description.png`
2. `02_description.png`
```

### Verification Pattern

Use `**Verify**` for assertions:

```markdown
42. **Verify** page shows "Dashboard" heading
43. **Verify** URL is `http://localhost:3000/dashboard`
44. **Verify** client list contains "TEST_Corporation"
```

If verification fails, test is marked as failed with details.

### Screenshot Naming

Use descriptive sequential names:

```
01_cleanup_complete.png
02_login_page.png
03_admin_dashboard.png
04_client_form.png
...
```

### Adding New Tests

1. Create file: `.claude/commands/e2e/new_test.md`
2. Follow structure above
3. Add to `/test_all_e2e` command
4. Document in this guide

---

## Test Data Management

### Data Cleanup

**Every test starts with cleanup** to ensure clean state:

```bash
# Cleanup script removes all TEST_* prefixed data
npx tsx test_fixtures/cleanup.ts
```

**What it removes:**
- Clients with names starting with `TEST`
- Quotes with numbers starting with `TEST-`
- Invoices with numbers starting with `TEST-`
- Jobs with notes containing `TEST`
- Files with names starting with `test_`

### Naming Convention

**⚠️ CRITICAL:** All test data MUST use these prefixes:

| Entity | Prefix | Example |
|--------|--------|---------|
| Clients | `TEST_` or `TEST ` | `TEST_Corporation`, `TEST Client` |
| Quotes | `TEST-QT-` | `TEST-QT-001` |
| Invoices | `TEST-INV-` | `TEST-INV-001` |
| Files | `test_` | `test_cube.stl` |
| Notes | Contains `TEST` | `TEST order for validation` |

### Test Fixtures

Located in `test_fixtures/`:

**Available files:**
- `cube_10mm.stl` - Simple 10mm cube for upload testing
- `cleanup.ts` - Cleanup script
- `README.md` - Fixture documentation

**Adding new fixtures:**
1. Place file in `test_fixtures/`
2. Use absolute path in tests: `/Users/varunprasad/code/prjs/3dprintsydney/test_fixtures/filename.ext`
3. Document in `test_fixtures/README.md`

### Database State

**Clean state per test:**
- Each test runs `cleanup.ts` first
- Removes all previous test data
- Ensures no conflicts or dependencies

**Persistent data:**
- Test users (admin, client) persist across tests
- Catalog data (materials, printers) persists
- Settings persist

---

## Troubleshooting

### Common Issues

#### Docker Not Running

**Error:**
```
Cannot connect to the Docker daemon at unix:///Users/varunprasad/.docker/run/docker.sock
```

**Solution:**
```bash
# Start Docker Desktop application
open -a Docker

# Wait for Docker to start, then:
npx supabase start
```

#### Supabase Not Started

**Error:**
```
Connection refused at http://127.0.0.1:54321
```

**Solution:**
```bash
# Check Supabase status
npx supabase status

# If not running:
npx supabase start
```

#### Test Users Don't Exist

**Error:**
```
Login failed: Invalid credentials
```

**Solution:**
1. Check users exist: http://127.0.0.1:54323 → Authentication
2. If missing, recreate using SQL from [Setup](#3-create-test-users) section
3. Verify passwords: `TestPass123!`

#### Migrations Not Applied

**Error:**
```
Relation "clients" does not exist
```

**Solution:**
```bash
# Reset and apply all migrations
npx supabase db reset
```

#### Port Already in Use / "port is already allocated"

**Error:**
```
failed to start docker container: Bind for 0.0.0.0:54324 failed: port is already allocated
```

**Root Cause:** Docker has stale port bindings from crashed/ungracefully stopped containers. This commonly happens after:
- Docker Desktop crashes or force quits
- System restarts with containers still running
- Supabase CLI project naming changes (containers run as `supabase_*_3dprintsydney` but CLI looks for `supabase_*_local`)

**Solution (Quick Fix):**
```bash
# Stop with explicit project ID
npx supabase stop --project-id local

# Clean all Supabase containers manually
docker stop $(docker ps -q --filter "name=supabase")
docker rm $(docker ps -aq --filter "name=supabase")

# Reset Docker network state
docker network prune -f

# Start fresh
npx supabase start
```

**Solution (If Quick Fix Fails):**
```bash
# Complete Docker cleanup
docker system prune --volumes -f

# Restart Docker Desktop entirely
# (Quit from menu bar, wait 10 seconds, restart)

# Start Supabase
npx supabase start
```

**Permanent Fix (Prevents Future Issues):**
Change port in `supabase/config.toml` if a specific port keeps conflicting:
```toml
[studio]
enabled = true
port = 54325  # Changed from 54324
```

#### Test Data Not Cleaned

**Error:**
```
Client "TEST_Corporation" already exists
```

**Solution:**
```bash
# Manually run cleanup
npx tsx test_fixtures/cleanup.ts

# Or reset entire database
npx supabase db reset
```

#### 3D Model Not Rendering

**Symptom:** Blank canvas or loading forever

**Possible causes:**
- File upload failed (check network tab)
- WebGL not supported (check browser console)
- Three.js library not loaded (check browser console)

**Solution:**
- Verify STL file exists and is valid
- Use Chrome/Firefox (best WebGL support)
- Check console for JavaScript errors

### Debug Mode

**Enable verbose logging:**

1. Browser console (F12 → Console tab)
2. Network tab (see API calls)
3. Playwright screenshots (automatically captured)

**Manual testing:**
1. Run test steps manually in browser
2. Identify failing step
3. Check browser console for errors
4. Check network tab for failed requests
5. Verify database state in Supabase Studio

### Getting Help

**Check these first:**
1. This documentation (search for error)
2. Test screenshots in `test_results/`
3. Browser console errors
4. Supabase logs: `npx supabase logs`

**If stuck:**
1. Document the error (screenshot + logs)
2. Note which test step failed
3. Check if issue is reproducible manually
4. Consult with team

---

## CI/CD Integration

### Current Setup

**Manual workflow:**
1. Developer runs tests locally
2. All tests pass ✅
3. Developer pushes to GitHub
4. Auto-deploy to VM

**No automated CI/CD** (GitHub Actions, etc.) currently.

### Future Enhancements

When ready to add CI/CD:

1. **GitHub Actions Workflow:**
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx supabase start
      - run: npm run dev &
      - run: npx playwright install
      - run: npx playwright test
```

2. **Playwright Config:**
Create `playwright.config.ts` for standard Playwright runner (not MCP).

3. **Test Conversion:**
Convert markdown tests to `.spec.ts` files.

**For now:** Keep manual Claude MCP workflow (simpler, works well).

---

## Best Practices

### Before Every Deploy

✅ **Run checklist:**
1. [ ] Docker Desktop running
2. [ ] Local Supabase started (`npx supabase start`)
3. [ ] Dev server running (`npm run dev`)
4. [ ] Run `/test_all_e2e`
5. [ ] All tests pass ✅
6. [ ] Review any warnings
7. [ ] Push to production

### Test Maintenance

**Weekly:**
- Run full test suite
- Review screenshots for UI changes
- Update tests if features changed

**Monthly:**
- Review test coverage
- Add tests for new features
- Clean up outdated tests

**After Major Changes:**
- Update test steps if UI changed
- Update selectors if IDs changed
- Re-verify all success criteria

### Data Safety

**❌ Never:**
- Run tests against production database
- Use production Supabase credentials
- Skip cleanup step
- Commit test data to repo

**✅ Always:**
- Use local Supabase only
- Prefix test data with `TEST_`
- Run cleanup before tests
- Keep test credentials in `.env.local` (gitignored)

---

## Appendix

### File Locations

```
.
├── .claude/commands/
│   ├── test_e2e.md              # Main test runner
│   ├── test_all_e2e.md          # Run all tests
│   └── e2e/
│       ├── admin_full_flow.md   # Admin test
│       └── client_full_flow.md  # Client test
├── test_fixtures/
│   ├── cleanup.ts               # Data cleanup script
│   ├── cube_10mm.stl            # Test STL file
│   └── README.md                # Fixtures documentation
├── test_results/
│   ├── admin_full_flow/         # Admin test screenshots
│   └── client_full_flow/        # Client test screenshots
└── documentation/
    └── TESTING.md               # This file
```

### Supabase Commands

```bash
# Start local Supabase
npx supabase start

# Stop local Supabase
npx supabase stop

# Check status
npx supabase status

# Reset database (apply migrations)
npx supabase db reset

# View logs
npx supabase logs

# Open Supabase Studio
# http://127.0.0.1:54323
```

### Test User Credentials

**Admin:**
- Email: `admin@test.local`
- Password: `TestPass123!`
- Access: Full admin dashboard

**Client:**
- Email: `client@test.local`
- Password: `TestPass123!`
- Access: Client portal only
- Wallet: $100.00 for testing payments

### Environment Variables

**Local testing (`.env.local`):**
```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Production (never change for testing):**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[production_key]
```

---

## Quick Reference

### Run Tests
```bash
# All tests
/test_all_e2e

# Admin test only
/test_e2e .claude/commands/e2e/admin_full_flow.md

# Client test only
/test_e2e .claude/commands/e2e/client_full_flow.md
```

### Cleanup
```bash
# Remove all TEST_* data
npx tsx test_fixtures/cleanup.ts
```

### Supabase
```bash
# Start
npx supabase start

# Stop
npx supabase stop

# Reset DB
npx supabase db reset
```

### Dev Server
```bash
# Start
npm run dev

# Will run on http://localhost:3000
```

---

**Last Updated:** 2025-01-12
**Version:** 1.0
**Maintained By:** Development Team
