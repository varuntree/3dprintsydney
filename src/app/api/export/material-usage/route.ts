import { logger } from "@/lib/logger";
import { exportMaterialUsageCsv } from "@/server/services/exports";
import { requireAdmin } from "@/server/auth/api-helpers";
import type { NextRequest } from "next/server";

/**
 * GET /api/export/material-usage
 * ADMIN ONLY - Material usage reports contain sensitive operational data
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const payload = await exportMaterialUsageCsv({ from, to });
    return new Response(payload.csv, {
      status: 200,
      headers: {
        "Content-Type": payload.contentType,
        "Content-Disposition": `attachment; filename="${payload.filename}"`,
      },
    });
  } catch (error) {
    logger.error({ scope: "export.material_usage", error });
    return new Response(JSON.stringify({ error: { message: "Failed to export material usage" } }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

