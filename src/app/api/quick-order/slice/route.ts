import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import {
  saveTmpFile,
  requireTmpFile,
  updateTmpFile,
  downloadTmpFileToBuffer,
  type TmpFileMetadata,
} from "@/server/services/tmp-files";
import { sliceFileWithCli } from "@/server/slicer/runner";
import path from "path";
import { promises as fsp } from "fs";
import { logger } from "@/lib/logger";
import os from "os";
import { ok, fail } from "@/server/api/respond";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

/**
 * POST /api/quick-order/slice
 *
 * Processes a single file per request. Keeps things simple and reliable for
 * the small business use case while still surfacing detailed progress/errors.
 */
export async function POST(req: NextRequest) {
  let tmpDir: string | null = null;
  let baseMeta: TmpFileMetadata = {};
  let attempts = 1;
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const item = body?.file;
    if (!item || typeof item.id !== "string") {
      return fail("NO_FILE", "No file provided", 400);
    }
    const fileUserKey = item.id.split("/")[0];
    if (fileUserKey !== String(user.id)) {
      return fail("UNAUTHORIZED", "Unauthorized", 403);
    }

    const supports = item.supports ?? { enabled: true, pattern: "normal", angle: 45 };

    const record = await requireTmpFile(user.id, item.id);
    baseMeta = (record.metadata ?? {}) as Record<string, unknown>;
    attempts = typeof baseMeta.attempts === "number" ? (baseMeta.attempts as number) + 1 : 1;

    await updateTmpFile(user.id, item.id, {
      status: "running",
      metadata: {
        ...baseMeta,
        attempts,
        settings: {
          layerHeight: item.layerHeight,
          infill: item.infill,
          supports,
        },
        fallback: false,
        error: null,
      },
    });

    const buffer = await downloadTmpFileToBuffer(item.id);
    tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "slice-"));
    const src = path.join(tmpDir, path.basename(item.id) || `input-${Date.now()}.stl`);
    await fsp.writeFile(src, buffer);

    const maxAttempts = 2;
    let attempt = 0;
    let lastError: Error & { stderr?: string } | null = null;
    let metrics: { timeSec: number; grams: number; gcodePath?: string } | null = null;

    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        const result = await sliceFileWithCli(src, {
          layerHeight: Number(item.layerHeight),
          infill: Number(item.infill),
          supports: {
            enabled: Boolean(supports.enabled),
            angle: supports?.angle ?? 45,
            pattern: supports?.pattern === "tree" ? "tree" : "normal",
          },
        });
        metrics = result;
        lastError = null;
        break;
      } catch (error) {
        lastError = error as Error & { stderr?: string };
        logger.error({
          scope: "quick-order.slice",
          message: "Slicer run failed",
          data: {
            tmpId: item.id,
            attempt,
            layerHeight: item.layerHeight,
            infill: item.infill,
            supports,
          },
          error: lastError.stderr || lastError.message,
        });
        if (attempt >= maxAttempts) {
          break;
        }
      }
    }

    if (!metrics) {
      const fallbackMetrics = {
        id: item.id,
        timeSec: 3600,
        grams: 80,
        gcodeId: undefined as string | undefined,
        fallback: true,
        error: lastError?.stderr || lastError?.message || "Slicer failed",
      };
      await updateTmpFile(user.id, item.id, {
        status: "failed",
        metadata: {
          ...baseMeta,
          attempts,
          settings: {
            layerHeight: item.layerHeight,
            infill: item.infill,
            supports,
          },
          metrics: { timeSec: fallbackMetrics.timeSec, grams: fallbackMetrics.grams },
          fallback: true,
          error: fallbackMetrics.error,
        },
      });
      if (tmpDir) {
        await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
      }
      return ok(fallbackMetrics);
    }

    let gcodeId: string | undefined;
    if (metrics.gcodePath) {
      const buf = await fsp.readFile(metrics.gcodePath);
      const { tmpId } = await saveTmpFile(
        Number(fileUserKey),
        path.basename(metrics.gcodePath),
        buf,
        "text/plain",
        {
          derivedFrom: item.id,
          type: "gcode",
        },
      );
      gcodeId = tmpId;
    }

    await updateTmpFile(user.id, item.id, {
      status: "completed",
      metadata: {
        ...baseMeta,
        attempts,
        settings: {
          layerHeight: item.layerHeight,
          infill: item.infill,
          supports,
        },
        metrics: { timeSec: metrics.timeSec, grams: metrics.grams },
        fallback: false,
        error: null,
        output: gcodeId ?? null,
      },
    });

    if (tmpDir) {
      await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    }

    return ok({
      id: item.id,
      timeSec: metrics.timeSec,
      grams: metrics.grams,
      gcodeId,
      fallback: false,
    });
  } catch (error) {
    if (tmpDir) {
      await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    }
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'quick-order.slice', error: error as Error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
