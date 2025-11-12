# Testing Setup & Observability Report: 3D Print Sydney

## 1. EXISTING TEST SETUP

### Vitest Configuration
**Location:** `/Users/varunprasad/code/prjs/3dprintsydney/vitest.config.ts`

```typescript
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
  },
});
```

**Status:** Minimal config - uses Node environment, supports TypeScript paths

### Existing Test Files (4 total)
1. `/src/server/services/__tests__/quick-order-pricing.test.ts` - Pricing logic tests
2. `/src/lib/utils/__tests__/validators.test.ts` - File validation tests
3. `/src/lib/3d/__tests__/face-alignment.test.ts` - 3D geometry tests
4. `/src/lib/3d/__tests__/overhang-detector.test.ts` - Overhang detection tests

**Test Pattern:** Vitest with mocking, describe/it/expect structure

### Test Command
```bash
npm test  # Runs vitest
```

---

## 2. LOGGING INFRASTRUCTURE

### Logger Architecture (Dual System)

#### Server Logger
**Location:** `/src/lib/logger.ts`

Features:
- Correlation ID tracking (AsyncLocalStorage-based)
- Request/User ID tracking
- PII sanitization (strips password, token, apiKey, secret, creditCard fields)
- Card number masking (shows only last 4 digits)
- String truncation (max 1024 chars)
- Circular reference handling
- JSON structured output

Log levels: debug, info, warn, error (configurable)

```typescript
export const logger = {
  debug: (payload) => emit("debug", payload),
  info: (payload) => emit("info", payload),
  warn: (payload) => emit("warn", payload),
  error: (payload) => emit("error", payload),
  timing: (scope, start, payload) => { /* duration tracking */ }
};
```

#### Browser Logger
**Location:** `/src/lib/logging/browser-logger.ts`

Identical to server logger but:
- Never includes stack traces (set to undefined)
- No correlation ID/request ID/userId in output
- Sanitized for browser safety

#### Configuration
**Location:** `/src/lib/logging/config.ts`

```typescript
const serverLogLevel = parseLogLevel(process.env.LOG_LEVEL);       // defaults: info
const frontendLogLevel = parseLogLevel(process.env.NEXT_PUBLIC_LOG_LEVEL);

featureFlags: {
  dbLoggingEnabled: process.env.ENABLE_DB_LOGGING === "true",
  requestLoggingEnabled: process.env.ENABLE_REQUEST_LOGGING === "true",
}
```

#### Correlation Context
**Location:** `/src/lib/logging/correlation.ts`

Uses AsyncLocalStorage for request-scoped context:
- correlationId (UUID, auto-generated if missing)
- requestId (optional)
- userId (optional, string | number)

```typescript
runWithCorrelationContext<T>(callback, context) // Wraps execution with context
```

---

## 3. ERROR BOUNDARIES & HANDLING

### React Error Boundary
**Location:** `/src/components/error-boundary.tsx`

```typescript
export class ErrorBoundary extends Component {
  componentDidCatch(error, info) {
    browserLogger.error({
      scope: "browser.error.boundary",
      message: "Unhandled error caught in React tree",
      error,
      data: { componentStack: info.componentStack }
    });
  }
  
  // Shows user-friendly error message + retry/refresh buttons
}
```

### Error User Messages
**Location:** `/src/lib/errors/user-messages.ts` (referenced but not shown)

Maps error types to user-friendly messages

### Async Action Hook
**Location:** `/src/hooks/useAsyncAction.ts`

```typescript
export function useAsyncAction(options = {}) {
  const { loading, error, execute } = useAsyncAction({
    successMessage?: string,
    errorMessage?: string,
    onSuccess?: () => void,
    onError?: (err) => void
  });
  
  // Wraps async operations with:
  // - Loading state
  // - Error handling
  // - Toast notifications (via sonner)
  // - Callback hooks
}
```

---

## 4. CRITICAL FLOW PATHS FOR E2E TESTING

### Path 1: Login → Dashboard
**Entry:** `/app/(public)/login/page.tsx`

```
1. User navigates to /login
2. Page checks /api/auth/me (unauthenticated → renders form)
3. Form submit POST /api/auth/login
   - Auth service validates email/password
   - Creates session (Supabase)
   - Sets auth cookies (sb:token, sb:refresh-token)
4. Response contains role (ADMIN|CLIENT)
5. Router redirects to /dashboard (admin) or /me (client)
```

**Handler:** `/app/api/auth/login/route.ts`
**Service:** `handleLogin` from auth service
**Auth Guards:** `requireAuth()`, `requireAdmin()`, `requireClient()` hooks

### Path 2: Quick Order Flow
**Entry:** `/app/(client)/quick-order/page.tsx` (27K lines - complex)

