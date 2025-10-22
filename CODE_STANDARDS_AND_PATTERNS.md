# Code Standards and Patterns

> **Definitive Reference**: This document reflects the ACTUAL patterns implemented in the 3D Print Sydney codebase. All examples are taken from real production code.

Last Updated: 2025-10-21

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [Pattern 1: Database Access](#pattern-1-database-access)
3. [Pattern 2: Service Layer Structure](#pattern-2-service-layer-structure)
4. [Pattern 3: Error Handling](#pattern-3-error-handling)
5. [Pattern 4: Type Organization](#pattern-4-type-organization)
6. [Pattern 5: API Response Format](#pattern-5-api-response-format)
7. [Pattern 6: Authentication](#pattern-6-authentication)
8. [Pattern 7: Validation](#pattern-7-validation)
9. [Pattern 8: Logging](#pattern-8-logging)
10. [Pattern 9: File Naming](#pattern-9-file-naming)
11. [Pattern 10: Import Organization](#pattern-10-import-organization)
12. [Complete Templates](#complete-templates)
13. [Quick Reference](#quick-reference)

---

## Core Principles

### Architectural Layers

```
┌─────────────────────────────────────────┐
│  API Routes (/src/app/api)              │  ← Thin handlers, auth, validation
├─────────────────────────────────────────┤
│  Services (/src/server/services)        │  ← Business logic, DB operations
├─────────────────────────────────────────┤
│  Database (Supabase)                    │  ← Single source of truth
└─────────────────────────────────────────┘
```

**Key Rules:**
- API routes are thin: auth → validate → call service → respond
- Services contain ALL business logic
- Services are the ONLY layer that accesses the database
- Never bypass the service layer from API routes

---

## Pattern 1: Database Access

### Rule: Services Only

**Database access is ONLY allowed in service layer files** (`/src/server/services/*.ts`)

### Implementation

```typescript
// ✅ CORRECT: In service file
// /src/server/services/materials.ts
import { getServiceSupabase } from "@/server/supabase/service-client";

export async function listMaterials(options?: {
  q?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = getServiceSupabase();
  let query = supabase
    .from("materials")
    .select("*")
    .order("name", { ascending: true });

  if (options?.q) {
    const term = options.q.trim();
    query = query.or(`name.ilike.%${term}%,color.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError(`Failed to list materials: ${error.message}`, 'DATABASE_ERROR', 500);
  }
  return data;
}
```

```typescript
// ❌ WRONG: Database access in API route
// NEVER do this
export async function GET(request: NextRequest) {
  const supabase = getServiceSupabase(); // ❌ NO!
  const { data } = await supabase.from("materials").select("*");
  return ok(data);
}
```

### Database Client Function

**Location:** `/src/server/supabase/service-client.ts`

```typescript
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/env';

export function getServiceSupabase(): SupabaseClient {
  if (!cached) {
    cached = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public',
      },
    });
  }
  return cached;
}
```

**Usage:** Only import and use `getServiceSupabase()` in `/src/server/services/*.ts` files.

---

## Pattern 2: Service Layer Structure

### Standard Service File Template

**Real Example:** `/src/server/services/materials.ts`

```typescript
// 1. IMPORTS: External deps first, then internal
import { logger } from "@/lib/logger";
import type { MaterialInput } from "@/lib/schemas/catalog";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { AppError, NotFoundError, ValidationError } from "@/lib/errors";

// 2. TYPES: DTOs and internal types
export type MaterialDTO = {
  id: number;
  name: string;
  color: string;
  category: string;
  costPerGram: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
};

type MaterialRow = {
  id: number;
  name: string;
  color: string | null;
  cost_per_gram: string | number | null;
  created_at: string;
  updated_at: string;
};

// 3. HELPER FUNCTIONS: Private utilities (not exported)
function mapMaterial(row: MaterialRow | null): MaterialDTO {
  if (!row) {
    throw new NotFoundError("Material", "unknown");
  }
  return {
    id: row.id,
    name: row.name,
    color: row.color ?? "",
    costPerGram: Number(row.cost_per_gram ?? 0),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

async function insertActivity(action: string, message: string, materialId: number) {
  const supabase = getServiceSupabase();
  const { error } = await supabase.from("activity_logs").insert({
    action,
    message,
    metadata: { materialId },
  });
  if (error) {
    logger.warn({
      scope: "materials.activity",
      message: "Failed to record material activity",
      error,
      data: { materialId, action },
    });
  }
}

// 4. PUBLIC FUNCTIONS: Exported service methods with JSDoc
/**
 * List all materials with optional filtering, sorting, and pagination
 * @param options - Query options for search, sorting, and pagination
 * @returns Array of material DTOs
 * @throws AppError if database query fails
 */
export async function listMaterials(options?: {
  q?: string;
  limit?: number;
  offset?: number;
  sort?: "name" | "updatedAt";
  order?: "asc" | "desc";
}): Promise<MaterialDTO[]> {
  const supabase = getServiceSupabase();
  let query = supabase
    .from("materials")
    .select("*")
    .order(
      options?.sort === "updatedAt" ? "updated_at" : "name",
      { ascending: (options?.order ?? "asc") === "asc" }
    );

  if (options?.q) {
    const term = options.q.trim();
    if (term.length > 0) {
      query = query.or(`name.ilike.%${term}%,color.ilike.%${term}%`);
    }
  }

  if (typeof options?.limit === "number") {
    const limit = Math.max(1, options.limit);
    const offset = Math.max(0, options.offset ?? 0);
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError(`Failed to list materials: ${error.message}`, 'DATABASE_ERROR', 500);
  }
  return (data as MaterialRow[]).map(mapMaterial);
}

/**
 * Create a new material
 * @param input - Material creation input (already validated)
 * @returns Created material DTO
 * @throws AppError if database operation fails
 */
export async function createMaterial(input: MaterialInput) {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("materials")
    .insert({
      name: input.name,
      color: input.color || null,
      category: input.category || null,
      cost_per_gram: String(input.costPerGram),
      notes: input.notes || null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new AppError(`Failed to create material: ${error?.message ?? "Unknown error"}`, 'DATABASE_ERROR', 500);
  }

  await insertActivity("MATERIAL_CREATED", `Material ${data.name} created`, data.id);
  logger.info({ scope: "materials.create", data: { id: data.id } });

  return mapMaterial(data as MaterialRow);
}

/**
 * Delete a material after verifying it's not referenced by product templates
 * @param id - Material ID to delete
 * @returns Deleted material DTO
 * @throws ValidationError if material is referenced by product templates
 * @throws AppError if database operation fails
 */
export async function deleteMaterial(id: number) {
  const supabase = getServiceSupabase();

  // Check for references before deleting
  const { count, error: countError } = await supabase
    .from("product_templates")
    .select("id", { count: "exact", head: true })
    .eq("material_id", id);

  if (countError) {
    throw new AppError(`Failed to verify material usage: ${countError.message}`, 'DATABASE_ERROR', 500);
  }

  if ((count ?? 0) > 0) {
    throw new ValidationError(
      "Cannot delete material: it is referenced by product templates"
    );
  }

  const { data, error } = await supabase
    .from("materials")
    .delete()
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new AppError(`Failed to delete material: ${error?.message ?? "Unknown error"}`, 'DATABASE_ERROR', 500);
  }

  await insertActivity("MATERIAL_DELETED", `Material ${data.name} deleted`, data.id);
  logger.info({ scope: "materials.delete", data: { id } });

  return mapMaterial(data as MaterialRow);
}
```

### Service Function Naming Conventions

```typescript
// List/query operations
export async function listClients(filters?: ClientFilters)
export async function getClientDetail(id: number)
export async function getJobBoard(filters?: BoardFilters)

// Create operations
export async function createClient(input: ClientInput)
export async function createMaterial(input: MaterialInput)

// Update operations
export async function updateClient(id: number, input: ClientInput)
export async function updateJobStatus(id: number, status: JobStatus)

// Delete operations
export async function deleteClient(id: number)
export async function deleteMaterial(id: number)

// Specialized operations (descriptive verb)
export async function archiveJob(id: number, reason?: string)
export async function revertInvoiceToQuote(invoiceId: number)
export async function ensureJobForInvoice(invoiceId: number)
```

---

## Pattern 3: Error Handling

### Error Class Hierarchy

**Location:** `/src/lib/errors.ts`

```typescript
/**
 * Base application error class
 * All custom errors extend from this
 */
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

/**
 * Resource not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id: number | string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404);
  }
}

/**
 * Validation error (422)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 422, details);
  }
}

/**
 * Unauthorized error - user not authenticated (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

/**
 * Forbidden error - user lacks permission (403)
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

/**
 * Conflict error - resource conflict (409)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

/**
 * Bad request error (400)
 */
export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'BAD_REQUEST', 400, details);
  }
}
```

### Error Usage in Services

```typescript
// Service throws typed errors
export async function getClientDetail(id: number): Promise<ClientDetailDTO> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new AppError(`Failed to load client: ${error.message}`, 'DATABASE_ERROR', 500);
  }
  if (!data) {
    throw new NotFoundError('Client', id);
  }

  return mapClientDetail(data);
}
```

### Error Handling in API Routes

API routes use `handleError()` helper (see Pattern 5).

---

## Pattern 4: Type Organization

### Type File Structure

**Types Directory:** `/src/lib/types/`

```
/src/lib/types/
├── index.ts          # Central export hub
├── common.ts         # Shared types
├── user.ts           # User types
├── clients.ts        # Client types
├── invoices.ts       # Invoice types
├── quotes.ts         # Quote types
├── jobs.ts           # Job types
└── messages.ts       # Message types
```

### Central Export Pattern

**File:** `/src/lib/types/index.ts`

```typescript
/**
 * Central Type Exports
 * Single import point for all application types
 */

// Common/shared types
export * from './common';

// Enums (re-export from constants for convenience)
export * from '../constants/enums';

// User types
export * from './user';

// Resource-specific types
export * from './clients';
export * from './invoices';
export * from './quotes';
export * from './jobs';
export * from './messages';
```

### Resource-Specific Type Pattern

**File:** `/src/lib/types/clients.ts`

```typescript
/**
 * Client Types
 * All types related to the clients resource
 */

// Re-export Input types from schemas (Zod-validated)
export type { ClientInput, ClientNoteInput } from '@/lib/schemas/clients';

/**
 * Client Summary DTO
 * Used for list views with aggregated data
 */
export type ClientSummaryDTO = {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  paymentTerms: string | null;
  notifyOnJobStatus: boolean;
  outstandingBalance: number;
  totalInvoices: number;
  totalQuotes: number;
  createdAt: Date;
};

/**
 * Client Detail DTO
 * Full client details with related entities
 */
export type ClientDetailDTO = {
  client: {
    id: number;
    name: string;
    company: string;
    email: string;
    phone: string;
    address: string;
    paymentTerms: string;
    notifyOnJobStatus: boolean;
    abn: string | null;
    notes: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
  };
  invoices: {
    id: number;
    number: string;
    status: string;
    total: number;
    balanceDue: number;
    issueDate: Date;
  }[];
  quotes: {
    id: number;
    number: string;
    status: string;
    total: number;
    issueDate: Date;
  }[];
  jobs: {
    id: number;
    title: string;
    status: string;
    priority: string;
    createdAt: Date;
  }[];
  activity: {
    id: number;
    action: string;
    message: string;
    createdAt: Date;
    context?: string;
  }[];
  totals: {
    outstanding: number;
    paid: number;
    queuedJobs: number;
  };
  clientUser?: {
    id: number;
    email: string;
    createdAt: Date;
    messageCount: number;
  } | null;
};

/**
 * Client Filters
 * Query parameters for listing clients
 */
export type ClientFilters = {
  q?: string;
  limit?: number;
  offset?: number;
  sort?: 'name' | 'createdAt';
  order?: 'asc' | 'desc';
};
```

### Type Naming Conventions

```typescript
// Input types (from Zod schemas)
ClientInput
MaterialInput
InvoiceInput
PaymentInput

// Output DTOs (Data Transfer Objects)
ClientSummaryDTO      // List view
ClientDetailDTO       // Detail view
MaterialDTO
InvoiceDetailDTO

// Filter/Query types
ClientFilters
InvoiceFilters
JobFilters

// Internal row types (in services, not exported)
type ClientRow = { /* raw DB shape */ }
type InvoiceRow = { /* raw DB shape */ }
```

---

## Pattern 5: API Response Format

### Response Helpers

**Location:** `/src/server/api/respond.ts`

```typescript
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";

export interface Success<T> {
  data: T;
  error?: undefined;
}

export interface Failure {
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

export function handleError(error: unknown, scope: string) {
  logger.error({ scope, message: 'Request handler error', error });

  // Handle AppError instances with proper code, message, status, and details
  if (error instanceof AppError) {
    return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
  }

  // Handle generic errors
  const message = error instanceof Error ? error.message : "Unexpected error";
  const status =
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as { status?: number }).status === "number"
      ? (error as { status?: number }).status
      : 500;
  return fail("INTERNAL_ERROR", message, status);
}
```

### Usage in API Routes

```typescript
import { ok, fail, handleError } from "@/server/api/respond";

// Success response
export async function GET(request: NextRequest) {
  try {
    const materials = await listMaterials();
    return ok(materials); // { data: [...] }
  } catch (error) {
    return handleError(error, "materials.list");
  }
}

// Success with custom status
export async function POST(request: NextRequest) {
  try {
    const material = await createMaterial(input);
    return ok(material, { status: 201 }); // Created
  } catch (error) {
    return handleError(error, "materials.create");
  }
}

// Manual error response
export async function DELETE(request: NextRequest) {
  try {
    const id = parseId(params);
    if (!id) {
      return fail("INVALID_ID", "ID must be a positive integer", 400);
    }
    await deleteMaterial(id);
    return ok({ success: true });
  } catch (error) {
    return handleError(error, "materials.delete");
  }
}
```

### Response Format Examples

```json
// Success Response
{
  "data": {
    "id": 1,
    "name": "PLA",
    "color": "Red"
  }
}

// Error Response
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Material not found: 999",
    "details": {}
  }
}

