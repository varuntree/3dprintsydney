# Authentication & Authorization

This directory contains authentication and authorization helpers for the 3D Print Sydney application.

## Directory Structure

```
src/
├── server/auth/
│   ├── api-helpers.ts      # For API routes (app/api/**/route.ts)
│   ├── permissions.ts      # Resource-specific access control
│   ├── session.ts          # Low-level session management (internal)
│   └── README.md           # This file
└── lib/
    └── auth-utils.ts       # For Server Components (app/**/page.tsx, layout.tsx)
```

---

## When to Use Which Helper

### API Routes (`app/api/**/route.ts`)

Use `@/server/auth/api-helpers`:

```typescript
import { requireAdmin } from '@/server/auth/api-helpers';

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);  // Throws 401/403
  // Only admins reach this code
  return success(data);
}
```

**Available Functions:**
- `requireAuth(req)` - Any authenticated user
- `requireAdmin(req)` - Admin role only
- `requireClient(req)` - Client role only
- `requireClientWithId(req)` - Client with clientId
- `getAuthUser(req)` - Optional auth (returns null)

---

### Server Components (`app/**/page.tsx`, `layout.tsx`)

Use `@/lib/auth-utils`:

```typescript
import { requireAdmin } from '@/lib/auth-utils';

export default async function AdminPage() {
  const user = await requireAdmin();  // Redirects to login
  // Only admins reach this code
  return <AdminDashboard user={user} />;
}
```

**Available Functions:**
- `requireAuth(callbackUrl?)` - Any authenticated user (redirects)
- `requireAdmin()` - Admin role (redirects)
- `requireClient()` - Client role (redirects)
- `requireClientWithId()` - Client with clientId (redirects)
- `getOptionalUser()` - Optional auth (returns null)

---

### Resource Access Control

Use `@/server/auth/permissions` for resource-specific checks:

```typescript
import { requireInvoiceAccess } from '@/server/auth/permissions';

export async function GET(req: NextRequest, { params }: Context) {
  const { id } = await params;
  await requireInvoiceAccess(req, Number(id));  // Admin or owner
  // User has access to this invoice
  const invoice = await getInvoice(Number(id));
  return success(invoice);
}
```

**Available Functions:**
- `requireInvoiceAccess(req, invoiceId)` - Admin or invoice owner
- `requireAttachmentAccess(req, attachmentId)` - Admin or attachment owner
- `requirePaymentAccess(req, paymentId)` - Admin or payment owner

---

## Why Two Sets of Helpers?

**API Routes** and **Server Components** have different execution contexts and error handling requirements:

| Aspect | API Routes | Server Components |
|--------|------------|-------------------|
| **Module** | `@/server/auth/api-helpers` | `@/lib/auth-utils` |
| **Takes Request** | Yes (`NextRequest`) | No (uses cookies directly) |
| **Auth Failure** | Throws error (401/403) | Redirects to login |
| **Use Case** | API endpoints | Page/layout rendering |

Trying to unify these would require runtime context detection and make the code more complex. Separate helpers keep the code clean and explicit.

---

## Import Guidelines

### ✅ Correct Usage

```typescript
// In API route (route.ts)
import { requireAdmin } from '@/server/auth/api-helpers';

// In Server Component (page.tsx, layout.tsx)
import { requireAdmin } from '@/lib/auth-utils';

// For resource checks (route.ts)
import { requireInvoiceAccess } from '@/server/auth/permissions';
```

### ❌ Incorrect Usage

```typescript
// WRONG: Using Server Component helper in API route
import { requireAdmin } from '@/lib/auth-utils';
export async function POST(req: NextRequest) {
  const user = await requireAdmin();  // ERROR: No NextRequest parameter
}

// WRONG: Using API helper in Server Component
import { requireAdmin } from '@/server/auth/api-helpers';
export default async function Page() {
  const user = await requireAdmin();  // ERROR: Missing NextRequest parameter
}
```

---

## Common Patterns

### Pattern 1: Admin-Only API Route

```typescript
import { requireAdmin } from '@/server/auth/api-helpers';
import { success } from '@/server/api/respond';

export async function DELETE(req: NextRequest, { params }: Context) {
  const admin = await requireAdmin(req);
  const { id } = await params;
  
  await deleteResource(Number(id));
  return success(null, 204);
}
```

