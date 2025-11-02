import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireClientWithId } from "@/server/auth/api-helpers";
import {
  createQuickOrderInvoice,
  type QuickOrderItemInput,
} from "@/server/services/quick-order";
import { okAuth, failAuth } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * POST /api/quick-order/checkout
 *
 * Creates an invoice for a quick order with all files and settings
 * Delegates business logic to createQuickOrderInvoice service function
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireClientWithId(req);

    const body = await req.json();
    const items: QuickOrderItemInput[] = body?.items ?? [];
    const address = body?.address ?? {};

    if (!Array.isArray(items) || items.length === 0) {
      return failAuth(req, "NO_ITEMS", "No items", 400);
    }

    // Delegate business logic to service
    const result = await createQuickOrderInvoice(
      items,
      user.id,
      user.clientId,
      address,
    );

    // Ensure admin/client dashboards reflect new invoice promptly
    await Promise.all([
      revalidatePath("/invoices"),
      revalidatePath("/jobs"),
      revalidatePath("/clients"),
      revalidatePath("/client/orders"),
    ]).catch(() => {
      // best-effort; ignore revalidation failures
    });

    return okAuth(req, result);
  } catch (error) {
    if (error instanceof AppError) {
      return failAuth(req, 
        error.code,
        error.message,
        error.status,
        error.details as Record<string, unknown> | undefined,
      );
    }
    logger.error({ scope: "quick-order.checkout", message: 'Checkout failed', error });
    return failAuth(req, "INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
}
