# API Architecture

## 1. API Design Philosophy

**Framework:** Next.js App Router with serverless route handlers in `src/app/api/`

**REST Conventions:**
- Resources mapped to hierarchical paths: `/api/clients`, `/api/invoices/[id]`
- Standard HTTP methods: `GET` (retrieve), `POST` (create), `PUT` (update), `DELETE` (destroy)
- Resource actions as sub-routes: `/api/invoices/[id]/mark-paid`, `/api/quotes/[id]/convert`

**URL Structure:**
- Collection endpoints: `/api/resource` → list/create
- Item endpoints: `/api/resource/[id]` → get/update/delete
- Action endpoints: `/api/resource/[id]/action` → perform state changes
- Nested resources: `/api/invoices/[id]/payments/[paymentId]`

**Query Parameters:** Pagination, filtering, sorting support on collection endpoints
- `limit`, `offset`: Pagination controls
- `q`: Search/filter term
- `sort`, `order`: Sorting configuration

---

## 2. Endpoint Organization

**Directory Structure:**
```
src/app/api/
├── auth/              # Authentication: login, logout, password, signup
├── admin/             # Admin-only: users, clients management
├── clients/           # Client management & detail operations
├── invoices/          # Invoice CRUD + related operations
├── quotes/            # Quote management & lifecycle
├── jobs/              # Job tracking & status management
├── materials/         # Material catalog
├── printers/          # Printer management
├── product-templates/ # Product templates for invoices
├── dashboard/         # Analytics & metrics
├── client/            # Client portal: self-service endpoints
├── quick-order/       # Quick ordering workflow
├── export/            # Data exports (CSV/reports)
├── stripe/            # Stripe integration & webhooks
└── maintenance/       # Background tasks & cron endpoints
```

**Endpoint Categories:**

**Admin Endpoints** (require `requireAdmin`):
- `GET /api/admin/users` — List all users
- `GET /api/admin/clients` — List all clients
- `POST /api/clients` — Create client
- `PUT /api/clients/[id]` — Update client
- `GET /api/invoices` — List invoices
- `POST /api/invoices` — Create invoice
- `PUT /api/printers/[id]` — Update printer config

**Client Endpoints** (authenticated, own data only):
- `GET /api/client/invoices` — Client's invoices
- `GET /api/client/dashboard` — Client metrics
- `GET /api/client/jobs` — Client's jobs
- `POST /api/quick-order/checkout` — Self-serve ordering

**Public Endpoints** (no auth):
- `POST /api/auth/login` — User login
- `POST /api/auth/signup` — User registration
- `POST /api/stripe/webhook` — Stripe event handler

**Shared Resources** (dual access, auth required):
- `GET /api/invoices/[id]` — Admin or owning client
- `GET /api/quotes/[id]` — Admin or owning client

---

## 3. Request/Response Patterns

**Standard Response Envelope (Success):**
```ts
{
  data: T  // Typed payload (DTO or array)
}
```

**Standard Response Envelope (Error):**
```ts
{
  error: {
    code: string;           // VALIDATION_ERROR, UNAUTHORIZED, NOT_FOUND, etc.
    message: string;        // Human-readable message
    details?: Record<string, unknown>;  // Extra context (validation issues, etc.)
  }
}
```

**HTTP Status Codes:**
- `200` — Success
- `201` — Created
- `400` — Bad request (validation, missing params)
- `401` — Unauthorized (no auth token)
- `403` — Forbidden (insufficient permissions)
- `404` — Not found
- `422` — Validation error (Zod failures)
- `500` — Internal error

**Content-Type:**
- Request: `application/json` (via `req.json()`)
- Response: `application/json` (via `NextResponse.json()`)

---

## 4. Service Layer Pattern

**Separation of Concerns:**

Routes handle:
- HTTP parsing (params, query strings, body)
- Authentication & authorization checks
- Response formatting

Services (in `src/server/services/`) handle:
- Business logic
- Data validation with Zod schemas
- Database operations via Supabase
- Complex workflows

**Service Responsibilities:**
- Accept validated input types (or raw payload for parsing)
- Perform CRUD operations
- Apply business rules (calculations, state transitions)
- Return DTOs (Data Transfer Objects)
- Throw errors with appropriate metadata (`status` property)

**Key Services:**
- `clients.ts` — Client management, contact normalization
- `invoices.ts` — Invoice lifecycle, payment tracking, line calculations
- `quotes.ts` — Quote generation, conversion to invoices, versioning
- `jobs.ts` — Job creation, status transitions, archive management
- `materials.ts` — Material catalog, pricing updates
- `users.ts` — User account management, role assignment
- `quick-order.ts` — Pricing, shipping calculation, checkout flow
- `exports.ts` — Data export formatting (CSV, summaries)

**Benefits:**
- Testable: Services decoupled from HTTP
- Reusable: Called from routes, crons, webhooks
- Clear responsibility: Routes orchestrate, services execute

---

