import { NextResponse, type NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { getUserMessage } from "@/lib/errors/user-messages";
import { AppError } from "@/lib/errors";
import { attachSessionCookies } from "@/server/auth/session";

export interface Success<T> {
  data: T;
  error?: undefined;
}

export interface Failure {
  data?: undefined;
  error: {
    code: string;
    message: string;
    userMessage?: string;
    details?: Record<string, unknown>;
  };
}

export function ok<T>(data: T, init: ResponseInit = { status: 200 }) {
  return NextResponse.json<Success<T>>({ data }, init);
}

export function okAuth<T>(
  req: NextRequest,
  data: T,
  init: ResponseInit = { status: 200 },
) {
  return attachSessionCookies(req, ok(data, init));
}

export function fail(
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>,
  userMessage?: string,
) {
  return NextResponse.json<Failure>(
    { error: { code, message, details, userMessage } },
    { status },
  );
}

export function failAuth(
  req: NextRequest,
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>,
) {
  return attachSessionCookies(req, fail(code, message, status, details));
}

export function handleError(error: unknown, scope: string) {
  const userMessage = getUserMessage(error);
  logger.error({ scope, message: "Request handler error", error });

  // Handle AppError instances with proper code, message, status, and details
  if (error instanceof AppError) {
    return fail(
      error.code,
      error.message,
      error.status,
      error.details as Record<string, unknown> | undefined,
      userMessage,
    );
  }

  // Handle generic errors with status property (legacy pattern)
  const message = error instanceof Error ? error.message : "Unexpected error";
  const status =
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as { status?: number }).status === "number"
      ? (error as { status?: number }).status
      : 500;
  return fail("INTERNAL_ERROR", message, status, undefined, userMessage);
}

export function handleErrorAuth(req: NextRequest, error: unknown, scope: string) {
  return attachSessionCookies(req, handleError(error, scope));
}
