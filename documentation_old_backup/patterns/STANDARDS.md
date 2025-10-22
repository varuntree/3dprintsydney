# Code Standards & Patterns - 3D Print Sydney

**Status:** ✅ APPROVED
**Purpose:** Define consistent patterns, standards, and best practices for codebase cleanup
**Goal:** Reduce entropy, achieve 100% consistency - NO functionality changes

---

## Core Principles

### 1. Consistency Over Cleverness
Every similar operation follows the exact same pattern.

### 2. Single Source of Truth
Each concern has exactly one place it belongs.

### 3. Fail Fast, Fail Clearly
Validate early, throw descriptive errors with context.

### 4. Type Safety First
No `any`, minimal `unknown`, explicit types everywhere.

### 5. Dependency Direction
Dependencies flow inward: UI → API → Services → Database

---

## Pattern 1: Database Access

**RULE:** Database access ONLY in service layer

```typescript
✅ ALWAYS: Services handle ALL database queries
❌ NEVER: API routes query database directly
❌ NEVER: Components query database directly
```

**Correct Pattern:**
```typescript
// ✅ api/clients/route.ts
export async function GET() {
  const clients = await getClients(); // Service call
  return success(clients);
}

// ✅ services/clients.ts
export async function getClients() {
  const supabase = getServiceSupabase();
  const { data } = await supabase.from('clients').select('*');
  return data.map(mapToDTO);
}
```

**Incorrect Pattern:**
```typescript
// ❌ api/clients/route.ts
export async function GET() {
  const supabase = getServiceSupabase(); // WRONG!
  const { data } = await supabase.from('clients').select('*');
  return NextResponse.json({ data });
}
```

---

## Pattern 2: Service Layer Structure

**RULE:** Services contain ONLY business logic, NO HTTP concerns

**Services MUST:**
- ✅ Handle ALL database operations
- ✅ Contain business logic and calculations
- ✅ Return typed DTOs
- ✅ Throw domain errors (with status codes)
- ✅ Call other services when needed
- ✅ Log important operations

**Services MUST NOT:**
- ❌ Know about HTTP requests/responses
- ❌ Handle authentication (receive userId as parameter)
- ❌ Format API responses
- ❌ Have circular dependencies

**Standard Service Structure:**
```typescript
// services/clients.ts

import { getServiceSupabase } from '@/server/supabase/service-client';
import type { ClientDTO, ClientInput, ClientFilters } from '@/lib/types/clients';
import { NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * Get a single client by ID
 * @throws NotFoundError if client doesn't exist
 */
export async function getClient(id: number): Promise<ClientDTO> {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();

  if (!data) throw new NotFoundError('Client', id);

  return mapClientToDTO(data);
}

/**
 * List clients with optional filters
 */
export async function listClients(filters?: ClientFilters): Promise<ClientDTO[]> {
  const supabase = getServiceSupabase();
  let query = supabase.from('clients').select('*');

  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  const { data } = await query;
  return data.map(mapClientToDTO);
}

/**
 * Create new client
 */
export async function createClient(
  input: ClientInput,
  userId: number
): Promise<ClientDTO> {
  const supabase = getServiceSupabase();

  const { data } = await supabase
    .from('clients')
    .insert({ ...input, created_by: userId })
    .select()
    .single();

  logger.info({
    scope: 'clients.create',
    message: 'Client created',
    data: { clientId: data.id }
  });

  return mapClientToDTO(data);
}

/**
 * Update existing client
 */
export async function updateClient(
  id: number,
  input: Partial<ClientInput>,
  userId: number
): Promise<ClientDTO> {
  await getClient(id); // Verify exists

  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from('clients')
    .update({ ...input, updated_by: userId })
    .eq('id', id)
    .select()
    .single();

  return mapClientToDTO(data);
}

/**
 * Delete client
 */
export async function deleteClient(id: number): Promise<void> {
  const supabase = getServiceSupabase();
  await supabase.from('clients').delete().eq('id', id);
}

// Helper: Map database row to DTO
function mapClientToDTO(row: any): ClientDTO {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
```

---

## Pattern 3: Error Handling

**RULE:** Use custom error classes with HTTP status codes

**Error Classes:**
```typescript
// lib/errors.ts

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: number | string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 422, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}
```

**Usage in Services:**
```typescript
export async function getClient(id: number) {
  const { data } = await supabase.from('clients').select('*').eq('id', id).single();
  if (!data) throw new NotFoundError('Client', id);
  return mapClientToDTO(data);
}
```

**Usage in API Routes:**
```typescript
export async function GET(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const client = await getClient(Number(id));
    return success(client);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    logger.error({ scope: 'clients.get', error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
```

---

## Pattern 4: Type Organization

**RULE:** Feature-colocated types in `/lib/types/[resource].ts`

