# Authentication and Authorization

## 1. Authentication Overview

### Supabase Auth with JWT
- Uses Supabase Auth for user credential management
- Tokens: Access Token (short-lived JWT) + Refresh Token (long-lived)
- Anon key for client-side auth, service role for admin operations

### Cookie-Based Sessions
- **Access Cookie**: `sb:token` (JWT, short-lived, exp ~1 hour)
- **Refresh Cookie**: `sb:refresh-token` (long-lived, no expiration set)
- Both HttpOnly, Secure (production), SameSite=Lax
- Prevents XSS attacks; can't be accessed by JavaScript

### Login Flow
1. User submits credentials to `/login` page
2. Supabase verifies and returns access + refresh tokens
3. Middleware sets both cookies in response
4. Tokens stored securely in cookies

### Logout Flow
1. Clear both cookies (set expires to epoch)
2. User redirected to login page
3. Tokens immediately invalid

### Token Lifecycle
- **Access Token**: Valid ~1 hour, verified on each request via middleware
- **Refresh Token**: Stored indefinitely; used when access expires
- **Middleware Refresh**: If access token expired, refresh automatically using refresh token
- **New cookies set**: Fresh access + refresh tokens returned on refresh success


## 2. Session Management

### Cookie Storage Strategy
- Cookies set via middleware on every request when user is authenticated
- `setSessionCookies()` helper handles secure cookie configuration
- HttpOnly flag prevents XSS access; Secure flag enforces HTTPS in production
- Path="/" ensures available to entire application

### Token Validation & Refresh
```
Request → Check Access Token → Valid? → Continue
         ↓ Expired?
         → Try Refresh Token → Success? → Set new cookies + Continue
         ↓ Fail
         → Redirect to login
```

**Middleware Process** (`middleware.ts`):
1. Extract `sb:token` and `sb:refresh-token` from cookies
2. Validate access token via Supabase `auth.getUser(accessToken)`
3. If expired, refresh using `auth.refreshSession(refreshToken)`
4. If both fail, redirect unauthenticated users to login

### User Profile Syncing
- Auth happens in `auth.users` (Supabase managed table)
- Application data in `users` table (app-managed): `id, auth_user_id, email, role, client_id`
- After auth validation, middleware fetches user profile via service role
- If profile missing (user not in `users` table), logout and redirect to login
- Ensures only provisioned users can access the app

**Service Role Used For**:
- Server-side profile queries (secure, not exposed to client)
- Handles RLS bypass (Row-Level Security)
- Cannot be accessed from browser


## 3. Authorization Model

### Two-Tier System

**Tier 1: Role-Based Access**
- `ADMIN`: Full system access, manages clients, invoices, users
- `CLIENT`: Limited to own data, views invoices/quotes

**Tier 2: Data-Level (clientId)**
- Clients restricted to their own `client_id` in `users` table
- Resources tagged with `client_id`: invoices, quotes, attachments, payments
- Admins can access all resources; clients only their own

### Role Capabilities

| Action | ADMIN | CLIENT |
|--------|-------|--------|
| View all invoices | Yes | Only own |
| Create users | Yes | No |
| Manage printers | Yes | No |
| View own invoices | Yes | Yes |
| Submit quotes | No | Yes |
| Upload attachments | Yes | Yes* |

*Only to own invoices

### Permission Verification Patterns
- **Middleware**: Routes checked before reaching handlers
- **Server Components**: `requireAdmin()`, `requireClient()` guard pages
- **API Routes**: `requireAdminAPI()`, `requireClientAPI()` guard endpoints
- **Resource Access**: `requireInvoiceAccess()`, `requireAttachmentAccess()` for granular checks

Flow: 1) Verify authenticated, 2) Check role, 3) Check resource ownership


## 4. Protected Routes

### Route Groups Structure
```
app/
├── (public)        → /login, /signup, /forgot-password (no auth required)
├── (admin)         → /admin/*, / (admin-only)
├── (client)        → /client/*, /quick-order (client-only)
└── [other routes]  → /account, /pricing (authenticated, any role)
```

### Middleware Protection Flow
1. **Public Routes**: Allow unauthenticated access
2. **Authenticated Routes**: Redirect to login if not authenticated
3. **Role-Specific Routes**:
   - Admin tries `/client` → redirect to `/`
   - Client tries `/admin` → redirect to `/client`
   - Authenticated tries public routes → redirect to dashboard (role-based)

