import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/api-helpers";
import { processOrientedFile, saveOrientationSnapshot } from "@/server/services/quick-order";
import { okAuth, failAuth } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { OrientationData } from "@/server/services/tmp-files";

export const runtime = "nodejs";

/**
 * POST /api/quick-order/orient
 *
 * Supports two payloads:
 *  - JSON orientation snapshots `{ originalFileId, quaternion, position, autoOriented? }`
 *    which persist orientation metadata for the existing tmp file.
 *  - Multipart uploads containing an `orientedSTL` file for legacy flows where the
 *    client bakes the orientation into a new mesh before upload.
 */
function parseNumberTuple(value: unknown, expectedLength: number): number[] | null {
  if (!Array.isArray(value) || value.length !== expectedLength) {
    return null;
  }
  const parsed = value.map((entry) => {
    if (typeof entry === "number" && Number.isFinite(entry)) {
      return entry;
    }
    if (typeof entry === "string" && entry.trim() !== "") {
      const numeric = Number(entry);
      if (Number.isFinite(numeric)) {
        return numeric;
      }
    }
    return null;
  });
  if (parsed.some((num) => num === null)) {
    return null;
  }
  return parsed as number[];
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function parseOrientationPayload(body: Record<string, unknown>):
  | { fileId: string; orientation: OrientationData }
  | null {
  const rawId =
    typeof body.originalFileId === "string"
      ? body.originalFileId
      : typeof body.fileId === "string"
      ? body.fileId
      : null;
  const quaternion = parseNumberTuple(body.quaternion, 4);
  const position = parseNumberTuple(body.position, 3);

  if (!rawId || !quaternion || !position) {
    return null;
  }

  const orientation: OrientationData = {
    quaternion: quaternion as OrientationData["quaternion"],
    position: position as OrientationData["position"],
    autoOriented: Boolean(body.autoOriented),
  };

  const supportVolume = parseOptionalNumber(body.supportVolume);
  const supportWeight = parseOptionalNumber(body.supportWeight);
  if (supportVolume !== undefined) {
    orientation.supportVolume = supportVolume;
  }
  if (supportWeight !== undefined) {
    orientation.supportWeight = supportWeight;
  }

  return { fileId: rawId, orientation };
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as Record<string, unknown>;
      const parsed = parseOrientationPayload(body);

      if (!parsed) {
        return failAuth(request,
          "VALIDATION_ERROR",
          "Invalid orientation payload",
          422,
        );
      }

      const result = await saveOrientationSnapshot(parsed.fileId, parsed.orientation, user.id);
      return okAuth(request, result);
    }

    if (
      contentType.includes("multipart/form-data") ||
      contentType.includes("application/x-www-form-urlencoded")
    ) {
      const formData = await request.formData();
      const fileId = formData.get("fileId") as string;
      const orientedSTL = formData.get("orientedSTL") as File;

      if (!fileId || !orientedSTL) {
        return failAuth(request,
          "VALIDATION_ERROR",
          "Missing required fields: fileId and orientedSTL",
          422,
        );
      }

      const buffer = Buffer.from(await orientedSTL.arrayBuffer());
      const filename = orientedSTL.name || "oriented.stl";
      const mimeType = orientedSTL.type || "application/octet-stream";

      const result = await processOrientedFile(
        fileId,
        { buffer, filename, mimeType },
        user.id,
      );

      return okAuth(request, result);
    }

    return failAuth(request,
      "UNSUPPORTED_MEDIA_TYPE",
      "Content-Type must be application/json or multipart form data",
      415,
    );
  } catch (error) {
    if (error instanceof AppError) {
      return failAuth(request,
        error.code,
        error.message,
        error.status,
        error.details as Record<string, unknown> | undefined,
      );
    }
    logger.error({ scope: "quick-order.orient", message: 'Orientation failed', error });
    return failAuth(request, "INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
}
