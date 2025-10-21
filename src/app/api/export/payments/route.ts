import { logger } from "@/lib/logger";
import { exportPaymentsCsv } from "@/server/services/exports";
import { requireAdmin } from "@/server/auth/api-helpers";
import type { NextRequest } from "next/server";

/**
 * GET /api/export/payments
 * ADMIN ONLY - Payment exports contain sensitive financial data
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const payload = await exportPaymentsCsv({ from, to });

    return new Response(payload.csv, {
      status: 200,
      headers: {
        "Content-Type": payload.contentType,
        "Content-Disposition": `attachment; filename="${payload.filename}"`,
      },
    });
  } catch (error) {
    logger.error({ scope: "export.payments", error });
    return new Response(JSON.stringify({ error: { message: "Failed to export payments" } }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
