import { ok, handleError } from "@/server/api/respond";
import { getJobBoard } from "@/server/services/jobs";
import { JobStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const archived = searchParams.get("archived");
    const includeArchived = archived === "true";
    const statusesParam = searchParams.getAll("status");
    const statuses = statusesParam.length
      ? (statusesParam.filter((s): s is JobStatus =>
          (Object.values(JobStatus) as string[]).includes(s),
        ) as JobStatus[])
      : null;
    const completedWindow = searchParams.get("completedWindow");
    let completedSince: Date | null = null;
    if (completedWindow === "today") {
      const now = new Date();
      completedSince = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    }
    const board = await getJobBoard({ includeArchived, statuses, completedSince });
    return ok(board);
  } catch (error) {
    return handleError(error, "jobs.list");
  }
}
