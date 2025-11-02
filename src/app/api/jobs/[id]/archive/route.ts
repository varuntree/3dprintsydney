import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import { archiveJob } from "@/server/services/jobs";
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

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  await requireAdmin(request);
  try {
    const id = await parseId(context.params);
    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason : undefined;
    const job = await archiveJob(id, reason);
    return okAuth(req, job);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid job id") {
      return failAuth(req, "INVALID_ID", error.message, 400);
    }
    return handleErrorAuth(req, error, "jobs.archive");
  }
}

