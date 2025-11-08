import { getServiceSupabase } from "@/server/supabase/service-client";
import {
  createTmpFile as uploadToStorage,
  deleteTmpFile as deleteFromStorage,
  downloadTmpFile,
} from "@/server/storage/supabase";
import { AppError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export type TmpFileStatus = "idle" | "running" | "completed" | "failed";

export type TmpFileMetadata = {
  attempts?: number;
  settings?: unknown;
  metrics?: unknown;
  fallback?: boolean;
  error?: string | null;
  [key: string]: unknown;
};

export type TmpFileRecord = {
  id: number;
  user_id: number;
  storage_key: string;
  filename: string;
  size_bytes: number;
  mime_type: string | null;
  status: TmpFileStatus;
  metadata: TmpFileMetadata | null;
  orientation_data: OrientationData | null;
  created_at: string;
  updated_at: string;
};

export type OrientationData = {
  quaternion: [number, number, number, number];
  position: [number, number, number];
  autoOriented?: boolean;
};

/**
 * Save a temporary file to storage and database
 * @param params - Temporary file save parameters (user ID, buffer, filename, mime type, metadata)
 * @returns Created temporary file record
 * @throws AppError if file upload or database operation fails
 */
export async function saveTmpFile(
  userId: number,
  filename: string,
  contents: Buffer | ArrayBuffer | Uint8Array,
  contentType: string | null,
  metadata?: TmpFileMetadata,
) {
  const key = await uploadToStorage(String(userId), filename, contents, contentType);
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("tmp_files")
    .insert({
      user_id: userId,
      storage_key: key,
      filename,
      size_bytes: Buffer.isBuffer(contents)
        ? contents.length
        : contents instanceof ArrayBuffer
        ? contents.byteLength
        : contents.byteLength,
      mime_type: contentType ?? null,
      status: "idle",
      metadata: metadata ?? null,
    })
    .select("id, user_id, storage_key, filename, size_bytes, mime_type, status, metadata, orientation_data, created_at, updated_at")
    .single();

  if (error || !data) {
    logger.error({
      scope: 'tmp-files.save',
      message: 'Failed to register tmp file in database',
      userId,
      filename,
      error: error?.message ?? 'no data returned',
    });
    await deleteFromStorage(key).catch(() => undefined);
    throw new AppError(error?.message ?? "Failed to register tmp file", 'DATABASE_ERROR', 500);
  }

  logger.info({ scope: 'tmp-files.save', data: { tmpId: data.storage_key, filename } });
  return {
    record: data as TmpFileRecord,
    tmpId: data.storage_key,
  };
}

/**
 * Get a temporary file by ID with user ownership validation
 * @param userId - User ID for ownership check
 * @param tmpId - Temporary file ID
 * @returns Temporary file record
 * @throws NotFoundError if file not found or user doesn't own the file
 * @throws AppError if database query fails
 */
export async function requireTmpFile(userId: number, tmpId: string): Promise<TmpFileRecord> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("tmp_files")
    .select("id, user_id, storage_key, filename, size_bytes, mime_type, status, metadata, orientation_data, created_at, updated_at")
    .eq("storage_key", tmpId)
    .maybeSingle();

  if (error) {
    throw new AppError(`Failed to load tmp file: ${error.message}`, 'DATABASE_ERROR', 500);
  }
  if (!data) {
    throw new NotFoundError("Tmp file", tmpId);
  }
  if (data.user_id !== userId) {
    throw new ForbiddenError("Unauthorized");
  }
  return data as TmpFileRecord;
}

/**
 * Update a temporary file's metadata
 * @param params - Update parameters (user ID, tmp ID, metadata)
 * @returns Updated temporary file record
 * @throws NotFoundError if file not found
 * @throws AppError if database operation fails
 */
export async function updateTmpFile(
  userId: number,
  tmpId: string,
  updates: {
    status?: TmpFileStatus;
    metadata?: TmpFileMetadata | null;
    sizeBytes?: number;
    filename?: string;
    mimeType?: string | null;
    orientationData?: OrientationData | null;
  },
) {
  await requireTmpFile(userId, tmpId);
  const supabase = getServiceSupabase();
  const { error, data } = await supabase
    .from("tmp_files")
    .update({
      status: updates.status ?? undefined,
      metadata: updates.metadata ?? undefined,
      size_bytes: updates.sizeBytes ?? undefined,
      filename: updates.filename ?? undefined,
      mime_type: updates.mimeType ?? undefined,
      orientation_data: updates.orientationData ?? undefined,
    })
    .eq("storage_key", tmpId)
    .select("id, user_id, storage_key, filename, size_bytes, mime_type, status, metadata, orientation_data, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new AppError(error?.message ?? "Failed to update tmp file", 'DATABASE_ERROR', 500);
  }

  return data as TmpFileRecord;
}

/**
 * Get temporary file metadata with user ownership validation
 * @param userId - User ID for ownership check
 * @param tmpId - Temporary file ID
 * @returns Temporary file metadata
 * @throws NotFoundError if file not found
 */
export async function getTmpFileMetadata(userId: number, tmpId: string) {
  const record = await requireTmpFile(userId, tmpId);
  return {
    status: record.status,
    metadata: (record.metadata ?? {}) as TmpFileMetadata,
  };
}

/**
 * Download a temporary file to a buffer
 * @param tmpId - Temporary file ID
 * @returns File buffer
 * @throws AppError if download fails
 */
export async function downloadTmpFileToBuffer(tmpId: string) {
  return downloadTmpFile(tmpId);
}

/**
 * Delete a temporary file from storage and database
 * @param userId - User ID for ownership check
 * @param tmpId - Temporary file ID to delete
 * @throws NotFoundError if file not found
 * @throws AppError if deletion fails
 */
export async function deleteTmpFile(userId: number, tmpId: string) {
  // Ensure ownership first
  await requireTmpFile(userId, tmpId);
  const supabase = getServiceSupabase();
  const { error } = await supabase.from("tmp_files").delete().eq("storage_key", tmpId);
  if (error) {
    throw new AppError(`Failed to delete tmp file record: ${error.message}`, 'DATABASE_ERROR', 500);
  }
  await deleteFromStorage(tmpId).catch(() => undefined);
  logger.info({ scope: 'tmp-files.delete', data: { tmpId, userId } });
}