**Directory Structure:**
```
src/lib/types/
├── clients.ts       # Client types
├── invoices.ts      # Invoice types
├── quotes.ts        # Quote types
├── common.ts        # Shared types
└── index.ts         # Re-export all
```

**Naming Convention:**
- `ResourceDTO` - Full object from API
- `ResourceListItemDTO` - Minimal object for lists
- `ResourceInput` - Create/update input
- `ResourceFilters` - Query filters

**Example:**
```typescript
// lib/types/clients.ts

// Full detail DTO
export interface ClientDTO {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  paymentTerms: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// List item DTO (minimal)
export interface ClientListItemDTO {
  id: number;
  name: string;
  email: string;
  outstandingBalance: number;
}

// Create/update input
export interface ClientInput {
  name: string;
  email: string;
  phone?: string;
  paymentTerms?: string;
}

// Query filters
export interface ClientFilters {
  search?: string;
  paymentTerms?: string;
}
```

**Re-export:**
```typescript
// lib/types/index.ts
export * from './clients';
export * from './invoices';
export * from './common';
```

---

## Pattern 5: API Response Format

**RULE:** Standard envelope with helper functions

**Response Helpers:**
```typescript
// server/api/respond.ts

export type SuccessResponse<T = unknown> = {
  data: T;
};

export type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function success<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data } as SuccessResponse<T>, { status });
}

export function fail(
  code: string,
  message: string,
  status = 500,
  details?: unknown
): NextResponse {
  return NextResponse.json(
    { error: { code, message, details } } as ErrorResponse,
    { status }
  );
}
```

**Standard HTTP Status Codes:**
- `200` - Success (GET, PUT, PATCH)
- `201` - Created (POST)
- `204` - No Content (DELETE)
- `400` - Bad Request
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (no permission)
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

**Usage:**
```typescript
// Success
return success(client);                    // 200
return success(client, 201);               // 201 Created
return success(null, 204);                 // 204 No Content

// Errors
return fail('NOT_FOUND', 'Client not found', 404);
return fail('VALIDATION_ERROR', 'Invalid input', 422, { field: 'email' });
```

---

## Pattern 6: Authentication

**RULE:** Consistent auth helpers with clear naming

**Auth Helpers:**
```typescript
// server/auth/api-helpers.ts

export async function getAuthUser(req: NextRequest): Promise<User | null> {
  const token = req.cookies.get('sb:token')?.value;
  if (!token) return null;

  const supabase = getServiceSupabase();
  const { data } = await supabase.auth.getUser(token);
  if (!data.user) return null;

  return await getUserProfile(data.user.id);
}

export async function requireAuth(req: NextRequest): Promise<User> {
  const user = await getAuthUser(req);
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireAdmin(req: NextRequest): Promise<User> {
  const user = await requireAuth(req);
  if (user.role !== 'ADMIN') {
    throw new ForbiddenError('Admin access required');
  }
  return user;
}

export async function requireClient(req: NextRequest): Promise<User> {
  const user = await requireAuth(req);
  if (user.role !== 'CLIENT') {
    throw new ForbiddenError('Client access required');
  }
  return user;
}
```

**Usage:**
```typescript
// Public route
export async function POST(req: NextRequest) { /* no auth */ }

// Any authenticated user
export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
}

// Admin only
export async function DELETE(req: NextRequest) {
  const user = await requireAdmin(req);
}
```

---

## Pattern 7: Validation

**RULE:** Validate at API boundary with Zod

**Schema Definition:**
```typescript
// lib/schemas/clients.ts
import { z } from 'zod';

export const clientInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  paymentTerms: z.string().optional(),
});

export type ClientInput = z.infer<typeof clientInputSchema>;

// Variations
export const createClientSchema = clientInputSchema;
export const updateClientSchema = clientInputSchema.partial();
```

**Usage in API Route:**
```typescript
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = clientInputSchema.parse(body); // Throws ZodError

    const user = await requireAdmin(req);
    const client = await createClient(validated, user.id);

    return success(client, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail('VALIDATION_ERROR', 'Invalid input', 422, {
        issues: error.issues
      });
    }
    return handleError(error, 'clients.create');
  }
}
```

**Service Trusts Input:**
```typescript
// Service assumes input is already validated
export async function createClient(
  input: ClientInput,  // Already validated by API route
  userId: number
): Promise<ClientDTO> {
  // No validation needed here
}
```

---

## Pattern 8: Logging

**RULE:** Structured logging with scope

