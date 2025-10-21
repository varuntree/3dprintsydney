# AUTHENTICATION USAGE ANALYSIS REPORT

## Executive Summary
The codebase has **80 files** importing or using authentication functions. These files are spread across:
- **72 API routes** (primary consumers)
- **4 Layout/Page components** (server components)
- **3 Auth server modules** (helpers and permissions)
- **1 Auth utilities library**

Total auth functions used: **7 distinct functions**

---

## 1. COMPLETE LIST OF FILES IMPORTING AUTH HELPERS

### By Import Source and Function

#### From `@/server/auth/api-helpers.ts` (46 files using requireAdmin):
```
requireAdmin() - 46 files
requireAuth() - 13 files
requireClientWithId() - 3 files
getAuthUser() - 1 file
```

#### From `@/server/auth/permissions.ts` (11 files using permission checks):
```
requireInvoiceAccess() - 9 files
requireAttachmentAccess() - 2 files
requirePaymentAccess() - 1 file
```

#### From `@/lib/auth-utils.ts` (4 files):
```
requireAuth() - 1 file (requireAuth variant for Server Components)
requireAdmin() - 1 file
requireClient() - 1 file
getOptionalUser() - 1 file
getUserFromCookies() - 1 file (internal)
```

#### From `@/server/auth/session.ts` (3 files - internal):
```
getUserFromRequest() - 1 file (permissions.ts)
getUserFromCookies() - 1 file (auth-utils.ts)
requireUser() - 1 file (api-helpers.ts)
```

---

## 2. DIRECTORY-LEVEL BREAKDOWN

### `/src/app/api/` - 72 Files (90% of auth users)

#### Admin Management APIs:
- `/admin/clients/route.ts` - requireAdmin
- `/admin/users/route.ts` - requireAdmin
- `/admin/users/[id]/route.ts` - requireAdmin
- `/admin/users/[id]/messages/route.ts` - requireAdmin

#### Clients Management:
- `/clients/route.ts` - requireAdmin
- `/clients/[id]/route.ts` - requireAdmin
- `/clients/[id]/notes/route.ts` - requireAdmin

#### Dashboard & Export:
- `/dashboard/route.ts` - requireAdmin
- `/dashboard/activity/route.ts` - requireAdmin
- `/export/ar-aging/route.ts` - requireAdmin
- `/export/invoices/route.ts` - requireAdmin
- `/export/jobs/route.ts` - requireAdmin
- `/export/material-usage/route.ts` - requireAdmin
- `/export/payments/route.ts` - requireAdmin
- `/export/printer-utilization/route.ts` - requireAdmin

#### Invoices Management (14 files):
- `/invoices/route.ts` - requireAdmin
- `/invoices/[id]/route.ts` - requireInvoiceAccess
- `/invoices/[id]/activity/route.ts` - requireAdmin
- `/invoices/[id]/attachments/route.ts` - requireAdmin
- `/invoices/[id]/attachments/[attachmentId]/route.ts` - requireAdmin + requireAttachmentAccess
- `/invoices/[id]/files/route.ts` - requireInvoiceAccess
- `/invoices/[id]/mark-paid/route.ts` - requireInvoiceAccess
- `/invoices/[id]/mark-unpaid/route.ts` - requireInvoiceAccess
- `/invoices/[id]/messages/route.ts` - requireAuth + requireInvoiceAccess
- `/invoices/[id]/payments/route.ts` - requireInvoiceAccess
- `/invoices/[id]/payments/[paymentId]/route.ts` - requirePaymentAccess
- `/invoices/[id]/pdf/route.ts` - requireInvoiceAccess
- `/invoices/[id]/revert/route.ts` - requireAdmin
- `/invoices/[id]/stripe-session/route.ts` - requireInvoiceAccess
- `/invoices/[id]/void/route.ts` - requireAdmin
- `/invoices/[id]/write-off/route.ts` - requireAdmin

