# API Architecture

Technical documentation for the 3D Print Sydney API layer, covering routing patterns, response envelopes, authentication strategies, and service integration.

---

## Design Philosophy

**RESTful Conventions**
- Resource-based URLs (`/api/invoices`, `/api/clients`)
- HTTP methods map to CRUD: `GET` (read), `POST` (create), `PUT`/`PATCH` (update), `DELETE` (remove)
- Action endpoints for complex operations: `/api/invoices/[id]/mark-paid`, `/api/quotes/[id]/convert`
- Consistent response envelopes for all JSON APIs

**Separation of Concerns**
- Routes handle HTTP (auth, validation, parsing)
- Services contain business logic
- Direct database queries only in service layer
- Response helpers (`respond.ts`) standardize envelope format

**Type Safety**
- Zod schemas validate all request payloads
- TypeScript DTOs define response shapes
- Service layer enforces type contracts

---

## Directory Structure

```
src/app/api/
├── admin/                  # Admin-only endpoints
│   ├── clients/           # Admin client management
│   └── users/             # Admin user management
│       ├── [id]/
│       │   ├── messages/  # User message management
│       │   └── route.ts   # User CRUD
│       └── route.ts
├── auth/                   # Public authentication
│   ├── login/
│   ├── logout/
│   ├── signup/
│   ├── forgot-password/
│   ├── change-password/
│   └── me/               # Current user profile
├── client/                # Client-only endpoints
│   ├── dashboard/
│   ├── invoices/
│   ├── jobs/
│   ├── materials/
│   └── preferences/
├── attachments/           # Invoice attachments
│   └── [id]/
├── clients/               # Client management
│   ├── [id]/
│   │   ├── notes/
│   │   └── route.ts
│   └── route.ts
├── dashboard/             # Dashboard data
│   ├── activity/
│   └── route.ts
├── export/                # CSV/Excel exports
│   ├── ar-aging/
│   ├── invoices/
│   ├── jobs/
│   ├── material-usage/
│   ├── payments/
│   └── printer-utilization/
├── invoices/              # Invoice management
│   ├── [id]/
│   │   ├── activity/
│   │   ├── attachments/
│   │   │   ├── [attachmentId]/
│   │   │   └── route.ts
│   │   ├── files/
│   │   ├── mark-paid/
│   │   ├── mark-unpaid/
│   │   ├── messages/
│   │   ├── payments/
│   │   │   ├── [paymentId]/
│   │   │   └── route.ts
│   │   ├── pdf/
│   │   ├── revert/
│   │   ├── stripe-session/
│   │   ├── void/
│   │   ├── write-off/
│   │   └── route.ts
│   └── route.ts
├── jobs/                  # Job management
│   ├── [id]/
│   │   ├── archive/
│   │   ├── status/
│   │   └── route.ts
│   ├── archive/
│   ├── reorder/
│   └── route.ts
├── maintenance/           # System maintenance
│   └── run/
├── materials/             # Material catalog
│   ├── [id]/
│   └── route.ts
├── messages/              # User messaging
│   └── route.ts
├── order-files/           # Order file management
│   └── [id]/
├── printers/              # Printer management
│   ├── [id]/
│   │   ├── clear-queue/
│   │   └── route.ts
│   └── route.ts
├── product-templates/     # Product template catalog
│   ├── [id]/
│   └── route.ts
├── quick-order/           # Public quick order flow
│   ├── checkout/
│   ├── orient/
│   ├── price/
│   ├── slice/
│   └── upload/
├── quotes/                # Quote management
│   ├── [id]/
│   │   ├── accept/
│   │   ├── convert/
│   │   ├── decline/
│   │   ├── duplicate/
│   │   ├── pdf/
│   │   ├── send/
│   │   ├── status/
│   │   └── route.ts
│   └── route.ts
├── settings/              # System settings
│   └── route.ts
├── stripe/                # Stripe integration
│   ├── test/
│   └── webhook/
└── tmp-file/              # Temporary file storage
    └── [...id]/
```

