import { shouldLog, type LogLevel } from "@/lib/logging/config";
import { getCorrelationId } from "@/lib/logging/correlation";

const PII_FIELDS = new Set(["password", "token", "apiKey", "secret", "creditCard"]);
const MAX_STRING_LENGTH = 1024;

type Primitive = string | number | boolean | null | undefined;

interface LogPayload {
  scope: string;
  message?: string;
  error?: unknown;
  data?: Record<string, unknown>;
  correlationId?: string;
  requestId?: string;
  userId?: string | number;
}

function maskCardNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) {
    return "****";
  }
  return `****${digits.slice(-4)}`;
}

function sanitizeValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === "string") {
    if (value.length > MAX_STRING_LENGTH) {
      return `${value.slice(0, MAX_STRING_LENGTH)}...`;
    }
    return value;
  }

  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "undefined"
  ) {
    return value;
  }

  if (typeof value === "object") {
    if (seen.has(value as object)) {
      return "[Circular]";
    }
    seen.add(value as object);

    if (Array.isArray(value)) {
      return value.map((item) => sanitizeValue(item, seen));
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (PII_FIELDS.has(key)) {
        continue;
      }
      if (key === "cardNumber" && typeof entry === "string") {
        sanitized[key] = maskCardNumber(entry);
        continue;
      }
      if (key.toLowerCase().includes("card") && typeof entry === "string") {
        sanitized[key] = maskCardNumber(entry);
        continue;
      }
      sanitized[key] = sanitizeValue(entry, seen);
    }
    return sanitized;
  }

  return String(value as Primitive);
}

function sanitizeData(data?: Record<string, unknown>) {
  if (!data) return undefined;
  const sanitized = sanitizeValue(data);
  if (typeof sanitized === "object" && sanitized !== null) {
    return sanitized as Record<string, unknown>;
  }
  return undefined;
}

function serializeError(error: unknown) {
  if (!error) return undefined;
  if (error instanceof Error) {
    const { name, message, stack } = error;
    return {
      name,
      message,
      stack: process.env.NODE_ENV === "development" ? stack : undefined,
    };
  }
  return { message: String(error) };
}

function emit(level: LogLevel, payload: LogPayload) {
  if (!shouldLog(level)) {
    return;
  }

  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    scope: payload.scope,
    message: payload.message,
    correlationId: payload.correlationId ?? getCorrelationId(),
    requestId: payload.requestId,
    userId: payload.userId,
    data: sanitizeData(payload.data),
    error: serializeError(payload.error),
  });

  const method = level === "debug" ? "debug" : level === "info" ? "log" : level;
  console[method as "log" | "warn" | "error" | "debug"](line);
}

function timing(
  scope: string,
  start: number | Date,
  payload: Omit<LogPayload, "scope"> = {},
) {
  const startTime = typeof start === "number" ? start : start.getTime();
  const durationMs = Math.max(Date.now() - startTime, 0);
  const mergedData = { ...(payload.data ?? {}), durationMs } as Record<string, unknown>;
  emit("info", {
    ...payload,
    scope,
    data: mergedData,
    message: payload.message,
  });
}

export const logger = {
  debug: (payload: LogPayload) => emit("debug", payload),
  info: (payload: LogPayload) => emit("info", payload),
  warn: (payload: LogPayload) => emit("warn", payload),
  error: (payload: LogPayload) => emit("error", payload),
  timing,
};

export const bugLogger = {
  logBug30: (error: unknown) =>
    logger.error({
      scope: "bug.30.request-undefined",
      message: "Request context helpers used outside handler scope",
      error,
    }),
  logBug31: (error: unknown) =>
    logger.error({
      scope: "bug.31.orientation-missing",
      message: "Orientation data could not be loaded from persistence",
      error,
    }),
  logBug32: (error: unknown, formData: unknown) =>
    logger.error({
      scope: "bug.32.multi-form-validation",
      message: "Multi-form submit validation failed",
      error,
      data: { formData },
    }),
  logBug33: (modelBounds: unknown) =>
    logger.error({
      scope: "bug.33.model-alignment",
      message: "Model alignment offset detected",
      data: { modelBounds },
    }),
  logBug34: (context: unknown) =>
    logger.error({
      scope: "bug.34.preview-crash",
      message: "WebGL context loss or preview crash",
      data: { context },
    }),
};
