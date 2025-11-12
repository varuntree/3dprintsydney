-- ============================================================================
-- Test Users Setup Script
-- ============================================================================
-- This script creates test users for E2E testing in local Supabase.
-- Run this in Supabase Studio SQL Editor: http://127.0.0.1:54323
--
-- Prerequisites:
-- 1. Create auth users first via Dashboard (Authentication > Users)
-- 2. Get their UUIDs from auth.users table
-- 3. Replace [ADMIN_UUID] and [CLIENT_UUID] below with actual UUIDs
-- ============================================================================

-- STEP 1: Check if auth users exist
-- Run this first to get UUIDs:
SELECT id, email, created_at
FROM auth.users
WHERE email IN ('admin@test.local', 'client@test.local')
ORDER BY email;

-- If no results, create users via Dashboard:
-- Navigation: Authentication > Users > Add User > Create new user
--
-- Admin User:
--   Email: admin@test.local
--   Password: TestPass123!
--   Auto Confirm User: YES (checked)
--
-- Client User:
--   Email: client@test.local
--   Password: TestPass123!
--   Auto Confirm User: YES (checked)
--
-- Then re-run SELECT above to get UUIDs

-- ============================================================================
-- STEP 2: Create database records
-- Replace UUIDs below with actual values from Step 1
-- ============================================================================

-- Admin user record
-- REPLACE: [ADMIN_UUID] with actual UUID from auth.users
INSERT INTO users (id, email, name, role, created_at, updated_at)
VALUES (
  '[ADMIN_UUID]',  -- ← REPLACE THIS
  'admin@test.local',
  'Test Admin',
  'Admin',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- ============================================================================

-- Client record (must be created before client user)
INSERT INTO clients (id, name, email, wallet_balance, payment_terms, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Test Client',
  'client@test.local',
  100.00,  -- $100 wallet balance for testing payments
  'NET_7',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  wallet_balance = EXCLUDED.wallet_balance,
  updated_at = NOW()
RETURNING id, name, email, wallet_balance;

-- Save the client ID from above, then use in next INSERT

-- Client user record
-- REPLACE: [CLIENT_UUID] with actual UUID from auth.users
-- REPLACE: [CLIENT_ID] with UUID from clients INSERT above
INSERT INTO users (id, email, name, role, client_id, created_at, updated_at)
VALUES (
  '[CLIENT_UUID]',  -- ← REPLACE THIS (from auth.users)
  'client@test.local',
  'Test Client',
  'Client',
  '[CLIENT_ID]',    -- ← REPLACE THIS (from clients table)
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  client_id = EXCLUDED.client_id,
  updated_at = NOW();

-- ============================================================================
-- STEP 3: Verify setup
-- ============================================================================

-- Check users table
SELECT
  u.id,
  u.email,
  u.name,
  u.role,
  u.client_id,
  c.name as client_name,
  c.wallet_balance
FROM users u
LEFT JOIN clients c ON u.client_id = c.id
WHERE u.email IN ('admin@test.local', 'client@test.local')
ORDER BY u.email;

-- Expected output:
-- admin@test.local | Test Admin  | Admin  | NULL       | NULL         | NULL
-- client@test.local| Test Client | Client | [client_id]| Test Client  | 100.00

-- ============================================================================
-- STEP 4: Test authentication (optional)
-- ============================================================================

-- Verify auth users can login (test in application):
-- 1. Go to http://localhost:3000/login
-- 2. Login as admin@test.local / TestPass123!
--    Should redirect to /dashboard
-- 3. Logout
-- 4. Login as client@test.local / TestPass123!
--    Should redirect to /client or /me

-- ============================================================================
-- Notes:
-- - These users are ONLY for local testing (not production)
-- - Passwords are intentionally simple for testing
-- - Client has $100 wallet balance for payment testing
-- - Run cleanup.ts between tests to remove test data
-- - Test users persist across test runs (don't get deleted by cleanup)
-- ============================================================================
