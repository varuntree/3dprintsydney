import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

interface Success<T> {
  data: T;
  error?: undefined;
}

interface Failure {
  data?: undefined;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export function ok<T>(data: T, init: ResponseInit = { status: 200 }) {
  return NextResponse.json<Success<T>>({ data }, init);
}

export function fail(
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>,
) {
  return NextResponse.json<Failure>(
    { error: { code, message, details } },
    { status },
  );
}

export function handleError(error: unknown, scope: string) {
  logger.error({ scope, error });
  const message = error instanceof Error ? error.message : "Unexpected error";
  const status =
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as { status?: number }).status === "number"
      ? (error as { status?: number }).status
      : 500;
  return fail("INTERNAL_ERROR", message, status);
}
