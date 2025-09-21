import { ZodError } from "zod";
import { ok, fail, handleError } from "@/server/api/respond";
import { listClients, createClient } from "@/server/services/clients";

export async function GET(request: Request) {
  try {
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
    return ok(clients);
  } catch (error) {
    return handleError(error, "clients.list");
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const client = await createClient(payload);
    return ok(client, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid client payload", 422, {
        issues: error.issues,
      });
    }
    return handleError(error, "clients.create");
  }
}
