import { NextRequest } from "next/server";
import { requireAdmin } from "@/server/auth/session";
import { listClients } from "@/server/services/clients";
import { ok, handleError } from "@/server/api/respond";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const clients = await listClients({ sort: 'name', order: 'asc' });
    return ok(clients);
  } catch (error) {
    return handleError(error, 'admin.clients.get');
  }
}
