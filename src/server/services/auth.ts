/**
 * Auth Service
 * Handles authentication-related database operations and workflows
 * NOTE: Cookie setting remains in API routes
 */

import { createClient } from '@supabase/supabase-js';
import { getServiceSupabase } from '@/server/supabase/service-client';
import { getSupabaseUrl, getSupabaseAnonKey, getAppUrl } from '@/lib/env';
import { AppError, NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { validatePasswordChange } from '@/lib/utils/validators';
import { emailService } from '@/server/services/email';
import { getSettings } from '@/server/services/settings';

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
  password: string,
  options?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    businessName?: string;
    position?: string;
  }
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
  const firstName = options?.firstName || '';
  const lastName = options?.lastName || '';
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : email.split('@')[0];

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      name: fullName,
      first_name: firstName,
      last_name: lastName,
      email,
      phone: options?.phone || null,
      company: options?.businessName || null,
      position: options?.position || null,
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
    const { error: clientDeleteError } = await supabase.from('clients').delete().eq('id', client.id);
    if (clientDeleteError) {
      logger.warn({ scope: 'auth.signup', message: 'Failed to cleanup client during rollback', error: clientDeleteError });
    }
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

  // Send welcome email
  const settings = await getSettings();
  if (!settings) {
    throw new AppError("System settings are not configured", "CONFIG_ERROR", 500);
  }
  await emailService.sendWelcome(email, {
    firstName: firstName || email.split('@')[0],
    businessName: settings.businessName,
    loginUrl: `${getAppUrl()}/login`,
    customMessage: settings.emailTemplates?.welcome?.body || "Thanks for signing up!",
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

/**
 * Session data returned from auth operations
 */
export type SessionData = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
};

/**
 * Login result with session and profile data
 */
export type LoginResult = {
  session: SessionData;
  profile: {
    id: number;
    email: string;
    role: 'ADMIN' | 'CLIENT';
    clientId: number | null;
  };
};

/**
 * Signup result with session and profile data
 */
export type SignupWorkflowResult = {
  session: SessionData;
  profile: {
    id: number;
    email: string;
    role: 'CLIENT';
    clientId: number;
  };
};

/**
 * Handle complete login workflow
 * Authenticates user and retrieves profile
 * @throws AppError if authentication fails
 */
export async function handleLogin(
  email: string,
  password: string
): Promise<LoginResult> {
  const authClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { persistSession: false },
  });

  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user || !authData.session) {
    throw new AppError('Invalid credentials', 'INVALID_CREDENTIALS', 401);
  }

  // Get user profile from database
  const profile = await getUserByAuthId(authData.user.id);

  return {
    session: {
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token ?? null,
      expiresAt: authData.session.expires_at ?? null,
    },
    profile: {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      clientId: profile.clientId,
    },
  };
}

/**
 * Handle complete signup workflow
 * Creates user and establishes session
 * @throws AppError if signup or authentication fails
 */
export async function handleSignup(
  email: string,
  password: string,
  options?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    businessName?: string;
    position?: string;
  }
): Promise<SignupWorkflowResult> {
  // Create user (handles all database operations)
  const result = await signupClient(email, password, options);

  // Create auth session
  const authClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { persistSession: false },
  });

  const { data: sessionData, error: signInError } = await authClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !sessionData.session) {
    throw new AppError(
      signInError?.message ?? 'Failed to sign in',
      'SIGNUP_ERROR',
      500
    );
  }

  return {
    session: {
      accessToken: sessionData.session.access_token,
      refreshToken: sessionData.session.refresh_token ?? null,
      expiresAt: sessionData.session.expires_at ?? null,
    },
    profile: {
      id: result.userId,
      email: result.email,
      role: result.role,
      clientId: result.clientId,
    },
  };
}

/**
 * Handle complete password change workflow
 * Validates current password and updates to new password
 * @throws AppError if validation or update fails
 */
export async function handlePasswordChange(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  // Validate password requirements
  validatePasswordChange(currentPassword, newPassword);

  // Get user email for authentication
  const email = await getUserEmail(userId);

  const authClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { persistSession: false },
  });

  // Verify current password
  const { data: authData, error: signInError } = await authClient.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (signInError || !authData.session) {
    throw new AppError('Incorrect current password', 'INCORRECT_PASSWORD', 401);
  }

  // Update password
  const { error: updateError } = await authClient.auth.updateUser({ password: newPassword });

  if (updateError) {
    throw new AppError(
      updateError.message ?? 'Failed to update password',
      'PASSWORD_CHANGE_ERROR',
      500
    );
  }

  // Clean up session
  await authClient.auth.signOut();

  logger.info({ scope: 'auth.change_password', data: { userId } });
}
