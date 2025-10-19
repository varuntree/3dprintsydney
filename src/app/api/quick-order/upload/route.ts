import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { saveTmpFile } from "@/server/services/tmp-files";

export const runtime = "nodejs";

const MAX_SIZE = 100 * 1024 * 1024; // 100MB per file
const ALLOWED = new Set([".stl", ".3mf"]);

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const form = await req.formData();
    const entries = form.getAll("files");
    if (!entries.length) {
      return NextResponse.json({ error: "No files" }, { status: 400 });
    }
    const results: Array<{ id: string; filename: string; size: number; type: string }> = [];
    for (const entry of entries) {
      if (!(entry instanceof File)) continue;
      const name = entry.name || "upload.stl";
      const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
      if (!ALLOWED.has(ext)) {
        return NextResponse.json({ error: `Invalid file type: ${ext}` }, { status: 400 });
      }
      if (entry.size > MAX_SIZE) {
        return NextResponse.json({ error: `File too large: ${name}` }, { status: 400 });
      }
      const buf = Buffer.from(await entry.arrayBuffer());
      const { record, tmpId } = await saveTmpFile(
        user.id,
        name,
        buf,
        entry.type || "application/octet-stream",
      );
      results.push({
        id: tmpId,
        filename: record.filename,
        size: record.size_bytes,
        type: record.mime_type || "application/octet-stream",
      });
    }
    return NextResponse.json({ data: results });
  } catch (error) {
    const e = error as Error & { status?: number };
    return NextResponse.json({ error: e?.message ?? "Upload failed" }, { status: e?.status ?? 400 });
  }
}
