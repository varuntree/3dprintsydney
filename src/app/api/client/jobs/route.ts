import { NextRequest } from "next/server";
import { requireClientWithId } from "@/server/auth/api-helpers";
import { listJobsForClient } from "@/server/services/jobs";
import { okAuth, failAuth } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const user = await requireClientWithId(req);
    const jobs = await listJobsForClient(user.clientId);
    return okAuth(req, jobs);
  } catch (error) {
    if (error instanceof AppError) {
      return failAuth(req, error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'client.jobs', message: 'Failed to fetch client jobs', error });
    return failAuth(req, 'INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
