import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/api-helpers";
import { saveTmpFile } from "@/server/services/tmp-files";
import { okAuth, failAuth } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { validateOrderFile } from "@/lib/utils/validators";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let userId: number | null = null;
  try {
    const user = await requireAuth(request);
    userId = user.id;
    const form = await request.formData();
    const entries = form.getAll("files");
    if (!entries.length) {
      logger.warn({
        scope: "quick-order.upload",
        message: "Upload rejected: no files provided",
        data: { userId: user.id },
      });
      return failAuth(request, "NO_FILES", "No files", 400);
    }
    const results: Array<{ id: string; filename: string; size: number; type: string }> = [];
    for (const entry of entries) {
      if (!(entry instanceof File)) {
        logger.warn({
          scope: "quick-order.upload",
          message: "Non-file entry encountered in upload form data",
          data: { userId: user.id, entryType: typeof entry },
        });
        continue;
      }
      const name = entry.name || "upload.stl";

      // Validate file using utility function
      try {
        validateOrderFile({ size: entry.size, type: entry.type, name });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid file";
        logger.warn({
          scope: "quick-order.upload",
          message: "Validation failed for uploaded file",
          data: {
            userId: user.id,
            filename: name,
            size: entry.size,
            type: entry.type || "unset",
          },
          error: message,
        });
        return failAuth(request, "VALIDATION_ERROR", message, 400);
      }

      const buf = Buffer.from(await entry.arrayBuffer());
      const { record, tmpId } = await saveTmpFile(
        user.id,
        name,
        buf,
        entry.type || "application/octet-stream",
      );
      logger.info({
        scope: "quick-order.upload",
        message: "Uploaded tmp file",
        data: { userId: user.id, tmpId, filename: name, size: entry.size, type: entry.type || "unset" },
      });
      results.push({
        id: tmpId,
        filename: record.filename,
        size: record.size_bytes,
        type: record.mime_type || "application/octet-stream",
      });
    }
    return okAuth(request, results);
  } catch (error) {
    if (error instanceof AppError) {
      logger.error({
        scope: "quick-order.upload",
        message: "Handled error during upload",
        data: { userId },
        error,
      });
      return failAuth(request, error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    const fallbackMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    logger.error({
      scope: 'quick-order.upload',
      message: 'File upload failed with unexpected error',
      data: { userId },
      error,
    });
    return failAuth(request, 'INTERNAL_ERROR', fallbackMessage, 500);
  }
}
