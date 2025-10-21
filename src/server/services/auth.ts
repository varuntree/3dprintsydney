/**
 * Auth Service
 * Handles authentication-related database operations
 * NOTE: Session/cookie management remains in API routes
 */

import { getServiceSupabase } from '@/server/supabase/service-client';
import { AppError, NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * User profile type for auth operations
 */
export type AuthUserProfile = {
  id: number;
  email: string;
  role: 'ADMIN' | 'CLIENT';
  clientId: number | null;
  authUserId: string;
};

/**
 * Signup result includes auth user ID for session creation
 */
export type SignupResult = {
  userId: number;
  authUserId: string;
  clientId: number;
  email: string;
  role: 'CLIENT';
};

/**
 * Create a new client user (signup flow)
 * Creates auth user, client record, and user profile
 * @throws AppError if any step fails
 */
export async function signupClient(
  email: string,
  password: string
): Promise<SignupResult> {
  const supabase = getServiceSupabase();

  // Check if user already exists
  const { data: exists, error: existsError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existsError) {
    throw new AppError(
      `Failed to check user: ${existsError.message}`,
      'SIGNUP_ERROR',
      500
    );
  }

  if (exists) {
    throw new AppError('Email already in use', 'EMAIL_IN_USE', 400);
  }

  // Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authUser.user) {
    throw new AppError(
      authError?.message ?? 'Failed to create auth user',
      'USER_CREATE_ERROR',
      500
    );
  }

  const authUserId = authUser.user.id;

  // Create client record
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      name: email.split('@')[0],
      email,
    })
    .select('id')
    .single();

  if (clientError || !client) {
    // Rollback auth user
    await supabase.auth.admin.deleteUser(authUserId).catch(() => undefined);
    throw new AppError(
      clientError?.message ?? 'Failed to create client',
      'SIGNUP_ERROR',
      500
    );
  }

  // Create user profile
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .insert({
      auth_user_id: authUserId,
      email,
      role: 'CLIENT',
      client_id: client.id,
    })
    .select('id')
    .single();

  if (profileError || !profile) {
    // Rollback client and auth user
    await supabase.from('clients').delete().eq('id', client.id).catch((error) => {
      logger.warn({ scope: 'auth.signup', message: 'Failed to cleanup client during rollback', error });
    });
    await supabase.auth.admin.deleteUser(authUserId).catch(() => undefined);
    throw new AppError(
      profileError?.message ?? 'Failed to create user',
      'USER_CREATE_ERROR',
      500
    );
  }

  logger.info({
    scope: 'auth.signup',
    message: 'User signed up',
    data: { userId: profile.id, clientId: client.id },
  });

  return {
    userId: profile.id,
    authUserId,
    clientId: client.id,
    email,
    role: 'CLIENT',
  };
}

/**
 * Get user profile by email (for login)
 * @throws NotFoundError if user doesn't exist
 */
export async function getUserByEmail(email: string): Promise<AuthUserProfile | null> {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('users')
    .select('id, auth_user_id, email, role, client_id')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    throw new AppError(
      `Failed to fetch user: ${error.message}`,
      'AUTH_ERROR',
      500
    );
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    email: data.email,
    role: data.role,
    clientId: data.client_id,
    authUserId: data.auth_user_id,
  };
}

/**
 * Get user profile by auth user ID (for login after Supabase Auth validates)
 * @throws NotFoundError if user doesn't exist
 */
export async function getUserByAuthId(authUserId: string): Promise<AuthUserProfile> {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('users')
    .select('id, auth_user_id, email, role, client_id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) {
    throw new AppError(
      `Failed to load profile: ${error.message}`,
      'AUTH_ERROR',
      500
    );
  }

  if (!data) {
    throw new NotFoundError('User profile', authUserId);
  }

  return {
    id: data.id,
    email: data.email,
    role: data.role,
    clientId: data.client_id,
    authUserId: data.auth_user_id,
  };
}

/**
 * Get user email by user ID (for password change)
 */
export async function getUserEmail(userId: number): Promise<string> {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new AppError(
      `Failed to load user profile: ${error.message}`,
      'PASSWORD_CHANGE_ERROR',
      500
    );
  }

  if (!data) {
    throw new NotFoundError('User profile', userId);
  }

  return data.email;
}
