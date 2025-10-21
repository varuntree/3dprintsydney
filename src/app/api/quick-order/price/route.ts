import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/api-helpers";
import { priceQuickOrder } from "@/server/services/quick-order";
import { ok, fail } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const body = await req.json();
    const items = body?.items ?? [];
    if (!Array.isArray(items) || items.length === 0) {
      return fail("NO_ITEMS", "No items", 400);
    }
    const location = body?.location ?? {};
    const priced = await priceQuickOrder(items, {
      state: typeof location?.state === "string" ? location.state : undefined,
      postcode: typeof location?.postcode === "string" ? location.postcode : undefined,
    });
    return ok(priced);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'quick-order.price', message: 'Price calculation failed', error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
