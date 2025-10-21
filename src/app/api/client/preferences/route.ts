import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireClientWithId } from "@/server/auth/api-helpers";
import {
  getClientNotificationPreference,
  updateClientNotificationPreference,
} from "@/server/services/clients";
import { ok, fail } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { clientPreferenceSchema } from "@/lib/schemas/clients";

export async function GET(req: NextRequest) {
  try {
    const user = await requireClientWithId(req);
    const notifyOnJobStatus = await getClientNotificationPreference(user.clientId);
    return ok({ notifyOnJobStatus });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'client.preferences', message: 'Failed to update client preferences', error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
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
    return ok({ notifyOnJobStatus });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("VALIDATION_ERROR", "Invalid preferences payload", 422);
    }
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'client.preferences', message: 'Failed to update client preferences', error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