#### Quotes Management (9 files):
- `/quotes/route.ts` - requireAdmin
- `/quotes/[id]/route.ts` - requireAdmin
- `/quotes/[id]/accept/route.ts` - requireAdmin
- `/quotes/[id]/convert/route.ts` - requireAdmin
- `/quotes/[id]/decline/route.ts` - requireAdmin
- `/quotes/[id]/duplicate/route.ts` - requireAdmin
- `/quotes/[id]/pdf/route.ts` - requireAdmin
- `/quotes/[id]/send/route.ts` - requireAdmin
- `/quotes/[id]/status/route.ts` - requireAdmin

#### Jobs Management (6 files):
- `/jobs/route.ts` - requireAdmin
- `/jobs/[id]/route.ts` - requireAdmin
- `/jobs/[id]/status/route.ts` - requireAdmin
- `/jobs/[id]/archive/route.ts` - requireAdmin
- `/jobs/archive/route.ts` - requireAdmin
- `/jobs/reorder/route.ts` - requireAdmin

#### Materials Management (2 files):
- `/materials/route.ts` - requireAdmin
- `/materials/[id]/route.ts` - requireAdmin

#### Printers Management (3 files):
- `/printers/route.ts` - requireAdmin
- `/printers/[id]/route.ts` - requireAdmin
- `/printers/[id]/clear-queue/route.ts` - requireAdmin

#### Product Templates (2 files):
- `/product-templates/route.ts` - requireAdmin
- `/product-templates/[id]/route.ts` - requireAdmin

#### Client APIs (5 files):
- `/client/dashboard/route.ts` - requireClientWithId
- `/client/invoices/route.ts` - requireAuth
- `/client/jobs/route.ts` - requireClientWithId
- `/client/materials/route.ts` - requireAuth
- `/client/preferences/route.ts` - requireClientWithId

#### Quick Order APIs (5 files):
- `/quick-order/upload/route.ts` - requireAuth
- `/quick-order/price/route.ts` - requireAuth
- `/quick-order/orient/route.ts` - requireAuth
- `/quick-order/slice/route.ts` - requireAuth
- `/quick-order/checkout/route.ts` - requireAuth

#### Auth APIs (2 files):
- `/auth/me/route.ts` - getAuthUser
- `/auth/change-password/route.ts` - requireAuth

#### Settings & Other (5 files):
- `/settings/route.ts` - requireAdmin
- `/maintenance/run/route.ts` - requireAdmin
- `/messages/route.ts` - requireAuth + requireInvoiceAccess
- `/order-files/[id]/route.ts` - requireAuth
- `/attachments/[id]/route.ts` - requireAttachmentAccess
- `/stripe/test/route.ts` - requireAuth
- `/tmp-file/[...id]/route.ts` - requireAuth

### `/src/app/(admin)/` - 2 Files
- `layout.tsx` - imports requireAdmin from @/lib/auth-utils (Server Component helper)
- `page.tsx` - imports getUserFromCookies from @/server/auth/session
- `me/page.tsx` - imports getUserFromCookies from @/server/auth/session

### `/src/app/(client)/` - 2 Files
- `layout.tsx` - imports requireClient from @/lib/auth-utils (Server Component helper)
- `client/page.tsx` - imports getUserFromCookies from @/server/auth/session
- `client/orders/[id]/page.tsx` - imports getUserFromCookies from @/server/auth/session

### `/src/app/(public)/` - 1 File
- `layout.tsx` - imports getOptionalUser from @/lib/auth-utils

### `/src/app/account/` - 1 File
- `page.tsx` - imports requireAuth from @/lib/auth-utils

### `/src/lib/` - 1 File
- `auth-utils.ts` - wrapper functions importing from @/server/auth/session

### `/src/server/auth/` - 3 Files (internal)
- `session.ts` - base functions (getUserFromRequest, requireUser, getUserFromCookies)
- `api-helpers.ts` - API route helpers
- `permissions.ts` - resource-based access control

---

## 3. AUTH FUNCTIONS DEPENDENCY MAP

