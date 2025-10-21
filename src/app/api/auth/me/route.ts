import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/server/auth/api-helpers";
import { ok, fail } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return fail("UNAUTHORIZED", "Unauthorized", 401);
    return ok({ id: user.id, email: user.email, role: user.role, clientId: user.clientId });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'auth.me', message: 'Failed to fetch user profile', error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
