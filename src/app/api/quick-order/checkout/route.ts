import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireClientWithId } from "@/server/auth/api-helpers";
import { createQuickOrderInvoice } from "@/server/services/quick-order";
import { okAuth, failAuth } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger, bugLogger } from "@/lib/logger";
import { quickOrderCheckoutSchema } from "@/lib/schemas/quick-order";

/**
 * POST /api/quick-order/checkout
 *
 * Creates an invoice for a quick order with all files and settings
 * Delegates business logic to createQuickOrderInvoice service function
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireClientWithId(request);

    const body = await request.json();
    const parsed = quickOrderCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      bugLogger.logBug32(parsed.error, body);
      return failAuth(
        request,
        "VALIDATION_ERROR",
        "Invalid checkout payload",
        422,
        { issues: parsed.error.issues },
      );
    }
    const { items, address, creditRequestedAmount, paymentPreference } = parsed.data;

    if (!Array.isArray(items) || items.length === 0) {
      return failAuth(request, "NO_ITEMS", "No items", 400);
    }

    // Delegate business logic to service
    const result = await createQuickOrderInvoice(
      items,
      user.id,
      user.clientId,
      address,
      {
        creditRequestedAmount,
        paymentPreference,
      },
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
    logger.error({ scope: "quick-order.checkout", message: 'Checkout failed', error });
    return failAuth(request, "INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
}
