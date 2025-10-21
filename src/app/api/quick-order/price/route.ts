import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { priceQuickOrder } from "@/server/services/quick-order";
import { fail } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    await requireUser(req);
    const body = await req.json();
    const items = body?.items ?? [];
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items" }, { status: 400 });
    }
    const location = body?.location ?? {};
    const priced = await priceQuickOrder(items, {
      state: typeof location?.state === "string" ? location.state : undefined,
      postcode: typeof location?.postcode === "string" ? location.postcode : undefined,
    });
    return NextResponse.json({ data: priced });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'quick-order.price', error: error as Error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