// Validation Error Response
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid material payload",
    "details": {
      "issues": [
        {
          "path": ["name"],
          "message": "Required"
        }
      ]
    }
  }
}
```

---

## Pattern 6: Authentication

### Auth Helpers for API Routes

**Location:** `/src/server/auth/api-helpers.ts`

```typescript
import type { NextRequest } from "next/server";
import { requireUser } from "@/server/auth/session";
import type { LegacyUser } from "@/lib/types/user";
import { ForbiddenError } from "@/lib/errors";

/**
 * Require authenticated user for API route (any role)
 */
export async function requireAuth(req: NextRequest): Promise<LegacyUser> {
  return await requireUser(req);
}

/**
 * Require admin role for API route
 * @throws UnauthorizedError if not authenticated (401)
 * @throws ForbiddenError if user is not admin (403)
 */
export async function requireAdmin(req: NextRequest): Promise<LegacyUser> {
  const user = await requireUser(req);
  if (user.role !== "ADMIN") {
    throw new ForbiddenError("Admin access required");
  }
  return user;
}

/**
 * Require client role for API route
 * @throws UnauthorizedError if not authenticated (401)
 * @throws ForbiddenError if user is not a client (403)
 */
export async function requireClient(req: NextRequest): Promise<LegacyUser> {
  const user = await requireUser(req);
  if (user.role !== "CLIENT") {
    throw new ForbiddenError("Client access required");
  }
  return user;
}

