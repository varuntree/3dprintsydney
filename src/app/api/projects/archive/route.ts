import { NextRequest } from "next/server";
import { requireClientWithId } from "@/server/auth/api-helpers";
import { okAuth, handleErrorAuth } from "@/server/api/respond";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { bulkArchiveJobs, bulkUnarchiveJobs } from "@/server/services/jobs";
import { AppError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const user = await requireClientWithId(request);
    const body = await request.json();
    const ids = Array.isArray(body?.ids)
      ? body.ids
          .map((value: unknown) => Number(value))
          .filter((value) => Number.isFinite(value) && value > 0)
      : [];
    if (ids.length === 0) {
      return okAuth(request, { count: 0 });
    }

    const action = body?.action === "unarchive" ? "unarchive" : "archive";
    const reason = typeof body?.reason === "string" ? body.reason : undefined;

    const supabase = getServiceSupabase();
    const { data: jobs, error } = await supabase
      .from("jobs")
      .select("id")
      .in("id", ids)
      .eq("client_id", user.clientId);

    if (error) {
      throw new AppError(`Failed to fetch client jobs: ${error.message}`, 'DATABASE_ERROR', 500);
    }

    const allowedIds = (jobs ?? []).map((job) => job.id);
    if (allowedIds.length === 0) {
      return okAuth(request, { count: 0 });
    }

    const count =
      action === "unarchive"
        ? await bulkUnarchiveJobs(allowedIds)
        : await bulkArchiveJobs(allowedIds, reason);

    return okAuth(request, { count });
  } catch (error) {
    return handleErrorAuth(request, error, "projects.archive");
  }
}
