import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/api-helpers";
import { saveTmpFile } from "@/server/services/tmp-files";
import { okAuth, failAuth } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { validateOrderFile } from "@/lib/utils/validators";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const form = await req.formData();
    const entries = form.getAll("files");
    if (!entries.length) {
      return failAuth(req, "NO_FILES", "No files", 400);
    }
    const results: Array<{ id: string; filename: string; size: number; type: string }> = [];
    for (const entry of entries) {
      if (!(entry instanceof File)) continue;
      const name = entry.name || "upload.stl";

      // Validate file using utility function
      try {
        validateOrderFile({ size: entry.size, type: entry.type, name });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid file";
        return failAuth(req, "VALIDATION_ERROR", message, 400);
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
    return okAuth(req, results);
  } catch (error) {
    if (error instanceof AppError) {
      return failAuth(req, error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'quick-order.upload', message: 'File upload failed', error });
    return failAuth(req, 'INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
