import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { processOrientedFile } from "@/server/services/quick-order";
import { ok, fail } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * POST /api/quick-order/orient
 *
 * Saves an oriented STL file after client-side transformation
 * Replaces or creates new tmp file with oriented geometry
 * Delegates business logic to processOrientedFile service function
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const formData = await req.formData();

    const fileId = formData.get("fileId") as string;
    const orientedSTL = formData.get("orientedSTL") as File;

    // Validation
    if (!fileId || !orientedSTL) {
      return fail(
        "VALIDATION_ERROR",
        "Missing required fields: fileId and orientedSTL",
        422,
      );
    }

    // Prepare file data
    const buffer = Buffer.from(await orientedSTL.arrayBuffer());
    const filename = orientedSTL.name || "oriented.stl";
    const mimeType = orientedSTL.type || "application/octet-stream";

    // Delegate business logic to service
    const result = await processOrientedFile(
      fileId,
      { buffer, filename, mimeType },
      user.id,
    );

    return ok(result);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(
        error.code,
        error.message,
        error.status,
        error.details as Record<string, unknown> | undefined,
      );
    }
    logger.error({ scope: "quick-order.orient", error: error as Error });
    return fail("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
}
