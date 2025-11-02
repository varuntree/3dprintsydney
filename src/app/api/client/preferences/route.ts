import { NextRequest } from "next/server";
import { z } from "zod";
import { requireClientWithId } from "@/server/auth/api-helpers";
import {
  getClientNotificationPreference,
  updateClientNotificationPreference,
} from "@/server/services/clients";
import { okAuth, failAuth } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { clientPreferenceSchema } from "@/lib/schemas/clients";

export async function GET(req: NextRequest) {
  try {
    const user = await requireClientWithId(req);
    const notifyOnJobStatus = await getClientNotificationPreference(user.clientId);
    return okAuth(req, { notifyOnJobStatus });
  } catch (error) {
    if (error instanceof AppError) {
      return failAuth(req, error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'client.preferences', message: 'Failed to update client preferences', error });
    return failAuth(req, 'INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireClientWithId(req);
    const payload = await req.json();
    const parsed = clientPreferenceSchema.parse(payload);
    const notifyOnJobStatus = await updateClientNotificationPreference(
      user.clientId,
      parsed.notifyOnJobStatus,
    );
    return okAuth(req, { notifyOnJobStatus });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failAuth(req, "VALIDATION_ERROR", "Invalid preferences payload", 422);
    }
    if (error instanceof AppError) {
      return failAuth(req, error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'client.preferences', message: 'Failed to update client preferences', error });
    return failAuth(req, 'INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
