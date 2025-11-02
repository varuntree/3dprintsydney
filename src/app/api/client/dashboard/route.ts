import { NextRequest } from "next/server";
import { requireClientWithId } from "@/server/auth/api-helpers";
import { getClientDashboardStats } from "@/server/services/dashboard";
import { okAuth, handleErrorAuth } from "@/server/api/respond";

export async function GET(req: NextRequest) {
  try {
    const user = await requireClientWithId(req);
    const stats = await getClientDashboardStats(user.clientId);
    return okAuth(req, stats);
  } catch (error) {
    return handleErrorAuth(req, error, 'client.dashboard');
  }
}
