import { z } from "zod";
import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import { reorderJobs } from "@/server/services/jobs";
import { jobReorderSchema } from "@/lib/schemas/jobs";
import { requireAdmin } from "@/server/auth/api-helpers";
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
    return okAuth(request, { success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failAuth(request, "VALIDATION_ERROR", "Invalid input", 422, {
        issues: error.issues,
      });
    }
    return handleErrorAuth(request, error, "jobs.reorder");
  }
}
