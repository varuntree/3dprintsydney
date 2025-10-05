# 3D Print Sydney - Technical Architecture Documentation

## Table of Contents

1. [System Overview & Technology Stack](#system-overview--technology-stack)
2. [Next.js App Router Architecture](#nextjs-app-router-architecture)
3. [Database Schema & Prisma Configuration](#database-schema--prisma-configuration)
4. [API Design Patterns](#api-design-patterns)
5. [State Management with React Query](#state-management-with-react-query)
6. [Component Architecture & UI System](#component-architecture--ui-system)
7. [Performance Optimizations](#performance-optimizations)
8. [Security Considerations](#security-considerations)
9. [Development Patterns](#development-patterns)

---

## System Overview & Technology Stack

### Core Technologies

The 3D Print Sydney application is built as a modern full-stack web application for managing print operations, quotes, invoices, and client relationships.

**Frontend Stack:**

- **Next.js 15.5.3** - React framework with App Router
- **React 19.1.0** - UI library with latest concurrent features
- **TypeScript 5** - Type safety and developer experience
- **Tailwind CSS 4** - Utility-first CSS framework with modern features
- **Radix UI** - Accessible, unstyled component primitives

**Backend Stack:**

- **Next.js API Routes** - Server-side API endpoints
- **Prisma 6.16.2** - Type-safe database ORM
- **SQLite** - Local database with WAL mode optimization
- **Zod** - Runtime type validation and schema parsing

**State Management & Data Fetching:**

- **TanStack React Query 5.89.0** - Server state management
- **Zustand 5.0.8** - Client-side state management
- **Immer 10.1.3** - Immutable state updates

**Additional Tools:**

- **Puppeteer** - PDF generation and automation
- **Stripe** - Payment processing integration
- **Lucide React** - Icon system
- **Sonner** - Toast notifications

### Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # Backend API endpoints
│   ├── (pages)/           # Frontend page components
│   ├── layout.tsx         # Root layout with providers
│   └── globals.css        # Global styles and Tailwind config
├── components/            # Reusable UI components
│   ├── ui/               # Base UI component library
│   ├── layout/           # Layout-specific components
│   └── (features)/       # Feature-specific components
├── lib/                  # Utility functions and configurations
│   ├── schemas/          # Zod validation schemas
│   └── utils/            # Helper functions
├── server/               # Server-side business logic
│   ├── api/              # API utilities
│   ├── db/               # Database client configuration
│   ├── services/         # Business logic services
│   └── pdf/              # PDF generation utilities
├── hooks/                # Custom React hooks
└── providers/            # React context providers
```

---

## Next.js App Router Architecture

### App Router Implementation

The application leverages Next.js 15's App Router for file-based routing with enhanced developer experience:

**Root Layout** (`/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/layout.tsx`):

```typescript
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
```

### Route Structure

**Page Routes:**

```
/                          # Dashboard overview
/clients                   # Client management
/clients/[id]             # Client detail view
/clients/new              # Create new client
/quotes                   # Quote management
/quotes/[id]              # Quote detail/editor
/quotes/new               # Create new quote
/invoices                 # Invoice management
/invoices/[id]            # Invoice detail/editor
/invoices/new             # Create new invoice
/jobs                     # Job queue management
/materials                # Material catalog
/printers                 # Printer management
/products                 # Product templates
/reports                  # Reporting dashboard
/settings                 # Application settings
```

**API Routes Structure:**

```
/api/clients              # Client CRUD operations
/api/clients/[id]         # Individual client operations
/api/quotes               # Quote management
/api/quotes/[id]/convert  # Quote to invoice conversion
/api/invoices             # Invoice management
/api/invoices/[id]/pdf    # PDF generation
/api/jobs                 # Job queue operations
/api/dashboard            # Dashboard data aggregation
/api/export/*             # Data export endpoints
/api/stripe/webhook       # Payment webhook handling
```

### Dynamic Configuration

The application uses `dynamic = "force-dynamic"` to ensure server-side rendering for real-time data consistency across the operations dashboard.

---

## Database Schema & Prisma Configuration

### Database Setup

**Prisma Client Configuration** (`/Users/varunprasad/Downloads/Archive/3dprintsydney/src/server/db/client.ts`):

```typescript
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    transactionOptions: {
      maxWait: 10000,
      timeout: 10000,
    },
  });

// SQLite optimizations
await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL;");
await prisma.$queryRawUnsafe("PRAGMA synchronous=NORMAL;");
await prisma.$queryRawUnsafe("PRAGMA foreign_keys=ON;");
```

### Core Entity Relationships

**Primary Entities:**

- **Client** - Customer information and contact details
- **Quote** - Price proposals with lifecycle management
- **Invoice** - Billing documents with payment tracking
- **Job** - Production queue items with printer assignment
- **Printer** - Equipment management with status tracking
- **Material** - Inventory and costing management
- **ProductTemplate** - Reusable product definitions

**Key Schema Patterns:**

```prisma
model Quote {
  id                 Int           @id @default(autoincrement())
  number             String        @unique
  clientId           Int
  client             Client        @relation(fields: [clientId], references: [id])
  status             QuoteStatus   @default(DRAFT)

  // Lifecycle tracking
  sentAt             DateTime?
  acceptedAt         DateTime?
  declinedAt         DateTime?

  // Financial calculations
  subtotal           Decimal
  taxTotal           Decimal
  total              Decimal

  // Relationships
  convertedInvoiceId Int?          @unique
  convertedInvoice   Invoice?      @relation("QuoteConvertedInvoice")
  items              QuoteItem[]
  activities         ActivityLog[]
}
```

### Status Management

The system uses comprehensive enums for status tracking:

```prisma
enum QuoteStatus {
  DRAFT
  PENDING
  ACCEPTED
  DECLINED
  CONVERTED
}

enum InvoiceStatus {
  PENDING
  PAID
  OVERDUE
}

enum JobStatus {
  QUEUED
  PRINTING
  PAUSED
  COMPLETED
  CANCELLED
}
```

### Activity Logging

Comprehensive audit trail through the `ActivityLog` model:

```prisma
model ActivityLog {
  id        Int      @id @default(autoincrement())
  clientId  Int?
  quoteId   Int?
  invoiceId Int?
  jobId     Int?
  printerId Int?
  action    String
  message   String
  metadata  Json?
  createdAt DateTime @default(now())
}
```

---

## API Design Patterns

### Consistent Response Structure

**API Response Utilities** (`/Users/varunprasad/Downloads/Archive/3dprintsydney/src/server/api/respond.ts`):

```typescript
interface Success<T> {
  data: T;
  error?: undefined;
}

interface Failure {
  data?: undefined;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export function ok<T>(data: T, init: ResponseInit = { status: 200 }) {
  return NextResponse.json<Success<T>>({ data }, init);
}

export function fail(
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>,
) {
  return NextResponse.json<Failure>(
    { error: { code, message, details } },
    { status },
  );
}
```

### Route Handler Pattern

**Standardized CRUD Operations** (`/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/api/clients/route.ts`):

```typescript
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? undefined;
    const limit = Number(searchParams.get("limit") ?? "0");
    const offset = Number(searchParams.get("offset") ?? "0");

    const clients = await listClients({
      q,
      limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
      offset: Number.isFinite(offset) && offset >= 0 ? offset : undefined,
    });

    return ok(clients);
  } catch (error) {
    return handleError(error, "clients.list");
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const client = await createClient(payload);
    return ok(client, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid client payload", 422, {
        issues: error.issues,
      });
    }
    return handleError(error, "clients.create");
  }
}
```

### Service Layer Architecture

Business logic is encapsulated in service modules (`/Users/varunprasad/Downloads/Archive/3dprintsydney/src/server/services/clients.ts`):

```typescript
export async function createClient(payload: unknown) {
  const parsed = clientInputSchema.parse(payload);
  const client = await prisma.$transaction(async (tx) => {
    const paymentTermsCode = await normalizePaymentTermsCode(
      tx,
      parsed.paymentTerms ?? null,
    );

    const created = await tx.client.create({
      data: {
        name: parsed.name,
        company: parsed.company || null,
        // ... other fields
      },
    });

    // Activity logging
    await tx.activityLog.create({
      data: {
        clientId: created.id,
        action: "CLIENT_CREATED",
        message: `Client ${created.name} created`,
      },
    });

    return created;
  });

  logger.info({ scope: "clients.create", data: { id: client.id } });
  return client;
}
```

### Error Handling Strategy

- **Validation Errors**: Zod schema validation with detailed error messages
- **Business Logic Errors**: Custom error types with appropriate HTTP status codes
- **Database Errors**: Transaction rollback with comprehensive logging
- **Unexpected Errors**: Graceful degradation with generic error responses

---

## State Management with React Query

### Provider Configuration

**Query Client Setup** (`/Users/varunprasad/Downloads/Archive/3dprintsydney/src/components/providers/app-providers.tsx`):

```typescript
export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 1000 * 30, // 30 seconds
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationProvider>
        {children}
        <Toaster position="top-right" />
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </NavigationProvider>
    </QueryClientProvider>
  );
}
```

### Data Fetching Patterns

**Custom Hooks for API Integration:**

```typescript
// Example pattern for client data fetching
export function useClients(params?: {
  q?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["clients", params],
    queryFn: () => fetchClients(params),
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useClient(id: number) {
  return useQuery({
    queryKey: ["clients", id],
    queryFn: () => fetchClient(id),
    enabled: !!id,
  });
}
```

### Mutation Patterns

**Optimistic Updates and Cache Management:**

```typescript
export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createClient,
    onSuccess: (newClient) => {
      // Invalidate and refetch clients list
      queryClient.invalidateQueries({ queryKey: ["clients"] });

      // Optimistically update cache
      queryClient.setQueryData(["clients", newClient.id], newClient);
    },
    onError: (error) => {
      toast.error("Failed to create client");
    },
  });
}
```

### Cache Strategies

- **List Queries**: 30-second stale time with background refetching
- **Detail Queries**: 5-minute stale time for individual entity views
- **Real-time Updates**: Mutation-based cache invalidation
- **Optimistic Updates**: Immediate UI feedback with rollback on failure

---

## Component Architecture & UI System

### Design System Foundation

**Component Variants with CVA** (`/Users/varunprasad/Downloads/Archive/3dprintsydney/src/components/ui/button.tsx`):

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md gap-1.5 px-3",
        lg: "h-10 rounded-md px-6",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
```

### Shared Token Palette

Design tokens now live in `src/styles/tokens.css`. The palette defines semantic layers such as `--surface-overlay`, `--warning-subtle`, and `--success-foreground`, which underpin Tailwind utility aliases (`bg-surface-overlay`, `text-warning-foreground`, etc.). All feature surfaces import the shared palette through `src/app/globals.css`, ensuring invoices, quotes, clients, and jobs share the same theming as the dashboard while keeping overrides in a single place.

### Layout System

**App Shell Pattern** (`/Users/varunprasad/Downloads/Archive/3dprintsydney/src/components/layout/app-shell.tsx`):

```typescript
export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-[260px] flex-col border-r border-border bg-sidebar text-sidebar-foreground backdrop-blur lg:flex">
        {/* Sidebar Navigation */}
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-surface-overlay backdrop-blur">
          {/* Header with Quick Actions */}
        </header>

        <main className="flex-1 bg-surface-canvas px-6 py-10">
          <div className="mx-auto w-full max-w-[1400px] space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
```

### Tailwind CSS 4 Configuration

**Modern CSS Features** (`/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/globals.css`):

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-primary: oklch(0.205 0 0);
  --color-primary-foreground: oklch(0.985 0 0);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
}
```

### Component Composition Patterns

**Compound Components:**

- Dialog compositions for modal workflows
- Form components with built-in validation
- Data tables with sorting, filtering, and pagination
- Navigation components with active state management

**Accessibility Features:**

- ARIA labels and descriptions on all interactive elements
- Keyboard navigation support
- Focus management for modal dialogs
- Screen reader optimization

---

## Performance Optimizations

### Server-Side Optimizations

**Database Performance:**

```typescript
// SQLite optimizations
await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL;");
await prisma.$queryRawUnsafe("PRAGMA synchronous=NORMAL;");
await prisma.$queryRawUnsafe("PRAGMA foreign_keys=ON;");

// Connection pooling and transaction optimization
transactionOptions: {
  maxWait: 10000,
  timeout: 10000,
}
```

**API Route Optimizations:**

- Efficient query patterns with selective field inclusion
- Pagination support for large datasets
- Request/response compression
- Appropriate HTTP status codes and caching headers

### Client-Side Performance

**Code Splitting:**

- Next.js automatic code splitting by route
- Dynamic imports for heavy components
- Lazy loading for non-critical features

**React Query Optimizations:**

- Background refetching for stale data
- Intelligent cache invalidation
- Optimistic updates for immediate feedback
- Parallel query execution

**CSS Optimizations:**

- Tailwind CSS purging in production
- Modern CSS features (oklch colors, custom properties)
- Backdrop blur effects with hardware acceleration

### Bundle Optimization

**Next.js Configuration:**

```typescript
const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  // Additional optimizations would be configured here
};
```

### Accessibility Performance

**Development-time Accessibility Checking:**

```typescript
useEffect(() => {
  if (process.env.NODE_ENV !== "development") return;

  async function loadAxe() {
    try {
      const [{ default: axe }, React] = await Promise.all([
        import("@axe-core/react"),
        import("react"),
      ]);
      if (typeof window !== "undefined") {
        axe(React, window, 1000);
      }
    } catch (error) {
      console.warn("Accessibility tooling unavailable", error);
    }
  }

  loadAxe();
}, []);
```

---

## Security Considerations

### Input Validation

**Zod Schema Validation** (`/Users/varunprasad/Downloads/Archive/3dprintsydney/src/lib/schemas/clients.ts`):

```typescript
export const clientInputSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional().or(z.literal("")),
  abn: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  paymentTerms: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  tags: z.array(z.string()).optional().default([]),
});
```

### Database Security

**Prisma Security Features:**

- Type-safe query construction prevents SQL injection
- Transaction isolation for data consistency
- Foreign key constraints enforcement
- Parameterized queries for all database operations

**Environment Configuration:**

```env
DATABASE_URL="file:./dev.db"
NODE_ENV="development"
```

### API Security

**Request Validation:**

- Zod schema validation for all input payloads
- Type-safe request/response handling
- Comprehensive error handling without information leakage

**Payment Integration Security:**

- Stripe webhook signature verification
- Secure payment session handling
- PCI compliance through Stripe's secure infrastructure

### File Upload Security

**Attachment Handling:**

- File type validation
- Size limitations
- Secure file storage with metadata tracking
- Access control for file downloads

---

## Development Patterns

### Type Safety

**End-to-End Type Safety:**

```typescript
// Database types generated by Prisma
export type ClientSummaryDTO = {
  id: number;
  name: string;
  company: string;
  email: string;
  outstandingBalance: number;
  createdAt: Date;
};

// Zod schemas for runtime validation
export type ClientInput = z.infer<typeof clientInputSchema>;

// API response types
interface Success<T> {
  data: T;
  error?: undefined;
}
```

### Error Handling

**Structured Error Management:**

```typescript
export function handleError(error: unknown, scope: string) {
  logger.error({ scope, error });
  const message = error instanceof Error ? error.message : "Unexpected error";
  const status =
    error && typeof error === "object" && "status" in error
      ? (error as { status?: number }).status
      : 500;
  return fail("INTERNAL_ERROR", message, status);
}
```

### Logging Strategy

**Structured Logging:**

- Development: Query logging, warnings, and errors
- Production: Error logging only
- Scope-based logging for debugging
- Metadata attachment for context

### Testing Patterns

**Development Tools:**

- TypeScript strict mode for compile-time checking
- ESLint for code quality enforcement
- Prettier for consistent code formatting
- React Query DevTools for development debugging

### Code Organization

**Feature-Based Structure:**

- Components grouped by feature domain
- Service layer separation for business logic
- Schema co-location with feature modules
- Utility functions in dedicated lib directory

**Import Patterns:**

```typescript
// Absolute imports with path mapping
import { Button } from "@/components/ui/button";
import { prisma } from "@/server/db/client";
import { clientInputSchema } from "@/lib/schemas/clients";
```

### Development Workflow

**Scripts and Automation:**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "typecheck": "tsc --noEmit",
    "format": "prettier --check .",
    "prisma": "prisma generate",
    "db:push": "prisma db push",
    "db:studio": "prisma studio"
  }
}
```

---

## Conclusion

The 3D Print Sydney application demonstrates modern full-stack development practices with a focus on type safety, performance, and maintainability. The architecture provides a solid foundation for scaling the business operations while maintaining code quality and developer experience.

Key architectural strengths:

- **Type Safety**: End-to-end TypeScript with runtime validation
- **Performance**: Optimized database queries and efficient state management
- **Maintainability**: Clear separation of concerns and consistent patterns
- **Scalability**: Modular architecture supporting feature growth
- **Developer Experience**: Modern tooling and comprehensive error handling

The codebase is well-positioned for future enhancements and business growth while maintaining operational reliability.
