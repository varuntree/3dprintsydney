# Plan: Comprehensive Logging Implementation

## Plan Description
Deploy structured, consistent logging across codebase (API, frontend, critical paths). Clean up inconsistent patterns. Establish standards for log levels, scopes, error serialization. Add missing instrumentation: file processing, slicing pipeline, frontend errors. Create user-friendly error message mapper. Avoid over-logging: focus on business operations, errors, slow operations. Phased approach: start conservative, add instrumentation as needed.

## User Story
As a developer/operator
I want comprehensive, structured logs across all system layers
So that I can debug issues, monitor performance, audit operations, and understand system behavior without guessing

## Problem Statement
Current logging:
- Inconsistent: some services log, others silent
- Scattered: mix of `console.log`, logger utility, no logging
- No config: hardcoded dev checks, no central control
- No standards: scope naming varies, log levels unclear
- Missing context: user/request IDs often absent
- **User-facing errors leak technical details or too vague**

Gaps identified:
- Slicer: no job lifecycle tracking
- Frontend: no error boundary, no structured errors, raw error.message shown to users
- File ops: partial success logging
- No correlation IDs across requests
- Workers: silent execution
- No user-friendly error message mapping

## Solution Statement

**Phase 1 (implement now):**
1. **Enhance logger utility**: add debug level, correlation ID support, timing helpers, PII sanitization
2. **User-friendly error mapper**: translate technical errors → user messages, never show raw error.message
3. **Config system**: env-based log level control, performance thresholds
4. **Service layer standardization**: consistent business operation logging (existing pattern, just clean up)
5. **Slicer pipeline**: log job lifecycle, timing, retries
6. **Frontend error boundary**: catch React errors, log structured
7. **Worker logging**: errors + completion only (not every step)
8. **Standardize scopes**: enforce `{layer}.{feature}.{operation}` pattern
9. **Cleanup**: remove console.log, standardize to logger
10. **Documentation**: standards, examples, user message guidelines

**Phase 2 (later, if needed):**
1. **Slow query logging**: DB queries >500ms only (not all queries)
2. **API error logging**: 4xx/5xx only (not all requests)
3. **Sampling**: 1% of success requests for traffic analysis
4. **External observability**: Datadog/New Relic/Axiom integration

## Pattern Analysis
**Discovered patterns:**
- Logger utility: `src/lib/logger.ts` - JSON structure, scope/message/error/data fields
- Error handling: `src/server/api/respond.ts:54-76` - centralized with `handleError()`
- Service logging: `src/server/services/*.ts` - info for success, error for failures, warn for non-blocking
- Scope naming: `{service}.{operation}` (e.g., `invoices.create`, `stripe.webhook`)
- Frontend: toast notifications for user feedback, console.error for dev debugging

**Deviations needed:**
- Add `debug` level for verbose dev logs (OFF by default)
- Add correlation ID to trace request flows
- **NO DB query logging wrapper** (Phase 2: slow queries only if needed)
- **NO request/response middleware logging all requests** (Phase 2: errors only if needed)
- Worker logging: errors + completion only, not every computation step
- User message mapper: separate technical logs from user-facing messages

**Pattern sources:**
- `src/lib/logger.ts:1-37` - base logger
- `src/server/services/invoices.ts:531,609,672-682` - service logging examples
- `src/server/services/stripe.ts:183-194` - warn pattern for non-fatal
- `src/app/api/quick-order/upload/route.ts:46-51` - route error handling

## Dependencies
### Previous Plans
None - foundational infrastructure change

### External Dependencies
None - using existing tech:
- Next.js 15.5.3
- Custom logger (`src/lib/logger.ts`)
- Supabase client
- Web Workers API

## Relevant Files
Use these files to implement the task:

**Core Logger Infrastructure:**
- `src/lib/logger.ts` - Extend with debug level, correlation IDs, metadata
- `src/lib/errors.ts` - Error classes (no changes needed)

**Server Infrastructure:**
- `src/server/api/respond.ts` - Error handler integration (already done), add user message mapper
- `src/server/auth/api-helpers.ts` - Auth guards (add failure logging only)

