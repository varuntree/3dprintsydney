import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/api-helpers";
import { sliceQuickOrderFile } from "@/server/services/quick-order";
import { okAuth, failAuth } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * POST /api/quick-order/slice
 *
 * Processes a single file per request. Keeps things simple and reliable for
 * the small business use case while still surfacing detailed progress/errors.
 * Delegates business logic to sliceQuickOrderFile service function
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const item = body?.file;

    if (!item || typeof item.id !== "string") {
      return failAuth(request, "NO_FILE", "No file provided", 400);
    }

    const fileUserKey = item.id.split("/")[0];
    if (fileUserKey !== String(user.id)) {
      return failAuth(request, "UNAUTHORIZED", "Unauthorized", 403);
    }

    const supports = item.supports ?? {
      enabled: true,
      pattern: "normal" as const,
      angle: 45,
    };

    // Delegate business logic to service
    const result = await sliceQuickOrderFile(String(item.id), user.id, {
      layerHeight: item.layerHeight,
      infill: item.infill,
      supports: {
        enabled: Boolean(supports.enabled),
        angle: supports.angle ?? 45,
        pattern: supports.pattern === "tree" ? "tree" : "normal",
      },
    });

    return okAuth(request, result);
  } catch (error) {
    if (error instanceof AppError) {
      return failAuth(request, 
        error.code,
        error.message,
        error.status,
        error.details as Record<string, unknown> | undefined,
      );
    }
    logger.error({ scope: "quick-order.slice", message: 'Slicing failed', error });
    return failAuth(request, "INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
}
