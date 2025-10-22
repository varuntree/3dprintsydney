# System Overview

**3D Print Sydney Management System**

A comprehensive business management platform for 3D printing services, handling quotes, orders, invoicing, production scheduling, and client relationships.

---

## Table of Contents

- [Project Background](#project-background)
- [High-Level Architecture](#high-level-architecture)
- [Technology Stack](#technology-stack)
- [Key Design Decisions](#key-design-decisions)
- [System Boundaries](#system-boundaries)
- [Data Architecture](#data-architecture)
- [Authentication & Authorization](#authentication--authorization)
- [Key Features by Role](#key-features-by-role)
- [Project Statistics](#project-statistics)

---

## Project Background

### Evolution

This system evolved from a basic quote-to-invoice workflow into a full-featured business management platform. Recent cleanup efforts standardized patterns across API routes, services, and error handling to improve maintainability.

### Purpose

Enable a 3D printing business to:
- Generate and send quotes to clients
- Convert quotes to production jobs
- Manage print queue scheduling
- Track material usage and printer utilization
- Generate invoices with online payment
- Export financial and operational reports
- Maintain client communications

---

## High-Level Architecture

### Architecture Pattern: Layered Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                      │
│  Next.js 15 App Router (React 19, Server Components)        │
│  - Route Groups: (public), (admin), (client)                │
│  - 79 React Components (UI + feature components)            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        API LAYER                             │
│  77 Next.js API Routes (/app/api)                           │
│  - Authentication & session management                       │
│  - Role-based access control (ADMIN/CLIENT)                 │
│  - Request validation (Zod schemas)                          │
│  - Standardized error handling                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                           │
│  19 Business Logic Services (/server/services)              │
│  - Transactional workflows                                   │
│  - Cross-entity operations                                   │
│  - Domain logic encapsulation                                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       DATA LAYER                             │
│  Supabase (PostgreSQL + Auth + Storage)                     │
│  - 10 database migrations                                    │
│  - Row-level security policies                              │
│  - 4 storage buckets (attachments, pdfs, tmp, order-files)  │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── app/                        # Next.js App Router
│   ├── (public)/              # Public routes (login, signup)
│   ├── (admin)/               # Admin-only routes (12 sections)
│   ├── (client)/              # Client portal routes
│   └── api/                   # 77 API route handlers
│
├── components/                # React components (79 total)
│   ├── ui/                    # 43 shadcn/ui components
│   ├── invoices/              # Invoice-specific components
│   ├── quotes/                # Quote-specific components
│   ├── clients/               # Client management components
│   ├── jobs/                  # Production job components
│   ├── messages/              # Messaging components
│   ├── dashboard/             # Dashboard widgets
│   ├── layout/                # Shell and navigation
│   ├── 3d/                    # STL viewer components
│   └── providers/             # React context providers
│
├── server/                    # Server-side code
│   ├── services/              # 19 business logic services
│   ├── pdf/                   # PDF generation (quotes/invoices)
│   ├── storage/               # File upload/download
│   ├── slicer/                # 3D model slicing integration
│   ├── supabase/              # Service-role Supabase client
│   └── auth/                  # Auth helpers for API routes
│
├── lib/                       # Shared utilities
│   ├── types/                 # TypeScript type definitions
│   ├── schemas/               # Zod validation schemas
│   ├── constants/             # Enums and constants
│   ├── supabase/              # Client/server Supabase helpers
│   ├── utils/                 # Validation & formatting utilities
│   ├── 3d/                    # 3D geometry calculations
│   ├── chat/                  # Message grouping utilities
│   ├── calculations.ts        # Pricing/tax calculations
│   ├── currency.ts            # Currency formatting
│   ├── datetime.ts            # Date utilities
│   ├── errors.ts              # Custom error classes
│   ├── http.ts                # Fetch wrappers
│   ├── logger.ts              # Structured logging
│   └── env.ts                 # Environment variable access
│
└── hooks/                     # React custom hooks
    ├── useAsyncAction.ts
    ├── useNavigation.ts
    └── use-stripe-status.ts
```

---

## Technology Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.5.3 | App Router, Server Components, API Routes |
| **React** | 19.1.0 | UI library with server/client components |
| **TypeScript** | 5.x | Type safety across 271 TS/TSX files |

### Database & Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Supabase** | 2.47.0 | PostgreSQL database, Auth, Storage |
| **@supabase/ssr** | 0.5.0 | Server-side Supabase client for Next.js |
| **Zod** | 4.1.9 | Runtime schema validation |

### UI & Styling

| Technology | Version | Purpose |
|------------|---------|---------|
| **Tailwind CSS** | 4.x | Utility-first styling |
| **Radix UI** | Various | Unstyled accessible components |
| **shadcn/ui** | Custom | Pre-built component library (43 components) |
| **Lucide React** | 0.544.0 | Icon library |
| **class-variance-authority** | 0.7.1 | Component variant management |

### Data Fetching & State

| Technology | Version | Purpose |
|------------|---------|---------|
| **TanStack Query** | 5.89.0 | Server state management, caching |
| **React Hook Form** | 7.62.0 | Form state and validation |
| **Zustand** | 5.0.8 | Client-side global state |
| **Immer** | 10.1.3 | Immutable state updates |

### 3D & Visualization

| Technology | Version | Purpose |
|------------|---------|---------|
| **Three.js** | 0.170.0 | 3D rendering engine |
| **@react-three/fiber** | 9.4.0 | React renderer for Three.js |
| **@react-three/drei** | 10.7.6 | Three.js helpers and abstractions |

### PDF Generation

| Technology | Version | Purpose |
|------------|---------|---------|
| **Puppeteer** | 24.21.0 | Headless browser for PDF rendering |
| **@sparticuz/chromium** | 123.0.1 | Chromium binary for serverless |

### Payments & Integrations

| Technology | Version | Purpose |
|------------|---------|---------|
| **Stripe** | 18.5.0 | Payment processing (invoices) |
| **fast-csv** | 5.0.5 | CSV export generation |
| **date-fns** | 4.1.0 | Date manipulation |

### Developer Experience

| Technology | Version | Purpose |
|------------|---------|---------|
| **ESLint** | 9.x | Code linting |
| **Prettier** | 3.6.2 | Code formatting |
| **tsx** | 4.20.5 | TypeScript execution for scripts |

---

## Key Design Decisions

### 1. Layered Service Architecture

**Pattern**: API routes delegate to service layer functions.

```typescript
// API Route: /src/app/api/quotes/[id]/route.ts
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const id = await parseId(context.params);
    const quote = await getQuote(id);  // ← Service layer call
    return ok(quote);
  } catch (error) {
    return handleError(error, "quotes.detail");
  }
}

// Service: /src/server/services/quotes.ts
export async function getQuote(id: number): Promise<QuoteDetailDTO> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('quotes')
    .select('*, client:clients(*), lines:quote_lines(*)')
    .eq('id', id)
    .maybeSingle();
  // Business logic, transformations, error handling
}
```

**Benefits**:
- Reusable business logic (can be called from API routes, background jobs, etc.)
- Testable in isolation
- Clear separation of concerns

### 2. Standardized API Response Format

All API routes return a consistent JSON structure:

```typescript
// Success response
{
  "data": { /* payload */ },
  "error": null
}

// Error response
{
  "data": null,
  "error": {
    "code": "NOT_FOUND",
    "message": "Invoice not found",
    "statusCode": 404,
    "details": { /* optional */ }
  }
}
```

**Implementation**: Helper functions in API layer
```typescript
// /src/server/api/respond.ts
export function ok<T>(data: T) {
  return Response.json({ data, error: null });
}

export function fail(code: string, message: string, status: number, details?: unknown) {
  return Response.json(
    { data: null, error: { code, message, statusCode: status, details } },
    { status }
  );
}
```

### 3. Type-Safe DTOs (Data Transfer Objects)

Services return strongly-typed DTOs instead of raw database rows:

```typescript
// /src/lib/types/invoices.ts
export type InvoiceSummaryDTO = {
  id: number;
  documentNumber: string;
  clientId: number;
  clientName: string;
  status: InvoiceStatus;
  total: number;
  amountPaid: number;
  dueDate: Date | null;
  createdAt: Date;
};

export type InvoiceDetailDTO = InvoiceSummaryDTO & {
  lines: InvoiceLineDTO[];
  payments: PaymentDTO[];
  attachments: AttachmentDTO[];
  activityLog: ActivityLogEntryDTO[];
};
```

**Benefits**:
- Clear API contracts
- Frontend knows exact shape of data
- Easier refactoring (rename DB column → update DTO mapping)

### 4. Centralized Error Handling

Custom error classes with consistent handling:

```typescript
// /src/lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string | number) {
    super(`${entity} not found`, 'NOT_FOUND', 404);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 'BAD_REQUEST', 400);
  }
}
```

**Usage**: Services throw errors, API routes catch and convert to JSON responses.

### 5. Structured Logging

All logs follow a consistent JSON format:

```typescript
// /src/lib/logger.ts
logger.info({ scope: 'invoices.create', data: { invoiceId: 123 } });
logger.warn({ scope: 'stripe.webhook', message: 'Unknown event type', data: { type } });
logger.error({ scope: 'pdf.generation', message: 'Failed to render', error });

// Output (JSON):
{
  "timestamp": "2025-10-21T10:30:00.000Z",
  "level": "info",
  "scope": "invoices.create",
  "data": { "invoiceId": 123 }
}
```

**Benefits**: Searchable, parseable, integration-ready for log aggregation tools.

### 6. Route-Based Authorization

Access control via Next.js route groups and middleware:

```
/app
├── (public)/          # No auth required (login, signup)
├── (admin)/           # requireAdmin() in layout.tsx
└── (client)/          # requireAuth() in layout.tsx
```

Server-side enforcement in layouts prevents unauthorized access before render.

### 7. React Server Components by Default

- **Server Components**: Default for all pages (data fetching, no JS bundle)
- **Client Components**: Only when needed (forms, interactivity, browser APIs)

```tsx
// Server Component (default)
export default async function QuotesPage() {
  // Direct database access, no client-side JS
  const quotes = await getQuotes();
  return <QuotesTable quotes={quotes} />;
}

// Client Component (explicit)
'use client';
export function QuoteEditor() {
  const [form, setForm] = useState(...);
  // Interactive form with state
}
```

### 8. Optimistic UI Updates

TanStack Query handles optimistic updates for mutations:

```typescript
const mutation = useMutation({
  mutationFn: updateInvoice,
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['invoice', id] });
    // Snapshot previous value
    const previous = queryClient.getQueryData(['invoice', id]);
    // Optimistically update
    queryClient.setQueryData(['invoice', id], newData);
    return { previous };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['invoice', id], context.previous);
  },
});
```

---

## System Boundaries

### What the System Does

1. **Quote Management**
   - Create, edit, send quotes to clients
   - PDF generation for professional quote documents
   - Client acceptance/decline workflow
   - Quote conversion to production jobs

2. **Order & Production Management**
   - Production job board (drag-and-drop scheduling)
   - Printer queue management
   - Material tracking and deduction
   - 3D model slicing integration (PrusaSlicer)
   - STL file viewing in browser

3. **Invoicing & Payments**
   - Invoice generation from quotes
   - Multiple payment methods (cash, bank transfer, Stripe online payment)
   - Payment status tracking (draft, sent, paid, overdue, void)
   - Invoice PDF generation
   - Attachment support (files, photos)

4. **Client Relationship Management**
   - Client database with contact info
   - Payment terms configuration per client
   - Internal notes (admin-only)
   - Client communication history

5. **Messaging & Communication**
   - Admin-client messaging threads
   - Real-time message grouping by date
   - Context-aware messaging (invoice-specific threads)

6. **Reporting & Analytics**
   - Dashboard metrics (revenue, outstanding, job counts)
   - Accounts Receivable aging report
   - Material usage reports
   - Printer utilization reports
   - CSV export for all reports

7. **Settings & Configuration**
   - Business information (name, address, ABN)
   - Payment terms templates
   - Tax rate configuration
   - Material catalog (filaments, resins)
   - Product templates (pre-configured pricing)
   - Printer definitions

### What the System Does NOT Do

1. **External Integrations** (future scope)
   - No email sending (quotes/invoices sent manually)
   - No SMS notifications
   - No calendar/scheduling integration
   - No CRM integration (Salesforce, HubSpot)

2. **Advanced Manufacturing Features**
   - No CAD design tools (assumes STL files provided)
   - No automatic orientation optimization (manual orientation required)
   - No real-time printer monitoring (OctoPrint integration)
   - No multi-material/multi-color support

3. **Advanced Financial Features**
   - No recurring invoices/subscriptions
   - No inventory cost tracking (FIFO/LIFO)
   - No general ledger integration
   - No multi-currency support (AUD only)

4. **User Management**
   - No fine-grained permissions (only ADMIN/CLIENT roles)
   - No team collaboration features
   - No role-based workflow assignments

---

## Data Architecture

### Core Entities & Relationships

```
┌─────────────┐
│   CLIENTS   │
└──────┬──────┘
       │ 1:N
       ├─────────────────┐
       │                 │
       ↓                 ↓