### requireAdmin() - Used by 46 Files
Most heavily used function. Requires ADMIN role for API routes.
Files:
- All `/api/admin/*` (4 files)
- All `/api/clients/*` (3 files)
- All `/api/dashboard/*` (2 files)
- All `/api/export/*` (6 files)
- All `/api/invoices/*` (11 files, except those using requireInvoiceAccess)
- All `/api/quotes/*` (9 files)
- All `/api/jobs/*` (6 files)
- All `/api/materials/*` (2 files)
- All `/api/printers/*` (3 files)
- All `/api/product-templates/*` (2 files)
- `/api/settings/route.ts`

### requireAuth() - Used by 13 Files
Requires any authenticated user. Used for:
- `/api/client/invoices/route.ts`
- `/api/client/materials/route.ts`
- `/api/auth/change-password/route.ts`
- All `/api/quick-order/*` (5 files)
- `/api/messages/route.ts`
- `/api/invoices/[id]/messages/route.ts`
- `/api/order-files/[id]/route.ts`
- `/api/stripe/test/route.ts`
- `/api/tmp-file/[...id]/route.ts`

Plus from @/lib/auth-utils for Server Components:
- `/app/account/page.tsx`

### requireClientWithId() - Used by 3 Files
Requires CLIENT role with valid clientId.
- `/api/client/dashboard/route.ts`
- `/api/client/jobs/route.ts`
- `/api/client/preferences/route.ts`

### requireInvoiceAccess() - Used by 9 Files
Resource-based access control for invoices. Checks if user is ADMIN or owns the invoice.
- `/api/invoices/[id]/route.ts`
- `/api/invoices/[id]/files/route.ts`
- `/api/invoices/[id]/mark-paid/route.ts`
- `/api/invoices/[id]/mark-unpaid/route.ts`
- `/api/invoices/[id]/messages/route.ts`
- `/api/invoices/[id]/payments/route.ts`
- `/api/invoices/[id]/pdf/route.ts`
- `/api/invoices/[id]/stripe-session/route.ts`
- `/api/messages/route.ts`

### requireAttachmentAccess() - Used by 2 Files
Delegates to requireInvoiceAccess after checking attachment ownership.
- `/api/attachments/[id]/route.ts`
- `/api/invoices/[id]/attachments/[attachmentId]/route.ts`

### requirePaymentAccess() - Used by 1 File
Delegates to requireInvoiceAccess after checking payment ownership.
- `/api/invoices/[id]/payments/[paymentId]/route.ts`

### getAuthUser() - Used by 1 File
Optional auth helper for API routes that support both auth and public access.
- `/api/auth/me/route.ts`

---

## 4. INLINE ROLE CHECKS (SHOULD BE REFACTORED)

Found **4 instances** of inline `user.role` checks that could be refactored:

1. **`/src/app/(public)/layout.tsx`** (line ~50)
   ```typescript
   if (user.role === "ADMIN") { ... }
   ```
   Could use: `requireAdmin()` helper

2. **`/src/app/api/messages/route.ts`** (line 44)
   ```typescript
   const sender = user.role === "ADMIN" ? "ADMIN" : "CLIENT";
   ```
   Requires refactoring - no helper exists for this use case
   **Action**: Create helper like `getSenderType(user)`

3. **`/src/app/api/invoices/[id]/messages/route.ts`** (line ~50)
   ```typescript
   const sender = user.role === "ADMIN" ? "ADMIN" : "CLIENT";
   ```
   Same as above - refactor to helper

4. **`/src/app/(admin)/me/page.tsx`** (line 9)
   ```typescript
   if (user.role === "CLIENT") redirect("/client/messages");
   ```
   Could use: `requireAdmin()` helper variant

---

## 5. IMPORT CONSOLIDATION ANALYSIS

### Current State:
- Files import from **3 different auth modules**:
  1. `@/server/auth/api-helpers.ts` (API route helpers)
  2. `@/server/auth/permissions.ts` (resource-based access)
  3. `@/lib/auth-utils.ts` (Server Component helpers)

