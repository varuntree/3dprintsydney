import {
  requireTmpFile,
  saveTmpFile,
  updateTmpFile,
  type OrientationData,
} from "@/server/services/tmp-files";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";

type OrientationSnapshotInput = {
  quaternion: [number, number, number, number];
  position: [number, number, number];
  autoOriented?: boolean;
  supportVolume?: number;
  supportWeight?: number;
};

function ensureFiniteTuple(
  tuple: number[],
  expectedLength: number,
  label: string
): number[] {
  if (!Array.isArray(tuple) || tuple.length !== expectedLength) {
    throw new AppError(`Orientation ${label} must contain ${expectedLength} values`, "VALIDATION_ERROR", 422);
  }
  const normalized = tuple.map((value, index) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new AppError(
        `Orientation ${label}[${index}] must be a finite number`,
        "VALIDATION_ERROR",
        422
      );
    }
    return value;
  });
  return normalized;
}

/**
 * Process and save an oriented STL file
 * @param fileId - Original file ID
 * @param orientedFile - The oriented file data
 * @param userId - User ID
 * @returns New file information
 */
export async function processOrientedFile(
  fileId: string,
  orientedFile: { buffer: Buffer; filename: string; mimeType: string },
  userId: number,
): Promise<{
  success: true;
  newFileId: string;
  filename: string;
  size: number;
}> {
  // Verify original file exists and belongs to user
  await requireTmpFile(userId, fileId);

  // Save oriented STL as new tmp file
  const { record, tmpId } = await saveTmpFile(
    userId,
    orientedFile.filename,
    orientedFile.buffer,
    orientedFile.mimeType,
  );

  logger.info({
    scope: "quick-order.orient",
    data: {
      originalFileId: fileId,
      newFileId: tmpId,
      orientedSize: record.size_bytes,
      userId,
    },
  });

  return {
    success: true,
    newFileId: tmpId,
    filename: record.filename,
    size: record.size_bytes,
  };
}

/**
 * Persist the orientation snapshot for an uploaded tmp file
 * @param fileId - Tmp file identifier
 * @param orientation - Orientation snapshot captured from the client
 * @param userId - Authenticated user identifier
 * @returns Persisted orientation payload
 */
export async function saveOrientationSnapshot(
  fileId: string,
  orientation: OrientationSnapshotInput,
  userId: number,
): Promise<{
  success: true;
  fileId: string;
  filename: string;
  size: number;
  orientation: OrientationData;
}> {
  const quaternion = ensureFiniteTuple([...orientation.quaternion], 4, "quaternion") as OrientationData["quaternion"];
  const position = ensureFiniteTuple([...orientation.position], 3, "position") as OrientationData["position"];
  const normalized: OrientationData = {
    quaternion,
    position,
    autoOriented: orientation.autoOriented ?? false,
    supportVolume:
      typeof orientation.supportVolume === "number" && Number.isFinite(orientation.supportVolume)
        ? orientation.supportVolume
        : undefined,
    supportWeight:
      typeof orientation.supportWeight === "number" && Number.isFinite(orientation.supportWeight)
        ? orientation.supportWeight
        : undefined,
  };

  const record = await updateTmpFile(userId, fileId, { orientationData: normalized });

  logger.info({
    scope: "quick-order.orient",
    message: "Orientation snapshot saved",
    data: { fileId, userId },
  });

  return {
    success: true,
    fileId,
    filename: record.filename,
    size: record.size_bytes,
    orientation: normalized,
  };
}
