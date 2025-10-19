#!/usr/bin/env tsx
/**
 * Creates the initial admin user for the 3D Print Sydney application
 *
 * Usage: npx tsx scripts/create-admin.ts
 */

import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'admin@3dprintsydney.com';
const ADMIN_PASSWORD = 'admin@123';

async function createAdmin() {
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

  console.log(`📧 Creating auth user: ${ADMIN_EMAIL}`);

  // Step 1: Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });

  if (authError) {
    throw new Error(`Failed to create auth user: ${authError.message}`);
  }

  if (!authUser.user) {
    throw new Error('Auth user created but no user object returned');
  }

  console.log(`✅ Auth user created with ID: ${authUser.user.id}`);

  // Step 2: Insert into public.users table
  console.log('👤 Creating admin user record...');
  const { data: userRecord, error: userError } = await supabase
    .from('users')
    .insert({
      auth_user_id: authUser.user.id,
      email: ADMIN_EMAIL,
      role: 'ADMIN',
      client_id: null,
    })
    .select()
    .single();

  if (userError) {
    // Rollback: delete auth user
    await supabase.auth.admin.deleteUser(authUser.user.id);
    throw new Error(`Failed to create user record: ${userError.message}`);
  }

  console.log(`✅ Admin user record created with ID: ${userRecord.id}`);
  console.log('\n🎉 SUCCESS! Admin user created:\n');
  console.log('═══════════════════════════════════════');
  console.log(`📧 Email:    ${ADMIN_EMAIL}`);
  console.log(`🔑 Password: ${ADMIN_PASSWORD}`);
  console.log(`👤 Role:     ADMIN`);
  console.log(`🆔 User ID:  ${userRecord.id}`);
  console.log('═══════════════════════════════════════');
  console.log('\n📝 Next steps:');
  console.log('1. Go to http://localhost:3000/login');
  console.log('2. Login with the credentials above');
  console.log('3. You will be redirected to the admin dashboard');
  console.log('\n⚠️  IMPORTANT: Change the password after first login!');
  console.log('   Go to /account in the admin portal to update your password.\n');
}

createAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error creating admin user:');
    console.error(error.message);
    process.exit(1);
  });
