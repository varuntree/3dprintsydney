# Authentication and Authorization

This document describes the authentication and authorization system for the 3D Print Sydney application.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Authentication Flow](#authentication-flow)
- [Session Management](#session-management)
- [Authorization Model](#authorization-model)
- [Route Protection](#route-protection)
- [API Authentication](#api-authentication)
- [Permission Patterns](#permission-patterns)
- [Security Features](#security-features)
- [Auth Endpoints](#auth-endpoints)
- [Helper Functions Reference](#helper-functions-reference)

## Architecture Overview

The application uses a **Supabase Auth + JWT** architecture with cookie-based session management:

- **Supabase Auth**: Handles authentication (login, signup, password management)
- **JWT Tokens**: Access and refresh tokens stored in HttpOnly cookies
- **Database Profiles**: User metadata stored in `users` table with role information
- **Middleware Protection**: Next.js middleware validates sessions and enforces role-based routing
- **Dual Context**: Separate helper functions for API routes and Server Components

### Key Components

```
/middleware.ts                          # Route protection and session refresh
/src/server/auth/
  ├── session.ts                        # Low-level session handling
  ├── api-helpers.ts                    # Auth helpers for API routes
  └── permissions.ts                    # Resource-specific permission checks
/src/lib/auth-utils.ts                  # Auth helpers for Server Components
/src/server/services/auth.ts            # Auth business logic
/src/app/api/auth/                      # Auth endpoints (login, signup, etc.)
```

## Authentication Flow

### Login Flow

1. **Client submits credentials** → `POST /api/auth/login`
2. **Validate input** using `loginSchema` (Zod validation)
3. **Authenticate with Supabase** via `handleLogin()`:
   - Create anon Supabase client
   - Call `signInWithPassword(email, password)`
   - Retrieve session tokens (access + refresh)
4. **Load user profile** from database by `auth_user_id`
5. **Set cookies**:
   - `sb:token` (access token, HttpOnly, expires with token)
   - `sb:refresh-token` (refresh token, HttpOnly, long-lived)
6. **Return user data** (id, email, role, clientId)

```typescript
// /src/app/api/auth/login/route.ts
export async function POST(req: NextRequest) {
  const { email, password } = loginSchema.parse(body);
  const { session, profile } = await handleLogin(email, password);

  const response = ok({
    id: profile.id,
    email: profile.email,
    role: profile.role,
    clientId: profile.clientId,
  });

  response.cookies.set("sb:token", session.accessToken, buildAuthCookieOptions(session.expiresAt));
  response.cookies.set("sb:refresh-token", session.refreshToken, buildAuthCookieOptions());

  return response;
}
```

### Signup Flow

1. **Client submits email and password** → `POST /api/auth/signup`
2. **Validate input** using `signupSchema` (includes password confirmation)
3. **Create user account** via `handleSignup()`:
   - Check if email already exists
   - Create Supabase Auth user (`auth.admin.createUser`)
   - Create client record in `clients` table
   - Create user profile in `users` table (role: CLIENT)
   - Rollback on any failure
4. **Authenticate** with newly created credentials
5. **Set cookies** (same as login)
6. **Return user data**

```typescript
// /src/server/services/auth.ts - signupClient()
export async function signupClient(email: string, password: string): Promise<SignupResult> {
  // 1. Check if user exists
  const { data: exists } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
  if (exists) throw new AppError('Email already in use', 'EMAIL_IN_USE', 400);

  // 2. Create auth user
  const { data: authUser } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });

  // 3. Create client record
  const { data: client } = await supabase.from('clients').insert({ name: email.split('@')[0], email }).select('id').single();

  // 4. Create user profile
  const { data: profile } = await supabase.from('users').insert({
    auth_user_id: authUser.user.id,
    email,
    role: 'CLIENT',
    client_id: client.id,
  }).select('id').single();

  return { userId: profile.id, authUserId: authUser.user.id, clientId: client.id, email, role: 'CLIENT' };
}
```

### Logout Flow

1. **Client requests logout** → `POST /api/auth/logout`
2. **Clear cookies** by setting them to empty with past expiration
3. **Return success**

```typescript
// /src/app/api/auth/logout/route.ts
export async function POST() {
  const response = ok({ success: true });
  response.cookies.set("sb:token", "", { httpOnly: true, sameSite: "lax", secure: isProd, path: "/", expires: new Date(0) });
  response.cookies.set("sb:refresh-token", "", { httpOnly: true, sameSite: "lax", secure: isProd, path: "/", expires: new Date(0) });
  return response;
}
```

## Session Management

### Cookie-Based Sessions

The application uses **two HttpOnly cookies**:

| Cookie Name | Purpose | Expiration | Security |
|------------|---------|------------|----------|
| `sb:token` | JWT access token | Matches token expiry (typically 1 hour) | HttpOnly, SameSite=lax, Secure (prod) |
| `sb:refresh-token` | JWT refresh token | Long-lived (no explicit expiry) | HttpOnly, SameSite=lax, Secure (prod) |

### Cookie Configuration

```typescript
// /src/lib/utils/auth-cookies.ts
export function buildAuthCookieOptions(expiresAt?: number): CookieOptions {
  return {
    httpOnly: true,        // Prevents JavaScript access
    sameSite: 'lax',       // CSRF protection
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    path: '/',             // Available site-wide
    expires: expiresAt ? new Date(expiresAt * 1000) : undefined,
  };
}
```

### Session Refresh (Middleware)

The middleware automatically refreshes expired sessions:

```typescript
// /middleware.ts
export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  let authUser = null;
  if (accessToken) {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (!error) {
      authUser = data.user;
    } else if (refreshToken) {
      // Access token expired, try refresh
      const { data: refreshData } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
      if (refreshData?.session?.access_token) {
        authUser = refreshData.session.user;
        setSessionCookies(response, refreshData.session.access_token, refreshData.session.refresh_token, refreshData.session.expires_at);
      }
    }
  }
  // ... rest of middleware
}
```

### Session Validation

Sessions are validated in three contexts:

1. **Middleware** (`/middleware.ts`): Validates on every request, refreshes if needed
2. **API Routes** (`/src/server/auth/api-helpers.ts`): Extracts user from request
3. **Server Components** (`/src/lib/auth-utils.ts`): Extracts user from cookies

## Authorization Model

### Role-Based Access Control (RBAC)

The application uses a simple two-role system:

| Role | Description | Access |
|------|-------------|--------|
| `ADMIN` | System administrators | Full access to admin dashboard, all clients, all invoices |
| `CLIENT` | Regular customers | Access to client portal, own invoices only |

### User Type Definition

```typescript
// /src/lib/types/user.ts
export type LegacyUser = {
  id: number;              // User ID (database primary key)
  email: string;           // Email address
  role: "ADMIN" | "CLIENT"; // Role
  clientId: number | null; // Client ID (null for ADMIN, required for CLIENT)
  name?: string | null;    // Optional name
  phone?: string | null;   // Optional phone
};
```

### Role Enforcement Strategy

- **Middleware**: Routes users to appropriate dashboards based on role
- **Layouts**: Server-side role validation before rendering (`requireAdmin`, `requireClient`)
- **API Routes**: Role checks via helper functions (`requireAdmin`, `requireClient`, etc.)
- **Database RLS**: Row-Level Security policies enforce data access (future enhancement)

## Route Protection

### Middleware Protection

The middleware (`/middleware.ts`) handles:

1. **Authentication Check**: Validates session, redirects to login if missing
2. **Role-Based Routing**: Redirects users to appropriate dashboard
3. **Public Route Handling**: Allows unauthenticated access to login/signup
4. **Session Refresh**: Automatically refreshes expired tokens

#### Public Routes

```typescript
const PUBLIC_ROUTES = ["/login", "/signup", "/forgot-password"];
```

#### Protected Route Logic

```typescript
// Not authenticated → redirect to login
if (!authUser) {
  if (isPublic) return response;
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
}

// Load user profile
const { data: profile } = await service.from("users").select("role, client_id").eq("auth_user_id", authUser.id).maybeSingle();

// Authenticated on public route → redirect to dashboard
if (isPublic) {
  const homeUrl = profile.role === "ADMIN" ? "/" : "/client";
  return NextResponse.redirect(new URL(homeUrl, request.url));
}

// CLIENT trying to access admin routes → redirect to client dashboard
const isClientRoute = pathname.startsWith("/client") || pathname.startsWith("/quick-order");
if (profile.role === "CLIENT" && !isClientRoute) {
  return NextResponse.redirect(new URL("/client", request.url));
}
```

### Layout-Level Protection

#### Admin Layout

```typescript
// /src/app/(admin)/layout.tsx
import { requireAdmin } from "@/lib/auth-utils";

export default async function AdminLayout({ children }) {
  const user = await requireAdmin(); // Redirects if not admin
  return <AdminShell user={user}>{children}</AdminShell>;
}
```

#### Client Layout

```typescript
// /src/app/(client)/layout.tsx
import { requireClient } from "@/lib/auth-utils";

export default async function ClientLayout({ children }) {
  const user = await requireClient(); // Redirects if not client
  return <ClientShell user={user}>{children}</ClientShell>;
}
```

## API Authentication

### Authentication Helpers for API Routes

Located in `/src/server/auth/api-helpers.ts`, these helpers are used **exclusively in API routes**:

#### `requireAuth(req: NextRequest): Promise<LegacyUser>`

Requires any authenticated user (ADMIN or CLIENT).

```typescript
import { requireAuth } from "@/server/auth/api-helpers";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  // user guaranteed to exist
  return success({ userId: user.id });
}
```

**Throws**: `UnauthorizedError` (401) if not authenticated

#### `requireAdmin(req: NextRequest): Promise<LegacyUser>`

Requires ADMIN role.

```typescript
import { requireAdmin } from "@/server/auth/api-helpers";

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req);
  // Only admins reach this code
  await deleteResource();
  return success(null, 204);
}
```

**Throws**:
- `UnauthorizedError` (401) if not authenticated
- `ForbiddenError` (403) if not admin

#### `requireClient(req: NextRequest): Promise<LegacyUser>`

Requires CLIENT role.

```typescript
import { requireClient } from "@/server/auth/api-helpers";

export async function GET(req: NextRequest) {
  const client = await requireClient(req);
  // Only clients reach this code
  const data = await getClientData(client.id);
  return success(data);
}
```

**Throws**:
- `UnauthorizedError` (401) if not authenticated
- `ForbiddenError` (403) if not a client

#### `requireClientWithId(req: NextRequest): Promise<LegacyUser & { clientId: number }>`

Requires CLIENT role with a non-null `clientId`.

```typescript
import { requireClientWithId } from "@/server/auth/api-helpers";

export async function GET(req: NextRequest) {
  const client = await requireClientWithId(req);
  // client.clientId is guaranteed to be a number
  const invoices = await getInvoicesByClient(client.clientId);
  return success(invoices);
}
```

**Throws**:
- `UnauthorizedError` (401) if not authenticated
- `ForbiddenError` (403) if not a client or missing clientId

#### `getAuthUser(req: NextRequest): Promise<LegacyUser | null>`

Optional authentication (returns null instead of throwing).

```typescript
import { getAuthUser } from "@/server/auth/api-helpers";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (user) {
    return success({ data: getPersonalizedData(user) });
  }
  return success({ data: getPublicData() });
}
```

**Returns**: `LegacyUser | null`

### Authentication Helpers for Server Components

Located in `/src/lib/auth-utils.ts`, these helpers are used **exclusively in Server Components** (page.tsx, layout.tsx):

#### `requireAuth(callbackUrl?: string): Promise<LegacyUser>`

Requires any authenticated user. Redirects to login if not authenticated.

```typescript
import { requireAuth } from "@/lib/auth-utils";

export default async function AccountPage() {
  const user = await requireAuth();
  return <div>Welcome, {user.email}</div>;
}
```

**Redirects**: `/login` if not authenticated

#### `requireAdmin(): Promise<LegacyUser>`

Requires ADMIN role. Redirects non-admins to client dashboard.

```typescript
import { requireAdmin } from "@/lib/auth-utils";

export default async function AdminLayout({ children }) {
  const admin = await requireAdmin();
  return <AdminShell user={admin}>{children}</AdminShell>;
}
```

**Redirects**:
- `/login` if not authenticated
- `/client` if not admin

#### `requireClient(): Promise<LegacyUser>`

Requires CLIENT role. Redirects non-clients to admin dashboard.

```typescript
import { requireClient } from "@/lib/auth-utils";

export default async function ClientLayout({ children }) {
  const client = await requireClient();
  return <ClientShell user={client}>{children}</ClientShell>;
}
```

**Redirects**:
- `/login` if not authenticated
- `/` if not a client

#### `requireClientWithId(): Promise<LegacyUser & { clientId: number }>`

Requires CLIENT role with a non-null `clientId`.

```typescript
import { requireClientWithId } from "@/lib/auth-utils";

export default async function MyOrdersPage() {
  const client = await requireClientWithId();
  const orders = await getOrdersByClient(client.clientId);
  return <OrderList orders={orders} />;
}
```

**Throws**: Error if client is missing clientId (should never happen)

#### `getOptionalUser(): Promise<LegacyUser | null>`

Optional authentication for Server Components.

```typescript
import { getOptionalUser } from "@/lib/auth-utils";

export default async function HomePage() {
  const user = await getOptionalUser();
  if (user) return <PersonalizedHome user={user} />;
  return <PublicHome />;
}
```

**Returns**: `LegacyUser | null`

## Permission Patterns

### Resource-Specific Permissions

Located in `/src/server/auth/permissions.ts`, these helpers enforce access to specific resources:

#### `requireInvoiceAccess(req: NextRequest, invoiceId: number)`

Allows access if user is ADMIN **or** the invoice owner (CLIENT).

```typescript
import { requireInvoiceAccess } from "@/server/auth/permissions";

export async function GET(req: NextRequest, { params }: Context) {
  const { id } = await params;
  await requireInvoiceAccess(req, Number(id));
  // User has access to this invoice
  const invoice = await getInvoice(Number(id));
  return success(invoice);
}
```

**Logic**:
1. Authenticate user
2. If ADMIN → grant access
3. If CLIENT → verify `invoice.client_id === user.clientId`
4. Otherwise → deny

**Throws**:
- `UnauthorizedError` (401) if not authenticated
- `NotFoundError` (404) if invoice doesn't exist
- `ForbiddenError` (403) if not admin and not invoice owner

#### `requireAttachmentAccess(req: NextRequest, attachmentId: number)`

Checks access by verifying access to the parent invoice.

```typescript
import { requireAttachmentAccess } from "@/server/auth/permissions";

export async function DELETE(req: NextRequest, { params }: Context) {
  const { id } = await params;
  await requireAttachmentAccess(req, Number(id));
  // User has access to this attachment
  await deleteAttachment(Number(id));
  return success(null, 204);
}
```

**Logic**:
1. Load attachment to get `invoice_id`
2. Call `requireInvoiceAccess(req, invoice_id)`

**Throws**: Same as `requireInvoiceAccess`

#### `requirePaymentAccess(req: NextRequest, paymentId: number)`

Checks access by verifying access to the parent invoice.

```typescript
import { requirePaymentAccess } from "@/server/auth/permissions";

export async function GET(req: NextRequest, { params }: Context) {
  const { id } = await params;
  await requirePaymentAccess(req, Number(id));
  // User has access to this payment
  const payment = await getPayment(Number(id));
  return success(payment);
}
```

**Logic**:
1. Load payment to get `invoice_id`
2. Call `requireInvoiceAccess(req, invoice_id)`

**Throws**: Same as `requireInvoiceAccess`

### Common Permission Patterns

#### Admin-Only Operations

```typescript
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req);
  await dangerousOperation();
  return success(null, 204);
}
```

#### Client-Scoped Data Access

```typescript
export async function GET(req: NextRequest) {
  const client = await requireClientWithId(req);
  const data = await getData({ client_id: client.clientId });
  return success(data);
}
```

#### Conditional Access (Admin or Owner)

```typescript
export async function GET(req: NextRequest, { params }: Context) {
  const { id } = await params;
  await requireInvoiceAccess(req, Number(id));
  const invoice = await getInvoice(Number(id));
  return success(invoice);
}
```

## Security Features

### 1. HttpOnly Cookies

**Why**: Prevents XSS attacks by making cookies inaccessible to JavaScript.

```typescript
{
  httpOnly: true, // Cookie cannot be read by document.cookie
}
```

### 2. SameSite=lax

**Why**: Protects against CSRF attacks by limiting cookie transmission to same-site requests.

```typescript
{
  sameSite: 'lax', // Cookie sent on top-level navigations, not on cross-site subrequests
}
```

### 3. Secure Flag (Production)

**Why**: Ensures cookies are only transmitted over HTTPS in production.

```typescript
{
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
}
```

### 4. Token Validation

Every request validates the access token with Supabase Auth:

```typescript
const { data: { user }, error } = await supabase.auth.getUser(token);
if (error) {
  // Token invalid or expired
}
```

### 5. Automatic Token Refresh

Middleware refreshes expired tokens transparently:

```typescript
if (error && refreshToken) {
  const { data: refreshData } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  // Update cookies with new tokens
}
```

### 6. Profile Verification

After validating the auth token, the middleware verifies the user profile exists:

```typescript
const { data: profile } = await service.from("users").select("role, client_id").eq("auth_user_id", authUser.id).maybeSingle();

if (!profile) {
  // Clear cookies and redirect to login (orphaned auth user)
  response.cookies.set(ACCESS_COOKIE, "", { path: "/", expires: new Date(0) });
  response.cookies.set(REFRESH_COOKIE, "", { path: "/", expires: new Date(0) });
  return NextResponse.redirect(new URL("/login", request.url));
}
```

### 7. Role-Based Routing

Middleware enforces role-based access at the routing level, preventing unauthorized access before rendering:

```typescript
if (profile.role === "CLIENT" && !isClientRoute) {
  return NextResponse.redirect(new URL("/client", request.url));
}
```

### 8. Row-Level Security (RLS)

Supabase RLS policies enforce database-level access control (configured in Supabase dashboard):

- Clients can only read their own invoices
- Admins can read all invoices
- Write operations restricted to service role

### 9. Input Validation

All auth endpoints use Zod schemas for input validation:

```typescript
const { email, password } = loginSchema.parse(body); // Validates email format, password length
```

### 10. Password Requirements

```typescript
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8, "Password must be at least 8 characters"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});
```

## Auth Endpoints

### POST /api/auth/login

Authenticate user and establish session.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "role": "CLIENT",
    "clientId": 42
  }
}
```

**Errors**:
- 401: Invalid credentials
- 422: Validation error

**Cookies Set**:
- `sb:token`: Access token
- `sb:refresh-token`: Refresh token

---

### POST /api/auth/signup

Create new client account and establish session.

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "confirm": "password123"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 2,
    "email": "newuser@example.com",
    "role": "CLIENT",
    "clientId": 43
  }
}
```

**Errors**:
- 400: Email already in use
- 422: Validation error (passwords don't match, invalid email, etc.)
- 500: Signup error

**Cookies Set**:
- `sb:token`: Access token
- `sb:refresh-token`: Refresh token

**Side Effects**:
- Creates Supabase Auth user
- Creates client record in `clients` table
- Creates user profile in `users` table

---

### POST /api/auth/logout

Clear session and log out user.

**Request Body**: None

**Response** (200):
```json
{
  "success": true,
  "data": {
    "success": true
  }
}
```

**Cookies Cleared**:
- `sb:token`
- `sb:refresh-token`

---

### GET /api/auth/me

Get current authenticated user profile.

**Request**: Requires `sb:token` cookie

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "role": "CLIENT",
    "clientId": 42
  }
}
```

**Errors**:
- 401: Not authenticated

---

### POST /api/auth/change-password

Change password for authenticated user.

**Request**: Requires `sb:token` cookie

**Request Body**:
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "success": true
  }
}
```

**Errors**:
- 401: Incorrect current password or not authenticated
- 422: Validation error (password too short)
- 500: Password change error

**Side Effects**:
- Updates password in Supabase Auth
- Invalidates all existing sessions (user must log in again)

---

### POST /api/auth/forgot-password

Send password reset email.

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "success": true
  }
}
```

**Errors**:
- 422: Invalid email format
- 400/500: Password reset error

**Side Effects**:
- Sends password reset email via Supabase Auth
- Email contains magic link to `/reset-password`

## Helper Functions Reference

### Low-Level Session Helpers (`/src/server/auth/session.ts`)

These are **internal helpers** - prefer using the higher-level helpers from `api-helpers.ts` or `auth-utils.ts`.

#### `getUserFromRequest(req: NextRequest): Promise<LegacyUser | null>`

Extract and validate user from request cookies.

**Returns**: User if authenticated, null otherwise

#### `requireUser(req: NextRequest): Promise<LegacyUser>`

Require authenticated user from request.

**Throws**: `UnauthorizedError` if not authenticated

#### `getUserFromCookies(): Promise<LegacyUser | null>`

Extract and validate user from cookies (Server Components).

**Returns**: User if authenticated, null otherwise

### Session Validation Flow

All session helpers follow this flow:

1. **Extract token** from `sb:token` cookie
2. **Validate token** with Supabase Auth (`getUser(token)`)
3. **Load profile** from `users` table by `auth_user_id`
4. **Return user** or null/throw error

```typescript
// /src/server/auth/session.ts
async function getAuthUserFromToken(token: string | undefined) {
  if (!token) return null;
  const supabase = createAuthClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error) {
    logger.warn({ scope: "auth.session", message: "Failed to fetch auth user", error });
    return null;
  }
  return user;
}

async function loadLegacyUser(authUserId: string): Promise<LegacyUser | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, role, client_id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) throw new AppError(`Failed to load user profile: ${error.message}`, 'USER_PROFILE_ERROR', 500);
  if (!data) return null;

  return { id: data.id, email: data.email, role: data.role, clientId: data.client_id, name: null, phone: null };
}
```

### Service Layer Helpers (`/src/server/services/auth.ts`)

#### `handleLogin(email: string, password: string): Promise<LoginResult>`

Complete login workflow.

**Returns**:
```typescript
{
  session: {
    accessToken: string;
    refreshToken: string | null;
    expiresAt: number | null;
  },
  profile: {
    id: number;
    email: string;
    role: 'ADMIN' | 'CLIENT';
    clientId: number | null;
  }
}
```

**Throws**: `AppError` ('INVALID_CREDENTIALS', 401) if authentication fails

#### `handleSignup(email: string, password: string): Promise<SignupWorkflowResult>`

Complete signup workflow.

**Returns**:
```typescript
{
  session: {
    accessToken: string;
    refreshToken: string | null;
    expiresAt: number | null;
  },
  profile: {
    id: number;
    email: string;
    role: 'CLIENT';
    clientId: number;
  }
}
```

**Throws**:
- `AppError` ('EMAIL_IN_USE', 400) if email exists
- `AppError` ('SIGNUP_ERROR', 500) if creation fails

#### `handlePasswordChange(userId: number, currentPassword: string, newPassword: string): Promise<void>`

Complete password change workflow.

**Throws**:
- `AppError` ('INCORRECT_PASSWORD', 401) if current password is wrong
- `AppError` ('PASSWORD_CHANGE_ERROR', 500) if update fails

#### `getUserByEmail(email: string): Promise<AuthUserProfile | null>`

Get user profile by email.

**Returns**: User profile or null if not found

#### `getUserByAuthId(authUserId: string): Promise<AuthUserProfile>`

Get user profile by Supabase Auth user ID.

**Throws**: `NotFoundError` if profile doesn't exist

---

## Best Practices

### 1. Use the Right Helper for the Context

- **API Routes** → Use helpers from `/src/server/auth/api-helpers.ts`
- **Server Components** → Use helpers from `/src/lib/auth-utils.ts`
- **Never** use low-level helpers from `/src/server/auth/session.ts` directly

### 2. Validate Role Early

Validate user roles as early as possible:

- **Middleware**: Routes users to correct dashboards
- **Layouts**: Server-side role checks before rendering
- **API Routes**: Role checks at the start of handlers

### 3. Use Resource-Specific Permissions

For resources with ownership (invoices, payments, attachments), use the permission helpers:

```typescript
await requireInvoiceAccess(req, invoiceId); // Admin or owner
```

### 4. Handle Errors Consistently

All auth helpers throw typed errors:

```typescript
try {
  const user = await requireAdmin(req);
} catch (error) {
  return handleError(error, 'scope'); // Converts to API response
}
```

### 5. Don't Trust Client-Provided IDs

Always derive the client ID from the authenticated user:

```typescript
// Good
const client = await requireClientWithId(req);
const invoices = await getInvoices({ client_id: client.clientId });

// Bad
const { clientId } = await req.json(); // User can fake this!
const invoices = await getInvoices({ client_id: clientId });
```

### 6. Use Proper Cookie Options

Always use `buildAuthCookieOptions()` for consistency:

```typescript
response.cookies.set("sb:token", token, buildAuthCookieOptions(expiresAt));
```

### 7. Clear Sessions on Logout

Always clear both cookies:

```typescript
response.cookies.set("sb:token", "", { path: "/", expires: new Date(0) });
response.cookies.set("sb:refresh-token", "", { path: "/", expires: new Date(0) });
```

---

## Troubleshooting

### User Not Authenticated After Login

**Check**:
1. Cookies are being set correctly (`sb:token`, `sb:refresh-token`)
2. Cookie options include `httpOnly: true`, `path: '/'`
3. Browser is not blocking cookies

### Session Expires Immediately

**Check**:
1. Access token expiry is being set correctly
2. Refresh token is being set
3. Middleware is refreshing tokens

### ADMIN Redirected to /client

**Check**:
1. User profile has `role: 'ADMIN'`
2. Middleware is loading profile correctly
3. No typos in role comparison

### CLIENT Can Access Admin Routes

**Check**:
1. Middleware is enforcing role-based routing
2. Layout is using `requireAdmin()`
3. Route matcher in middleware.ts is correct

### API Returns 401 for Authenticated User

**Check**:
1. Using correct helper (API routes vs Server Components)
2. Token is valid and not expired
3. User profile exists in database

---

## Future Enhancements

1. **Multi-Factor Authentication (MFA)**: Add 2FA support via Supabase Auth
2. **OAuth Providers**: Support Google, GitHub, etc. login
3. **Session Management UI**: Allow users to view/revoke active sessions
4. **Audit Logging**: Track authentication events (login, logout, failed attempts)
5. **Rate Limiting**: Prevent brute-force attacks on login endpoint
6. **Password Complexity**: Enforce stronger password requirements
7. **Account Lockout**: Temporarily lock accounts after failed login attempts
8. **Email Verification**: Require email verification before account activation
