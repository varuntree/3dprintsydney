import { NextRequest } from "next/server";
import { okAuth, failAuth } from "@/server/api/respond";
import { requireClientWithId } from "@/server/auth/api-helpers";
import { quoteQuickOrderShipping } from "@/server/services/quick-order";
import { AppError } from "@/lib/errors";

/**
 * POST /api/quick-order/shipping
 * Calculates the current shipping quote for a quick order
 */
export async function POST(req: NextRequest) {
  try {
    await requireClientWithId(req);
    const body = await req.json().catch(() => ({}));
    const address = body?.address ?? {};
    const state = typeof address?.state === "string" ? address.state : undefined;
    const postcode = typeof address?.postcode === "string" ? address.postcode : undefined;

    const quote = await quoteQuickOrderShipping({ state, postcode });

    return okAuth(req, quote);
  } catch (error) {
    if (error instanceof AppError) {
      return failAuth(req, error.code, error.message, error.status);
    }
    return failAuth(req, "INTERNAL_ERROR", "Unable to determine shipping", 500);
  }
}
