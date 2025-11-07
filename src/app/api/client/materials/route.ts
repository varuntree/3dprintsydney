import { okAuth, handleErrorAuth } from "@/server/api/respond";
import { listMaterials } from "@/server/services/materials";
import { requireAuth } from "@/server/auth/api-helpers";
import type { NextRequest } from "next/server";

/**
 * GET /api/client/materials
 * Auth: any authenticated user (CLIENT or ADMIN)
 * Returns a limited, client-safe view of materials for Quick Order
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const materials = await listMaterials({ sort: "name", order: "asc" });
    // Expose only safe fields to clients
    const safe = materials.map((m) => ({ id: m.id, name: m.name, color: m.color }));
    return okAuth(request, safe);
  } catch (error) {
    return handleErrorAuth(request, error, "client.materials.list");
  }
}

