import { mkdir, writeFile, unlink, readdir, stat } from "fs/promises";
import path from "path";
import { createReadStream } from "fs";

const DATA_ROOT = path.resolve(process.cwd(), "data");
const FILES_ROOT = path.join(DATA_ROOT, "files");
const PDF_ROOT = path.join(DATA_ROOT, "pdfs");

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

export async function ensureStorage() {
  await Promise.all([ensureDir(DATA_ROOT), ensureDir(FILES_ROOT), ensureDir(PDF_ROOT)]);
}

export function resolveInvoiceFilePath(invoiceId: number, filename: string) {
  return path.join(FILES_ROOT, `${invoiceId}`, filename);
}

export async function saveInvoiceFile(
  invoiceId: number,
  filename: string,
  buffer: Buffer,
) {
  const dir = path.join(FILES_ROOT, `${invoiceId}`);
  await ensureDir(dir);
  const filePath = path.join(dir, filename);
  await writeFile(filePath, buffer);
  return filePath;
}

export async function deleteInvoiceFile(invoiceId: number, filename: string) {
  const filePath = path.join(FILES_ROOT, `${invoiceId}`, filename);
  await unlink(filePath);
}

export async function readInvoiceFile(invoiceId: number, filename: string) {
  const filePath = path.join(FILES_ROOT, `${invoiceId}`, filename);
  return createReadStream(filePath);
}

export async function listInvoiceFiles(invoiceId: number) {
  const dir = path.join(FILES_ROOT, `${invoiceId}`);
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function savePdf(filename: string, buffer: Buffer) {
  await ensureDir(PDF_ROOT);
  const filePath = path.join(PDF_ROOT, filename);
  await writeFile(filePath, buffer);
  return filePath;
}

export function resolvePdfPath(filename: string) {
  return path.join(PDF_ROOT, filename);
}

export async function fileInfo(filePath: string) {
  const stats = await stat(filePath);
  return stats;
}

export { FILES_ROOT, PDF_ROOT };
