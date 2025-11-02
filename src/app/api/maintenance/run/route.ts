import { okAuth, handleErrorAuth } from "@/server/api/respond";
import { runDailyMaintenance } from "@/server/services/maintenance";
import { requireAdmin } from "@/server/auth/api-helpers";
import type { NextRequest } from "next/server";

/**
 * POST /api/maintenance/run
 * ADMIN ONLY - Only admins can trigger maintenance operations
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    await runDailyMaintenance();
    return okAuth(req, { success: true });
  } catch (error) {
    return handleErrorAuth(req, error, "maintenance.run");
  }
}

