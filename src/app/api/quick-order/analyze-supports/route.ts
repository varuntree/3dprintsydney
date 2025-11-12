import { NextRequest } from "next/server";
import * as THREE from "three";

import { requireAuth } from "@/server/auth/api-helpers";
import { okAuth, failAuth } from "@/server/api/respond";
import { requireTmpFile, downloadTmpFileToBuffer } from "@/server/services/tmp-files";
import { loadGeometryFromModel } from "@/server/geometry/load-geometry";
import { detectOverhangs } from "@/lib/3d/overhang-detector";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

interface AnalyzeSupportsBody {
  fileId: string;
  quaternion: [number, number, number, number];
  supportSettings?: {
    enabled: boolean;
    angle: number;
    style: string;
  };
}

const DEFAULT_SUPPORT_ANGLE = 45;
const MIN_ESTIMATED_TIME_SEC = 60;
const TIME_SEC_PER_CUBIC_MM = 6;

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = (await request.json()) as AnalyzeSupportsBody | null;

    if (!body || typeof body.fileId !== "string" || !Array.isArray(body.quaternion)) {
      return failAuth(request, "VALIDATION_ERROR", "fileId and quaternion are required", 422);
    }
    if (body.quaternion.length !== 4 || body.quaternion.some((value) => typeof value !== "number")) {
      return failAuth(request, "VALIDATION_ERROR", "Quaternion must be an array of four numbers", 422);
    }

    const record = await requireTmpFile(user.id, body.fileId);
    const buffer = await downloadTmpFileToBuffer(body.fileId);
    let geometry: THREE.BufferGeometry;
    try {
      geometry = loadGeometryFromModel(buffer, record.filename);
    } catch (parseError) {
      return failAuth(request, "UNSUPPORTED_MODEL", (parseError as Error).message, 422);
    }

    const quaternion = new THREE.Quaternion(...body.quaternion).normalize();
    const threshold = typeof body.supportSettings?.angle === "number" ? body.supportSettings.angle : DEFAULT_SUPPORT_ANGLE;
    const analysis = detectOverhangs(geometry, quaternion, threshold);

    const estimatedTime = Math.max(
      MIN_ESTIMATED_TIME_SEC,
      Math.round(analysis.supportVolume * TIME_SEC_PER_CUBIC_MM)
    );

    return okAuth(request, {
      overhangFaces: analysis.overhangFaceIndices,
      supportVolume: analysis.supportVolume,
      supportWeight: analysis.supportWeight,
      contactArea: analysis.contactArea,
      estimatedTime,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return failAuth(request, error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: "quick-order.analyze-supports", error });
    return failAuth(request, "INTERNAL_ERROR", "Failed to analyze supports", 500);
  }
}
