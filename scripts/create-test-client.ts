#!/usr/bin/env tsx
/**
 * Creates the test client user for E2E testing
 *
 * Usage: npx tsx scripts/create-test-client.ts
 */

import { createClient } from '@supabase/supabase-js';

const TEST_CLIENT_EMAIL = 'client@test.3dprintsydney.com';
const TEST_CLIENT_PASSWORD = 'TestPass123!';
const TEST_CLIENT_NAME = 'Test Client';
const INITIAL_WALLET_BALANCE = 100.00;

async function createTestClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  console.log('🔧 Connecting to Supabase...');
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  console.log(`📧 Creating auth user: ${TEST_CLIENT_EMAIL}`);

  // Step 1: Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: TEST_CLIENT_EMAIL,
    password: TEST_CLIENT_PASSWORD,
    email_confirm: true,
  });

  if (authError) {
    throw new Error(`Failed to create auth user: ${authError.message}`);
  }

  if (!authUser.user) {
    throw new Error('Auth user created but no user object returned');
  }

  console.log(`✅ Auth user created with ID: ${authUser.user.id}`);

  // Step 2: Create client record
  console.log('🏢 Creating client record...');
  const { data: clientRecord, error: clientError } = await supabase
    .from('clients')
    .insert({
      name: TEST_CLIENT_NAME,
      email: TEST_CLIENT_EMAIL,
      wallet_balance: INITIAL_WALLET_BALANCE,
    })
    .select()
    .single();

  if (clientError) {
    // Rollback: delete auth user
    await supabase.auth.admin.deleteUser(authUser.user.id);
    throw new Error(`Failed to create client record: ${clientError.message}`);
  }

  console.log(`✅ Client record created with ID: ${clientRecord.id}`);

  // Step 3: Insert into public.users table
  console.log('👤 Creating user record...');
  const { data: userRecord, error: userError } = await supabase
    .from('users')
    .insert({
      auth_user_id: authUser.user.id,
      email: TEST_CLIENT_EMAIL,
      role: 'CLIENT',
      client_id: clientRecord.id,
    })
    .select()
    .single();

  if (userError) {
    // Rollback: delete client and auth user
    await supabase.from('clients').delete().eq('id', clientRecord.id);
    await supabase.auth.admin.deleteUser(authUser.user.id);
    throw new Error(`Failed to create user record: ${userError.message}`);
  }

  console.log(`✅ User record created with ID: ${userRecord.id}`);
  console.log('\n🎉 SUCCESS! Test client user created:\n');
  console.log('═══════════════════════════════════════');
  console.log(`📧 Email:        ${TEST_CLIENT_EMAIL}`);
  console.log(`🔑 Password:     ${TEST_CLIENT_PASSWORD}`);
  console.log(`👤 Role:         CLIENT`);
  console.log(`🆔 User ID:      ${userRecord.id}`);
  console.log(`🏢 Client ID:    ${clientRecord.id}`);
  console.log(`💰 Wallet:       $${INITIAL_WALLET_BALANCE.toFixed(2)}`);
  console.log(`🔐 Auth ID:      ${authUser.user.id}`);
  console.log('═══════════════════════════════════════');
  console.log('\n📝 For E2E testing:');
  console.log('- Update documentation/TESTING.md with new IDs if needed');
  console.log('- Update .claude/commands/e2e/client_full_flow.md with correct client_id');
  console.log('- Wallet will be reset to $100 after each test\n');
}

createTestClient()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error creating test client user:');
    console.error(error.message);
    process.exit(1);
  });
