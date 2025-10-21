import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireClientWithIdAPI } from "@/server/auth/api-helpers";
import {
  getClientNotificationPreference,
  updateClientNotificationPreference,
} from "@/server/services/clients";
import { fail } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const preferenceSchema = z.object({
  notifyOnJobStatus: z.boolean(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireClientWithIdAPI(req);
    const notifyOnJobStatus = await getClientNotificationPreference(user.clientId);
    return NextResponse.json({ data: { notifyOnJobStatus } });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'client.preferences', error: error as Error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireClientWithIdAPI(req);
    const payload = await req.json();
    const parsed = preferenceSchema.parse(payload);
    const notifyOnJobStatus = await updateClientNotificationPreference(
      user.clientId,
      parsed.notifyOnJobStatus,
    );
    return NextResponse.json({ data: { notifyOnJobStatus } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid preferences payload", issues: error.issues },
        { status: 422 },
      );
    }
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'client.preferences', error: error as Error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
