import { ok, handleError } from "@/server/api/respond";
import { getJobBoard } from "@/server/services/jobs";
import { JobStatus } from "@/lib/constants/enums";
import { requireAdmin } from "@/server/auth/api-helpers";
import { calculateDateWindow } from "@/lib/utils/api-params";
import type { NextRequest } from "next/server";

/**
 * GET /api/jobs
 * ADMIN ONLY - Job board is admin-only
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const archived = searchParams.get("archived");
    const includeArchived = archived === "true";
    const statusesParam = searchParams.getAll("status");
    const validStatuses = new Set(Object.values(JobStatus) as JobStatus[]);
    const statuses = statusesParam.length
      ? (statusesParam.filter((s): s is JobStatus =>
          validStatuses.has(s as JobStatus),
        ) as JobStatus[])
      : null;
    const completedWindow = searchParams.get("completedWindow");
    let completedSince: Date | null = null;
    if (completedWindow === "today") {
      const { startDate } = calculateDateWindow("today");
      completedSince = startDate;
    }
    const board = await getJobBoard({ includeArchived, statuses, completedSince });
    return ok(board);
  } catch (error) {
    return handleError(error, "jobs.list");
  }
}
