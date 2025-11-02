import { z } from "zod";
import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import { updateJobStatus } from "@/server/services/jobs";
import { jobStatusSchema } from "@/lib/schemas/jobs";
import { requireAdmin } from "@/server/auth/api-helpers";
import type { NextRequest } from "next/server";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid job id");
  }
  return id;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  await requireAdmin(request);
  try {
    const id = await parseId(context.params);
    const payload = await request.json();
    const parsed = jobStatusSchema.parse(payload);
    const job = await updateJobStatus(id, parsed.status, parsed.note || undefined);
    return okAuth(req, job);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failAuth(req, "VALIDATION_ERROR", "Invalid input", 422, {
        issues: error.issues,
      });
    }
    if (error instanceof Error && error.message === "Invalid job id") {
      return failAuth(req, "INVALID_ID", error.message, 400);
    }
    return handleErrorAuth(req, error, "jobs.status");
  }
}
