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

export async function GET(request: NextRequest) {
  try {
    const user = await requireClientWithId(request);
    const notifyOnJobStatus = await getClientNotificationPreference(user.clientId);
    return okAuth(request, { notifyOnJobStatus });
  } catch (error) {
    if (error instanceof AppError) {
      return failAuth(request, error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'client.preferences', message: 'Failed to update client preferences', error });
    return failAuth(request, 'INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireClientWithId(request);
    const payload = await request.json();
    const parsed = clientPreferenceSchema.parse(payload);
    const notifyOnJobStatus = await updateClientNotificationPreference(
      user.clientId,
      parsed.notifyOnJobStatus,
    );
    return okAuth(request, { notifyOnJobStatus });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failAuth(request, "VALIDATION_ERROR", "Invalid preferences payload", 422);
    }
    if (error instanceof AppError) {
      return failAuth(request, error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'client.preferences', message: 'Failed to update client preferences', error });
    return failAuth(request, 'INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
