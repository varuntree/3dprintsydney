import { mkdir, writeFile } from "fs/promises";
import path from "path";

const DATA_ROOT = path.resolve(process.cwd(), "data");
const PDF_ROOT = path.join(DATA_ROOT, "pdfs");

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

export async function ensurePdfCache() {
  await Promise.all([ensureDir(DATA_ROOT), ensureDir(PDF_ROOT)]);
}

export async function cachePdf(filename: string, buffer: Buffer) {
  await ensureDir(PDF_ROOT);
  const filePath = path.join(PDF_ROOT, filename);
  await writeFile(filePath, buffer);
  return filePath;
}

export function resolvePdfPath(filename: string) {
  return path.join(PDF_ROOT, filename);
}

export { PDF_ROOT };