┌─────────────┐    ┌─────────────┐
│   QUOTES    │    │  INVOICES   │
│             │    │             │
│ - lines     │    │ - lines     │
│ - status    │    │ - payments  │
│ - totals    │    │ - attachments│
└──────┬──────┘    │ - activity  │
       │           └─────────────┘
       │ 1:N
       ↓
┌─────────────┐
│    JOBS     │
│             │
│ - priority  │
│ - status    │
│ - printer   │
└─────────────┘

┌─────────────┐
│   USERS     │
│             │
│ - email     │
│ - role      │
│ - client_id │
└─────────────┘

┌──────────────┐
│  MATERIALS   │
│              │
│ - type       │
│ - cost/gram  │
└──────────────┘

┌──────────────┐
│  PRINTERS    │
│              │
│ - name       │
│ - build_vol  │
└──────────────┘
```

### Key Relationships

1. **Client → Quotes**: One client can have many quotes
2. **Client → Invoices**: One client can have many invoices
3. **Quote → Jobs**: One quote can generate multiple jobs (one per quote line)
4. **Job → Printer**: Each job is assigned to one printer
5. **User → Client**: CLIENT users are linked to one client (1:1)
6. **Invoice → Payments**: One invoice can have multiple partial payments
7. **Invoice → Attachments**: Invoices can have multiple file attachments

### Data Flow: Quote → Job → Invoice

```
1. QUOTE CREATED
   - Admin creates quote with multiple lines
   - Each line: description, quantity, unit price, material
   - Total calculated with discounts, shipping, tax

