import { AsyncLocalStorage } from "async_hooks";
import { randomUUID } from "crypto";

interface CorrelationContext {
  correlationId: string;
  requestId?: string;
  userId?: string | number;
}

const storage = new AsyncLocalStorage<CorrelationContext>();

export function generateCorrelationId(): string {
  return randomUUID();
}

function getContext(): CorrelationContext | undefined {
  return storage.getStore();
}

export function getCorrelationId(): string | undefined {
  return getContext()?.correlationId;
}

export function setCorrelationId(value: string): void {
  const context = getContext();
  if (context) {
    context.correlationId = value;
  }
}

export function getRequestId(): string | undefined {
  return getContext()?.requestId;
}

export function setRequestId(value: string): void {
  const context = getContext();
  if (context) {
    context.requestId = value;
  }
}

export function getUserId(): string | number | undefined {
  return getContext()?.userId;
}

export function setUserId(value: string | number): void {
  const context = getContext();
  if (context) {
    context.userId = value;
  }
}

export function runWithCorrelationContext<T>(
  callback: () => T,
  context: Partial<CorrelationContext> = {},
): T {
  const base = getContext();
  const merged: CorrelationContext = {
    correlationId:
      context.correlationId ?? base?.correlationId ?? generateCorrelationId(),
    requestId: context.requestId ?? base?.requestId,
    userId: context.userId ?? base?.userId,
  };
  return storage.run(merged, callback);
}
