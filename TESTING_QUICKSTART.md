# Testing Quick Start Guide

Get up and running with E2E tests in 5 minutes.

## Prerequisites

- ✅ Docker Desktop installed and running
- ✅ Supabase CLI installed (already installed via Homebrew)
- ✅ Project dependencies installed (`npm install`)

## Setup (One-Time)

### 1. Start Local Supabase

```bash
# Terminal 1
npx supabase start
```

Wait ~30 seconds for containers to start. You'll see output like:

```
API URL: http://127.0.0.1:54321
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
```

### 2. Apply Migrations

```bash
npx supabase db reset
```

This creates all tables (clients, quotes, invoices, jobs, etc.).

### 3. Create Test Users

**Via Supabase Dashboard:**

1. Open: http://127.0.0.1:54323
2. Go to: **Authentication** → **Users** → **Add User**

**Admin User:**
- Email: `admin@test.local`
- Password: `TestPass123!`
- Auto Confirm: ✅ (checked)

**Client User:**
- Email: `client@test.local`
- Password: `TestPass123!`
- Auto Confirm: ✅ (checked)

3. Go to: **SQL Editor** → **New Query**
4. Copy SQL from: `test_fixtures/setup_test_users.sql`
5. Replace `[ADMIN_UUID]` and `[CLIENT_UUID]` with actual UUIDs from auth.users
6. Replace `[CLIENT_ID]` with generated client ID
7. Run the SQL

**Verification:**
- Should see 2 users in users table
- Client should have $100 wallet balance

### 4. Seed Materials (if needed)

In SQL Editor, run:

```sql
INSERT INTO materials (name, cost_per_gram, density)
VALUES ('PLA', 0.05, 1.24)
ON CONFLICT (name) DO NOTHING;
```

## Running Tests

### Daily Workflow

**Terminal 1:**
```bash
npx supabase start  # If not already running
```

**Terminal 2:**
```bash
npm run dev  # Start Next.js dev server
```

**In Claude:**
```bash
/test_all_e2e  # Runs both admin + client tests
```

### Results

- ✅ **Passed**: Green checkmark, all steps successful
- ❌ **Failed**: Red X, error details provided
- 📸 **Screenshots**: Saved to `test_results/<test_name>/`

**Expected Duration:** ~5-10 minutes for both tests

## Individual Tests

**Admin flow only:**
```bash
/test_e2e .claude/commands/e2e/admin_full_flow.md
```

**Client flow only:**
```bash
/test_e2e .claude/commands/e2e/client_full_flow.md
```

## Troubleshooting

### Docker Not Running

**Error:** `Cannot connect to the Docker daemon`

**Fix:**
```bash
open -a Docker  # Start Docker Desktop
# Wait 30 seconds
npx supabase start
```

### Test Users Don't Exist

**Error:** `Login failed: Invalid credentials`

**Fix:** Re-run step 3 (Create Test Users) above

### Port In Use

**Error:** `Port 54321 already in use`

**Fix:**
```bash
npx supabase stop
sleep 5
npx supabase start
```

### Test Data Conflicts

**Error:** `Client "TEST_Corporation" already exists`

**Fix:**
```bash
npx tsx test_fixtures/cleanup.ts
```

## What Tests Cover

### Admin Flow ✅
- Login → Create client → Create quote → Send → Convert to invoice → Mark paid → Verify job

### Client Flow ✅
- Signup → Upload STL → Configure → Checkout → Pay → Verify order/invoice/job

**Total Coverage:** All critical business operations

## Need Help?

📖 **Full Documentation:** `documentation/TESTING.md`

🔍 **Test Details:**
- Admin test: `.claude/commands/e2e/admin_full_flow.md`
- Client test: `.claude/commands/e2e/client_full_flow.md`

🛠️ **Test Fixtures:** `test_fixtures/README.md`

---

**Quick Commands:**

```bash
# Start environment
npx supabase start && npm run dev

# Run tests (in Claude)
/test_all_e2e

# Cleanup test data
npx tsx test_fixtures/cleanup.ts

# Stop environment
# Ctrl+C (dev server)
npx supabase stop
```

**That's it! You're ready to test.** 🚀
