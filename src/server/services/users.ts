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