---

## Request/Response Patterns

### Response Envelope Format

All JSON API responses follow a standardized envelope defined in `/src/server/api/respond.ts`:

**Success Response (`ok`)**
```typescript
{
  "data": T  // Typed payload
}
```

**Error Response (`fail`)**
```typescript
{
  "error": {
    "code": string,     // Machine-readable error code
    "message": string,  // Human-readable message
    "details"?: object  // Optional additional context (e.g., Zod validation issues)
  }
}
```

### Response Helper Functions

```typescript
// Success response (default 200)
ok<T>(data: T, init?: ResponseInit): NextResponse<Success<T>>

// Error response (default 400)
fail(code: string, message: string, status?: number, details?: object): NextResponse<Failure>

// Centralized error handler
handleError(error: unknown, scope: string): NextResponse<Failure>
```

**Example Usage**
```typescript
// Success
return ok(client, { status: 201 });

// Error
return fail("VALIDATION_ERROR", "Invalid client payload", 422, { issues: error.issues });

// Auto-handled errors
try {
  const data = await service();
  return ok(data);
} catch (error) {
  return handleError(error, 'clients.list');
}
```

### Error Handling Strategy

**AppError Hierarchy** (`/src/lib/errors.ts`)
```typescript
AppError          // Base class (500)
├── NotFoundError        // 404
├── ValidationError      // 422
├── UnauthorizedError    // 401
├── ForbiddenError       // 403
├── ConflictError        // 409
└── BadRequestError      // 400
```

**Auto-mapping in `handleError`**
- `AppError` instances → mapped to `fail(error.code, error.message, error.status, error.details)`
- `ZodError` instances → `fail("VALIDATION_ERROR", ..., 422, { issues })`
- Generic errors → `fail("INTERNAL_ERROR", ..., 500)`

---

## Authentication Patterns

### API Auth Helpers (`/src/server/auth/api-helpers.ts`)

**Role-based guards:**
```typescript
requireAuth(req)              // Any authenticated user
requireAdmin(req)             // Admin role only
requireClient(req)            // Client role only
requireClientWithId(req)      // Client with clientId set
getAuthUser(req)              // Optional auth (returns null if not authenticated)
```

**Usage Example:**
```typescript
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);  // Throws UnauthorizedError or ForbiddenError
    const data = await listClients();
    return ok(data);
  } catch (error) {
    return handleError(error, 'clients.list');
  }
}
```

### Resource-Level Permissions (`/src/server/auth/permissions.ts`)

For fine-grained access control beyond role checks:

```typescript
requireInvoiceAccess(req, invoiceId)      // Admin or invoice owner
requireAttachmentAccess(req, attachmentId) // Via parent invoice
requirePaymentAccess(req, paymentId)       // Via parent invoice
```

**Pattern:**
- Admins bypass ownership checks
- Clients verified against resource ownership (via `client_id` or related entity)
- Throws `NotFoundError` if resource missing, `ForbiddenError` if unauthorized

**Example:**
```typescript
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const id = await parseId(context.params);
    await requireInvoiceAccess(request, id);  // Auth + ownership check
    const invoice = await getInvoiceDetail(id);
    return ok(invoice);
  } catch (error) {
    return handleError(error, "invoices.detail");
  }
}
```

---

## Service Layer Integration

### Pattern: Route → Service → Database

**Routes** (`/src/app/api/**/*.ts`)
- Parse request (params, body, query)
- Authenticate user
- Validate input with Zod schemas
- Call service functions
- Return standardized response

**Services** (`/src/server/services/*.ts`)
- Implement business logic
- Interact with database via Supabase client
- Map database rows to DTOs
- Throw typed errors (`AppError` subclasses)
- Log operations

