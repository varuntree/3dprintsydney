import { ZodError } from "zod";
import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import { listClients, createClient } from "@/server/services/clients";
import { clientInputSchema } from "@/lib/schemas/clients";
import { requireAdmin } from "@/server/auth/api-helpers";
import type { NextRequest } from "next/server";

/**
 * GET /api/clients
 * ADMIN ONLY - Client data management is admin-only
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? undefined;
    const limit = Number(searchParams.get("limit") ?? "0");
    const offset = Number(searchParams.get("offset") ?? "0");
    const sort = (searchParams.get("sort") as "name" | "createdAt" | null) ?? null;
    const order = (searchParams.get("order") as "asc" | "desc" | null) ?? null;
    const clients = await listClients({
      q,
      limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
      offset: Number.isFinite(offset) && offset >= 0 ? offset : undefined,
      sort: sort ?? undefined,
      order: order ?? undefined,
    });
    return okAuth(req, clients);
  } catch (error) {
    return handleErrorAuth(req, error, "clients.list");
  }
}

/**
 * POST /api/clients
 * ADMIN ONLY - Only admins can create clients
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const validated = clientInputSchema.parse(body);
    const client = await createClient(validated);
    return okAuth(req, client, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return failAuth(req, "VALIDATION_ERROR", "Invalid client payload", 422, {
        issues: error.issues,
      });
    }
    return handleErrorAuth(req, error, "clients.create");
  }
}