/**
 * Require client role with clientId for API route
 * @throws ForbiddenError if not a client or missing clientId (403)
 */
export async function requireClientWithId(req: NextRequest): Promise<LegacyUser & { clientId: number }> {
  const user = await requireClient(req);
  if (!user.clientId) {
    throw new ForbiddenError("Client ID not found");
  }
  return user as LegacyUser & { clientId: number };
}

/**
 * Get authenticated user for API route (optional auth)
 * Returns null if not authenticated instead of throwing an error
 */
export async function getAuthUser(req: NextRequest): Promise<LegacyUser | null> {
  try {
    return await requireUser(req);
  } catch {
    return null;
  }
}
```

### Auth Usage in Routes

```typescript
import { requireAdmin, requireClient, requireAuth } from "@/server/auth/api-helpers";

// Admin-only endpoint
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const materials = await listMaterials();
    return ok(materials);
  } catch (error) {
    return handleError(error, "materials.list");
  }
}

// Client-only endpoint
export async function GET(request: NextRequest) {
  try {
    const client = await requireClientWithId(request);
    const invoices = await listClientInvoices(client.clientId);
    return ok(invoices);
  } catch (error) {
    return handleError(error, "client.invoices");
  }
}

// Any authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const data = await getUserData(user.id);
    return ok(data);
  } catch (error) {
    return handleError(error, "user.data");
  }
}