2. QUOTE ACCEPTED (by client)
   - Quote status → ACCEPTED
   - System auto-creates JOB records (one per quote line)
   - Jobs enter PENDING status

3. JOBS SCHEDULED
   - Admin drags jobs to printer queues
   - Jobs transition: PENDING → PRINTING → COMPLETED

4. INVOICE GENERATED
   - Admin converts quote to invoice (or creates standalone)
   - Invoice lines mirror quote lines
   - Invoice status: DRAFT → SENT → PAID

5. PAYMENT RECORDED
   - Admin logs payment (or client pays via Stripe)
   - Invoice status updates based on amount paid
   - Activity log tracks payment history
```

### Database Schema Highlights

**10 Migrations** (located in `/supabase/migrations/`):

1. `202510161800_init.sql` - Core tables (clients, quotes, invoices, jobs, users, materials, printers)
2. `202510161805_policies.sql` - Row-level security policies
3. `202510171300_users_sessions.sql` - User profile and session handling
4. `202510171320_transactions.sql` - Invoice payments and transactions
5. `202510180001_grants.sql` - Database grants and permissions
6. `202510181400_fix_missing_policies.sql` - Additional RLS policies
7. `202510181830_fix_next_document_number.sql` - Document numbering function
8. `202510191530_seed_catalog_data.sql` - Default materials and product templates
9. `202510191545_webhook_idempotency.sql` - Stripe webhook deduplication
10. `202510191600_order_files.sql` - File storage for client-uploaded STL files

**Storage Buckets**:

- `attachments` - Invoice attachments (receipts, photos, documents)
- `pdfs` - Generated PDF files (quotes, invoices)
- `tmp` - Temporary files (STL processing, slicing output)
- `order-files` - Client-uploaded 3D model files (STL)

---

## Authentication & Authorization

### Authentication Flow

**Provider**: Supabase Auth (built-in auth system)

1. **Signup** (Client role only)
   - User provides email + password
   - System creates: Auth user → Client record → User profile
   - Transaction: If any step fails, rollback previous steps
   - Auto-login after successful signup

2. **Login**
   - Supabase validates credentials
   - System fetches user profile (id, email, role, clientId)
   - Session stored in HTTP-only cookies

3. **Session Management**
   - Cookies: `sb-access-token`, `sb-refresh-token`
   - Access token expires: 1 hour (configurable)
   - Refresh token: Auto-refreshed by Supabase client

4. **Logout**
   - Invalidate session in Supabase
   - Clear cookies
   - Redirect to login

### Authorization Model

**Two Roles**:

| Role | Access | Typical User |
|------|--------|--------------|
| `ADMIN` | Full system access | Business owner, staff |
| `CLIENT` | Limited to own data | Customers |

**Implementation**:

```typescript
// Server Components (layouts, pages)
import { requireAdmin, requireAuth } from '@/lib/auth-utils';

