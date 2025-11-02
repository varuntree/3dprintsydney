import { randomUUID } from 'crypto';
import { Buffer } from 'node:buffer';
import { getServiceSupabase } from '@/server/supabase/service-client';

const ATTACHMENTS_BUCKET = 'attachments';
const TMP_BUCKET = 'tmp';
const ORDER_FILES_BUCKET = 'order-files';

type BinaryPayload = Buffer | ArrayBuffer | Uint8Array;

export type StoredObject = {
  key: string;
  size: number;
  updatedAt: string;
};

function toBytes(input: BinaryPayload): ArrayBuffer {
  if (input instanceof ArrayBuffer) {
    return input;
  }
  const view = Buffer.isBuffer(input) ? new Uint8Array(input) : (input as Uint8Array);
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy.buffer;
}

function normalizeFolder(folder?: string | null): string {
  if (!folder) return '';
  return folder.replace(/^\/+|\/+$/g, '');
}

function withInvoicePrefix(invoiceId: number, filename: string): string {
  return `${invoiceId}/${filename}`;
}

async function listBucketObjects(bucket: string, folder?: string, { recursive = false }: { recursive?: boolean } = {}): Promise<StoredObject[]> {
  const supabase = getServiceSupabase();
  const path = normalizeFolder(folder);
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(path.length > 0 ? path : undefined, {
      limit: 1000,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });
  if (error) {
    throw new Error(`Failed to list objects in bucket "${bucket}"${path ? ` (${path})` : ''}: ${error.message}`);
  }

  const entries: StoredObject[] = [];
  const directories: string[] = [];

  for (const item of data ?? []) {
    const key = path ? `${path}/${item.name}` : item.name;
    const isDirectory = item.id === null && item.metadata === null;

    if (isDirectory) {
      if (recursive) {
        directories.push(key);
      }
      continue;
    }

    entries.push({
      key,
      size: item.metadata?.size ?? 0,
      updatedAt: item.updated_at ?? new Date().toISOString(),
    });
  }

  if (recursive && directories.length > 0) {
    const nested = await Promise.all(directories.map((dir) => listBucketObjects(bucket, dir, { recursive: true })));
    for (const list of nested) {
      entries.push(...list);
    }
  }

  return entries;
}

async function removeObjects(bucket: string, keys: string[]) {
  if (keys.length === 0) return;
  const supabase = getServiceSupabase();
  const { error } = await supabase.storage.from(bucket).remove(keys);
  if (error) {
    throw new Error(`Failed to delete objects from bucket "${bucket}": ${error.message}`);
  }
}

export async function uploadInvoiceAttachment(invoiceId: number, filename: string, contents: BinaryPayload, contentType: string | null) {
  const supabase = getServiceSupabase();
  const path = withInvoicePrefix(invoiceId, filename);
  const { error } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(path, toBytes(contents), {
    contentType: contentType ?? 'application/octet-stream',
    upsert: true,
  });
  if (error) {
    throw new Error(`Failed to upload attachment: ${error.message}`);
  }
  return path;
}

export async function deleteInvoiceAttachment(path: string) {
  const supabase = getServiceSupabase();
  const { error } = await supabase.storage.from(ATTACHMENTS_BUCKET).remove([path]);
  if (error) {
    throw new Error(`Failed to delete attachment: ${error.message}`);
  }
}

export async function deleteInvoiceAttachments(paths: string[]) {
  await removeObjects(ATTACHMENTS_BUCKET, paths);
}

export async function getAttachmentSignedUrl(path: string, expiresIn = 60) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.storage.from(ATTACHMENTS_BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? 'Missing URL'}`);
  }
  return data.signedUrl;
}

export async function listInvoiceAttachments(invoiceId: number): Promise<StoredObject[]> {
  return listBucketObjects(ATTACHMENTS_BUCKET, String(invoiceId));
}

export async function createTmpFile(userKey: string, filename: string, contents: BinaryPayload, contentType: string | null) {
  const supabase = getServiceSupabase();
  const key = `${userKey}/${randomUUID()}/${filename}`;
  const { error } = await supabase.storage.from(TMP_BUCKET).upload(key, toBytes(contents), {
    contentType: contentType ?? 'application/octet-stream',
    upsert: true,
  });
  if (error) {
    throw new Error(`Failed to upload tmp file: ${error.message}`);
  }
  return key;
}

export async function deleteTmpFile(path: string) {
  const supabase = getServiceSupabase();
  const { error } = await supabase.storage.from(TMP_BUCKET).remove([path]);
  if (error) {
    throw new Error(`Failed to delete tmp file: ${error.message}`);
  }
}

export async function deleteTmpFiles(paths: string[]) {
  await removeObjects(TMP_BUCKET, paths);
}

export async function getTmpFileSignedUrl(path: string, expiresIn = 60) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.storage.from(TMP_BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create tmp file signed URL: ${error?.message ?? 'Missing URL'}`);
  }
  return data.signedUrl;
}

export async function downloadTmpFile(path: string): Promise<Buffer> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.storage.from(TMP_BUCKET).download(path);
  if (error || !data) {
    throw new Error(`Failed to download tmp file: ${error?.message ?? 'Missing data'}`);
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function listTmpFiles(userKey: string): Promise<StoredObject[]> {
  return listBucketObjects(TMP_BUCKET, userKey, { recursive: true });
}

// ========================================
// Order Files Bucket (Permanent 3D Models)
// ========================================

export async function uploadOrderFile(
  clientId: number,
  filename: string,
  contents: BinaryPayload,
  contentType: string | null
) {
  const supabase = getServiceSupabase();
  const key = `${clientId}/${randomUUID()}/${filename}`;
  const { error } = await supabase.storage.from(ORDER_FILES_BUCKET).upload(key, toBytes(contents), {
    contentType: contentType ?? 'application/octet-stream',
    upsert: false,
  });
  if (error) {
    throw new Error(`Failed to upload order file: ${error.message}`);
  }
  return key;
}

export async function getOrderFileSignedUrl(path: string, expiresIn = 300) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.storage.from(ORDER_FILES_BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create order file signed URL: ${error?.message ?? 'Missing URL'}`);
  }
  return data.signedUrl;
}

export async function downloadOrderFile(path: string): Promise<Buffer> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.storage.from(ORDER_FILES_BUCKET).download(path);
  if (error || !data) {
    throw new Error(`Failed to download order file: ${error?.message ?? 'Missing data'}`);
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function deleteOrderFile(path: string) {
  await removeObjects(ORDER_FILES_BUCKET, [path]);
}

export async function listOrderFiles(clientId: number): Promise<StoredObject[]> {
  return listBucketObjects(ORDER_FILES_BUCKET, String(clientId), { recursive: true });
}

// ========================================
// Generic Storage Delete Helpers
// ========================================

/**
 * Delete a single file from any storage bucket
 * @throws Error if deletion fails
 */
export async function deleteFromStorage(
  bucket: string,
  path: string
): Promise<void> {
  const supabase = getServiceSupabase();

  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    throw new Error(
      `Failed to delete file from storage bucket "${bucket}": ${error.message}`
    );
  }
}

/**
 * Delete multiple files from a storage bucket
 * @throws Error if deletion fails
 */
export async function deleteManyFromStorage(
  bucket: string,
  paths: string[]
): Promise<void> {
  if (paths.length === 0) return;

  const supabase = getServiceSupabase();

  const { error } = await supabase.storage
    .from(bucket)
    .remove(paths);

  if (error) {
    throw new Error(
      `Failed to delete files from storage bucket "${bucket}": ${error.message}`
    );
  }
}
