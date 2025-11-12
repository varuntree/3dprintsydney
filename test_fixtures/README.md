# Test Fixtures

Test data and utilities for E2E testing.

## Files

### cleanup.ts
Script to remove all TEST_* prefixed data from database.

**Usage:**
```bash
npx tsx test_fixtures/cleanup.ts
```

**What it cleans:**
- Clients with names starting with "TEST"
- Quotes with numbers starting with "TEST-"
- Invoices with numbers starting with "TEST-"
- Jobs with notes containing "TEST"
- Order files with filenames starting with "test_"
- Storage files starting with "test_"

### cube_10mm.stl
Simple 10mm cube STL file for upload testing. Use this for quick-order flow tests.

## Test Data Naming Convention

All test data MUST follow these prefixes:
- **Clients:** `TEST_[Name]` (e.g., `TEST_Corp`, `TEST_Client`)
- **Quotes:** `TEST-QT-[Number]` (e.g., `TEST-QT-001`)
- **Invoices:** `TEST-INV-[Number]` (e.g., `TEST-INV-001`)
- **Files:** `test_[filename].stl` (e.g., `test_cube.stl`)
- **Notes:** Include "TEST" keyword for jobs/other records

This ensures cleanup script can find and remove all test data.

## Test Users

### Admin User
- **Email:** `admin@test.local`
- **Password:** `TestPass123!`
- **Role:** Admin
- **Access:** Full admin dashboard

### Client User
- **Email:** `client@test.local`
- **Password:** `TestPass123!`
- **Role:** Client
- **Access:** Client portal only

**Note:** These users must be created manually in local Supabase auth before running E2E tests.