### Import Pattern Distribution:
```
requireAdmin():           46 files (api-helpers) + 1 file (auth-utils)
requireAuth():            13 files (api-helpers) + 1 file (auth-utils)
requireClient():          0 files (api-helpers) + 1 file (auth-utils)
requireClientWithId():    3 files (api-helpers) + 0 files (auth-utils)
requireInvoiceAccess():   9 files (permissions)
requireAttachmentAccess(): 2 files (permissions)
requirePaymentAccess():   1 file (permissions)
getAuthUser():            1 file (api-helpers)
```

---

## 6. FILES REQUIRING IMPORT UPDATES

### If Consolidating to Single Module:
Would need to update **80 files** with new import paths.

### Import Path Update Matrix:
```
FROM                              TO                    FILES TO UPDATE
@/server/auth/api-helpers    -->  @/server/auth        46 + 1
@/server/auth/permissions    -->  @/server/auth        11
@/lib/auth-utils             -->  @/server/auth        4 (might need new helpers for Server Components)
```

### Migration Strategy:
1. Create consolidated `@/server/auth/index.ts` that re-exports all helpers
2. Or keep separate files but update import paths
3. For Server Component helpers, either:
   - Move to auth-utils (keeps separation)
   - Or create new server component helpers in @/server/auth

---

## 7. POTENTIAL BREAKING CHANGES IF CONSOLIDATING

### High Impact:
1. **API Helper Functions** (requireAdmin, requireAuth, etc.)
   - 60 files depend on these
   - Any signature change breaks all consumers

2. **Permission Checking Functions** (requireInvoiceAccess, etc.)
   - 11 files depend on these
   - Return type is `{ user: LegacyUser }`
   - Changing this signature breaks resource-based access control

### Medium Impact:
3. **Server Component Helpers** (@/lib/auth-utils)
   - 4 files depend on these
   - These use `redirect()` from next/navigation
   - Cannot be moved to API context without refactoring

### Considerations:
- **requireAdmin** and **requireAuth** have SAME NAME but DIFFERENT signatures:
  - API version: `requireAdmin(req: NextRequest): Promise<LegacyUser>`
  - Component version: `requireAdmin(): Promise<LegacyUser>`
  - **This creates namespace collision risk if consolidating**

- **Permission functions return `{ user }` wrapper**
  - Inconsistent with other helpers that return just `user`
  - Could cause confusion during consolidation

---

## 8. SUMMARY TABLE: ALL FILES BY AUTH USAGE

### Total Files: 80

| Category | Count | Primary Functions |
|----------|-------|-------------------|
| API routes (admin operations) | 40 | requireAdmin |
| API routes (client operations) | 8 | requireAuth, requireClientWithId |
| API routes (resource-based) | 11 | requireInvoiceAccess, requireAttachmentAccess, requirePaymentAccess |
| API routes (optional auth) | 1 | getAuthUser |
| Server Components (admin) | 1 | requireAdmin (from auth-utils) |
| Server Components (client) | 1 | requireClient (from auth-utils) |
| Server Components (public/optional) | 1 | getOptionalUser |
| Layout components | 4 | requireAuth, requireAdmin, requireClient, getOptionalUser |
| Auth helpers | 3 | Internal session/permissions logic |
| Auth utilities | 1 | Re-exports from session.ts |

### Files NOT using auth (potential oversight):
Check for:
- `/api/auth/signup/route.ts` - might be public
- `/api/auth/login/route.ts` - might be public
- `/api/auth/logout/route.ts` - might need auth
- `/api/auth/forgot-password/route.ts` - public
- `/api/auth/forgot-password/route.ts` - might need auth

---

## 9. RECOMMENDATIONS

1. **Do NOT rename functions** - 46 files use requireAdmin, breakage is high
2. **Do NOT move Server Component helpers** - different context, different logic
3. **CONSIDER creating barrel exports** - `@/server/auth/index.ts` for easier imports
4. **REFACTOR inline role checks** - Create 2 new helpers for sender type determination
5. **DOCUMENT function differences** - Make clear which helpers are for API vs Server Components
6. **ADD TypeScript overloads** - If consolidating, use function overloading for dual signatures

---

## 10. COMPLETE FILE LISTING

[See detailed list in previous sections]