## 5. Data Transfer Objects (DTOs)

**Purpose:**
- Transform raw database rows into response objects
- Hide internal schema; expose only needed fields
- Provide type-safe contracts for API consumers
- Apply formatting: dates, decimals, computed values

**Row to DTO Transformation:**

```ts
// Database row (snake_case)
type ClientRow = {
  id: number;
  name: string;
  email: string;
  payment_terms: string | null;
  created_at: string;
  invoices: { balance_due: string; status: string }[];
};

// DTO (camelCase, computed fields)
export type ClientSummaryDTO = {
  id: number;
  name: string;
  email: string;
  paymentTerms: string | null;
  outstandingBalance: number;  // Computed from invoices
  createdAt: Date;
};

function mapClientSummary(row: ClientRow): ClientSummaryDTO {
  const outstanding = row.invoices.reduce((sum, inv) => {
    return inv.status === 'PAID' ? sum : sum + Number(inv.balance_due);
  }, 0);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    paymentTerms: row.payment_terms,
    outstandingBalance: outstanding,
    createdAt: new Date(row.created_at),
  };
}
```

**Summary vs Detail DTOs:**
- **Summary (List):** Minimal fields for lists
- **Detail (Get):** Full fields + nested relationships + metadata

---

## 6. Validation & Error Handling

**Zod Schema Validation:**

Schemas defined in `src/lib/schemas/`:
```ts
const invoiceInputSchema = z.object({
  clientId: z.number(),
  lines: z.array(invoiceLineSchema).min(1),
  taxRate: z.number().min(0).max(100).optional(),
  shippingCost: z.number().min(0).optional(),
  // ... more fields
});

type InvoiceInput = z.infer<typeof invoiceInputSchema>;
```

**Validation Flow:**
1. Route receives JSON payload
2. Service calls `schema.parse(payload)` → throws `ZodError` on failure
3. Route catches `ZodError` → calls `fail("VALIDATION_ERROR", ...)`

**Error Propagation:**

Services throw errors with optional `status` property:
```ts
throw Object.assign(
  new Error("Client not found"),
  { status: 404 }
);
```

Routes catch and pass to `handleError(error, scope)`:
```ts
catch (error) {
  if (error instanceof ZodError) {
    return fail("VALIDATION_ERROR", "Invalid payload", 422, {
      issues: error.issues,
    });
  }
  return handleError(error, "invoices.create");
}
```

**Logging:**
- `handleError()` logs to logger with scope and error
- Scope format: `resource.operation` (e.g., `invoices.create`, `clients.list`)

---

## 7. Authentication in APIs

**API Route Protection:**

Three levels:
1. **No auth required:** Login, signup, webhooks
2. **User required:** `await requireUser(req)` → any authenticated user
3. **Admin required:** `await requireAdmin(req)` → admin role only

**Auth Helper Functions** (`src/server/auth/`):

```ts
// Extract user from request
const user = await getUserFromRequest(req);  // null if no valid token

// Require authentication
const user = await requireUser(req);  // throws 401 if missing

// Require admin role
const user = await requireAdmin(req);  // throws 403 if not admin

// Resource-specific access
await requireInvoiceAccess(req, invoiceId);  // Admin or owning client
```

**Token Extraction:**
- Token stored in `sb:token` HTTP-only cookie (Supabase auth)
- Route accesses via `req.cookies.get("sb:token")?value`
- Validated against Supabase Auth service
- Fallback to legacy user profile in `users` table

**Error Responses:**
```ts
// 401 Unauthorized (no token or invalid)
throw Object.assign(new Error("Unauthorized"), { status: 401 });

// 403 Forbidden (insufficient role/access)
throw Object.assign(new Error("Forbidden"), { status: 403 });

// 404 Not Found (resource doesn't exist)
throw Object.assign(new Error("Not found"), { status: 404 });
```

---

## 8. Middleware

**Global Middleware** (`middleware.ts`):
- Runs on every request (except API, static assets)
- Validates access token & refreshes if expired
- Enforces public routes (login, signup)
- Redirects unauthenticated users to login
- Routes CLIENT role users to `/client` only
- Routes ADMIN role users to admin dashboard

**Cross-Cutting Concerns Handled:**
- Authentication state refresh
- Authorization redirects
- Role-based route protection
- Session persistence

---

## Key Patterns & Conventions

1. **Async Context Parameters:** Routes use `context: { params: Promise<{ id: string }> }` (Next.js 15+)
2. **Scope-Based Logging:** Error logs include operation scope for debugging
3. **Error Status Property:** Custom errors attach `status` for HTTP response code
4. **DTO Layer:** All responses mapped through DTOs, never raw rows
5. **Zod Validation:** All user input validated at service layer
6. **Service Composition:** Invoices service calls jobs service, quotes service calls invoices
7. **Supabase RLS:** Row-level security at database layer complements route-level auth
8. **No GraphQL:** Pure REST API with standard CRUD operations