**Example Flow:**
```typescript
// Route: /src/app/api/clients/route.ts
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const validated = clientInputSchema.parse(body);  // Zod validation
    const client = await createClient(validated);      // Service call
    return ok(client, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid client payload", 422, { issues: error.issues });
    }
    return handleError(error, "clients.create");
  }
}

// Service: /src/server/services/clients.ts
export async function createClient(input: ClientInput) {
  const supabase = getServiceSupabase();

  // Business logic (payment term validation, normalization)
  const paymentTermsCode = await normalizePaymentTermsCode(input.paymentTerms ?? null);

  // Database operation
  const { data, error } = await supabase
    .from('clients')
    .insert({ name: input.name, ... })
    .select()
    .single();

  if (error || !data) {
    throw new AppError(`Failed to create client: ${error?.message}`, 'DATABASE_ERROR', 500);
  }

  // Activity logging
  await insertActivity({
    clientId: data.id,
    action: 'CLIENT_CREATED',
    message: `Client ${data.name} created`,
  });

  logger.info({ scope: 'clients.create', data: { id: data.id } });
  return data;
}
```

---

## Data Transfer Objects (DTOs)

### Pattern: Schema → DTO → Response

**Input Schemas** (`/src/lib/schemas/*.ts`)
```typescript
// Zod schema for validation
export const invoiceInputSchema = z.object({
  clientId: z.number(),
  issueDate: z.string().optional(),
  lines: z.array(invoiceLineSchema).min(1),
  // ...
});

export type InvoiceInput = z.infer<typeof invoiceInputSchema>;
```

**Output DTOs** (`/src/lib/types/*.ts`)
```typescript
// Typed response objects
export interface ClientSummaryDTO {
  id: number;
  name: string;
  email: string;
  outstandingBalance: number;
  totalInvoices: number;
  createdAt: Date;
}

export interface ClientDetailDTO {
  client: ClientInfo;
  invoices: InvoiceReference[];
  quotes: QuoteReference[];
  jobs: JobReference[];
  activity: ActivityEntry[];
  totals: ClientTotals;
  clientUser: ClientUserInfo | null;
}
```

**Service Mapping Pattern:**
```typescript
function mapClientSummary(row: ClientRow): ClientSummaryDTO {
  const outstanding = row.invoices.reduce((sum, invoice) => {
    if (invoice.status === 'PAID') return sum;
    return sum + Number(invoice.balance_due ?? 0);
  }, 0);

  return {
    id: row.id,
    name: row.name,
    email: row.email ?? '',
    outstandingBalance: outstanding,
    totalInvoices: row.invoices.length,
    createdAt: new Date(row.created_at),
  };
}
```

---

## Validation & Error Handling

### Zod Schema Validation

**Location:** `/src/lib/schemas/`
- `auth.ts` - Login, signup, password reset
- `clients.ts` - Client CRUD, notes
- `invoices.ts` - Invoices, payments, line items, actions
- `jobs.ts` - Job creation, updates, status changes
- `quotes.ts` - Quotes, line items, actions
- `messages.ts` - User messaging
- `quick-order.ts` - Quick order flow
- `catalog.ts` - Materials, printers, product templates
- `settings.ts` - System settings
- `users.ts` - User management

**Validation Pattern:**
```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = invoiceInputSchema.parse(body);  // Throws ZodError on failure
    const result = await createInvoice(validated);
    return ok(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid invoice payload", 422, {
        issues: error.issues  // Detailed validation errors
      });
    }
    return handleError(error, "invoices.create");
  }
}
```

### ID Parameter Validation

**Common Pattern:**
```typescript
async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid invoice id");
  }
  return id;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const id = await parseId(context.params);
    // ...
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid invoice id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "invoices.detail");
  }
}
```

**Utility Helper:**
```typescript
// /src/lib/utils/api-params.ts
export function parseNumericId(id: string): number {
  const parsed = Number(id);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new BadRequestError("Invalid ID format");
  }
  return parsed;
}
```

---

## Endpoint Inventory

### Admin Endpoints

