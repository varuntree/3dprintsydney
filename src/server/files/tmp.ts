import { mkdir, writeFile, stat, rm, rename } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const DATA_ROOT = path.resolve(process.cwd(), "data");
const TMP_ROOT = path.join(DATA_ROOT, "tmp");

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

export async function ensureTmpRoot() {
  await ensureDir(TMP_ROOT);
}

function sanitize(name: string) {
  return name.replaceAll("\\", "/").split("/").pop()!.replace(/[^\w.\-]+/g, "_");
}

export async function saveTmpFile(userKey: string, filename: string, buffer: Buffer) {
  await ensureTmpRoot();
  const id = randomBytes(8).toString("hex");
  const safe = sanitize(filename || "upload.bin");
  const dir = path.join(TMP_ROOT, userKey, id);
  await ensureDir(dir);
  const filePath = path.join(dir, safe);
  await writeFile(filePath, buffer);
  const s = await stat(filePath);
  const tmpId = path.join(userKey, id, safe);
  return { tmpId, filePath, size: Number(s.size), filename: safe };
}

export function resolveTmpPath(tmpId: string) {
  const fp = path.join(TMP_ROOT, path.normalize(tmpId));
  if (!fp.startsWith(TMP_ROOT)) throw new Error("Invalid tmp id");
  return fp;
}

export async function moveTmpToDir(tmpId: string, destDir: string) {
  const src = resolveTmpPath(tmpId);
  await ensureDir(destDir);
  const base = path.basename(src);
  const dest = path.join(destDir, base);
  await rename(src, dest);
  return dest;
}

export async function removeTmpDir(tmpId: string) {
  const src = resolveTmpPath(tmpId);
  const dir = path.dirname(src);
  await rm(dir, { recursive: true, force: true });
}

export { TMP_ROOT };
