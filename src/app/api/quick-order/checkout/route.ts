import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/server/auth/api-helpers";
import {
  createQuickOrderInvoice,
  type QuickOrderItemInput,
} from "@/server/services/quick-order";
import { ok, fail } from "@/server/api/respond";
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
    const user = await requireAuth(req);
    if (!user.clientId) {
      return fail("NO_CLIENT", "User not linked to client", 400);
    }

    const body = await req.json();
    const items: QuickOrderItemInput[] = body?.items ?? [];
    const address = body?.address ?? {};

    if (!Array.isArray(items) || items.length === 0) {
      return fail("NO_ITEMS", "No items", 400);
    }

    // Delegate business logic to service
    const result = await createQuickOrderInvoice(
      items,
      user.id,
      user.clientId, // TypeScript knows this is number due to guard above
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
    logger.error({ scope: "quick-order.checkout", error: error as Error });
    return fail("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
}
