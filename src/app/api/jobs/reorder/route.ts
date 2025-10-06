import { ok, handleError } from "@/server/api/respond";
import { reorderJobs } from "@/server/services/jobs";
import { jobReorderSchema } from "@/lib/schemas/jobs";
import { requireAdmin } from "@/server/auth/session";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  await requireAdmin(request);
  try {
    const body = await request.json();
    const parsed = jobReorderSchema.parse(body);
    await reorderJobs(
      parsed.map((entry) => ({
        id: entry.id,
        queuePosition: entry.queuePosition,
        printerId: entry.printerId ?? null,
      })),
    );
    return ok({ success: true });
  } catch (error) {
    return handleError(error, "jobs.reorder");
  }
}
