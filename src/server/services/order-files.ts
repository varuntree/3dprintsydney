import { getServiceSupabase } from "@/server/supabase/service-client";
import {
  uploadOrderFile as uploadToStorage,
  deleteOrderFile as deleteFromStorage,
  downloadOrderFile,
  getOrderFileSignedUrl,
} from "@/server/storage/supabase";
import { AppError, NotFoundError, BadRequestError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export type OrderFileType = "model" | "settings";

export type OrderFileRecord = {
  id: number;
  invoice_id: number | null;
  quote_id: number | null;
  client_id: number;
  filename: string;
  storage_key: string;
  file_type: OrderFileType;
  mime_type: string | null;
  size_bytes: number;
  metadata: Record<string, unknown> | null;
  uploaded_by: number | null;
  uploaded_at: string;
};

/**
 * Save an order file to storage and database
 * @param params - File save parameters (buffer, filename, invoice/quote ID, user ID)
 * @returns Created order file record
 * @throws AppError if file upload or database operation fails
 */
export async function saveOrderFile(params: {
  invoiceId?: number;
  quoteId?: number;
  clientId: number;
  userId: number;
  filename: string;
  fileType: OrderFileType;
  contents: Buffer | ArrayBuffer | Uint8Array;
  mimeType: string | null;
  metadata?: Record<string, unknown>;
}): Promise<OrderFileRecord> {
  const {
    invoiceId,
    quoteId,
    clientId,
    userId,
    filename,
    fileType,
    contents,
    mimeType,
    metadata,
  } = params;

  if (!invoiceId && !quoteId) {
    throw new BadRequestError("Either invoiceId or quoteId must be provided");
  }

  // Upload to storage
  const storageKey = await uploadToStorage(clientId, filename, contents, mimeType);

  // Create database record
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("order_files")
    .insert({
      invoice_id: invoiceId ?? null,
      quote_id: quoteId ?? null,
      client_id: clientId,
      filename,
      storage_key: storageKey,
      file_type: fileType,
      mime_type: mimeType,
      size_bytes: Buffer.isBuffer(contents)
        ? contents.length
        : contents instanceof ArrayBuffer
        ? contents.byteLength
        : contents.byteLength,
      metadata: metadata ?? null,
      uploaded_by: userId,
    })
    .select()
    .single();

  if (error || !data) {
    // Cleanup storage if DB insert fails
    await deleteFromStorage(storageKey).catch(() => undefined);
    throw new AppError(error?.message ?? "Failed to save order file record", 'DATABASE_ERROR', 500);
  }

  logger.info({ scope: 'order-files.save', data: { id: data.id, filename, invoiceId, quoteId } });
  return data as OrderFileRecord;
}

/**
 * Get all order files for a specific invoice
 * @param invoiceId - Invoice ID
 * @returns Array of order file records
 * @throws AppError if database query fails
 */
export async function getOrderFilesByInvoice(invoiceId: number): Promise<OrderFileRecord[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("order_files")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("uploaded_at", { ascending: true });

  if (error) {
    throw new AppError(`Failed to get order files: ${error.message}`, 'DATABASE_ERROR', 500);
  }

  return (data ?? []) as OrderFileRecord[];
}

/**
 * Get all order files for a specific quote
 * @param quoteId - Quote ID
 * @returns Array of order file records
 * @throws AppError if database query fails
 */
export async function getOrderFilesByQuote(quoteId: number): Promise<OrderFileRecord[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("order_files")
    .select("*")
    .eq("quote_id", quoteId)
    .order("uploaded_at", { ascending: true });

  if (error) {
    throw new AppError(`Failed to get order files: ${error.message}`, 'DATABASE_ERROR', 500);
  }

  return (data ?? []) as OrderFileRecord[];
}

/**
 * Get a single order file by ID
 * @param id - Order file ID
 * @returns Order file record
 * @throws NotFoundError if file not found
 * @throws AppError if database query fails
 */
export async function getOrderFile(id: number): Promise<OrderFileRecord> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("order_files")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    throw new NotFoundError("Order file", id);
  }

  return data as OrderFileRecord;
}

/**
 * Get a signed download URL for an order file
 * @param id - Order file ID
 * @param expiresIn - URL expiration time in seconds (default 300)
 * @returns Signed download URL
 * @throws AppError if URL generation fails
 */
export async function getOrderFileDownloadUrl(id: number, expiresIn = 300): Promise<string> {
  const file = await getOrderFile(id);
  return getOrderFileSignedUrl(file.storage_key, expiresIn);
}

/**
 * Download an order file to a buffer
 * @param id - Order file ID
 * @returns File buffer
 * @throws AppError if download fails
 */
export async function downloadOrderFileToBuffer(id: number): Promise<Buffer> {
  const file = await getOrderFile(id);
  return downloadOrderFile(file.storage_key);
}

/**
 * Delete an order file from storage and database
 * @param id - Order file ID to delete
 * @throws AppError if deletion fails
 */
export async function deleteOrderFile(id: number): Promise<void> {
  const file = await getOrderFile(id);
  const supabase = getServiceSupabase();

  // Delete database record
  const { error } = await supabase.from("order_files").delete().eq("id", id);
  if (error) {
    throw new AppError(`Failed to delete order file record: ${error.message}`, 'DATABASE_ERROR', 500);
  }

  // Delete from storage
  await deleteFromStorage(file.storage_key).catch(() => undefined);

  logger.info({ scope: 'order-files.delete', data: { id, filename: file.filename } });
}