Require `requireAdmin()` - full system access.

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/admin/clients` | GET | List all clients (sorted) |
| `/api/admin/users` | GET, POST | User management |
| `/api/admin/users/[id]` | GET, PUT, DELETE | User CRUD |
| `/api/admin/users/[id]/messages` | GET | User message history |
| `/api/clients` | GET, POST | Client list/create |
| `/api/clients/[id]` | GET, PUT, DELETE | Client detail/update/delete |
| `/api/clients/[id]/notes` | POST | Add client note |
| `/api/dashboard` | GET | Admin dashboard stats |
| `/api/dashboard/activity` | GET | Recent activity log |
| `/api/export/ar-aging` | GET | Accounts receivable aging report |
| `/api/export/invoices` | GET | Invoice CSV export |
| `/api/export/jobs` | GET | Job CSV export |
| `/api/export/material-usage` | GET | Material usage report |
| `/api/export/payments` | GET | Payment CSV export |
| `/api/export/printer-utilization` | GET | Printer utilization report |
| `/api/invoices` | GET, POST | Invoice list/create |
| `/api/invoices/[id]` | GET, PUT, DELETE | Invoice detail/update/delete |
| `/api/invoices/[id]/activity` | GET | Invoice activity log |
| `/api/invoices/[id]/attachments` | GET, POST | Invoice attachments |
| `/api/invoices/[id]/attachments/[attachmentId]` | DELETE | Remove attachment |
| `/api/invoices/[id]/files` | GET | Invoice related files |
| `/api/invoices/[id]/mark-paid` | POST | Mark invoice as paid |
| `/api/invoices/[id]/mark-unpaid` | POST | Mark invoice as unpaid |
| `/api/invoices/[id]/messages` | GET, POST | Invoice messages |
| `/api/invoices/[id]/payments` | GET, POST | Invoice payments |
| `/api/invoices/[id]/payments/[paymentId]` | DELETE | Delete payment |
| `/api/invoices/[id]/pdf` | GET | Generate invoice PDF |
| `/api/invoices/[id]/revert` | POST | Revert invoice status |
| `/api/invoices/[id]/stripe-session` | POST | Create Stripe session |
| `/api/invoices/[id]/void` | POST | Void invoice |
| `/api/invoices/[id]/write-off` | POST | Write off invoice |
| `/api/jobs` | GET, POST | Job list/create |
| `/api/jobs/[id]` | PATCH | Update job |
| `/api/jobs/[id]/archive` | POST | Archive job |
| `/api/jobs/[id]/status` | PATCH | Update job status |
| `/api/jobs/archive` | GET | List archived jobs |
| `/api/jobs/reorder` | POST | Reorder job queue |
| `/api/maintenance/run` | POST | Run maintenance tasks |
| `/api/materials` | GET, POST | Material catalog |
| `/api/materials/[id]` | GET, PUT, DELETE | Material CRUD |
| `/api/printers` | GET, POST | Printer management |
| `/api/printers/[id]` | GET, PUT, DELETE | Printer CRUD |
| `/api/printers/[id]/clear-queue` | POST | Clear printer queue |
| `/api/product-templates` | GET, POST | Product template catalog |
| `/api/product-templates/[id]` | GET, PUT, DELETE | Template CRUD |
| `/api/quotes` | GET, POST | Quote list/create |
| `/api/quotes/[id]` | GET, PUT, DELETE | Quote detail/update/delete |
| `/api/quotes/[id]/accept` | POST | Accept quote |
| `/api/quotes/[id]/convert` | POST | Convert quote to invoice |
| `/api/quotes/[id]/decline` | POST | Decline quote |
| `/api/quotes/[id]/duplicate` | POST | Duplicate quote |
| `/api/quotes/[id]/pdf` | GET | Generate quote PDF |
| `/api/quotes/[id]/send` | POST | Send quote to client |
| `/api/quotes/[id]/status` | PUT | Update quote status |
| `/api/settings` | GET, PUT | System settings |

### Client Endpoints

Require `requireClient()` or `requireClientWithId()` - scoped to client's own data.

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/client/dashboard` | GET | Client dashboard stats |
| `/api/client/invoices` | GET | Client's invoices |
| `/api/client/jobs` | GET | Client's jobs |
| `/api/client/materials` | GET | Available materials |
| `/api/client/preferences` | GET, PUT | Client preferences |
| `/api/invoices/[id]` | GET | Invoice detail (if owner) |
| `/api/invoices/[id]/apply-credit` | POST | Apply wallet credits to invoice (if owner) |
| `/api/invoices/[id]/pdf` | GET | Invoice PDF (if owner) |
| `/api/invoices/[id]/stripe-session` | POST | Stripe payment (if owner) |
| `/api/messages` | GET, POST | User messages |

