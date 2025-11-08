# Logging Standards

## Overview
- We log business-critical operations, errors, job lifecycles, and fallbacks. High-traffic success paths only log infrequent checkpoints (not every query or status change). Tests, UI events, and helpers should rely on the structured logs defined here.
- Add logging on server + client paths as needed (see `src/lib/logger.ts`, `src/lib/logging/browser-logger.ts`). Avoid introducing extra noise; more instrumentation can come later via Phase 2.

## Scope Naming
- Every log scope follows `{layer}.{feature}.{operation}` so telemetry can be filtered easily.
- Examples:
  - `invoices.create` when invoices are minted (`src/server/services/invoices.ts`).
  - `quick-order.slice` for quick-order slicing jobs (`src/server/services/quick-order.ts`).
  - `worker.overhang` for background worker errors (`src/workers/overhang-worker.ts`).
  - `browser.error.boundary` for caught client-side render errors (`src/components/error-boundary.tsx`).
- Include optional nested scopes for retries, fallbacks, or activity logging (e.g., `quick-order.slice.retry`, `jobs.ensure.activity`, `printer.status.activity`).

## Log Levels
| Level | Use Case | Example Scope |
| --- | --- | --- |
| `error` | Unhandled exceptions, failed business contracts, request/worker failure that stops progress (`src/server/services/clients.ts`, `src/server/auth/api-helpers.ts`). | `auth.guard.requireAuth` when authentication fails. |
| `warn` | Non-fatal fallbacks, retry attempts, missing data, or deprecated behavior (fallback metrics, worker retries). | `quick-order.slice.fallback` or `quick-order.slice.retry`. |
| `info` | Business operations and job completions that operators care about but are expected (`invoices.create`, `jobs.archive`, `quick-order.slice` success). | `slicer.run` completion, `jobs.update`, `clients.delete`. |
| `debug` | Verbose diagnostics only shipped to devs (e.g., auto-orient candidate counts, orientation debug). | `browser.auto-orient` or `orientation` paths. Defaults to off via `LOG_LEVEL`/`NEXT_PUBLIC_LOG_LEVEL`. |

## Error Messages & User-facing Text
- Do not show raw exceptions (`error.message`) to end users. Always pipe errors through `getUserMessage()` (`src/lib/errors/user-messages.ts`). Sample migrations:
  - `toast.error(getUserMessage(error))` in quick-order/client components (`src/app/(client)/quick-order/page.tsx`).
  - `handleError()` in API responses now augments failures with `userMessage` (`src/server/api/respond.ts`).
- Log the technical error separately via `logger.error` or `browserLogger.error` with correlation IDs and operation metadata.

## PII Sanitization
- The logger builds a sanitization layer that drops or masks sensitive fields before emitting JSON (`password`, `token`, `apiKey`, `secret`, `creditCard`, `cardNumber`).
- Large strings are trimmed to 1,024 characters and circular references report `[Circular]`. Keep data payloads lean.
- When logging protocol-level data (e.g., worker payloads, orientation metrics), drop any user secrets or credit card details up-front; the logger will sanitize common fields, but prefer filtering at source if possible.

## Adding Logging to New Features
1. Determine the layer (`server`, `browser`, `worker`, `slicer`, etc.) and compose a scope like `layer.feature.operation`.
2. Inject `logger` (server) or `browserLogger` (client) and log start/success/failure as needed (use `.timing()` for durations).
3. Avoid logging every request/operation—focus on business operations, retries, fallbacks, and errors. instrumentation for high-frequency paths should rely on filters.
4. Update relevant React components to call `getUserMessage()` for toasts & fallback UI.
5. If you need correlation IDs in async flows (API handlers, worker messaging), propagate them via `runWithCorrelationContext` (future extension) or include request IDs manually.

## Configuration
- `LOG_LEVEL` controls server-side log filtering (`src/lib/logging/config.ts`). Allowed values: `debug`, `info`, `warn`, `error` (default: `info`).
- `NEXT_PUBLIC_LOG_LEVEL` controls browser logs and defaults to the server level when undefined.
- Feature flags (e.g., `ENABLE_DB_LOGGING`, `ENABLE_REQUEST_LOGGING`) live in the same config file and can gate extra instrumentation without code changes.

## Phase 2 (Deferred)
- Slow DB query logging (>500 ms) and request/response middleware logging are intentionally deferred.
- Sampling success traffic, request-only API middleware, and observability integrations (Axiom/Datadog/Sentry) belong to Phase 2.
- When those features are requested, follow the same scope naming and error/user-message guidelines above.
