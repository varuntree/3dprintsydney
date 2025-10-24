import { NextRequest } from "next/server";
import type { DiscountType } from "@/lib/calculations";
import { requireAuth } from "@/server/auth/api-helpers";
import { priceQuickOrder } from "@/server/services/quick-order";
import { coerceStudentDiscount, getClientStudentDiscount } from "@/server/services/student-discount";
import { ok, fail } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const items = body?.items ?? [];
    if (!Array.isArray(items) || items.length === 0) {
      return fail("NO_ITEMS", "No items", 400);
    }
    const location = body?.location ?? {};
    let discountType: DiscountType = "NONE";
    let discountValue = 0;
    let studentDiscountEligible = false;
    let studentDiscountRate = 0;
    if (user.role === "CLIENT" && user.clientId) {
      const studentDiscount = await getClientStudentDiscount(user.clientId);
      studentDiscountEligible = studentDiscount.eligible;
      studentDiscountRate = studentDiscount.rate;
      const coerced = coerceStudentDiscount(studentDiscount);
      discountType = coerced.discountType;
      discountValue = coerced.discountValue;
    }
    const priced = await priceQuickOrder(items, {
      state: typeof location?.state === "string" ? location.state : undefined,
      postcode: typeof location?.postcode === "string" ? location.postcode : undefined,
    }, { discountType, discountValue });
    return ok({
      ...priced,
      studentDiscountEligible,
      studentDiscountRate,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'quick-order.price', message: 'Price calculation failed', error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
