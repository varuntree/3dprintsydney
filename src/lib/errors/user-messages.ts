import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";

const friendlyMessages: Record<string, string> = {
  VALIDATION_ERROR: "Please check your input and try again",
  NOT_FOUND: "We couldn't find what you're looking for",
  UNAUTHORIZED: "Please sign in to continue",
  FORBIDDEN: "You don't have permission to do that",
  CONFLICT: "This action conflicts with existing data",
  BAD_REQUEST: "Invalid request. Please check and try again",
};

const fallbackMessage = "Something went wrong. Please try again";

function resolveCustomMessage(error: AppError): string | undefined {
  if (
    error.details &&
    typeof error.details === "object" &&
    "userMessage" in error.details &&
    typeof (error.details as Record<string, unknown>).userMessage === "string"
  ) {
    return (error.details as Record<string, unknown>).userMessage as string;
  }
  return undefined;
}

export function getUserMessage(error: unknown): string {
  if (!error) {
    return fallbackMessage;
  }

  if (error instanceof AppError) {
    const custom = resolveCustomMessage(error);
    if (custom) {
      return custom;
    }
    return friendlyMessages[error.code] ?? fallbackMessage;
  }

  if (error instanceof ValidationError) {
    return friendlyMessages.VALIDATION_ERROR;
  }

  if (error instanceof NotFoundError) {
    return friendlyMessages.NOT_FOUND;
  }

  if (error instanceof UnauthorizedError) {
    return friendlyMessages.UNAUTHORIZED;
  }

  if (error instanceof ForbiddenError) {
    return friendlyMessages.FORBIDDEN;
  }

  if (error instanceof ConflictError) {
    return friendlyMessages.CONFLICT;
  }

  if (error instanceof BadRequestError) {
    return friendlyMessages.BAD_REQUEST;
  }

  if (typeof error === "object" && error !== null && "userMessage" in error) {
    const candidate = (error as Record<string, unknown>).userMessage;
    if (typeof candidate === "string") {
      return candidate;
    }
  }

  return fallbackMessage;
}
