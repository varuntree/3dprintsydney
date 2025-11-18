import {
  requireTmpFile,
  downloadTmpFileToBuffer,
  saveTmpFile,
  updateTmpFile,
  type TmpFileMetadata,
} from "@/server/services/tmp-files";
import { sliceFileWithCli } from "@/server/slicer/runner";
import { applyOrientationToModel } from "@/server/geometry/orient";
import { logger } from "@/lib/logger";
import path from "path";
import { promises as fsp } from "fs";
import os from "os";

type SupportSettingsInput = {
  enabled?: boolean;
  pattern?: "normal" | "tree";
  angle?: number;
  style?: "grid" | "organic";
  interfaceLayers?: number;
};

function normalizeSupportSettings(input?: SupportSettingsInput) {
  const pattern: "normal" | "tree" = input?.pattern === "tree" ? "tree" : "normal";
  const style: "grid" | "organic" = input?.style ?? (pattern === "tree" ? "organic" : "grid");
  const interfaceLayers =
    typeof input?.interfaceLayers === "number" && Number.isFinite(input.interfaceLayers)
      ? input.interfaceLayers
      : 3;
  const angle =
    typeof input?.angle === "number" && Number.isFinite(input.angle)
      ? input.angle
      : 45;
  return {
    enabled: input?.enabled ?? true,
    pattern,
    angle,
    style,
    interfaceLayers,
  };
}

/**
 * Generate fallback metrics when slicing fails
 * @param fileId - The file ID that failed
 * @param error - The error that occurred
 * @returns Fallback metrics object
 */
export function generateFallbackMetrics(
  fileId: string,
  error: Error & { stderr?: string } | null,
) {
  return {
    id: fileId,
    timeSec: 3600,
    grams: 80,
    supportGrams: 0,
    gcodeId: undefined as string | undefined,
    fallback: true,
    error: error?.stderr || error?.message || "Slicer failed",
  };
}

/**
 * Execute slicing with retry logic
 * @param srcPath - Path to the source file
 * @param settings - Slicing settings
 * @param maxAttempts - Maximum number of attempts
 * @returns Slicing metrics or null if failed
 */
export async function executeSlicingWithRetry(
  srcPath: string,
  settings: {
    layerHeight: number;
    infill: number;
    supports: {
      enabled: boolean;
      angle: number;
      pattern: "normal" | "tree";
      style: "grid" | "organic";
      interfaceLayers: number;
    };
  },
  maxAttempts = 2,
): Promise<{ timeSec: number; grams: number; supportGrams: number; gcodePath?: string } | null> {
  let attempt = 0;
  let lastError: Error & { stderr?: string } | null = null;
  let metrics: { timeSec: number; grams: number; supportGrams: number; gcodePath?: string } | null = null;
  const normalizedSupports = normalizeSupportSettings(settings.supports);

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const result = await sliceFileWithCli(srcPath, {
        layerHeight: Number(settings.layerHeight),
        infill: Number(settings.infill),
        supports: normalizedSupports,
      });
      metrics = result;
      lastError = null;
      break;
    } catch (error) {
      lastError = error as Error & { stderr?: string };
      logger.warn({
        scope: "quick-order.slice.retry",
        message: "Slicer attempt failed",
        data: {
          attempt,
          layerHeight: settings.layerHeight,
          infill: settings.infill,
          supports: normalizedSupports,
        },
        error: lastError.stderr || lastError.message,
      });
      if (attempt >= maxAttempts) {
        break;
      }
    }
  }

  return metrics;
}

/**
 * Slice a quick order file with retry and fallback logic
 * @param fileId - The file ID to slice
 * @param userId - User ID
 * @param settings - Slicing settings (item from request)
 * @returns Slicing result with metrics and gcode ID
 */