// Optional auth
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (user) {
      return ok(await getPersonalizedData(user.id));
    }
    return ok(await getPublicData());
  } catch (error) {
    return handleError(error, "data.get");
  }
}
```

---

## Pattern 7: Validation

### Zod Schema Organization

**Schemas Directory:** `/src/lib/schemas/`

```
/src/lib/schemas/
├── index.ts          # Central export hub
├── auth.ts           # Authentication schemas
├── catalog.ts        # Materials, printers, products
├── clients.ts        # Client schemas
├── invoices.ts       # Invoice schemas
├── jobs.ts           # Job schemas
├── messages.ts       # Message schemas
├── quotes.ts         # Quote schemas
├── settings.ts       # Settings schemas
└── users.ts          # User schemas
```

### Central Export Pattern

**File:** `/src/lib/schemas/index.ts`

```typescript
// Central export for all validation schemas

export * from "./auth";
export * from "./catalog";
export * from "./clients";
export * from "./invoices";
export * from "./jobs";
export * from "./messages";
export * from "./quick-order";
export * from "./quotes";
export * from "./settings";
export * from "./users";
```

### Schema Definition Pattern

**File:** `/src/lib/schemas/clients.ts`

```typescript
import { z } from "zod";

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
  notifyOnJobStatus: z.boolean().optional().default(false),
});

export type ClientInput = z.infer<typeof clientInputSchema>;

export const clientNoteSchema = z.object({
  body: z.string().min(1),
});

