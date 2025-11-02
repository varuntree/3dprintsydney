import { NextRequest } from "next/server";
import { requireAdmin } from "@/server/auth/api-helpers";
import { listClients } from "@/server/services/clients";
import { okAuth, handleErrorAuth } from "@/server/api/respond";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const clients = await listClients({ sort: 'name', order: 'asc' });
    return okAuth(req, clients);
  } catch (error) {
    return handleErrorAuth(req, error, 'admin.clients.get');
  }
}