export async function sliceQuickOrderFile(
  fileId: string,
  userId: number,
  settings: {
    layerHeight: number;
    infill: number;
    supports: {
      enabled: boolean;
      pattern: "normal" | "tree";
      angle: number;
      style?: "grid" | "organic";
      interfaceLayers?: number;
    };
  },
): Promise<{
  id: string;
  timeSec: number;
  grams: number;
  supportGrams: number;
  gcodeId?: string;
  fallback: boolean;
  error?: string;
}> {
  const scope = "quick-order.slice";
  const startTime = Date.now();
  let attempts = 1;
  let tmpDir: string | null = null;
  const normalizedSupports = normalizeSupportSettings(settings.supports);
  const slicingSettings = { ...settings, supports: normalizedSupports };
  try {
    const record = await requireTmpFile(userId, fileId);
    const baseMeta = (record.metadata ?? {}) as TmpFileMetadata;
    attempts = typeof baseMeta.attempts === "number" ? (baseMeta.attempts as number) + 1 : 1;

    logger.info({
      scope,
      message: "Quick order slicing started",
      data: {
        fileId,
        userId,
        attempts,
        settings: slicingSettings,
      },
    });

    // Update status to running
    await updateTmpFile(userId, fileId, {
      status: "running",
      metadata: {
        ...baseMeta,
        attempts,
        settings: {
          layerHeight: settings.layerHeight,
          infill: settings.infill,
          supports: normalizedSupports,
        },
        fallback: false,
        error: null,
      },
    });

    // Download and prepare file
    const buffer = await downloadTmpFileToBuffer(fileId);
    tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "slice-"));
    let sourceBuffer = buffer;
    let sourceFilename = record.filename;
    if (record.orientation_data) {
      try {
        const oriented = applyOrientationToModel(buffer, record.filename, record.orientation_data);
        sourceBuffer = oriented.buffer;
        sourceFilename = oriented.filename;
        logger.info({
          scope: "quick-order.slice.orientation",
          message: "Applied orientation snapshot",
          data: { fileId, userId, filename: sourceFilename },
        });
      } catch (error) {
        logger.error({
          scope: "quick-order.slice.orientation",
          message: "Failed to apply orientation snapshot",
          error,
          data: { fileId, userId },
        });
      }
    }
    const baseName = path.basename(sourceFilename || `input-${Date.now()}.stl`);
    const fileNameWithExt = path.extname(baseName) ? baseName : `${baseName}.stl`;
    const src = path.join(tmpDir, fileNameWithExt);
    await fsp.writeFile(src, sourceBuffer);

    // Execute slicing with retry
    const metrics = await executeSlicingWithRetry(src, slicingSettings);

    // Handle failure with fallback
    if (!metrics) {
      const fallbackMetrics = generateFallbackMetrics(fileId, null);
      logger.warn({
        scope: "quick-order.slice.fallback",
        message: "Fallback slicing metrics applied",
        data: { fileId, attempts, error: fallbackMetrics.error },
      });
      await updateTmpFile(userId, fileId, {
        status: "failed",
        metadata: {
          ...baseMeta,
          attempts,
          settings: {
            layerHeight: settings.layerHeight,
            infill: settings.infill,
            supports: normalizedSupports,
          },
          metrics: {
            timeSec: fallbackMetrics.timeSec,
            grams: fallbackMetrics.grams,
            supportGrams: fallbackMetrics.supportGrams,
          },
          fallback: true,
          error: fallbackMetrics.error,
        },
      });
      if (tmpDir) {
        await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
      }
      return fallbackMetrics;
    }

    // Save gcode file if available
    let gcodeId: string | undefined;
    if (metrics.gcodePath) {
      const buf = await fsp.readFile(metrics.gcodePath);
      const fileUserKey = fileId.split("/")[0];
      const { tmpId } = await saveTmpFile(
        Number(fileUserKey),
        path.basename(metrics.gcodePath),
        buf,
        "text/plain",
        {
          derivedFrom: fileId,
          type: "gcode",
        },
      );
      gcodeId = tmpId;
    }

    // Update status to completed
    await updateTmpFile(userId, fileId, {
      status: "completed",
      metadata: {
        ...baseMeta,
        attempts,
        settings: {
          layerHeight: settings.layerHeight,
          infill: settings.infill,
          supports: normalizedSupports,
        },
        metrics: { timeSec: metrics.timeSec, grams: metrics.grams, supportGrams: metrics.supportGrams },
        fallback: false,
        error: null,
        output: gcodeId ?? null,
      },
    });

    // Cleanup temp directory
    if (tmpDir) {
      await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    }

    logger.timing(scope, startTime, {
      message: "Quick order slicing completed",
      data: {
        fileId,
        userId,
        attempts,
        timeSec: metrics.timeSec,
        grams: metrics.grams,
        supportGrams: metrics.supportGrams,
        gcodeId: gcodeId ?? null,
      },
    });

    return {
      id: fileId,
      timeSec: metrics.timeSec,
      grams: metrics.grams,
      supportGrams: metrics.supportGrams,
      gcodeId,
      fallback: false,
    };
  } catch (error) {
    logger.error({
      scope,
      message: "Quick order slicing failed",
      error,
      data: { fileId, userId, attempts },
    });
    if (tmpDir) {
      await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    }
    throw error;
  }
}