export default async function AdminLayout({ children }) {
  const user = await requireAdmin(); // Redirects non-admin to /client
  return <AdminShell user={user}>{children}</AdminShell>;
}

// API Routes
import { requireAdmin, requireAuth } from '@/server/auth/api-helpers';

export async function GET(request: NextRequest) {
  await requireAdmin(request); // Returns 401/403 for non-admin
  // ... admin-only logic
}
```

**Access Control Examples**:

| Endpoint | Admin | Client | Notes |
|----------|-------|--------|-------|
| `GET /api/quotes` | ✅ | ❌ | List all quotes |
| `GET /api/client/dashboard` | ❌ | ✅ | Own dashboard data |
| `GET /api/invoices/[id]` | ✅ | ❌ | Invoice details |
| `GET /api/client/invoices` | ❌ | ✅ | Own invoices only |
| `POST /api/quotes` | ✅ | ❌ | Create quote |
| `POST /api/messages` | ✅ | ✅ | Both can send messages |

### Row-Level Security (RLS)

Supabase RLS policies enforce data isolation at database level:

```sql
-- Example: Clients can only read their own invoices
CREATE POLICY "Clients can view own invoices"
  ON invoices FOR SELECT
  USING (
    client_id = (
      SELECT client_id FROM users WHERE auth_user_id = auth.uid()
    )
  );
