import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { getOrderFile, getOrderFileDownloadUrl } from "@/server/services/order-files";
import { ok, fail } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(request);
    const resolvedParams = await params;
    const fileId = parseInt(resolvedParams.id, 10);

    if (isNaN(fileId)) {
      return fail("VALIDATION_ERROR", "Invalid file ID", 400);
    }

    // Get file record
    const file = await getOrderFile(fileId);

    // Authorization check: Admin can access all files, clients can only access their own
    if (user.role !== "ADMIN" && user.clientId !== file.client_id) {
      return fail("FORBIDDEN", "Forbidden", 403);
    }

    // Get signed download URL (expires in 5 minutes)
    const downloadUrl = await getOrderFileDownloadUrl(fileId, 300);

    return ok({
      id: file.id,
      filename: file.filename,
      fileType: file.file_type,
      mimeType: file.mime_type,
      sizeBytes: file.size_bytes,
      downloadUrl,
      metadata: file.metadata,
      uploadedAt: file.uploaded_at,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'order-files.get', error: error as Error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
