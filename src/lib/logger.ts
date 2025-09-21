interface LogPayload {
  scope: string;
  message?: string;
  error?: unknown;
  data?: Record<string, unknown>;
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

function emit(level: "info" | "warn" | "error", payload: LogPayload) {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    scope: payload.scope,
    message: payload.message,
    data: payload.data,
    error: serializeError(payload.error),
  });
  console[level === "info" ? "log" : level](line);
}

export const logger = {
  info: (payload: LogPayload) => emit("info", payload),
  warn: (payload: LogPayload) => emit("warn", payload),
  error: (payload: LogPayload) => emit("error", payload),
};
