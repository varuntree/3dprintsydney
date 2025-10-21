import { ok, handleError } from "@/server/api/respond";
import { getDashboardSnapshot } from "@/server/services/dashboard";
import { requireAdmin } from "@/server/auth/api-helpers";
import { parsePaginationParams } from "@/lib/utils/api-params";
import type { NextRequest } from "next/server";

/**
 * GET /api/dashboard
 * ADMIN ONLY - Dashboard contains sensitive business metrics
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") ?? undefined; // today|7d|30d|ytd
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;

    // Parse activity pagination parameters
    const actLimit = Number(searchParams.get("actLimit") ?? "12");
    const actOffset = Number(searchParams.get("actOffset") ?? "0");
    const activityLimit = Number.isFinite(actLimit) && actLimit > 0 ? actLimit : 12;
    const activityOffset = Number.isFinite(actOffset) && actOffset >= 0 ? actOffset : 0;

    const snapshot = await getDashboardSnapshot({ range, from, to, activityLimit, activityOffset });
    return ok(snapshot);
  } catch (error) {
    return handleError(error, "dashboard.snapshot");
  }
}