### Public Endpoints

No authentication required (or optional auth).

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/auth/login` | POST | User login |
| `/api/auth/logout` | POST | User logout |
| `/api/auth/signup` | POST | User registration |
| `/api/auth/forgot-password` | POST | Password reset request |
| `/api/auth/change-password` | POST | Change password |
| `/api/auth/me` | GET | Current user profile |
| `/api/quick-order/upload` | POST | Upload STL files (requires auth) |
| `/api/quick-order/orient` | POST | Auto-orient model |
| `/api/quick-order/slice` | POST | Generate slicing data |
| `/api/quick-order/price` | POST | Calculate pricing |
| `/api/quick-order/checkout` | POST | Complete order |
| `/api/stripe/webhook` | POST | Stripe event handler |
| `/api/tmp-file/[...id]` | GET | Retrieve temporary file |
| `/api/order-files/[id]` | GET | Download order file |

### Shared Endpoints

Use `requireInvoiceAccess()` or similar for context-aware permissions.

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/attachments/[id]` | GET, DELETE | Attachment operations (via invoice access) |
| `/api/invoices/[id]/*` | Various | Invoice operations (admin or owner) |

---

## Special Patterns

### File Upload/Download

**Upload (multipart/form-data):**
```typescript
export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  const form = await req.formData();
  const files = form.getAll("files");

  for (const entry of files) {
    if (!(entry instanceof File)) continue;
    validateOrderFile({ size: entry.size, type: entry.type, name: entry.name });
    const buf = Buffer.from(await entry.arrayBuffer());
    const { record, tmpId } = await saveTmpFile(user.id, entry.name, buf, entry.type);
    // ...
  }
  return ok(results);
}
```

**Download (CSV/PDF):**
```typescript
export async function GET(request: NextRequest) {
  await requireAdmin(request);
  const payload = await exportInvoicesCsv({ from, to });

  return new Response(payload.csv, {
    status: 200,
    headers: {
      "Content-Type": payload.contentType,
      "Content-Disposition": `attachment; filename="${payload.filename}"`,
    },
  });
}
```

### Webhook Handlers

**Stripe Webhook:**
```typescript
export const runtime = "nodejs";  // Required for Buffer API

export async function POST(request: Request) {
  try {
    const env = await getStripeEnvironment();
    const bodyBuffer = Buffer.from(await request.arrayBuffer());
    const signature = request.headers.get("stripe-signature");

    const event = env.stripe.webhooks.constructEvent(
      bodyBuffer,
      signature,
      env.webhookSecret
    );

    await handleStripeEvent(event);
    return ok({ received: true });
  } catch (error) {
    return handleError(error, 'stripe.webhook');
  }
}
```

### Async Context Parameters (Next.js 15)

**Route params are now async:**
```typescript
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }  // Async promise
) {
  const { id } = await context.params;  // Must await
  // ...
}
```

---

## Common Code Patterns