export const clientPreferenceSchema = z.object({
  notifyOnJobStatus: z.boolean(),
});

export type ClientNoteInput = z.infer<typeof clientNoteSchema>;
export type ClientPreferenceInput = z.infer<typeof clientPreferenceSchema>;
```

### Validation in API Routes

```typescript
import { ZodError } from "zod";
import { clientInputSchema } from "@/lib/schemas/clients";
import { ok, fail, handleError } from "@/server/api/respond";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const validated = clientInputSchema.parse(body);
    const client = await createClient(validated);
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

---

## Pattern 8: Logging

### Logger Implementation

**Location:** `/src/lib/logger.ts`

```typescript
interface LogPayload {
  scope: string;
  message?: string;
  error?: unknown;
  data?: Record<string, unknown>;
}

function serializeError(error: unknown) {
  if (!error) return undefined;
  if (error instanceof Error) {
    const { name, message, stack } = error;
    return {
      name,
      message,
      stack: process.env.NODE_ENV === "development" ? stack : undefined,
    };
  }
  return { message: String(error) };
}

function emit(level: "info" | "warn" | "error", payload: LogPayload) {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    scope: payload.scope,
    message: payload.message,
    data: payload.data,
    error: serializeError(payload.error),
  });
  console[level === "info" ? "log" : level](line);
}

export const logger = {
  info: (payload: LogPayload) => emit("info", payload),
  warn: (payload: LogPayload) => emit("warn", payload),
  error: (payload: LogPayload) => emit("error", payload),
};
```

### Logger Usage

```typescript
import { logger } from "@/lib/logger";

// Info logging (successful operations)
export async function createMaterial(input: MaterialInput) {
  // ... create material ...
  logger.info({ scope: "materials.create", data: { id: data.id } });
  return material;
}

// Warning logging (non-critical issues)
async function insertActivity(action: string, message: string, materialId: number) {
  const { error } = await supabase.from("activity_logs").insert({...});
  if (error) {
    logger.warn({
      scope: "materials.activity",
      message: "Failed to record material activity",
      error,
      data: { materialId, action },
    });
  }
}

// Error logging (handled in handleError)
export function handleError(error: unknown, scope: string) {
  logger.error({ scope, message: 'Request handler error', error });
  // ... return error response ...
}

// Detailed operation logging
export async function updateJobStatus(id: number, status: JobStatus) {
  // ... update job ...
  logger.info({ scope: "jobs.status", data: { id, status } });
  return job;
}
```

### Log Output Format

```json
{
  "timestamp": "2025-10-21T10:30:45.123Z",
  "level": "info",
  "scope": "materials.create",
  "data": {
    "id": 42
  }
}

{
  "timestamp": "2025-10-21T10:31:12.456Z",
  "level": "error",
  "scope": "invoices.update",
  "message": "Request handler error",
  "error": {
    "name": "AppError",
    "message": "Failed to update invoice: constraint violation"
  }
}
```

### Scope Naming Convention

```
{resource}.{operation}
{resource}.{operation}.{detail}

Examples:
materials.create
materials.update
materials.delete
materials.activity
clients.create
clients.preference
jobs.status
jobs.printer.clear_queue
invoices.payment.add
invoices.revert.activity
```

---

## Pattern 9: File Naming

### Naming Conventions

```
kebab-case:
- All files and directories
- URL routes

Examples:
/src/lib/schemas/quick-order.ts
/src/server/services/order-files.ts
/src/app/api/quick-order/checkout/route.ts
/src/app/api/invoices/[id]/stripe-session/route.ts
```

### File Structure Examples

```
API Routes (Next.js App Router):
/src/app/api/materials/route.ts
/src/app/api/materials/[id]/route.ts
/src/app/api/invoices/[id]/payments/route.ts
/src/app/api/invoices/[id]/payments/[paymentId]/route.ts

Services:
/src/server/services/materials.ts
/src/server/services/clients.ts
/src/server/services/invoices.ts
/src/server/services/order-files.ts
/src/server/services/product-templates.ts

Types:
/src/lib/types/clients.ts
/src/lib/types/invoices.ts
/src/lib/types/jobs.ts

Schemas:
/src/lib/schemas/clients.ts
/src/lib/schemas/invoices.ts
/src/lib/schemas/quick-order.ts
```

---

## Pattern 10: Import Organization

### Import Order

**Standard order used across all files:**

