import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/api-helpers";
import { getOrderFile, getOrderFileDownloadUrl } from "@/server/services/order-files";
import { okAuth, failAuth } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { parseNumericId } from "@/lib/utils/api-params";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const resolvedParams = await params;

    let fileId: number;
    try {
      fileId = parseNumericId(resolvedParams.id);
    } catch {
      return failAuth(request, "VALIDATION_ERROR", "Invalid file ID", 400);
    }

    // Get file record
    const file = await getOrderFile(fileId);

    // Authorization check: Admin can access all files, clients can only access their own
    if (user.role !== "ADMIN" && user.clientId !== file.client_id) {
      return failAuth(request, "FORBIDDEN", "Forbidden", 403);
    }

    // Get signed download URL (expires in 5 minutes)
    const downloadUrl = await getOrderFileDownloadUrl(fileId, 300);

    return okAuth(request, {
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
      return failAuth(request, error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'order-files.get', message: 'Order file retrieval failed', error });
    return failAuth(request, 'INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
