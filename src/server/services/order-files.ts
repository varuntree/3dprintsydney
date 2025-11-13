import { getServiceSupabase } from "@/server/supabase/service-client";
import {
  uploadOrderFile as uploadToStorage,
  deleteOrderFile as deleteFromStorage,
  downloadOrderFile,
  getOrderFileSignedUrl,
} from "@/server/storage/supabase";
import { AppError, NotFoundError, BadRequestError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { applyOrientationToModel } from "@/server/geometry/orient";
import type { OrientationData } from "@/server/services/tmp-files";
import { supportsOrientationDataColumn } from "@/server/services/orientation-schema";

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
  orientation_data: OrientationData | null;
  uploaded_by: number | null;
  uploaded_at: string;
};

type RawOrderFileRow = Record<string, unknown>;
const ORDER_FILE_BASE_COLUMNS = [
  "id",
  "invoice_id",
  "quote_id",
  "client_id",
  "filename",
  "storage_key",
  "file_type",
  "mime_type",
  "size_bytes",
  "metadata",
  "uploaded_by",
  "uploaded_at",
];

function getOrderFileSelectColumns(includeOrientation: boolean) {
  const columns = [...ORDER_FILE_BASE_COLUMNS];
  if (includeOrientation) {
    columns.push("orientation_data");
  }
  return columns.join(", ");
}

const ORDER_FILE_TYPES: OrderFileType[] = ["model", "settings"];

function ensureNumberField(row: RawOrderFileRow, key: string) {
  const value = row[key];
  if (typeof value !== "number") {
    throw new AppError(`Order file record missing numeric field "${key}"`, "DATABASE_ERROR", 500);
  }
  return value;
}

function ensureNullableNumberField(row: RawOrderFileRow, key: string) {
  const value = row[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "number") {
    throw new AppError(`Order file record invalid nullable number "${key}"`, "DATABASE_ERROR", 500);
  }
  return value;
}

function ensureStringField(row: RawOrderFileRow, key: string) {
  const value = row[key];
  if (typeof value !== "string") {
    throw new AppError(`Order file record missing string field "${key}"`, "DATABASE_ERROR", 500);
  }
  return value;
}

function ensureNullableStringField(row: RawOrderFileRow, key: string) {
  const value = row[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new AppError(`Order file record invalid nullable string "${key}"`, "DATABASE_ERROR", 500);
  }
  return value;
}

function ensureMetadataField(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "object") {
    throw new AppError("Order file metadata is malformed", "DATABASE_ERROR", 500);
  }
  return value as Record<string, unknown>;
}

function ensureOrientationField(value: unknown): OrientationData | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "object") {
    throw new AppError("Order file orientation data is malformed", "DATABASE_ERROR", 500);
  }
  return value as OrientationData;
}

function ensureOrderFileType(value: unknown): OrderFileType {
  if (typeof value !== "string" || !ORDER_FILE_TYPES.includes(value as OrderFileType)) {
    throw new AppError(`Order file record has invalid file type "${String(value)}"`, "DATABASE_ERROR", 500);
  }
  return value as OrderFileType;
}

function assertRawOrderFileRow(value: unknown): asserts value is RawOrderFileRow {
  if (typeof value !== "object" || value === null) {
    throw new AppError("Order file row is malformed", "DATABASE_ERROR", 500);
  }
}

function mapOrderFileRow(row: RawOrderFileRow, includeOrientation: boolean): OrderFileRecord {
  return {
    id: ensureNumberField(row, "id"),
    invoice_id: ensureNullableNumberField(row, "invoice_id"),
    quote_id: ensureNullableNumberField(row, "quote_id"),
    client_id: ensureNumberField(row, "client_id"),
    filename: ensureStringField(row, "filename"),
    storage_key: ensureStringField(row, "storage_key"),
    file_type: ensureOrderFileType(row.file_type),
    mime_type: ensureNullableStringField(row, "mime_type"),
    size_bytes: ensureNumberField(row, "size_bytes"),
    metadata: ensureMetadataField(row.metadata),
    orientation_data: includeOrientation ? ensureOrientationField(row.orientation_data) : null,
    uploaded_by: ensureNullableNumberField(row, "uploaded_by"),
    uploaded_at: ensureStringField(row, "uploaded_at"),
  };
}

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
  orientationData?: OrientationData | null;
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
    orientationData,
  } = params;

  if (!invoiceId && !quoteId) {
    throw new BadRequestError("Either invoiceId or quoteId must be provided");
  }

  // Upload to storage
  const storageKey = await uploadToStorage(clientId, filename, contents, mimeType);

  // Create database record
  const supabase = getServiceSupabase();
  const includeOrientation = await supportsOrientationDataColumn("order_files");
  const insertPayload: Record<string, unknown> = {
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
  };
  if (includeOrientation) {
    insertPayload.orientation_data = orientationData ?? null;
  }
  const selectColumns = getOrderFileSelectColumns(includeOrientation);
  const { data, error } = await supabase
    .from("order_files")
    .insert(insertPayload)
    .select(selectColumns)
    .single();

  if (error || !data) {
    // Cleanup storage if DB insert fails
    await deleteFromStorage(storageKey).catch(() => undefined);
    throw new AppError(error?.message ?? "Failed to save order file record", 'DATABASE_ERROR', 500);
  }

  assertRawOrderFileRow(data);
  const record = mapOrderFileRow(data, includeOrientation);
  logger.info({ scope: 'order-files.save', data: { id: record.id, filename, invoiceId, quoteId } });
  return record;
}

