import { NextRequest } from "next/server";
import { requireAdmin } from "@/server/auth/api-helpers";
import { listClients } from "@/server/services/clients";
import { okAuth, handleErrorAuth } from "@/server/api/respond";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const clients = await listClients({ sort: 'name', order: 'asc' });
    return okAuth(request, clients);
  } catch (error) {
    return handleErrorAuth(request, error, 'admin.clients.get');
  }
}
