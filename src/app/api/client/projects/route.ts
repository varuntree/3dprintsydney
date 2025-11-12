import { NextRequest } from "next/server";
import { requireClientWithId } from "@/server/auth/api-helpers";
import { listClientProjects } from "@/server/services/jobs";
import { okAuth, handleErrorAuth } from "@/server/api/respond";

const VALID_STATUSES = new Set(["active", "completed", "archived"]);

export async function GET(request: NextRequest) {
  try {
    const user = await requireClientWithId(request);
    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status");
    const status = VALID_STATUSES.has(statusParam ?? "")
      ? (statusParam as "active" | "completed" | "archived")
      : undefined;

    const limitParam = Number(url.searchParams.get("limit"));
    const offsetParam = Number(url.searchParams.get("offset"));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 50;
    const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0;
    const search = url.searchParams.get("q")?.trim() || undefined;

    const data = await listClientProjects(user.clientId, {
      status,
      limit,
      offset,
      search,
    });

    return okAuth(request, data);
  } catch (error) {
    return handleErrorAuth(request, error, "client.projects.list");
  }
}
