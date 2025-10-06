import { ok, handleError } from "@/server/api/respond";
import { bulkArchiveJobs } from "@/server/services/jobs";
import { requireAdmin } from "@/server/auth/session";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  await requireAdmin(request);
  try {
    const body = await request.json();
    const ids = Array.isArray(body?.ids)
      ? body.ids.filter((n: unknown) => Number.isFinite(Number(n))).map((n: unknown) => Number(n))
      : [];
    const reason = typeof body?.reason === "string" ? body.reason : undefined;
    const count = await bulkArchiveJobs(ids, reason);
    return ok({ count });
  } catch (error) {
    return handleError(error, "jobs.archive.bulk");
  }
}