```

**Benefit**: Even if API route auth fails, database enforces access control.

---

## Key Features by Role

### Admin Features

1. **Dashboard**
   - Revenue metrics (today, this week, this month)
   - Outstanding invoices summary
   - Recent activity feed
   - Job queue overview

2. **Quote Management**
   - Create/edit quotes with multiple line items
   - PDF generation and preview
   - Send to client (manual email)
   - Track acceptance/decline status
   - Duplicate quotes for similar orders

3. **Production Management**
   - Job board (kanban-style drag-and-drop)
   - Assign jobs to printers
   - Update job status (pending → printing → completed)
   - Material usage tracking

4. **Invoice Management**
   - Create invoices (from quote or standalone)
   - Track payment status (draft, sent, paid, overdue, void)
   - Record payments (multiple methods)
   - Generate Stripe payment links
   - Upload attachments (receipts, photos)
   - View activity history

5. **Client Management**
   - Client database with contact info
   - Payment terms configuration
   - Internal notes (admin-only)
   - View client order history

6. **Messaging**
   - Send messages to clients
   - View conversation history
   - Attach messages to invoices/quotes

7. **Settings**
   - Business information
   - Material catalog (add/edit materials)
   - Product templates (pre-configured pricing)
   - Printer management
   - Payment terms templates

8. **Reports**
   - Accounts Receivable aging
   - Material usage by time period
   - Printer utilization
   - Job export (CSV)
   - Invoice export (CSV)
   - Payment history export (CSV)

### Client Features

1. **Dashboard**
   - Recent orders
   - Invoice summary (unpaid balance)
   - Order status tracking

2. **Orders**
   - View all orders (quotes + invoices)
   - Track production status
   - View order details

3. **Invoices**
   - View unpaid and paid invoices
   - Pay online via Stripe
   - Download invoice PDFs

4. **Messaging**
   - Send messages to admin
   - View conversation history

5. **Quick Order** (future enhancement)
   - Upload STL files
   - Auto-quote based on 3D model analysis
   - Select material and options
   - Checkout and pay immediately

---

## Project Statistics

### Codebase Metrics

| Metric | Count |
|--------|-------|
| **Total TypeScript Files** | 271 |
| **API Routes** | 77 |
| **React Components** | 79 |
| **Service Layer Functions** | 19 services |
| **Database Migrations** | 10 |
| **UI Components (shadcn/ui)** | 43 |
| **Custom Hooks** | 5 |
| **Storage Buckets** | 4 |

### Component Breakdown

| Category | Count | Examples |
|----------|-------|----------|
| **UI Primitives** | 43 | Button, Input, Dialog, Table, Form |
| **Feature Components** | 36 | InvoiceEditor, QuoteView, JobBoard, ClientDashboard |

### Service Layer Breakdown

| Service | Purpose |
|---------|---------|
| `auth.ts` | Signup, login, password management |
| `clients.ts` | Client CRUD, notes |
| `dashboard.ts` | Metrics, activity feeds |
| `exports.ts` | CSV report generation |
| `invoices.ts` | Invoice CRUD, payments, status transitions |
| `jobs.ts` | Job scheduling, printer assignment |
| `maintenance.ts` | Cleanup tasks, data integrity |
| `materials.ts` | Material catalog management |
| `messages.ts` | Admin-client messaging |
| `numbering.ts` | Sequential document number generation |
| `order-files.ts` | STL file upload/download |
| `printers.ts` | Printer management |
| `product-templates.ts` | Pre-configured pricing templates |
| `quick-order.ts` | Instant quote from STL upload |
| `quotes.ts` | Quote CRUD, acceptance, conversion |
| `settings.ts` | Business settings, payment terms |
| `stripe.ts` | Payment processing, webhooks |
| `tmp-files.ts` | Temporary file management |
| `users.ts` | User profile management |

### API Route Organization

| Namespace | Routes | Purpose |
|-----------|--------|---------|
| `/api/auth` | 6 | Login, signup, logout, password management |
| `/api/admin` | 3 | Admin-specific user and client operations |
| `/api/client` | 5 | Client-specific dashboard and data |
| `/api/quotes` | 10 | Quote CRUD, actions (send, accept, convert) |
| `/api/invoices` | 13 | Invoice CRUD, payments, attachments, activity |
| `/api/jobs` | 6 | Job management, scheduling |
| `/api/clients` | 3 | Client management |
| `/api/materials` | 2 | Material catalog |
| `/api/printers` | 3 | Printer management |
| `/api/product-templates` | 2 | Product templates |
| `/api/messages` | 1 | Messaging |
| `/api/settings` | 1 | Settings |
| `/api/export` | 6 | Report generation (CSV) |
| `/api/stripe` | 2 | Stripe webhook and test endpoint |
| `/api/quick-order` | 5 | STL upload, slicing, pricing, checkout |
| `/api/maintenance` | 1 | Maintenance tasks |
| `/api/tmp-file` | 1 | Temporary file serving |
| `/api/order-files` | 1 | Order file download |
| `/api/attachments` | 1 | Invoice attachment download |
| `/api/dashboard` | 2 | Dashboard metrics and activity |

---

## Additional Documentation

For detailed information on specific subsystems, see:

- **API_REFERENCE.md** - Comprehensive API endpoint documentation
- **SERVICE_LAYER.md** - Service function reference
- **COMPONENT_GUIDE.md** - React component usage
- **DATABASE_SCHEMA.md** - Database tables and relationships
- **DEPLOYMENT.md** - Deployment procedures and environment setup

---

**Document Version**: 1.0
**Last Updated**: 2025-10-21
**Codebase Snapshot**: After Phase 10 cleanup (standardized patterns)
