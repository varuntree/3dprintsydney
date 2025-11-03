import { logger } from '@/lib/logger';
import { deleteInvoiceAttachments } from '@/server/storage/supabase';
import { getServiceSupabase } from '@/server/supabase/service-client';
import { AppError, NotFoundError } from '@/lib/errors';

async function collectClientAttachmentKeys(clientId: number): Promise<string[]> {
  const supabase = getServiceSupabase();
  const { data: invoices, error: invoiceError } = await supabase
    .from("invoices")
    .select("id")
    .eq("client_id", clientId);
  if (invoiceError) {
    throw new AppError(`Failed to load client invoices: ${invoiceError.message}`, 'DATABASE_ERROR', 500);
  }
  const invoiceIds = (invoices ?? []).map((row) => row.id);
  if (invoiceIds.length === 0) {
    return [];
  }
  const { data: attachments, error: attachmentError } = await supabase
    .from("attachments")
    .select("storage_key")
    .in("invoice_id", invoiceIds);
  if (attachmentError) {
    throw new AppError(`Failed to load attachment keys: ${attachmentError.message}`, 'DATABASE_ERROR', 500);
  }
  return (attachments ?? [])
    .map((row) => row.storage_key)
    .filter((key): key is string => typeof key === "string" && key.length > 0);
}

async function deleteAttachmentFiles(keys: string[]) {
  if (keys.length === 0) return;
  try {
    await deleteInvoiceAttachments(keys);
  } catch (error) {
    logger.warn({
      scope: 'users.delete',
      message: 'Failed to remove attachment files from storage',
      error,
      data: { count: keys.length },
    });
  }
}

export async function deleteUserAndData(userId: number) {
  const supabase = getServiceSupabase();
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, client_id, role, auth_user_id")
    .eq("id", userId)
    .maybeSingle();
  if (userError) {
    throw new AppError(`Failed to lookup user: ${userError.message}`, 'DATABASE_ERROR', 500);
  }
  if (!user) {
    throw new NotFoundError("User", userId);
  }

  const authIdsToRemove: string[] = [];
  if (user.auth_user_id) {
    authIdsToRemove.push(user.auth_user_id);
  }

  if (user.client_id) {
    const clientId = user.client_id;
    const { data: clientUsers, error: clientUsersError } = await supabase
      .from("users")
      .select("auth_user_id")
      .eq("client_id", clientId);
    if (clientUsersError) {
      throw new AppError(`Failed to load client users: ${clientUsersError.message}`, 'DATABASE_ERROR', 500);
    }
    for (const u of clientUsers ?? []) {
      if (u.auth_user_id) authIdsToRemove.push(u.auth_user_id);
    }

    const attachmentKeys = await collectClientAttachmentKeys(clientId);

    const { error: deleteClientError } = await supabase
      .from("clients")
      .delete()
      .eq("id", clientId);
    if (deleteClientError) {
      throw new AppError(`Failed to delete client: ${deleteClientError.message}`, 'DATABASE_ERROR', 500);
    }

    await deleteAttachmentFiles(attachmentKeys);
    logger.info({ scope: "users.delete", message: "Deleted client and related data", data: { clientId } });
  } else {
    const { error: deleteUserError } = await supabase.from("users").delete().eq("id", userId);
    if (deleteUserError) {
      throw new AppError(`Failed to delete user: ${deleteUserError.message}`, 'DATABASE_ERROR', 500);
    }
    logger.info({ scope: "users.delete", message: "Deleted admin user", data: { userId } });
  }

  await Promise.all(
    authIdsToRemove.map((id) =>
      supabase.auth.admin.deleteUser(id).catch((error) => {
        logger.warn({ scope: "users.delete", message: "Failed to delete auth user", error, data: { authUserId: id } });
      }),
    ),
  );
}

import type { UserDTO, UserCreateInput } from '@/lib/types/user';
import { randomBytes } from 'crypto';

/**
 * List all users (admin view)
 * Optimized with a single query instead of N+1 pattern
 */
export async function listUsers(): Promise<UserDTO[]> {
  const supabase = getServiceSupabase();

  // Single optimized query with message count aggregation
  // This replaces the N+1 query pattern with a single JOIN
  const { data: users, error } = await supabase
    .from('users')
    .select(`
      id,
      email,
      role,
      client_id,
      created_at,
      user_messages(count)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(
      `Failed to load users: ${error.message}`,
      'USER_LOAD_ERROR',
      500
    );
  }

  return (users ?? []).map((u) => {
    // Extract message count from the aggregate
    const messageCount = Array.isArray(u.user_messages) 
      ? u.user_messages.length 
      : 0;

    return {
      id: u.id,
      email: u.email,
      role: u.role,
      clientId: u.client_id,
      createdAt: u.created_at,
      messageCount,
    };
  });
}

/**
 * Create a new user (admin operation)
 * @returns UserDTO with temporary password
 */
export async function createAdminUser(
  input: UserCreateInput
): Promise<UserDTO & { temporaryPassword: string }> {
  const supabase = getServiceSupabase();

  // Validate client exists if clientId provided
  if (input.clientId) {
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', input.clientId)
      .maybeSingle();

    if (clientError) {
      throw new AppError(
        `Failed to verify client: ${clientError.message}`,
        'USER_CREATE_ERROR',
        500
      );
    }

    if (!client) {
      throw new NotFoundError('Client', input.clientId);
    }
  }

  // Generate temporary password
  const temporaryPassword = randomBytes(12).toString('base64url').slice(0, 16);

  // Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: temporaryPassword,
    email_confirm: true,
  });

  if (authError || !authUser.user) {
    throw new AppError(
      authError?.message ?? 'Failed to create auth user',
      'USER_CREATE_ERROR',
      500
    );
  }

  // Create user profile
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .insert({
      auth_user_id: authUser.user.id,
      email: input.email,
      role: input.role,
      client_id: input.role === 'CLIENT' ? input.clientId ?? null : null,
    })
    .select('id, email, role, client_id, created_at')
    .single();

  if (profileError || !profile) {
    // Rollback auth user creation
    await supabase.auth.admin.deleteUser(authUser.user.id).catch((error) => {
      logger.warn({
        scope: 'users.create',
        message: 'Rollback auth user failed',
        error,
      });
    });

    throw new AppError(
      profileError?.message ?? 'Failed to create user profile',
      'USER_CREATE_ERROR',
      500
    );
  }

  logger.info({
    scope: 'users.create',
    message: 'User created',
    data: { userId: profile.id, role: profile.role },
  });

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    clientId: profile.client_id,
    createdAt: profile.created_at,
    temporaryPassword,
  };
}
