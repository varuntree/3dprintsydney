import { logger } from "@/lib/logger";
import { exportMaterialUsageCsv } from "@/server/services/exports";

export async function GET(request: Request) {
  try {
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