**Logger:**
```typescript
// lib/logger.ts

type LogData = {
  scope: string;      // Format: 'resource.action'
  message?: string;
  data?: unknown;
  error?: Error;
};

export const logger = {
  info: ({ scope, message, data }: LogData) => {
    console.log(`[INFO] [${scope}]`, message, data);
  },

  warn: ({ scope, message, error, data }: LogData) => {
    console.warn(`[WARN] [${scope}]`, message, error?.message, data);
  },

  error: ({ scope, error, data }: LogData) => {
    console.error(`[ERROR] [${scope}]`, error?.message, error?.stack, data);
  },

  debug: ({ scope, message, data }: LogData) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] [${scope}]`, message, data);
    }
  },
};
```

**Usage:**
```typescript
logger.info({
  scope: 'clients.create',
  message: 'Creating new client',
  data: { name: 'Acme Corp' }
});

logger.error({
  scope: 'clients.create',
  error,
  data: { input }
});
```

**Scope Naming:**
- Format: `resource.action`
- Examples: `clients.get`, `clients.create`, `invoices.update`, `stripe.webhook`

---

## Pattern 9: File Naming

**RULE:** Consistent naming conventions

- **Files:** `kebab-case.ts`
- **Components:** `PascalCase.tsx`
- **Services:** `kebab-case.ts` (plural: `clients.ts`)
- **Types:** `kebab-case.ts` (plural: `clients.ts`)
- **Schemas:** `kebab-case.ts` (plural: `clients.ts`)

**Examples:**
```
src/
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   └── DataTable.tsx
│   └── clients/
│       ├── ClientList.tsx
│       └── ClientCard.tsx
├── server/services/
│   ├── clients.ts
│   └── invoices.ts
└── lib/
    ├── types/
    │   └── clients.ts
    └── schemas/
        └── clients.ts
```

---

## Pattern 10: Import Organization

**RULE:** Grouped and ordered imports

```typescript
// 1. React and Next.js
import { useState } from 'react';
import { NextRequest, NextResponse } from 'next/server';

// 2. Third-party libraries
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';

// 3. Server layer
import { getClient, updateClient } from '@/server/services/clients';
import { requireAdmin } from '@/server/auth/api-helpers';

// 4. Lib (utils, schemas)
import { logger } from '@/lib/logger';
import { clientSchema } from '@/lib/schemas/clients';

// 5. Components
import { Button } from '@/components/ui/button';
import { ClientCard } from '@/components/clients/ClientCard';

// 6. Types (use 'import type')
import type { ClientDTO, ClientInput } from '@/lib/types/clients';

// 7. Relative imports (only for colocated files)
import { helper } from './helpers';

// 8. Styles (always last)
import './styles.css';
```

---

## API Route Template

**Standard Structure:**
```typescript
// src/app/api/clients/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/server/auth/api-helpers';
import { getClient, updateClient, deleteClient } from '@/server/services/clients';
import { success, fail } from '@/server/api/respond';
import { updateClientSchema } from '@/lib/schemas/clients';
import { AppError } from '@/lib/errors';
import { ZodError } from 'zod';
import type { ClientDTO } from '@/lib/types/clients';

type Context = { params: Promise<{ id: string }> };

/**
 * GET /api/clients/[id]
 * Get a single client by ID
 * @requires ADMIN role
 */
export async function GET(req: NextRequest, { params }: Context) {
  try {
    // 1. Auth
    await requireAdmin(req);

    // 2. Parse params
    const { id } = await params;

    // 3. Call service
    const client = await getClient(Number(id));

    // 4. Return success
    return success(client);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

/**
 * PUT /api/clients/[id]
 * Update a client
 * @requires ADMIN role
 */
export async function PUT(req: NextRequest, { params }: Context) {
  try {
    // 1. Auth
    const user = await requireAdmin(req);

    // 2. Parse params
    const { id } = await params;

    // 3. Parse and validate body
    const body = await req.json();
    const validated = updateClientSchema.parse(body);

    // 4. Call service
    const updated = await updateClient(Number(id), validated, user.id);

    // 5. Return success
    return success(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail('VALIDATION_ERROR', 'Invalid input', 422, {
        issues: error.issues
      });
    }
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

/**
 * DELETE /api/clients/[id]
 * Delete a client
 * @requires ADMIN role
 */
export async function DELETE(req: NextRequest, { params }: Context) {
  try {
    await requireAdmin(req);
    const { id } = await params;

    await deleteClient(Number(id));

    return success(null, 204);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
```

---

## Summary

| Pattern | Standard |
|---------|----------|
| Database Access | **Services only** |
| Service Layer | **Pure business logic** |
| Errors | **Custom classes with status** |
| Types | **Feature-colocated** `/lib/types/[resource].ts` |
| API Responses | **Standard envelope** `{ data }` or `{ error }` |
| Auth | **Consistent helpers** `requireAuth()`, `requireAdmin()` |
| Validation | **At API boundary** with Zod |
| Logging | **Structured with scope** `resource.action` |
| File Names | **kebab-case** (except components: PascalCase) |
| Imports | **Grouped and ordered** |

---

**Last Updated:** 2025-10-20
**Status:** ✅ Approved - Ready for Implementation