### Pattern 2: Client-Specific API Route

```typescript
import { requireClientWithId } from '@/server/auth/api-helpers';
import { success } from '@/server/api/respond';

export async function GET(req: NextRequest) {
  const client = await requireClientWithId(req);
  
  // client.clientId is guaranteed to exist
  const data = await getClientData(client.clientId);
  return success(data);
}
```

### Pattern 3: Resource-Specific Access

```typescript
import { requireInvoiceAccess } from '@/server/auth/permissions';
import { success } from '@/server/api/respond';

export async function GET(req: NextRequest, { params }: Context) {
  const { id } = await params;
  await requireInvoiceAccess(req, Number(id));
  
  // User is admin OR owns this invoice
  const invoice = await getInvoice(Number(id));
  return success(invoice);
}
```

### Pattern 4: Optional Authentication

```typescript
import { getAuthUser } from '@/server/auth/api-helpers';
import { success } from '@/server/api/respond';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  
  if (user) {
    // Personalized response
    return success(getPersonalizedData(user));
  }
  
  // Public response
  return success(getPublicData());
}
```

### Pattern 5: Admin Layout

```typescript
import { requireAdmin } from '@/lib/auth-utils';

export default async function AdminLayout({ children }) {
  const admin = await requireAdmin();
  
  return (
    <AdminShell user={admin}>
      {children}
    </AdminShell>
  );
}
```

### Pattern 6: Client Layout

```typescript
import { requireClient } from '@/lib/auth-utils';

export default async function ClientLayout({ children }) {
  const client = await requireClient();
  
  return (
    <ClientShell user={client}>
      {children}
    </ClientShell>
  );
}
```

---

## Error Handling

All auth helpers throw standard errors from `@/lib/errors`:

- **UnauthorizedError** (401) - Not authenticated
- **ForbiddenError** (403) - Authenticated but lacks permission
- **NotFoundError** (404) - Resource not found (permissions only)

These errors are caught by the standard error handler in API routes:

```typescript
import { requireAdmin } from '@/server/auth/api-helpers';
import { handleError } from '@/server/api/respond';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    // ...
  } catch (error) {
    return handleError(error, 'resource.action');
  }
}
```

---

## Testing Authentication

### Testing API Routes

```typescript
// Mock authenticated request
const req = new NextRequest('http://localhost/api/test', {
  headers: {
    cookie: `sb:token=${validToken}`
  }
});

const response = await POST(req);
```

### Testing Server Components

```typescript
// Server components use cookies() from 'next/headers'
// Mock via test framework (e.g., Jest, Vitest)
```

---

## Security Best Practices

1. **Always validate authentication** - Use helpers, don't skip auth checks
2. **Use resource-specific helpers** - Don't just check role, check resource ownership
3. **Never trust client input** - Always validate on server
4. **Use appropriate helper** - API routes vs Server Components
5. **Log security events** - Auth failures, permission denials

---

## Troubleshooting

### Problem: "Cannot use API helper in Server Component"

**Solution:** Use the Server Component version from `@/lib/auth-utils`

```typescript
// WRONG
import { requireAdmin } from '@/server/auth/api-helpers';

// RIGHT
import { requireAdmin } from '@/lib/auth-utils';
```

### Problem: "Missing NextRequest parameter"

**Solution:** You're using the wrong helper - use API helper for routes

```typescript
// WRONG (in route.ts)
import { requireAdmin } from '@/lib/auth-utils';

// RIGHT (in route.ts)
import { requireAdmin } from '@/server/auth/api-helpers';
```

### Problem: "User not authorized for resource"

**Solution:** Use resource-specific permission helpers

```typescript
// Instead of just checking auth
await requireAuth(req);

// Check resource access
await requireInvoiceAccess(req, invoiceId);
```

---

## Related Documentation

- [AUTHENTICATION_AND_AUTHORIZATION.md](/documentation/AUTHENTICATION_AND_AUTHORIZATION.md) - Full auth architecture
- [STANDARDS.md](/documentation/patterns/STANDARDS.md) - Pattern 6: Authentication
- [errors.ts](/src/lib/errors.ts) - Error classes

---

**Last Updated:** 2025-10-21
**Maintained By:** Development Team