```typescript
// 1. External dependencies (npm packages)
import { addDays } from 'date-fns';
import { ZodError } from "zod";
import type { NextRequest } from "next/server";

// 2. Internal utilities and shared code (@/lib)
import { logger } from '@/lib/logger';
import { AppError, NotFoundError, BadRequestError } from '@/lib/errors';
import { DiscountType, InvoiceStatus } from '@/lib/constants/enums';

// 3. Schemas (@/lib/schemas)
import { type InvoiceInput, type PaymentInput } from '@/lib/schemas/invoices';

// 4. Types (@/lib/types)
import type { InvoiceDetailDTO, InvoiceSummaryDTO } from '@/lib/types/invoices';

// 5. Server-side utilities (@/server)
import { getServiceSupabase } from '@/server/supabase/service-client';
import { ok, fail, handleError } from "@/server/api/respond";
import { requireAdmin } from "@/server/auth/api-helpers";

// 6. Other services (@/server/services)
import { nextDocumentNumber } from '@/server/services/numbering';
import { getJobCreationPolicy, ensureJobForInvoice } from '@/server/services/jobs';
```

### Real Examples from Codebase

**Service file:** `/src/server/services/clients.ts`
```typescript
import { logger } from '@/lib/logger';
import type { ClientInput, ClientNoteInput } from '@/lib/schemas/clients';
import { DEFAULT_PAYMENT_TERMS } from '@/lib/schemas/settings';
import { getServiceSupabase } from '@/server/supabase/service-client';
import { AppError, NotFoundError, BadRequestError } from '@/lib/errors';
import type { ClientSummaryDTO, ClientDetailDTO, ClientFilters } from '@/lib/types/clients';
```

**API route:** `/src/app/api/materials/route.ts`
```typescript
import { ZodError } from "zod";
import { ok, fail, handleError } from "@/server/api/respond";
import { listMaterials, createMaterial } from "@/server/services/materials";
import { materialInputSchema } from "@/lib/schemas/catalog";
import { requireAdmin } from "@/server/auth/api-helpers";
import type { NextRequest } from "next/server";
```

**Service with business logic:** `/src/server/services/invoices.ts`
```typescript
import { addDays } from 'date-fns';
import { logger } from '@/lib/logger';
import { DiscountType, InvoiceStatus, JobStatus, PaymentMethod } from '@/lib/constants/enums';
import { calculateLineTotal, calculateDocumentTotals } from '@/lib/calculations';
import { type InvoiceInput, type PaymentInput } from '@/lib/schemas/invoices';
import { getServiceSupabase } from '@/server/supabase/service-client';
import { nextDocumentNumber } from '@/server/services/numbering';
import { getJobCreationPolicy, ensureJobForInvoice } from '@/server/services/jobs';
import { resolvePaymentTermsOptions } from '@/server/services/settings';
import { uploadInvoiceAttachment as uploadToStorage, deleteInvoiceAttachment } from '@/server/storage/supabase';
import { AppError, NotFoundError, BadRequestError } from '@/lib/errors';
import type { InvoiceDetailDTO, InvoiceSummaryDTO } from '@/lib/types/invoices';
```

---

## Complete Templates

### API Route Template (Collection)

**File:** `/src/app/api/materials/route.ts`

```typescript
import { ZodError } from "zod";
import { ok, fail, handleError } from "@/server/api/respond";
import { listMaterials, createMaterial } from "@/server/services/materials";
import { materialInputSchema } from "@/lib/schemas/catalog";
import { requireAdmin } from "@/server/auth/api-helpers";
import type { NextRequest } from "next/server";

/**
 * GET /api/materials
 * ADMIN ONLY - Material management is admin-only
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? undefined;
    const limit = Number(searchParams.get("limit") ?? "0");
    const offset = Number(searchParams.get("offset") ?? "0");
    const sort = (searchParams.get("sort") as "name" | "updatedAt" | null) ?? null;
    const order = (searchParams.get("order") as "asc" | "desc" | null) ?? null;
    const materials = await listMaterials({
      q,
      limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
      offset: Number.isFinite(offset) && offset >= 0 ? offset : undefined,
      sort: sort ?? undefined,
      order: order ?? undefined,
    });
    return ok(materials);
  } catch (error) {
    return handleError(error, "materials.list");
  }
}

/**
 * POST /api/materials
 * ADMIN ONLY - Only admins can create materials
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const validated = materialInputSchema.parse(body);
    const material = await createMaterial(validated);
    return ok(material, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid material payload", 422, {
        issues: error.issues,
      });
    }
    return handleError(error, "materials.create");
  }
}
```

### API Route Template (Resource by ID)

**File:** `/src/app/api/materials/[id]/route.ts`

