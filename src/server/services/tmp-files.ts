import { getServiceSupabase } from "@/server/supabase/service-client";
import {
  createTmpFile as uploadToStorage,
  deleteTmpFile as deleteFromStorage,
  downloadTmpFile,
} from "@/server/storage/supabase";

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
  created_at: string;
  updated_at: string;
};

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
    .select("id, user_id, storage_key, filename, size_bytes, mime_type, status, metadata, created_at, updated_at")
    .single();

  if (error || !data) {
    await deleteFromStorage(key).catch(() => undefined);
    throw new Error(error?.message ?? "Failed to register tmp file");
  }

  return {
    record: data as TmpFileRecord,
    tmpId: data.storage_key,
  };
}

export async function requireTmpFile(userId: number, tmpId: string): Promise<TmpFileRecord> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("tmp_files")
    .select("id, user_id, storage_key, filename, size_bytes, mime_type, status, metadata, created_at, updated_at")
    .eq("storage_key", tmpId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load tmp file: ${error.message}`);
  }
  if (!data || data.user_id !== userId) {
    const err = new Error("Unauthorized");
    (err as Error & { status?: number }).status = data ? 403 : 404;
    throw err;
  }
  return data as TmpFileRecord;
}

export async function updateTmpFile(
  userId: number,
  tmpId: string,
  updates: {
    status?: TmpFileStatus;
    metadata?: TmpFileMetadata | null;
    sizeBytes?: number;
    filename?: string;
    mimeType?: string | null;
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
    })
    .eq("storage_key", tmpId)
    .select("id, user_id, storage_key, filename, size_bytes, mime_type, status, metadata, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update tmp file");
  }

  return data as TmpFileRecord;
}

export async function getTmpFileMetadata(userId: number, tmpId: string) {
  const record = await requireTmpFile(userId, tmpId);
  return {
    status: record.status,
    metadata: (record.metadata ?? {}) as TmpFileMetadata,
  };
}

export async function downloadTmpFileToBuffer(tmpId: string) {
  return downloadTmpFile(tmpId);
}

export async function deleteTmpFile(userId: number, tmpId: string) {
  // Ensure ownership first
  await requireTmpFile(userId, tmpId);
  const supabase = getServiceSupabase();
  const { error } = await supabase.from("tmp_files").delete().eq("storage_key", tmpId);
  if (error) {
    throw new Error(`Failed to delete tmp file record: ${error.message}`);
  }
  await deleteFromStorage(tmpId).catch(() => undefined);
}
