import { NextResponse } from "next/server";
import { fail } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function POST() {
  try {
    const response = NextResponse.json({ ok: true });
    response.cookies.set("sb:token", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    });
    response.cookies.set("sb:refresh-token", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    });
    return response;
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'auth.logout', error: error as Error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
