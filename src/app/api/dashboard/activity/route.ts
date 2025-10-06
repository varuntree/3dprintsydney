import { ok, handleError } from "@/server/api/respond";
import { getRecentActivity } from "@/server/services/dashboard";
import { requireAdmin } from "@/server/auth/session";
import type { NextRequest } from "next/server";

/**
 * GET /api/dashboard/activity
 * ADMIN ONLY - Activity logs contain sensitive internal operations
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "12");
    const offset = Number(searchParams.get("offset") ?? "0");

    const result = await getRecentActivity({ limit, offset });
    return ok(result);
  } catch (error) {
    return handleError(error, "dashboard.activity");
  }
}
