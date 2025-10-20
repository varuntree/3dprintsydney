# Code Standards and Patterns - 3D Print Sydney

**Status:** DRAFT - For Review and Discussion
**Purpose:** Define consistent patterns, standards, and best practices for the entire codebase
**Goal:** Achieve 100% consistency and reliability across all code

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [Architecture & Layering](#architecture--layering)
3. [Database Access Patterns](#database-access-patterns)
4. [API Route Patterns](#api-route-patterns)
5. [Service Layer Patterns](#service-layer-patterns)
6. [Type Safety & DTOs](#type-safety--dtos)
7. [Error Handling](#error-handling)
8. [Authentication & Authorization](#authentication--authorization)
9. [React Component Patterns](#react-component-patterns)
10. [File Organization](#file-organization)
11. [Naming Conventions](#naming-conventions)
12. [Import Organization](#import-organization)
13. [Validation Patterns](#validation-patterns)
14. [Logging & Observability](#logging--observability)
15. [Testing Patterns](#testing-patterns)

---

## Core Principles

### 1. Consistency Over Cleverness
- **Principle:** Every similar operation should follow the exact same pattern
- **Why:** Predictability, maintainability, onboarding speed
- **Example:** All database queries go through service layer, no exceptions

### 2. Single Source of Truth
- **Principle:** Each concern has exactly one place it belongs
- **Why:** No duplication, clear boundaries, easy to find and fix bugs
- **Example:** Business logic only in services, never in API routes or components

### 3. Fail Fast, Fail Clearly
- **Principle:** Validate early, throw descriptive errors with context
- **Why:** Easier debugging, better user experience
- **Example:** Validate input at API boundary, throw errors with status codes

### 4. Type Safety First
- **Principle:** No `any`, minimal `unknown`, explicit types everywhere
- **Why:** Catch bugs at compile time, self-documenting code
- **Example:** All DTOs have explicit interfaces, all functions have typed parameters/returns

### 5. Dependency Direction
- **Principle:** Dependencies flow inward (UI → API → Services → Database)
- **Why:** Clean architecture, testable, loosely coupled
- **Example:** Services never import from API routes or components

---

## Architecture & Layering

### Layer Definitions

```
┌─────────────────────────────────────────┐
│  Presentation Layer (React Components)   │  ← User-facing UI, forms, displays
├─────────────────────────────────────────┤
│  API Layer (Next.js Route Handlers)     │  ← HTTP handling, auth checks, response formatting
├─────────────────────────────────────────┤
│  Service Layer (Business Logic)         │  ← Core business rules, workflows, calculations
├─────────────────────────────────────────┤
│  Data Access Layer (Supabase Client)    │  ← Database queries, storage operations
└─────────────────────────────────────────┘
```

### Strict Layer Rules

**MUST:**
- [ ] Each layer only imports from layers below it
- [ ] Services are the ONLY layer that talks to the database
- [ ] API routes call services, never database directly
- [ ] Components fetch via API routes or React Query
- [ ] All business logic lives in services

**MUST NOT:**
- [ ] Services import from API routes or components
- [ ] API routes contain business logic
- [ ] Components call database directly
- [ ] Utilities contain business logic
- [ ] Mixing concerns across layers

### Questions to Define:
1. **Q:** Should we allow Server Components to call services directly, or always go through API routes?
2. **Q:** Where do we put shared types? In a separate `/types` directory or colocated?
3. **Q:** How do we handle cross-service dependencies? (e.g., invoices service needs quotes service)

---

## Database Access Patterns

### DECISION NEEDED: Database Access Rules

**Current State:** Mixed - some routes query database, some use services

**Proposed Standard:**
```typescript
// ✅ CORRECT: Service layer handles all database access
// src/server/services/clients.ts
export async function getClient(id: number) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(`Client not found: ${id}`);
  return mapClientToDTO(data);
}

// src/app/api/clients/[id]/route.ts
export async function GET(req: NextRequest, { params }: Context) {
  const { id } = await params;
  const client = await getClient(Number(id));
  return success(client);
}

// ❌ WRONG: API route queries database directly
export async function GET(req: NextRequest, { params }: Context) {
  const supabase = getServiceSupabase();
  const { data } = await supabase.from('clients').select('*').eq('id', id);
  return NextResponse.json({ data });
}
```

### Standards to Define:

1. **Supabase Client Usage:**
   - [ ] Define: Where should `getServiceSupabase()` be called? (Service layer only? Or allow in routes?)
   - [ ] Define: Should we create a single database client instance or create per-request?
   - [ ] Define: How to handle transactions? (RPC functions? Service-level transactions?)

2. **Query Patterns:**
   - [ ] Define: Should all queries use `.select()` with explicit fields or allow `*`?
   - [ ] Define: How to handle joins? Always explicit or allow `.select('*, relation(*)')`?
   - [ ] Define: Where do we put complex queries? (Service methods? Separate query builders?)

3. **Error Handling:**
   - [ ] Define: How to handle Supabase errors? Transform to domain errors?
   - [ ] Define: Should we throw on not found, or return null?
   - [ ] Define: How to handle database constraint violations?

4. **Mutations:**
   - [ ] Define: All updates via services? No direct updates from routes?
   - [ ] Define: Should we use RPC functions for complex operations or handle in TypeScript?

---

## API Route Patterns

### DECISION NEEDED: API Route Responsibilities

**Proposed Standard:**
API routes should ONLY handle:
1. HTTP request parsing (params, query, body)
2. Authentication/authorization checks
3. Input validation (or delegate to service)
4. Calling service layer
5. Response formatting
6. Error handling/logging

**API routes should NEVER:**
1. Contain business logic
2. Query database directly
3. Contain calculations
4. Have conditional business rules

### Standard Template

```typescript
// src/app/api/resource/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/server/auth/api-helpers';
import { getResource, updateResource } from '@/server/services/resources';
import { success, fail } from '@/server/api/respond';
import { resourceSchema } from '@/lib/schemas/resources';
import { ZodError } from 'zod';

type Context = { params: Promise<{ id: string }> };

/**
 * GET /api/resource/[id]
 * Retrieve a single resource by ID
 * @requires ADMIN role
 */
export async function GET(req: NextRequest, { params }: Context) {
  try {
    // 1. Auth check
    await requireAdminAPI(req);

    // 2. Parse params
    const { id } = await params;
    const resourceId = Number(id);

    // 3. Call service
    const resource = await getResource(resourceId);

    // 4. Return success
    return success(resource);
  } catch (error) {
    // 5. Handle errors
    return handleError(error, 'resources.get');
  }
}

/**
 * PUT /api/resource/[id]
 * Update a resource
 * @requires ADMIN role
 */
export async function PUT(req: NextRequest, { params }: Context) {
  try {
    // 1. Auth check
    const user = await requireAdminAPI(req);

    // 2. Parse params
    const { id } = await params;
    const resourceId = Number(id);

    // 3. Parse and validate body
    const body = await req.json();
    const validated = resourceSchema.parse(body);

    // 4. Call service
    const updated = await updateResource(resourceId, validated, user.id);

    // 5. Return success
    return success(updated);
  } catch (error) {
    // 6. Handle validation errors
    if (error instanceof ZodError) {
      return fail('VALIDATION_ERROR', 'Invalid input', 422, {
        issues: error.issues
      });
    }
    return handleError(error, 'resources.update');
  }
}
```

### Questions to Define:

1. **Response Format:**
   - [ ] Should we use `success()` and `fail()` helpers everywhere?
   - [ ] Or use NextResponse.json() directly?
   - [ ] What's the standard success envelope? `{ data: T }` or just `T`?

2. **Error Responses:**
   - [ ] Standard error codes? (VALIDATION_ERROR, NOT_FOUND, UNAUTHORIZED, etc.)
   - [ ] Should errors include stack traces in development?
   - [ ] How to handle async errors in route handlers?

3. **Authentication:**
   - [ ] Should ALL routes call auth check first, or only protected ones?
   - [ ] Where to put auth logic? Helper functions or middleware?
   - [ ] How to handle optional auth (public routes)?

4. **Status Codes:**
   - [ ] Define standard status codes for each scenario
   - [ ] 200 for success, 201 for created, 204 for no content?
   - [ ] 400, 401, 403, 404, 422, 500 - when to use which?

---

## Service Layer Patterns

### DECISION NEEDED: Service Structure

**Proposed Standard:**

```typescript
// src/server/services/[resource].ts

import { getServiceSupabase } from '@/server/supabase/service-client';
import { ResourceDTO, ResourceInput } from '@/lib/types/resource';
import { logger } from '@/lib/logger';

/**
 * Get a single resource by ID
 * @throws Error if not found
 */
export async function getResource(id: number): Promise<ResourceDTO> {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw Object.assign(
      new Error(`Resource not found: ${id}`),
      { status: 404 }
    );
  }

  return mapResourceToDTO(data);
}

/**
 * List all resources with optional filtering
 */
export async function listResources(filters?: {
  status?: string;
  clientId?: number;
}): Promise<ResourceDTO[]> {
  const supabase = getServiceSupabase();

  let query = supabase.from('resources').select('*');

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.clientId) {
    query = query.eq('client_id', filters.clientId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list resources: ${error.message}`);
  }

  return data.map(mapResourceToDTO);
}

/**
 * Create a new resource
 */
export async function createResource(
  input: ResourceInput,
  userId: number
): Promise<ResourceDTO> {
  const supabase = getServiceSupabase();

  // Business logic: validate, calculate, etc.
  const dataToInsert = {
    ...input,
    created_by: userId,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('resources')
    .insert(dataToInsert)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create resource: ${error.message}`);
  }

  // Activity logging
  await logActivity({
    action: 'RESOURCE_CREATED',
    resourceId: data.id,
    userId,
  });

  return mapResourceToDTO(data);
}

/**
 * Update an existing resource
 */
export async function updateResource(
  id: number,
  input: Partial<ResourceInput>,
  userId: number
): Promise<ResourceDTO> {
  const supabase = getServiceSupabase();

  // Check existence
  await getResource(id);

  const { data, error } = await supabase
    .from('resources')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update resource: ${error.message}`);
  }

  return mapResourceToDTO(data);
}

/**
 * Delete a resource
 */
export async function deleteResource(id: number): Promise<void> {
  const supabase = getServiceSupabase();

  const { error } = await supabase
    .from('resources')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete resource: ${error.message}`);
  }
}

// Helper: Map database row to DTO
function mapResourceToDTO(row: any): ResourceDTO {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
```

### Questions to Define:

1. **DTO Mapping:**
   - [ ] Should every service have `mapToDTO()` functions?
   - [ ] Where should DTOs be defined? Colocated with service or separate?
   - [ ] Should DTOs transform snake_case to camelCase?

2. **Error Handling:**
   - [ ] Should services throw errors or return null?
   - [ ] Should errors have `status` property for HTTP codes?
   - [ ] How to handle database errors vs business logic errors?

3. **Activity Logging:**
   - [ ] Should every mutation log activity?
   - [ ] Should logging be in service or separate?
   - [ ] What metadata should be logged?

4. **Transactions:**
   - [ ] How to handle multi-step operations?
   - [ ] Use Supabase RPC functions or TypeScript transactions?
   - [ ] Where to put transaction logic?

5. **Service Dependencies:**
   - [ ] Can services import other services?
   - [ ] How to avoid circular dependencies?
   - [ ] Should we have a service orchestrator layer?

---

## Type Safety & DTOs

### DECISION NEEDED: Type Organization

**Proposed Standards:**

1. **Database Types:**
```typescript
// src/lib/supabase/types.ts (generated from Supabase)
export type Database = { ... }
export type Tables = Database['public']['Tables']
export type Enums = Database['public']['Enums']
```

2. **Domain Types (DTOs):**
```typescript
// src/lib/types/[resource].ts
export interface ResourceDTO {
  id: number;
  name: string;
  status: ResourceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceListItemDTO {
  id: number;
  name: string;
  status: ResourceStatus;
}

export interface ResourceInput {
  name: string;
  status: ResourceStatus;
}
```

3. **Validation Schemas:**
```typescript
// src/lib/schemas/[resource].ts
import { z } from 'zod';

export const resourceInputSchema = z.object({
  name: z.string().min(1).max(255),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export type ResourceInput = z.infer<typeof resourceInputSchema>;
```

### Questions to Define:

1. **Type Location:**
   - [ ] One `/types` directory or colocated with usage?
   - [ ] Where do enums live?
   - [ ] Where do shared types live?

2. **DTO Naming:**
   - [ ] `ResourceDTO` vs `Resource` vs `ResourceResponse`?
   - [ ] `ResourceInput` vs `CreateResourceRequest` vs `ResourcePayload`?
   - [ ] `ResourceListItemDTO` vs `ResourceSummary` vs `ResourceListItem`?

3. **Type Inference:**
   - [ ] Infer types from Zod schemas or define separately?
   - [ ] Use database types directly or transform?

4. **Type Exports:**
   - [ ] Re-export types from index files?
   - [ ] Export types alongside implementation?

---

## Error Handling

### DECISION NEEDED: Error Patterns

**Current Issues:**
- Inconsistent error throwing/catching
- Mixing error types (Error, custom errors, Supabase errors)
- Inconsistent status code handling

**Proposed Standard:**

```typescript
// src/lib/errors.ts

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
    super(
      `${resource} not found: ${id}`,
      'NOT_FOUND',
      404
    );
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 422, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

// Usage in services:
export async function getResource(id: number): Promise<ResourceDTO> {
  const { data, error } = await supabase.from('resources').select('*').eq('id', id).single();

  if (error || !data) {
    throw new NotFoundError('Resource', id);
  }

  return mapResourceToDTO(data);
}

// Usage in API routes:
export async function GET(req: NextRequest) {
  try {
    const resource = await getResource(id);
    return success(resource);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return handleError(error, 'resources.get');
  }
}
```

### Questions to Define:

1. **Error Types:**
   - [ ] Custom error classes or plain Error with properties?
   - [ ] Should we have domain-specific error types?
   - [ ] How to handle third-party errors (Supabase, Stripe)?

2. **Error Messages:**
   - [ ] Generic messages or detailed?
   - [ ] Client-safe messages vs internal logging?
   - [ ] Error message templates?

3. **Error Logging:**
   - [ ] Where to log errors? (Service layer? API layer? Both?)
   - [ ] What to log? (Stack trace? Request context? User info?)
   - [ ] Log levels? (error, warn, info, debug)

---

## Authentication & Authorization

### DECISION NEEDED: Auth Patterns

**Current Issues:**
- Multiple auth checking functions
- Inconsistent auth patterns across routes
- Mixing authentication and authorization

**Proposed Standard:**

```typescript
// src/server/auth/api-helpers.ts

/**
 * Get authenticated user from request (or null)
 */
export async function getAuthUser(req: NextRequest): Promise<User | null> {
  const token = req.cookies.get('sb:token')?.value;
  if (!token) return null;

  const supabase = getServiceSupabase();
  const { data } = await supabase.auth.getUser(token);

  if (!data.user) return null;

  return await getUserProfile(data.user.id);
}

/**
 * Require authenticated user (throws 401)
 */
export async function requireAuth(req: NextRequest): Promise<User> {
  const user = await getAuthUser(req);
  if (!user) {
    throw new UnauthorizedError('Authentication required');
  }
  return user;
}

/**
 * Require ADMIN role (throws 401/403)
 */
export async function requireAdmin(req: NextRequest): Promise<User> {
  const user = await requireAuth(req);
  if (user.role !== 'ADMIN') {
    throw new ForbiddenError('Admin access required');
  }
  return user;
}

/**
 * Require CLIENT role (throws 401/403)
 */
export async function requireClient(req: NextRequest): Promise<User> {
  const user = await requireAuth(req);
  if (user.role !== 'CLIENT') {
    throw new ForbiddenError('Client access required');
  }
  return user;
}

// Usage in API routes:
export async function GET(req: NextRequest) {
  const user = await requireAdmin(req); // Or requireClient, or requireAuth
  // ... rest of handler
}
```

### Questions to Define:

1. **Auth Naming:**
   - [ ] `requireAdmin` vs `requireAdminAPI` vs `ensureAdmin`?
   - [ ] Should we have separate functions for API vs page auth?
   - [ ] One set of functions or separate for each layer?

2. **Permission Checking:**
   - [ ] Where to check resource ownership? (Service? API route? Helper?)
   - [ ] How to handle complex permissions?
   - [ ] Should we have permission helpers? (`canEditInvoice()`, etc.)

3. **Auth State:**
   - [ ] How to pass user context to services?
   - [ ] Should services know about auth or just receive userId?
   - [ ] How to handle system operations (no user)?

---

## React Component Patterns

### DECISION NEEDED: Component Organization

**Current Issues:**
- Mixing server and client components
- Inconsistent state management
- No clear pattern for data fetching

**Proposed Standards:**

1. **Server Components (Default):**
```typescript
// src/app/(admin)/clients/page.tsx
import { requireAdmin } from '@/server/auth/session';
import { ClientsView } from '@/components/clients/clients-view';

export default async function ClientsPage() {
  // Auth check
  await requireAdmin();

  // Optional: Fetch initial data server-side
  // const clients = await listClients();

  return <ClientsView />;
}
```

2. **Client Components (When Needed):**
```typescript
// src/components/clients/clients-view.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchClients } from '@/lib/api/clients';

export function ClientsView() {
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
  });

  if (isLoading) return <Loader />;

  return (
    <div>
      {clients?.map(client => <ClientCard key={client.id} client={client} />)}
    </div>
  );
}
```

3. **API Client Functions:**
```typescript
// src/lib/api/clients.ts
export async function fetchClients(): Promise<ClientDTO[]> {
  const response = await fetch('/api/clients');
  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error?.message || 'Failed to fetch clients');
  }

  return json.data;
}
```

### Questions to Define:

1. **Component Types:**
   - [ ] When to use Server vs Client components?
   - [ ] Should we prefer Server Components by default?
   - [ ] How to handle forms? (Server Actions vs Client mutations?)

2. **State Management:**
   - [ ] React Query for all server state?
   - [ ] Zustand only for UI state?
   - [ ] Context for what use cases?

3. **Data Fetching:**
   - [ ] Where to fetch data? (Page? Component? Hook?)
   - [ ] Use React Query everywhere or mix with Server Components?
   - [ ] How to handle optimistic updates?

4. **Component Structure:**
   - [ ] One component per file or colocate related components?
   - [ ] Where to put sub-components?
   - [ ] How to organize component files?

---

## File Organization

### DECISION NEEDED: Directory Structure

**Current Structure:**
```
src/
├── app/                    # Next.js routes
│   ├── (admin)/           # Admin portal pages
│   ├── (client)/          # Client portal pages
│   ├── (public)/          # Public pages
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # Shared UI components
│   └── [feature]/        # Feature-specific components
├── lib/                   # Shared utilities
│   ├── schemas/          # Zod validation schemas
│   └── types/            # TypeScript types (?)
├── server/                # Backend code
│   ├── services/         # Business logic
│   ├── auth/             # Auth helpers
│   └── storage/          # File storage
└── styles/               # Global styles
```

### Questions to Define:

1. **Types Location:**
   - [ ] `/lib/types/` or `/types/` or colocated?
   - [ ] Should we have a central types directory?
   - [ ] Where do DTOs live?

2. **Shared Code:**
   - [ ] What goes in `/lib/`? Only pure utilities?
   - [ ] Should schemas be in `/lib/` or `/server/`?
   - [ ] Where do constants live?

3. **Component Organization:**
   - [ ] Group by feature or by type?
   - [ ] Where do shared components live?
   - [ ] How deep can nesting go?

4. **Service Organization:**
   - [ ] One service file per resource?
   - [ ] Where do helper functions go?
   - [ ] Should we have service subdirectories?

---

## Naming Conventions

### DECISION NEEDED: Naming Standards

**Proposed Standards:**

1. **Files:**
   - [ ] `kebab-case.ts` or `camelCase.ts` or `PascalCase.ts`?
   - [ ] Component files: `ClientCard.tsx` or `client-card.tsx`?
   - [ ] Service files: `clients.ts` or `clientsService.ts` or `clients.service.ts`?

2. **Variables:**
   - [ ] `camelCase` for all variables?
   - [ ] `UPPER_SNAKE_CASE` for constants?
   - [ ] `PascalCase` for types/interfaces/classes?

3. **Functions:**
   - [ ] Verb-first: `getClient`, `createInvoice`, `updateJob`?
   - [ ] CRUD naming: `get`, `list`, `create`, `update`, `delete`?
   - [ ] Or: `find`, `findAll`, `save`, `remove`?

4. **React Components:**
   - [ ] `PascalCase` always?
   - [ ] Suffix for specific types: `ClientCard`, `ClientList`, `ClientForm`?
   - [ ] Or prefix: `CardClient`, `ListClient`, `FormClient`?

5. **API Endpoints:**
   - [ ] Plural or singular? `/api/clients` or `/api/client`?
   - [ ] Action endpoints: `/api/invoices/[id]/mark-paid` or `/api/invoices/[id]/payment`?

---

## Import Organization

### DECISION NEEDED: Import Patterns

**Proposed Standard:**

```typescript
// 1. External dependencies (React, Next.js, third-party)
import { useState } from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// 2. Internal absolute imports - Server/Services
import { getClient, updateClient } from '@/server/services/clients';
import { requireAdminAPI } from '@/server/auth/api-helpers';

// 3. Internal absolute imports - Lib/Utils
import { logger } from '@/lib/logger';
import { clientSchema } from '@/lib/schemas/clients';

// 4. Internal absolute imports - Components (if applicable)
import { Button } from '@/components/ui/button';

// 5. Internal absolute imports - Types
import type { ClientDTO, ClientInput } from '@/lib/types/clients';

// 6. Relative imports (only for colocated files)
import { helper } from './helpers';

// 7. CSS/Styles (always last)
import './styles.css';
```

### Questions to Define:

1. **Import Order:**
   - [ ] Should we enforce this order? (ESLint rule?)
   - [ ] Group by source or by type?

2. **Import Aliases:**
   - [ ] Use `@/` for everything?
   - [ ] Or use relative imports for nearby files?
   - [ ] Multiple aliases? (`@server/`, `@lib/`, `@components/`)?

3. **Type Imports:**
   - [ ] Always use `import type` for types?
   - [ ] Or let TypeScript strip unused imports?

---

## Validation Patterns

### DECISION NEEDED: Validation Strategy

**Proposed Standard:**

```typescript
// 1. Define schema
// src/lib/schemas/clients.ts
export const clientInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
});

export type ClientInput = z.infer<typeof clientInputSchema>;

// 2. Validate in API route
// src/app/api/clients/route.ts
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = clientInputSchema.parse(body); // Throws ZodError

    const client = await createClient(validated);
    return success(client);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail('VALIDATION_ERROR', 'Invalid input', 422, {
        issues: error.issues
      });
    }
    return handleError(error, 'clients.create');
  }
}

// 3. Service receives validated data
// src/server/services/clients.ts
export async function createClient(input: ClientInput): Promise<ClientDTO> {
  // input is already validated, no need to check again
  // ... create client
}
```

### Questions to Define:

1. **Validation Location:**
   - [ ] API routes only? Or also in services?
   - [ ] Should services trust input or validate again?
   - [ ] Where to validate on update vs create?

2. **Schema Reuse:**
   - [ ] Separate schemas for create/update/partial?
   - [ ] Or one schema with `.partial()`, `.pick()`, `.omit()`?

3. **Error Messages:**
   - [ ] Custom error messages in schema?
   - [ ] Or generic messages?
   - [ ] Client-facing vs internal validation?

---

## Logging & Observability

### DECISION NEEDED: Logging Strategy

**Proposed Standard:**

```typescript
// src/lib/logger.ts
export const logger = {
  info: (data: { scope: string; message?: string; data?: unknown }) => {
    console.log('[INFO]', data.scope, data.message, data.data);
  },

  warn: (data: { scope: string; message: string; error?: Error; data?: unknown }) => {
    console.warn('[WARN]', data.scope, data.message, data.error, data.data);
  },

  error: (data: { scope: string; message?: string; error: Error; data?: unknown }) => {
    console.error('[ERROR]', data.scope, data.message, data.error, data.data);
  },

  debug: (data: { scope: string; message: string; data?: unknown }) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[DEBUG]', data.scope, data.message, data.data);
    }
  },
};

// Usage:
logger.info({
  scope: 'clients.create',
  message: 'Creating new client',
  data: { clientName: 'Acme Corp' }
});

logger.error({
  scope: 'clients.create',
  error,
  data: { input }
});
```

### Questions to Define:

1. **Scope Convention:**
   - [ ] Format: `resource.action` or `service.resource.action`?
   - [ ] Should we have scope constants or free-form strings?

2. **What to Log:**
   - [ ] Log all API requests?
   - [ ] Log all database queries?
   - [ ] Log only errors or also success?

3. **Sensitive Data:**
   - [ ] How to avoid logging passwords, tokens, etc.?
   - [ ] Should we have a sanitize function?

4. **Log Levels:**
   - [ ] When to use each level?
   - [ ] Should we have trace/verbose levels?

---

## Testing Patterns

### DECISION NEEDED: Testing Strategy

**Questions to Define:**

1. **What to Test:**
   - [ ] Unit tests for services?
   - [ ] Integration tests for API routes?
   - [ ] E2E tests for critical flows?
   - [ ] Component tests?

2. **Test Organization:**
   - [ ] Colocate tests with code? (`clients.test.ts` next to `clients.ts`)
   - [ ] Or separate `/tests` directory?

3. **Test Naming:**
   - [ ] `*.test.ts` or `*.spec.ts`?
   - [ ] Test file per source file or grouped?

4. **Mocking:**
   - [ ] Mock Supabase? Or use test database?
   - [ ] Mock external services (Stripe, etc.)?

---

## Summary: Key Decisions Needed

### Critical Decisions (Must Define First):

1. **Database Access:**
   - [ ] Services only? Or allow routes to query?
   - [ ] Where to create Supabase client?

2. **Service Layer:**
   - [ ] What goes in services?
   - [ ] Can services call other services?
   - [ ] DTO mapping in services or separate?

3. **Error Handling:**
   - [ ] Custom error classes or plain Error?
   - [ ] Where to handle errors?

4. **Type Organization:**
   - [ ] Where do types live?
   - [ ] DTOs, inputs, outputs naming?

5. **API Response Format:**
   - [ ] Standard envelope?
   - [ ] Error format?

### Secondary Decisions (Important but can evolve):

6. File naming conventions
7. Import order
8. Component patterns
9. Logging format
10. Testing strategy

---

## Next Steps

1. **Review & Discuss:** Go through each section and make decisions
2. **Document Decisions:** Update this file with agreed standards
3. **Create Examples:** Build reference implementations for each pattern
4. **Create Checklist:** Turn this into a cleanup checklist
5. **Execute Cleanup:** Systematically apply standards across codebase

---

**Status:** 🟡 AWAITING DECISIONS
**Last Updated:** 2025-10-20
**Owner:** Team Discussion