### Standard CRUD Route
```typescript
// GET /api/resource
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "0");
    const offset = Number(searchParams.get("offset") ?? "0");

    const resources = await listResources({ limit, offset });
    return ok(resources);
  } catch (error) {
    return handleError(error, 'resource.list');
  }
}

// POST /api/resource
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const validated = resourceInputSchema.parse(body);
    const resource = await createResource(validated);
    return ok(resource, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid payload", 422, { issues: error.issues });
    }
    return handleError(error, "resource.create");
  }
}

// PUT /api/resource/[id]
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const id = await parseId(context.params);
    await requireAdmin(request);
    const body = await request.json();
    const validated = resourceInputSchema.parse(body);
    const resource = await updateResource(id, validated);
    return ok(resource);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid payload", 422, { issues: error.issues });
    }
    return handleError(error, "resource.update");
  }
}

// DELETE /api/resource/[id]
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const id = await parseId(context.params);
    await requireAdmin(request);
    const resource = await deleteResource(id);
    return ok(resource);
  } catch (error) {
    return handleError(error, "resource.delete");
  }
}
```

### Action Endpoint Pattern
```typescript
// POST /api/invoices/[id]/mark-paid
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const id = await parseId(context.params);
    await requireInvoiceAccess(request, id);

    // Optional payload
    let payload: unknown = undefined;
    if (request.headers.get("content-type")?.includes("application/json")) {
      const text = await request.text();
      if (text.trim().length > 0) {
        payload = JSON.parse(text);
      }
    }

    const parsed = payload ? paymentInputSchema.partial().parse(payload) : {};
    await markInvoicePaid(id, parsed);

    return ok({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid payment payload", 422, { issues: error.issues });
    }
    return handleError(error, "invoices.markPaid");
  }
}
```

---

## Migration Notes

### Recent Standardization Changes

**Phase 3: Response Format** (Completed 2025-01-21)
- All routes now use `ok()` and `fail()` from `respond.ts`
- Eliminated legacy `success()` and `NextResponse.json()` patterns
- Consistent error envelope with `{ error: { code, message, details } }`

**Phase 7: Validation** (Completed 2025-01-21)
- All request validation uses Zod schemas from `/src/lib/schemas/`
- ZodError handled uniformly: `fail("VALIDATION_ERROR", ..., 422, { issues })`
- Input types derived via `z.infer<typeof schema>`

**Phase 8: Logging** (Completed 2025-01-21)
- All structured logging uses `logger.info()`, `logger.error()`, etc.
- Format: `logger.error({ scope: 'domain.operation', message: 'Description', error })`
- No more `console.log` or `console.error`

**Known Patterns:**
- All routes follow: parse → auth → validate → service → respond
- Service layer throws `AppError` subclasses, routes use `handleError()`
- DTOs map database rows to typed API responses
- Activity logging inserted within service functions

---

## Testing Considerations

### API Route Testing Strategy

**Test Layers:**
1. Unit tests for service functions (mock Supabase)
2. Integration tests for routes (test request/response contracts)
3. E2E tests for critical flows (auth + permissions)

**Mock Patterns:**
```typescript
// Mock auth helpers
jest.mock('@/server/auth/api-helpers', () => ({
  requireAdmin: jest.fn().mockResolvedValue({ id: 1, role: 'ADMIN' })
}));

// Mock service functions
jest.mock('@/server/services/clients', () => ({
  listClients: jest.fn().mockResolvedValue([...])
}));
```

**Response Contract Validation:**
```typescript
const response = await GET(request);
const json = await response.json();

// Success
expect(json).toHaveProperty('data');
expect(json).not.toHaveProperty('error');

// Error
expect(json).toHaveProperty('error');
expect(json.error).toHaveProperty('code');
expect(json.error).toHaveProperty('message');
```

---

## Related Documentation

- **Service Layer:** See individual service files in `/src/server/services/`
- **Authentication:** `/src/server/auth/session.ts` (session management)
- **Permissions:** `/src/server/auth/permissions.ts` (resource-level access)
- **Database:** Supabase client in `/src/server/supabase/`
- **Types:** `/src/lib/types/` (DTOs), `/src/lib/schemas/` (validation)
- **Error Handling:** `/src/lib/errors.ts` (AppError hierarchy)