**Services (standardize existing):**
- `src/server/services/invoices.ts` - Already has logging, standardize
- `src/server/services/quotes.ts` - Already has logging, standardize
- `src/server/services/auth.ts` - Already has logging, standardize
- `src/server/services/stripe.ts` - Already has logging, standardize
- `src/server/services/quick-order.ts` - Add missing lifecycle logs
- `src/server/services/order-files.ts` - Add missing logs
- `src/server/services/tmp-files.ts` - Standardize
- `src/server/services/materials.ts` - Standardize
- `src/server/services/users.ts` - Standardize
- `src/server/services/messages.ts` - Standardize
- `src/server/services/settings.ts` - Standardize
- `src/server/services/printers.ts` - Standardize
- `src/server/services/credits.ts` - Standardize
- `src/server/services/clients.ts` - Add logging (missing)
- `src/server/services/jobs.ts` - Add logging (missing)
- `src/server/services/exports.ts` - Add logging (missing)
- `src/server/services/activity.ts` - Add logging (missing)

**3D/Processing:**
- `src/lib/3d/orientation.ts` - Add structured logging (currently console.debug)
- `src/lib/3d/overhang-detector.ts` - Add logging (currently silent)
- `src/server/slicer/runner.ts` - Add job lifecycle logging

**Workers:**
- `src/workers/overhang-worker.ts` - Add message-based logging

**Frontend:**
- `src/components/providers/app-providers.tsx` - Add error boundary
- `src/hooks/useAsyncAction.ts` - Add structured error logging
- `src/app/(client)/quick-order/page.tsx` - Replace console.error with logger

**Components with console usage (cleanup):**
- `src/components/3d/ModelViewer.tsx` - Replace console.error
- `src/components/settings/settings-form.tsx` - Replace console.warn
- `src/lib/pdf/stripe.ts` - Replace console.warn
- `src/hooks/useShellNotifications.ts` - Replace console.error
- `src/providers/navigation-provider.tsx` - Replace console.error

### New Files
- `src/lib/logging/config.ts` - Centralized logging config, performance thresholds
- `src/lib/logging/correlation.ts` - Correlation ID management (AsyncLocalStorage)
- `src/lib/logging/browser-logger.ts` - Browser-safe logger variant
- `src/lib/errors/user-messages.ts` - Error → user-friendly message mapper
- `src/components/error-boundary.tsx` - React error boundary with logging
- `docs/LOGGING_STANDARDS.md` - Documentation for logging conventions, user message guidelines

## Acceptance Criteria

**Phase 1 (required):**
1. User-friendly error messages: all `toast.error()` use error mapper, never raw `error.message`
2. Service operations log: business events (info), errors (error), non-fatal (warn) - standardized scopes
3. Slicer pipeline logs: job start, retry attempts, completion/failure with timing
4. Frontend error boundary catches render errors, logs with component stack
5. Worker errors logged (errors + completion, NOT every step)
6. Zero `console.log/error/warn` in src/ (all replaced with logger)
7. All logs follow scope pattern: `{layer}.{feature}.{operation}`
8. Log level controllable via `LOG_LEVEL` env (default: info, debug OFF)
9. Correlation IDs available (AsyncLocalStorage)
10. PII sanitization: passwords, tokens, full card numbers removed from logs
11. Documentation created: standards, examples, user message guidelines

**Phase 2 (deferred):**
12. DB slow query logging (>500ms) - only if needed
13. API error logging middleware (4xx/5xx only) - only if needed
14. Request sampling (1%) for traffic analysis - only if needed

## Step by Step Tasks