### Server Component Auth

**For Page Protection**:
- `requireAuth()` → Redirect to login if not authenticated
- `requireAdmin()` → Redirect to `/client` if not admin
- `requireClient()` → Redirect to `/` if not client
- `requireClientWithId()` → Ensures client has assigned clientId

**Pattern Usage**:
```typescript
// app/(admin)/page.tsx
export default async function AdminDashboard() {
  const user = await requireAdmin();  // Throws if not ADMIN
  // page content with access to user data
}
```

### API Route Auth

**API Helpers** (`src/server/auth/api-helpers.ts`):
- `requireAuthAPI()` → Verify authenticated (401 if not)
- `requireAdminAPI()` → Verify admin (401/403)
- `requireClientAPI()` → Verify client (401/403)
- `requireClientWithIdAPI()` → Verify client + clientId
- `getOptionalUserAPI()` → Get user or null (no error)

**Pattern Usage**:
```typescript
// app/api/admin/clients/route.ts
export async function GET(req: NextRequest) {
  const admin = await requireAdminAPI(req);  // Throws if not admin
  // fetch and return client data
}
```


## 5. Permission Patterns

### Resource Access Control

**Invoices** (`requireInvoiceAccess`):
- Admin: Access any invoice
- Client: Access only invoices where `client_id == user.clientId`
- Returns 403 Forbidden if unauthorized

**Attachments** (`requireAttachmentAccess`):
- Resolve `attachment → invoice`, then check invoice access
- Cascades to invoice permission rules

**Payments** (`requirePaymentAccess`):
- Resolve `payment → invoice`, then check invoice access
- Same cascading pattern

### Admin vs Client Access Rules
| Resource | Admin | Client |
|----------|-------|--------|
| invoices | All | Own (clientId match) |
| quotes | All | Own |
| attachments | All | Own (via invoice) |
| payments | All | Own (via invoice) |
| users | Create/edit | View own profile |
| clients | Manage | View own |

### Helper Functions Overview
- **Session**: `getUserFromRequest()`, `requireUser()`, `requireAdmin()`, `getUserFromCookies()`
- **Permissions**: `requireInvoiceAccess()`, `requireAttachmentAccess()`, `requirePaymentAccess()`
- **API**: `requireAuthAPI()`, `requireAdminAPI()`, `requireClientAPI()`, `getOptionalUserAPI()`
- **Components**: `requireAuth()`, `requireAdmin()`, `requireClient()`, `getOptionalUser()`


## 6. Security Features

### HttpOnly Cookies
- Cookies cannot be accessed via `document.cookie` (JavaScript)
- Prevents XSS attacks stealing session tokens
- Only readable by HTTP requests (server-side)

### Secure Cookie Flags
- **HttpOnly**: true (always)
- **Secure**: true in production only (HTTPS required)
- **SameSite**: lax (prevents CSRF, allows same-site top-level navigation)
- **Path**: "/" (available to entire app)

### Service Role vs Anon Key
- **Service Role**: Uses secret key, bypasses RLS, server-side only
  - Used for querying user profiles, admin operations
  - Never exposed to client
- **Anon Key**: Public key, subject to RLS rules, used for client auth
  - Used for login/signup, client queries
  - Safe to expose (RLS protects data)

### RLS Strategy
- Supabase Row-Level Security restricts data at database level
- Rules check `auth.uid()` against row ownership
- Service role bypasses RLS for admin operations
- Example: Users table RLS allows users to see only their own row

### Token Validation Points
1. **Middleware**: Every request validates access token
2. **Server Components**: `requireAuth()` validates token before rendering
3. **API Routes**: Each route validates token at start
4. **Cascading**: `requireInvoiceAccess()` validates user then checks resource ownership

No stored sessions needed; stateless JWT validation sufficient for security.


## Implementation Checklist

- Auth implemented via Supabase (managed in `auth.users`)
- User profiles in `users` table with role + clientId
- Middleware handles token refresh and route protection
- Server components use role-based guards
- API routes use permission helpers
- Cookies properly secured (HttpOnly, Secure, SameSite)
- Service role used for server-side queries
- Resource-level access control for sensitive data
