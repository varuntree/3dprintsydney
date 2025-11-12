import { NextRequest } from "next/server";
import { requireClientWithId } from "@/server/auth/api-helpers";
import { getClientDashboardStats } from "@/server/services/dashboard";
import { okAuth, handleErrorAuth } from "@/server/api/respond";

export async function GET(request: NextRequest) {
  try {
    const user = await requireClientWithId(request);
    const stats = await getClientDashboardStats(user.clientId);
    return okAuth(request, stats);
  } catch (error) {
    return handleErrorAuth(request, error, 'client.dashboard');
  }
}
