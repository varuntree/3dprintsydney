import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { resolveTmpPath, saveTmpFile } from "@/server/files/tmp";
import { sliceFileWithCli } from "@/server/slicer/runner";
import path from "path";
import { promises as fsp } from "fs";

export const runtime = "nodejs";

/**
 * POST /api/quick-order/slice
 *
 * Slices multiple 3D model files in parallel for performance
 * Uses Promise.all to process all files concurrently
 */
export async function POST(req: NextRequest) {
  try {
    await requireUser(req);
    const body = await req.json();
    const items: { id: string; layerHeight: number; infill: number; supports?: boolean }[] = body?.files ?? [];
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // OPTIMIZATION: Slice all files in parallel using Promise.all
    // This dramatically improves performance when processing multiple files
    const slicePromises = items.map(async (it) => {
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

        return {
          id: it.id,
          timeSec: metrics.timeSec,
          grams: metrics.grams,
          gcodeId,
          fallback: metrics.fallback ?? false,
        };
      } catch (error) {
        // Return fallback metrics for failed slices
        console.error(`[Slice] Failed to slice ${it.id}:`, error);
        return {
          id: it.id,
          timeSec: 3600,
          grams: 80,
          gcodeId: undefined,
          fallback: true,
        };
      }
    });

    // Wait for all slicing operations to complete
    const results = await Promise.all(slicePromises);

    return NextResponse.json({ data: results });
  } catch (error) {
    const e = error as Error & { status?: number };
    return NextResponse.json({ error: e?.message ?? "Slice failed" }, { status: e?.status ?? 400 });
  }
}