```typescript
import { ZodError } from "zod";
import { ok, fail, handleError } from "@/server/api/respond";
import {
  getMaterial,
  updateMaterial,
  deleteMaterial,
} from "@/server/services/materials";
import { materialInputSchema } from "@/lib/schemas/catalog";
import { requireAdmin } from "@/server/auth/api-helpers";
import type { NextRequest } from "next/server";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid material id");
  }
  return id;
}

/**
 * GET /api/materials/[id]
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await parseId(context.params);
    await requireAdmin(request);
    const material = await getMaterial(id);
    return ok(material);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid material id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "materials.detail");
  }
}

/**
 * PUT /api/materials/[id]
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await parseId(context.params);
    await requireAdmin(request);
    const body = await request.json();
    const validated = materialInputSchema.parse(body);
    const material = await updateMaterial(id, validated);
    return ok(material);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid material payload", 422, {
        issues: error.issues,
      });
    }
    if (error instanceof Error && error.message === "Invalid material id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "materials.update");
  }
}

/**
 * DELETE /api/materials/[id]
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = await parseId(context.params);
    await requireAdmin(request);
    const material = await deleteMaterial(id);
    return ok(material);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid material id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "materials.delete");
  }
}
```

### Service Template

**File:** `/src/server/services/materials.ts`

```typescript
// 1. IMPORTS
import { logger } from "@/lib/logger";
import type { MaterialInput } from "@/lib/schemas/catalog";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { AppError, NotFoundError, ValidationError } from "@/lib/errors";

// 2. TYPES
export type MaterialDTO = {
  id: number;
  name: string;
  color: string;
  category: string;
  costPerGram: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
};

type MaterialRow = {
  id: number;
  name: string;
  color: string | null;
  category: string | null;
  cost_per_gram: string | number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// 3. HELPER FUNCTIONS
function mapMaterial(row: MaterialRow | null): MaterialDTO {
  if (!row) {
    throw new NotFoundError("Material", "unknown");
  }
  return {
    id: row.id,
    name: row.name,
    color: row.color ?? "",
    category: row.category ?? "",
    costPerGram: Number(row.cost_per_gram ?? 0),
    notes: row.notes ?? "",
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

async function insertActivity(action: string, message: string, materialId: number) {
  const supabase = getServiceSupabase();
  const { error } = await supabase.from("activity_logs").insert({
    action,
    message,
    metadata: { materialId },
  });
  if (error) {
    logger.warn({
      scope: "materials.activity",
      message: "Failed to record material activity",
      error,
      data: { materialId, action },
    });
  }
}

// 4. PUBLIC FUNCTIONS
/**
 * List all materials with optional filtering, sorting, and pagination
 * @param options - Query options for search, sorting, and pagination
 * @returns Array of material DTOs
 * @throws AppError if database query fails
 */
export async function listMaterials(options?: {
  q?: string;
  limit?: number;
  offset?: number;
  sort?: "name" | "updatedAt";
  order?: "asc" | "desc";
}): Promise<MaterialDTO[]> {
  const supabase = getServiceSupabase();
  let query = supabase
    .from("materials")
    .select("*")
    .order(
      options?.sort === "updatedAt" ? "updated_at" : "name",
      {
        ascending: (options?.order ?? "asc") === "asc",
        nullsFirst: false,
      },
    );

  if (options?.q) {
    const term = options.q.trim();
    if (term.length > 0) {
      query = query.or(
        `name.ilike.%${term}%,color.ilike.%${term}%,category.ilike.%${term}%`,
      );
    }
  }

  if (typeof options?.limit === "number") {
    const limit = Math.max(1, options.limit);
    const offset = Math.max(0, options.offset ?? 0);
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError(`Failed to list materials: ${error.message}`, 'DATABASE_ERROR', 500);
  }
  return (data as MaterialRow[]).map(mapMaterial);
}

/**
 * Create a new material
 * @param input - Material creation input (already validated)
 * @returns Created material DTO
 * @throws AppError if database operation fails
 */
export async function createMaterial(input: MaterialInput) {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("materials")
    .insert({
      name: input.name,
      color: input.color || null,
      category: input.category || null,
      cost_per_gram: String(input.costPerGram),
      notes: input.notes || null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new AppError(`Failed to create material: ${error?.message ?? "Unknown error"}`, 'DATABASE_ERROR', 500);
  }

  await insertActivity(
    "MATERIAL_CREATED",
    `Material ${data.name} created`,
    data.id,
  );

  logger.info({ scope: "materials.create", data: { id: data.id } });
  return mapMaterial(data as MaterialRow);
}

/**
 * Update an existing material
 * @param id - Material ID
 * @param input - Material update input (already validated)
 * @returns Updated material DTO
 * @throws AppError if database operation fails
 */
export async function updateMaterial(id: number, input: MaterialInput) {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("materials")
    .update({
      name: input.name,
      color: input.color || null,
      category: input.category || null,
      cost_per_gram: String(input.costPerGram),
      notes: input.notes || null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new AppError(`Failed to update material: ${error?.message ?? "Unknown error"}`, 'DATABASE_ERROR', 500);
  }

  await insertActivity(
    "MATERIAL_UPDATED",
    `Material ${data.name} updated`,
    data.id,
  );

  logger.info({ scope: "materials.update", data: { id } });
  return mapMaterial(data as MaterialRow);
}

/**
 * Delete a material after verifying it's not referenced by product templates
 * @param id - Material ID to delete
 * @returns Deleted material DTO
 * @throws ValidationError if material is referenced by product templates
 * @throws AppError if database operation fails
 */
export async function deleteMaterial(id: number) {
  const supabase = getServiceSupabase();
  const { count, error: countError } = await supabase
    .from("product_templates")
    .select("id", { count: "exact", head: true })
    .eq("material_id", id);

  if (countError) {
    throw new AppError(`Failed to verify material usage: ${countError.message}`, 'DATABASE_ERROR', 500);
  }

  if ((count ?? 0) > 0) {
    throw new ValidationError(
      "Cannot delete material: it is referenced by product templates",
    );
  }

  const { data, error } = await supabase
    .from("materials")
    .delete()
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new AppError(`Failed to delete material: ${error?.message ?? "Unknown error"}`, 'DATABASE_ERROR', 500);
  }

  await insertActivity(
    "MATERIAL_DELETED",
    `Material ${data.name} deleted`,
    data.id,
  );

  logger.info({ scope: "materials.delete", data: { id } });
  return mapMaterial(data as MaterialRow);
}
```

