import { ok, handleError } from "@/server/api/respond";
import { getRecentActivity } from "@/server/services/dashboard";
import { requireAdmin } from "@/server/auth/api-helpers";
import { parsePaginationParams } from "@/lib/utils/api-params";
import type { NextRequest } from "next/server";

/**
 * GET /api/dashboard/activity
 * ADMIN ONLY - Activity logs contain sensitive internal operations
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const { limit, offset } = parsePaginationParams(searchParams);

    const result = await getRecentActivity({ limit, offset });
    return ok(result);
  } catch (error) {
    return handleError(error, "dashboard.activity");
  }
}