**EXECUTION RULES:**
- Execute ALL Phase 1 steps below in exact order
- Check Phase 1 Acceptance Criteria - all items REQUIRED
- Phase 2 steps DEFERRED (don't implement unless explicitly requested)
- Focus: user messages, business operation logs, error handling, cleanup
- Avoid over-logging: NO all-request middleware, NO all-query logging
- If blocked, document and continue other steps

### 1. Enhance Core Logger

- Extend `src/lib/logger.ts` to add:
  - `debug` level method
  - Optional correlation ID field in LogPayload
  - Optional `userId` and `requestId` fields
  - `timing` helper for duration logging
  - Sanitization helper for PII removal
- Update `emit()` to include new fields
- Add log level filtering based on env var `LOG_LEVEL`
- Ensure backward compatibility with existing logger calls

### 2. Create Logging Configuration System

- Create `src/lib/logging/config.ts`:
  - Parse `LOG_LEVEL` env var (default: `info`)
  - Export `shouldLog(level)` function
  - Export enabled/disabled feature flags (DB logging, request logging)
  - Support separate frontend log level via `NEXT_PUBLIC_LOG_LEVEL`
- Create `src/lib/logging/correlation.ts`:
  - `generateCorrelationId()` - UUID v4
  - `AsyncLocalStorage` for server-side context
  - `getCorrelationId()` / `setCorrelationId()` helpers

### 3. Create User-Friendly Error Message Mapper

- Create `src/lib/errors/user-messages.ts`:
  - Export `getUserMessage(error: unknown): string`
  - Map AppError subclasses to friendly messages:
    - `ValidationError` → "Please check your input and try again"
    - `NotFoundError` → "We couldn't find what you're looking for"
    - `UnauthorizedError` → "Please sign in to continue"
    - `ForbiddenError` → "You don't have permission to do that"
    - `ConflictError` → "This action conflicts with existing data"
    - `BadRequestError` → "Invalid request. Please check and try again"
    - Generic fallback → "Something went wrong. Please try again"
  - Support optional custom messages for specific error codes
  - Never return raw `error.message` (technical details)
- Update `src/server/api/respond.ts`:
  - Add `userMessage` field to error responses using mapper
  - Keep technical `message` for logging, add friendly `userMessage` for clients

### 4. Update Frontend Error Handling with User Messages

- Audit all `toast.error()` calls in codebase
- Replace patterns:
  - `toast.error(error.message)` → `toast.error(getUserMessage(error))`
  - `toast.error(error instanceof Error ? error.message : "...")` → `toast.error(getUserMessage(error))`
- Update `src/hooks/useAsyncAction.ts`:
  - Use `getUserMessage(error)` instead of `error.message`
- Files to update (found in exploration):
  - `src/components/client/pay-online-button.tsx`
  - `src/components/account/profile-form.tsx`
  - `src/components/jobs/job-board.tsx`
  - `src/components/quotes/quote-view.tsx`
  - All other files with `toast.error()`

### 5. Standardize Service Layer Logging

- For services already logging (standardize existing pattern):
  - `invoices.ts`, `quotes.ts`, `auth.ts`, `stripe.ts`, `tmp-files.ts`, `materials.ts`, `users.ts`, `messages.ts`, `settings.ts`, `printers.ts`, `credits.ts`
  - Check: all create/update/delete log success (info), errors (error), non-fatal (warn)
  - Ensure scope naming consistent: `{service}.{operation}`
  - Add correlation ID from context where missing
- For services missing logs:
  - `clients.ts`, `jobs.ts`, `exports.ts`, `activity.ts`
  - Add logging for create/update/delete operations
  - Follow existing pattern from `invoices.ts`

---
✅ CHECKPOINT: Steps 1-5 complete (Core infrastructure, user messages, service standardization). Continue to step 6.
---

### 6. Add Slicer Pipeline Logging

- Update `src/server/slicer/runner.ts`:
  - Log job start with params (scope: `slicer.run`)
  - Log stderr output on failure (error level)
  - Log success with timing, file size (info level)
  - **Do NOT log every subprocess detail**
- Update `src/server/services/quick-order.ts`:
  - Log `sliceQuickOrderFile()` start with fileId (scope: `quick-order.slice`)
  - Log retry attempts with attempt number (scope: `quick-order.slice.retry`)
  - Log fallback activation (warn level, scope: `quick-order.slice.fallback`)
  - Log completion with timing (info level)
  - **Do NOT log every status transition**

### 7. Add Worker Logging (Minimal)

- Update `src/workers/overhang-worker.ts`:
  - Log errors only via `postMessage({ type: 'log', level: 'error', scope: 'worker.overhang', error })`
  - Log completion with timing (info level)
  - **Do NOT log every request/computation step**
- Update `src/components/3d/ModelViewer.tsx`:
  - Listen for log messages from worker, forward to browser logger
  - Replace existing `console.error` with browser logger

### 8. Create Browser Logger

- Create `src/lib/logging/browser-logger.ts`:
  - Same interface as `src/lib/logger.ts`
  - Use `window` instead of `process.env` for config
  - Read `NEXT_PUBLIC_LOG_LEVEL` from env (default: info)
  - Scope pattern: `browser.{feature}.{operation}`

### 9. Add Frontend Error Boundary

- Create `src/components/error-boundary.tsx`:
  - React ErrorBoundary component
  - Catch render errors
  - Log with browser logger: scope `browser.error.boundary`, component stack, error
  - Display user-friendly fallback UI using `getUserMessage()`
  - Include retry button
- Update `src/components/providers/app-providers.tsx`:
  - Wrap children with ErrorBoundary

---
✅ CHECKPOINT: Steps 6-9 complete (Slicer, workers, frontend). Continue to step 10.
---

### 10. Cleanup Console Usage

- Replace all `console.log/error/warn/debug` with appropriate logger:
  - `src/components/3d/ModelViewer.tsx` - browser logger
  - `src/components/settings/settings-form.tsx` - browser logger
  - `src/lib/pdf/stripe.ts` - server logger
  - `src/hooks/useShellNotifications.ts` - browser logger
  - `src/providers/navigation-provider.tsx` - browser logger
  - `src/app/(client)/quick-order/page.tsx` - browser logger
  - `src/lib/3d/orientation.ts` - replace console.debug with logger.debug
- Remove dev-only console conditionals
- Search for remaining: `grep -r "console\." src/ | grep -v node_modules`

### 11. Standardize Scope Naming

- Audit all logger calls for scope consistency:
  - Pattern: `{layer}.{feature}.{operation}`
  - Layers: `browser`, `worker`, `slicer`, service names (invoices, quotes, etc.)
  - Operations: action verb (create, update, delete, slice, process, etc.)
- Create scope reference list in docs
- Fix any inconsistent scopes found

### 12. Add PII Sanitization

- Update logger sanitization helper in `src/lib/logger.ts`:
  - Recursively sanitize data objects
  - Remove fields: `password`, `token`, `apiKey`, `secret`, `creditCard`
  - Truncate `cardNumber` to last 4 digits
- Apply automatically in `emit()` function
- Document sanitized fields in code comments

### 13. Add Auth Guard Logging (Failures Only)

- Update `src/server/auth/api-helpers.ts`:
  - Log auth failures only: scope `auth.guard.requireAuth`, `auth.guard.requireAdmin`
  - Include correlation ID from context
  - **Do NOT log successful auth** (creates noise)

### 14. Create Documentation

- Create `docs/LOGGING_STANDARDS.md`:
  - Overview: phased approach, avoid over-logging
  - Scope naming conventions with examples (file:line references)
  - Log level guidelines:
    - `error`: exceptions, failures blocking operations
    - `warn`: non-fatal issues, fallbacks, deprecated patterns
    - `info`: business operations (create/update/delete), job completion
    - `debug`: verbose dev-only (OFF by default)
  - User message guidelines: never show raw error.message, use getUserMessage()
  - PII sanitization rules
  - How to add logging to new features
  - How to configure: `LOG_LEVEL`, `NEXT_PUBLIC_LOG_LEVEL`
  - Phase 2 options (deferred): slow query logging, error-only API middleware

### 15. Run Validation Commands

- Execute all validation commands below
- Fix any issues found
- Verify zero regressions

## Testing Strategy
### Unit Tests
- Test logger:
  - Log level filtering works (LOG_LEVEL env)
  - PII sanitization removes sensitive fields
  - Correlation ID included when set
  - JSON format valid
  - Circular references handled gracefully
- Test user message mapper:
  - AppError subclasses map correctly
  - Generic errors get fallback message
  - Never returns raw technical details
- Test browser logger:
  - Works without Node.js APIs
  - Respects NEXT_PUBLIC_LOG_LEVEL

### Edge Cases
- Empty/null errors: logged without crash, user sees generic message
- Worker logs: when worker terminated mid-operation
- Correlation ID: graceful fallback when AsyncLocalStorage unavailable
- Logger used before config: defaults to info level
- Circular references in data objects: caught and handled
- Very large data objects: truncate or omit
- Missing getUserMessage import: fallback to generic message

## Validation Commands
Execute every command to validate the task works correctly with zero regressions.

**EXPECTED OUTPUT:**

1. **Type check passes:**
```bash
npm run typecheck
```
Expected: No errors, exit code 0

2. **Build succeeds:**
```bash
npm run build
```
Expected: Build completes, no errors

3. **No console.* in source:**
```bash
grep -r "console\.\(log\|error\|warn\|debug\)" src/ --exclude-dir=node_modules | grep -v "logger.ts" | grep -v "browser-logger.ts"
```
Expected: No matches

4. **All services import logger:**
```bash
grep -L "from.*logger" src/server/services/*.ts
```
Expected: Empty (all import logger)

5. **Scope naming follows pattern:**
```bash
grep -r "scope:" src/ | grep -v "test" | awk -F'"' '{print $2}' | sort | uniq
```
Expected: All scopes match `{layer}.{feature}.{operation}` pattern (review list, no `db.` or `api.request` scopes)

6. **All toast.error use getUserMessage:**
```bash
grep -r "toast\.error" src/ | grep -v "getUserMessage"
```
Expected: No matches (or only const definitions, not calls)

7. **Start dev server and trigger operations:**
```bash
npm run dev
```
Manually test:
- Create invoice → should see `invoices.create` log (info level)
- Upload file → should see `tmp-files.save` log (info level)
- Slice file → should see `slicer.run`, `quick-order.slice` logs with timing
- Trigger error → user sees friendly message, logs show technical details
- Check: timestamps, correlation IDs, proper levels, PII sanitized

8. **Test log level filtering:**
```bash
LOG_LEVEL=error npm run dev
```
Expected: Only error logs visible (very quiet)

```bash
LOG_LEVEL=debug npm run dev
```
Expected: All logs visible including debug (3d orientation, etc.)

9. **Frontend error boundary test:**
- Modify component to throw error
- Expected: Error boundary catches, shows friendly UI, logs with scope `browser.error.boundary`

10. **User message quality check:**
- Trigger various errors (auth failure, validation, not found, etc.)
- Expected: All user-facing messages friendly, no stack traces, no technical jargon

# Implementation log created at:
# specs/comprehensive-logging-implementation/comprehensive-logging-implementation_implementation.log

## Definition of Done
- [ ] All Phase 1 acceptance criteria met
- [ ] All validation commands pass with expected output
- [ ] No regressions (existing tests still pass)
- [ ] User-friendly error messages: all toast.error() use getUserMessage()
- [ ] Patterns followed (scope naming, log levels, no over-logging)
- [ ] Documentation created with examples and user message guidelines
- [ ] Zero console.* in src/ (all replaced with logger)
- [ ] PII sanitization applied automatically
- [ ] Correlation IDs available via AsyncLocalStorage
- [ ] Phase 2 clearly deferred (no DB/API middleware logging)

## Notes

**Critical decisions made:**
- **NO over-logging**: Avoided all-request middleware, all-query DB logging (Phase 2 only if needed)
- **User messages first**: Technical logs separate from user-facing errors
- **Conservative start**: Focus on business operations, errors, critical paths
- **Phased approach**: Can add more instrumentation later based on actual needs

**Phase 2 options (deferred, only if needed):**
- DB slow query logging (>500ms threshold)
- API error-only middleware (4xx/5xx, skip 2xx/3xx)
- Request sampling (1% of success traffic)
- External observability (Datadog, New Relic, Axiom)
- Client-side error reporting (Sentry, LogRocket)
- Distributed tracing (OpenTelemetry)

**Libraries NOT added:**
- Staying with custom logger (lightweight, works)
- Could migrate to `pino` or `winston` later if needed
- JSON format compatible with log aggregators

**Performance impact:**
- Minimal: only log business operations + errors
- JSON.stringify fast for small objects
- Log level filtering prevents debug overhead in production
- PII sanitization has small overhead, acceptable for security

**Over-logging risks avoided:**
- High-traffic routes wouldn't spam logs
- DB queries stay silent unless slow (Phase 2)
- Worker computations don't log every step
- Health checks don't create noise

## Research Documentation
None required - using existing patterns and Node.js built-ins
