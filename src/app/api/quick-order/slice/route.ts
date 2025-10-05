import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { resolveTmpPath, saveTmpFile } from "@/server/files/tmp";
import { sliceFileWithCli } from "@/server/slicer/runner";
import path from "path";
import { promises as fsp } from "fs";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await requireUser(req);
    const body = await req.json();
    const items: { id: string; layerHeight: number; infill: number; supports?: boolean }[] = body?.files ?? [];
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }
    const results: Array<{ id: string; timeSec: number; grams: number; gcodeId?: string; fallback: boolean }> = [];
    for (const it of items) {
      try {
        const src = resolveTmpPath(it.id);
        const metrics = await sliceFileWithCli(src, {
          layerHeight: it.layerHeight,
          infill: it.infill,
          supports: Boolean(it.supports),
        });
        let gcodeId: string | undefined;
        if (metrics.gcodePath) {
          const buf = await fsp.readFile(metrics.gcodePath);
          const userKey = it.id.split("/")[0] ?? "u";
          const saved = await saveTmpFile(userKey, path.basename(metrics.gcodePath), buf);
          gcodeId = saved.tmpId;
        }
        results.push({ id: it.id, timeSec: metrics.timeSec, grams: metrics.grams, gcodeId, fallback: metrics.fallback ?? false });
      } catch {
        results.push({ id: it.id, timeSec: 3600, grams: 80, gcodeId: undefined, fallback: true });
      }
    }
    return NextResponse.json({ data: results });
  } catch (error) {
    const e = error as Error & { status?: number };
    return NextResponse.json({ error: e?.message ?? "Slice failed" }, { status: e?.status ?? 400 });
  }
}
