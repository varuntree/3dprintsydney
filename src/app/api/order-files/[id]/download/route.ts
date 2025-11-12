import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/api-helpers";
import {
  getOrderFile,
  downloadOrderFileToBuffer,
  downloadOrderFileWithOrientation,
} from "@/server/services/order-files";
import { failAuth } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { parseNumericId } from "@/lib/utils/api-params";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id: rawId } = await params;
    const fileId = parseNumericId(rawId);
    const mode = request.nextUrl.searchParams.get("mode") ?? "original";

    const file = await getOrderFile(fileId);
    if (user.role !== "ADMIN" && user.clientId !== file.client_id) {
      return failAuth(request, "FORBIDDEN", "Forbidden", 403);
    }

    const shouldApplyOrientation = mode === "oriented";
    const { buffer, filename, mimeType, orientationApplied } = shouldApplyOrientation
      ? await downloadOrderFileWithOrientation(fileId, { applyOrientation: true })
      : { buffer: await downloadOrderFileToBuffer(fileId), filename: file.filename, mimeType: file.mime_type, orientationApplied: false };

    const payload = new Uint8Array(buffer);
    const response = new NextResponse(payload, {
      headers: {
        "Content-Type": mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${orientationApplied ? filename : file.filename}"`,
      },
    });
    return response;
  } catch (error) {
    if (error instanceof AppError) {
      return failAuth(request, error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: "order-files.download", message: "Download failed", error });
    return failAuth(request, "INTERNAL_ERROR", "Failed to download file", 500);
  }
}
