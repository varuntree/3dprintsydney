import { NextRequest, NextResponse } from "next/server";
import { requireClientWithId } from "@/server/auth/api-helpers";
import { listJobsForClient } from "@/server/services/jobs";
import { ok, fail } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const user = await requireClientWithId(req);
    const jobs = await listJobsForClient(user.clientId);
    return ok(jobs);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'client.jobs', error: error as Error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
