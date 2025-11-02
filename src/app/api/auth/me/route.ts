import { NextRequest } from "next/server";
import { getAuthUser } from "@/server/auth/api-helpers";
import { okAuth, failAuth } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return failAuth(req, "UNAUTHORIZED", "Unauthorized", 401);
    return okAuth(req, {
      id: user.id,
      email: user.email,
      role: user.role,
      clientId: user.clientId,
      studentDiscountEligible: Boolean(user.studentDiscountEligible),
      studentDiscountRate: user.studentDiscountRate ?? 0,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return failAuth(req, error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'auth.me', message: 'Failed to fetch user profile', error });
    return failAuth(req, 'INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