---

## Quick Reference

### Pattern Summary Table

| Pattern | Location | Key Rule |
|---------|----------|----------|
| **Database Access** | Services only (`/src/server/services`) | Never access DB from API routes |
| **Service Structure** | `/src/server/services/*.ts` | Imports → Types → Helpers → Public functions |
| **Error Handling** | `/src/lib/errors.ts` | Use typed error classes (AppError, NotFoundError, etc.) |
| **Types** | `/src/lib/types/*.ts` | DTOs for output, Input types from schemas |
| **API Response** | `/src/server/api/respond.ts` | Use `ok()`, `fail()`, `handleError()` |
| **Authentication** | `/src/server/auth/api-helpers.ts` | `requireAdmin()`, `requireClient()`, `requireAuth()` |
| **Validation** | `/src/lib/schemas/*.ts` | Zod schemas, export Input types |
| **Logging** | `/src/lib/logger.ts` | Structured JSON logs with scope |
| **File Naming** | All files | kebab-case everywhere |
| **Imports** | All files | External → lib → schemas → types → server |

### Common Function Signatures

```typescript
// Service functions
export async function listResources(filters?: ResourceFilters): Promise<ResourceDTO[]>
export async function getResourceDetail(id: number): Promise<ResourceDetailDTO>
export async function createResource(input: ResourceInput): Promise<ResourceDTO>
export async function updateResource(id: number, input: ResourceInput): Promise<ResourceDTO>
export async function deleteResource(id: number): Promise<{ id: number }>

// API route handlers
export async function GET(request: NextRequest): Promise<NextResponse>
export async function POST(request: NextRequest): Promise<NextResponse>
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse>
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse>

// Auth helpers
export async function requireAdmin(req: NextRequest): Promise<LegacyUser>
export async function requireClient(req: NextRequest): Promise<LegacyUser>
export async function requireAuth(req: NextRequest): Promise<LegacyUser>
export async function getAuthUser(req: NextRequest): Promise<LegacyUser | null>

// Response helpers
export function ok<T>(data: T, init?: ResponseInit): NextResponse
export function fail(code: string, message: string, status?: number, details?: Record<string, unknown>): NextResponse
export function handleError(error: unknown, scope: string): NextResponse
```

### Error Classes Quick Reference

```typescript
throw new AppError(message, code, status, details)     // Base error
throw new NotFoundError(resource, id)                  // 404
throw new ValidationError(message, details)            // 422
throw new UnauthorizedError(message)                   // 401
throw new ForbiddenError(message)                      // 403
throw new ConflictError(message)                       // 409
throw new BadRequestError(message, details)            // 400
```

### Logger Quick Reference

```typescript
logger.info({ scope: "resource.operation", data: { id } })
logger.warn({ scope: "resource.operation", message: "Warning", error, data })
logger.error({ scope: "resource.operation", message: "Error", error })
```

---

## Version History

- **2025-10-21**: Initial definitive version extracted from actual codebase
  - Patterns extracted from real implementations in `/src/server/services/`
  - API route patterns from `/src/app/api/`
  - Complete templates with actual code examples
  - All function signatures verified against production code