**Steps:**
1. User uploads STL file
2. File validation (type, size, extension check via validators)
3. 3D analysis (face alignment, overhang detection)
4. Pricing calculation via `priceQuickOrder()` service
5. Item customization (supports, infill, layer height)
6. Shipping/tax calculation
7. Order submission (POST endpoint)
8. Redirect to order status page

**Key Dependencies:**
- Material costs from DB
- Settings (hourly rate, setup fee, min price, shipping regions)
- Tax calculation

### Path 3: Job Status Transitions
**Entry:** `/app/(admin)/jobs/page.tsx`

**Transitions tracked via:**
- Invoice state machine (pending, approved, submitted, completed, failed)
- Activity logs with timestamps
- Payment status changes
- Messaging around status updates

---

## 5. RECOMMENDED E2E COVERAGE (Priority Order)

### HIGH PRIORITY
1. **Auth Flow** - Login/logout, role-based redirects
2. **Quick Order** - File upload → pricing → submission
3. **Invoice Lifecycle** - Create → approve → mark paid → track status
4. **Payment Processing** - Stripe integration, payment confirmation

### MEDIUM PRIORITY
5. Admin dashboard data loading
6. Job queue management and status updates
7. Message/collaboration features
8. Client portal navigation and account management

### LOW PRIORITY
9. Settings/configuration management
10. Reports generation
11. Material management (admin only)
12. User management (admin only)

---

## 6. LOGGING PATTERNS FOUND

### Standard Payload Structure
```typescript
{
  scope: "module.action.context",           // e.g., "browser.error.boundary"
  message?: string,                          // Human-readable
  error?: Error,                             // Exception object
  data?: Record<string, unknown>,            // Context data (sanitized)
  correlationId?: string,                    // Set by correlation middleware
  requestId?: string,                        // Optional, set per request
  userId?: string | number,                  // Optional, current user
  timestamp: string,                         // ISO 8601
  level: "debug" | "info" | "warn" | "error"
}
```

### Sanitization Rules
- **Automatic strip:** password, token, apiKey, secret, creditCard
- **Card number masking:** Any field with "card" in name → "****XXXX"
- **String truncation:** > 1024 chars → truncate + "..."
- **Circular refs:** Replaced with "[Circular]"
- **Stack traces:** Only in development (server logger), never in browser

### Timing Logs
```typescript
logger.timing("scope", startTime, { 
  message: "Operation name",
  data: { userId: 123 }
  // Automatically appends durationMs
});
```

---

## 7. API ROUTE STRUCTURE

### Auth Routes
- POST `/api/auth/login` - Login with email/password
- POST `/api/auth/signup` - Create account
- POST `/api/auth/logout` - Logout
- POST `/api/auth/change-password` - Update password
- GET `/api/auth/me` - Current user info

### Key Endpoints for E2E
- POST `/api/clients` - Create client
- POST `/api/invoices` - Create invoice
- POST `/api/invoices/[id]/payments` - Record payment
- PATCH `/api/invoices/[id]/mark-paid` - Update invoice status
- POST `/api/messages` - Send message
- GET `/api/materials` - Fetch material pricing

---

## 8. CRITICAL UNRESOLVED QUESTIONS

1. **E2E Framework choice?** 
   - Playwright vs Cypress vs Puppeteer?
   - Browser targets (Chromium only or multi-browser)?

2. **Test data strategy?**
   - Factory fixtures for users/materials/invoices?
   - Seed DB before each test or isolated in-memory?
   - Production data masking if using real DB?

3. **Auth for E2E tests?**
   - Mock Supabase JWT or use real auth service?
   - Session persistence between tests?
   - Admin vs client user roles in tests?

4. **File upload testing?**
   - Mock 3D file analysis (geometry detection)?
   - Test with real STL files or fixtures?
   - How to verify 3D processing in headless env?

5. **External services?**
   - Mock Stripe for payment tests?
   - Mock Resend email service?
   - Real DB or test database?

6. **CI/CD integration?**
   - Container-based test environment?
   - Parallel test execution strategy?
   - Failure screenshots/videos?

---

## 9. QUICK REFERENCE: Key File Locations

| Category | File | Purpose |
|----------|------|---------|
| **Test Config** | vitest.config.ts | Vitest setup |
| **Server Logger** | src/lib/logger.ts | Structured logging |
| **Browser Logger** | src/lib/logging/browser-logger.ts | Client-side logging |
| **Log Config** | src/lib/logging/config.ts | Log levels & flags |
| **Correlation** | src/lib/logging/correlation.ts | Request tracking |
| **Error Boundary** | src/components/error-boundary.tsx | React error handling |
| **Async Hook** | src/hooks/useAsyncAction.ts | Form action state |
| **Auth Helpers** | src/lib/auth-utils.ts | Server component auth guards |
| **Auth Routes** | src/app/api/auth/* | Auth endpoints |
| **Quick Order** | src/app/(client)/quick-order/page.tsx | Main order flow |
| **Pricing Service** | src/server/services/quick-order.ts | Pricing logic (tested) |

