import { NextRequest } from "next/server";
import { requireClientWithId } from "@/server/auth/api-helpers";
import { getClientDashboardStats } from "@/server/services/dashboard";
import { ok, handleError } from "@/server/api/respond";

export async function GET(req: NextRequest) {
  try {
    const user = await requireClientWithId(req);
    const stats = await getClientDashboardStats(user.clientId);
    return ok(stats);
  } catch (error) {
    return handleError(error, 'client.dashboard');
  }
}
