import { getServiceSupabase } from "@/server/supabase/service-client";
import { supportsOrientationDataColumn } from "@/server/services/orientation-schema";
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
  supportVolume?: number;
  supportWeight?: number;
};

type RawTmpFileRow = Record<string, unknown>;
const TMP_FILE_STATUSES: TmpFileStatus[] = ["idle", "running", "completed", "failed"];

function ensureNumberField(row: RawTmpFileRow, key: string) {
  const value = row[key];
  if (typeof value !== "number") {
    throw new AppError(`Tmp file record missing numeric field "${key}"`, "DATABASE_ERROR", 500);
  }
  return value;
}

function ensureStringField(row: RawTmpFileRow, key: string) {
  const value = row[key];
  if (typeof value !== "string") {
    throw new AppError(`Tmp file record missing string field "${key}"`, "DATABASE_ERROR", 500);
  }
  return value;
}

function ensureNullableStringField(row: RawTmpFileRow, key: string) {
  const value = row[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new AppError(`Tmp file record invalid nullable string "${key}"`, "DATABASE_ERROR", 500);
  }
  return value;
}

function ensureStatusField(value: unknown): TmpFileStatus {
  if (typeof value !== "string" || !TMP_FILE_STATUSES.includes(value as TmpFileStatus)) {
    throw new AppError(`Tmp file record has invalid status "${String(value)}"`, "DATABASE_ERROR", 500);
  }
  return value as TmpFileStatus;
}

function ensureMetadataField(value: unknown): TmpFileMetadata | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "object") {
    throw new AppError("Tmp file metadata is malformed", "DATABASE_ERROR", 500);
  }
  return value as TmpFileMetadata;
}

function ensureOrientationField(value: unknown): OrientationData | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "object") {
    throw new AppError("Tmp file orientation data is malformed", "DATABASE_ERROR", 500);
  }
  return value as OrientationData;
}

function assertRawTmpFileRow(value: unknown): asserts value is RawTmpFileRow {
  if (typeof value !== "object" || value === null) {
    throw new AppError("Tmp file row is malformed", "DATABASE_ERROR", 500);
  }
}

function mapTmpFileRow(row: RawTmpFileRow, includeOrientation: boolean): TmpFileRecord {
  return {
    id: ensureNumberField(row, "id"),
    user_id: ensureNumberField(row, "user_id"),
    storage_key: ensureStringField(row, "storage_key"),
    filename: ensureStringField(row, "filename"),
    size_bytes: ensureNumberField(row, "size_bytes"),
    mime_type: ensureNullableStringField(row, "mime_type"),
    status: ensureStatusField(row.status),
    metadata: ensureMetadataField(row.metadata),
    orientation_data: includeOrientation ? ensureOrientationField(row.orientation_data) : null,
    created_at: ensureStringField(row, "created_at"),
    updated_at: ensureStringField(row, "updated_at"),
  };
}

function getSupabaseErrorMessage(error: unknown) {
  if (!error) return "no data returned";
  if (typeof error === "string") {
    return error;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === "string") {
      return message;
    }
  }
  return "Unknown error";
}

const TMP_FILE_BASE_COLUMNS = [
  "id",
  "user_id",
  "storage_key",
  "filename",
  "size_bytes",
  "mime_type",
  "status",
  "metadata",
];

function getTmpFileSelectColumns(includeOrientation: boolean) {
  const columns = [...TMP_FILE_BASE_COLUMNS];
  if (includeOrientation) {
    columns.push("orientation_data");
  }
  columns.push("created_at", "updated_at");
  return columns.join(", ");
}

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
  const includeOrientation = await supportsOrientationDataColumn("tmp_files");
  const payloadMetadata = metadata ? { ...metadata } : null;
  const insertPayload: Record<string, unknown> = {
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
    metadata: payloadMetadata,
  };
  if (includeOrientation) {
    insertPayload.orientation_data = null;
  }
  const { data, error } = await supabase
    .from("tmp_files")
    .insert(insertPayload)
    .select(getTmpFileSelectColumns(includeOrientation))
    .single();

  if (error || !data) {
    const errorMessage = getSupabaseErrorMessage(error);
    logger.error({
      scope: 'tmp-files.save',
      message: 'Failed to register tmp file in database',
      data: { userId, filename },
      error: errorMessage,
    });
    await deleteFromStorage(key).catch(() => undefined);
    throw new AppError(errorMessage, 'DATABASE_ERROR', 500);
  }

  assertRawTmpFileRow(data);
  const record = mapTmpFileRow(data, includeOrientation);
  logger.info({ scope: 'tmp-files.save', data: { tmpId: record.storage_key, filename } });
  return {
    record,
    tmpId: record.storage_key,
  };
}

export async function findTmpFileByHash(
  userId: number,
  hash: string,
  sizeBytes: number,
): Promise<TmpFileRecord | null> {
  const supabase = getServiceSupabase();
  const includeOrientation = await supportsOrientationDataColumn("tmp_files");
  const selectColumns = getTmpFileSelectColumns(includeOrientation);
  const { data, error } = await supabase
    .from("tmp_files")
    .select(selectColumns)
    .eq("user_id", userId)
    .eq("size_bytes", sizeBytes)
    .neq("status", "failed")
    .contains("metadata", { hash })
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (error) {
    const message = getSupabaseErrorMessage(error);
    throw new AppError(`Failed to search for duplicate tmp file: ${message}`, "DATABASE_ERROR", 500);
  }
  if (!data) {
    return null;
  }
  assertRawTmpFileRow(data);
  return mapTmpFileRow(data, includeOrientation);
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
  const includeOrientation = await supportsOrientationDataColumn("tmp_files");
  const selectColumns = getTmpFileSelectColumns(includeOrientation);
  const { data, error } = await supabase
    .from("tmp_files")
    .select(selectColumns)
    .eq("storage_key", tmpId)
    .maybeSingle();

  if (error) {
    const message = getSupabaseErrorMessage(error);
    throw new AppError(`Failed to load tmp file: ${message}`, 'DATABASE_ERROR', 500);
  }
  if (!data) {
    throw new NotFoundError("Tmp file", tmpId);
  }
  assertRawTmpFileRow(data);
  if (data.user_id !== userId) {
    throw new ForbiddenError("Unauthorized");
  }
  return mapTmpFileRow(data, includeOrientation);
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
  const includeOrientation = await supportsOrientationDataColumn("tmp_files");
  const updatePayload: Record<string, unknown> = {
    status: updates.status ?? undefined,
    metadata: updates.metadata ?? undefined,
    size_bytes: updates.sizeBytes ?? undefined,
    filename: updates.filename ?? undefined,
    mime_type: updates.mimeType ?? undefined,
  };
  if (includeOrientation && updates.orientationData !== undefined) {
    updatePayload.orientation_data = updates.orientationData;
  }
  const { error, data } = await supabase
    .from("tmp_files")
    .update(updatePayload)
    .eq("storage_key", tmpId)
    .select(getTmpFileSelectColumns(includeOrientation))
    .single();

  if (error || !data) {
    const message = getSupabaseErrorMessage(error);
    throw new AppError(message, 'DATABASE_ERROR', 500);
  }

  assertRawTmpFileRow(data);
  return mapTmpFileRow(data, includeOrientation);
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
