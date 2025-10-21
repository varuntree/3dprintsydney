import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { saveTmpFile, requireTmpFile } from "@/server/services/tmp-files";
import { logger } from "@/lib/logger";
import { fail } from "@/server/api/respond";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

/**
 * POST /api/quick-order/orient
 *
 * Saves an oriented STL file after client-side transformation
 * Replaces or creates new tmp file with oriented geometry
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const formData = await req.formData();

    const fileId = formData.get("fileId") as string;
    const orientedSTL = formData.get("orientedSTL") as File;

    // Validation
    if (!fileId || !orientedSTL) {
      return NextResponse.json(
        { error: "Missing required fields: fileId and orientedSTL" },
        { status: 400 }
      );
    }

    // Verify original file exists and belongs to user
    try {
      await requireTmpFile(user.id, fileId);
    } catch (error) {
      if (error instanceof AppError) {
        return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
      }
      logger.error({ scope: 'quick-order.orient', error: error as Error });
      return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
    }

    // Save oriented STL as new tmp file
    const buffer = Buffer.from(await orientedSTL.arrayBuffer());
    const filename = orientedSTL.name || "oriented.stl";

    const { record, tmpId } = await saveTmpFile(
      user.id,
      filename,
      buffer,
      orientedSTL.type || "application/octet-stream",
    );

    logger.info({
      scope: "quick-order.orient",
      data: {
        originalFileId: fileId,
        newFileId: tmpId,
        originalSize: null, // Could fetch if needed
        orientedSize: record.size_bytes,
        userId: user.id,
      },
    });

    return NextResponse.json({
      data: {
        success: true,
        newFileId: tmpId,
        filename: record.filename,
        size: record.size_bytes,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'quick-order.orient', error: error as Error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