/**
 * Get all order files for a specific invoice
 * @param invoiceId - Invoice ID
 * @returns Array of order file records
 * @throws AppError if database query fails
 */
export async function getOrderFilesByInvoice(invoiceId: number): Promise<OrderFileRecord[]> {
  const supabase = getServiceSupabase();
  const includeOrientation = await supportsOrientationDataColumn("order_files");
  const selectColumns = getOrderFileSelectColumns(includeOrientation);
  const { data, error } = await supabase
    .from("order_files")
    .select(selectColumns)
    .eq("invoice_id", invoiceId)
    .order("uploaded_at", { ascending: true });

  if (error) {
    throw new AppError(`Failed to get order files: ${error.message}`, 'DATABASE_ERROR', 500);
  }

  return (Array.isArray(data) ? data : []).map((row) => {
    assertRawOrderFileRow(row);
    return mapOrderFileRow(row, includeOrientation);
  });
}

/**
 * Get all order files for a specific quote
 * @param quoteId - Quote ID
 * @returns Array of order file records
 * @throws AppError if database query fails
 */
export async function getOrderFilesByQuote(quoteId: number): Promise<OrderFileRecord[]> {
  const supabase = getServiceSupabase();
  const includeOrientation = await supportsOrientationDataColumn("order_files");
  const selectColumns = getOrderFileSelectColumns(includeOrientation);
  const { data, error } = await supabase
    .from("order_files")
    .select(selectColumns)
    .eq("quote_id", quoteId)
    .order("uploaded_at", { ascending: true });

  if (error) {
    throw new AppError(`Failed to get order files: ${error.message}`, 'DATABASE_ERROR', 500);
  }

  return (Array.isArray(data) ? data : []).map((row) => {
    assertRawOrderFileRow(row);
    return mapOrderFileRow(row, includeOrientation);
  });
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
  const includeOrientation = await supportsOrientationDataColumn("order_files");
  const selectColumns = getOrderFileSelectColumns(includeOrientation);
  const { data, error } = await supabase
    .from("order_files")
    .select(selectColumns)
    .eq("id", id)
    .single();

  if (error || !data) {
    throw new NotFoundError("Order file", id);
  }

  assertRawOrderFileRow(data);
  return mapOrderFileRow(data, includeOrientation);
}

export async function getOrderFileOrientationData(fileId: number): Promise<OrientationData | null> {
  const file = await getOrderFile(fileId);
  return file.orientation_data ?? null;
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

export async function downloadOrderFileWithOrientation(
  id: number,
  { applyOrientation = false }: { applyOrientation?: boolean } = {}
): Promise<{ buffer: Buffer; filename: string; mimeType: string | null; orientationApplied: boolean }>
{
  const file = await getOrderFile(id);
  const buffer = await downloadOrderFile(file.storage_key);
  if (!applyOrientation || !file.orientation_data) {
    return { buffer, filename: file.filename, mimeType: file.mime_type, orientationApplied: false };
  }

  try {
    const oriented = applyOrientationToModel(buffer, file.filename, file.orientation_data);
    const orientedName = oriented.filename.replace(/\.stl$/i, "_oriented.stl");
    return {
      buffer: oriented.buffer,
      filename: orientedName,
      mimeType: oriented.mimeType,
      orientationApplied: true,
    };
  } catch (error) {
    logger.error({
      scope: "order-files.orient",
      message: "Failed to apply orientation",
      error,
      data: { fileId: id },
    });
    throw new AppError("Failed to generate oriented file", "ORIENTATION_ERROR", 500);
  }
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
