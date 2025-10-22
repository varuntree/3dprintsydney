# Phase 6: Authentication - Implementation Plan

**Created:** 2025-10-21
**Status:** Ready for Execution

---

## Executive Summary

Phase 6 will standardize authentication patterns to improve clarity and consistency. The explore agents found that the auth system is **fundamentally sound** but has **documentation and usage inconsistencies** that need addressing.

**Key Finding:** We have 22 exported auth functions across 4 modules serving 80 files. The architecture is correct (API routes vs Server Components separation), but needs better documentation and cleanup of inline checks.

**Scope:** LOW-MEDIUM (documentation + 4-5 files with inline checks)
**Risk Level:** LOW (no breaking changes, mostly documentation)
**Estimated Duration:** 2-3 hours

---

## Analysis Summary from 3 Explore Agents

### Agent 1: Found All Auth Functions
- **22 exported functions** across 4 modules
- **4 duplicate names** (requireAuth, requireAdmin, requireClient, requireClientWithId)
  - But in DIFFERENT contexts (API vs Server Components) - **this is intentional**
- Properly separated by use case

### Agent 2: Pattern Analysis
- **Good:** Clear separation between API routes and server components
- **Good:** Consistent error handling via AppError classes
- **Needs Work:** 4 files with inline role checks instead of using helpers
- **Needs Work:** Missing documentation clarifying when to use which helper

### Agent 3: Usage Analysis
- **80 files** use auth functions
- **72 API routes** use `@/server/auth/api-helpers`
- **8 server components** use `@/lib/auth-utils`
- **46 routes** depend on `requireAdmin()` (most common)
- **4 files** have inline `user.role` checks

---

## Current State Assessment

### ✅ What's Working Well:

1. **Clear architectural separation:**
   - API routes: `server/auth/api-helpers.ts` (takes NextRequest, throws errors)
   - Server components: `lib/auth-utils.ts` (uses cookies, calls redirect())
   - Permissions: `server/auth/permissions.ts` (resource-specific)

2. **Consistent naming:**
   - requireAuth() - any authenticated user
   - requireAdmin() - admin role only
   - requireClient() - client role only
   - requireClientWithId() - client with clientId

3. **Proper error handling:**
   - Uses AppError subclasses (UnauthorizedError, ForbiddenError)
   - Most routes use handleError() helper

### ❌ What Needs Fixing:

1. **Missing JSDoc documentation** on all auth functions
2. **No clarity on when to use API helpers vs Server Component helpers**
3. **4 files with inline role checks** instead of using helpers:
   - `/src/app/api/messages/route.ts` (line 44)
   - `/src/app/api/invoices/[id]/messages/route.ts` (line 58)
   - Manual `user.role === "ADMIN" ? "ADMIN" : "CLIENT"` logic

4. **Minor: No helper for common pattern** (determining sender type from role)

---

## Goals & Success Criteria

### Goals:
1. ✅ Add comprehensive JSDoc to all auth functions
2. ✅ Create helper for role-based sender determination
3. ✅ Remove inline auth checks (use helpers instead)
4. ✅ Document architectural decisions (why two sets of helpers)
5. ✅ Maintain 100% build success
6. ✅ No breaking changes to existing code

### Success Criteria:
- [ ] All auth functions have JSDoc (22 functions)
- [ ] Zero inline role checks remain
- [ ] New helper created for sender determination
- [ ] README.md added to auth/ explaining structure
- [ ] Build passes with zero TypeScript errors
- [ ] Review agent approval
- [ ] All 80 dependent files still work

---

## Implementation Strategy

**Conservative Approach:** Documentation + minimal code changes

We will NOT:
- ❌ Rename any functions (would break 80 files)
- ❌ Move files (would break all imports)
- ❌ Merge helpers (different contexts need different implementations)
- ❌ Change signatures (would break all callers)

We WILL:
- ✅ Add JSDoc documentation to clarify usage
- ✅ Extract inline checks to helper functions
- ✅ Add README explaining architecture
- ✅ Improve code comments

---

## Detailed Implementation Plan

### Task 1: Add JSDoc Documentation (45 min)

Add comprehensive JSDoc to all exported auth functions:

#### File: `src/server/auth/api-helpers.ts` (5 functions)
```typescript
/**
 * Require authenticated user for API route
 * @param req - Next.js request object
 * @returns Authenticated user
 * @throws UnauthorizedError if not authenticated
 * @example
 * export async function GET(req: NextRequest) {
 *   const user = await requireAuth(req);
 *   // user is guaranteed to exist
 * }
 */
export async function requireAuth(req: NextRequest): Promise<LegacyUser>

/**
 * Require admin role for API route
 * @param req - Next.js request object
 * @returns Admin user
 * @throws UnauthorizedError if not authenticated
 * @throws ForbiddenError if not admin
 */
export async function requireAdmin(req: NextRequest): Promise<LegacyUser>

/**
 * Require client role for API route
 * @param req - Next.js request object
 * @returns Client user
 * @throws UnauthorizedError if not authenticated
 * @throws ForbiddenError if not client role
 */
export async function requireClient(req: NextRequest): Promise<LegacyUser>

/**
 * Require client role with clientId for API route
 * @param req - Next.js request object
 * @returns Client user with clientId guaranteed
 * @throws UnauthorizedError if not authenticated
 * @throws ForbiddenError if not client or missing clientId
 */
export async function requireClientWithId(req: NextRequest): Promise<LegacyUser & { clientId: number }>

/**
 * Get optional authenticated user for API route (returns null if not authenticated)
 * @param req - Next.js request object
 * @returns User if authenticated, null otherwise
 */
export async function getAuthUser(req: NextRequest): Promise<LegacyUser | null>
```

#### File: `src/lib/auth-utils.ts` (5 functions)
```typescript
/**
 * Require authenticated user for Server Component (redirects to login if not authenticated)
 * Use this ONLY in Server Components (page.tsx, layout.tsx)
 * For API routes, use requireAuth from @/server/auth/api-helpers instead
 * @param callbackUrl - Optional URL to redirect back to after login
 * @returns Authenticated user
 * @redirects /login if not authenticated
 */
export async function requireAuth(callbackUrl?: string): Promise<LegacyUser>

// Similar for requireAdmin, requireClient, requireClientWithId, getOptionalUser
```

#### File: `src/server/auth/permissions.ts` (3 functions)
```typescript
/**
 * Require access to invoice (admin or invoice owner)
 * @param req - Next.js request object
 * @param invoiceId - Invoice ID to check access for
 * @throws UnauthorizedError if not authenticated
 * @throws ForbiddenError if not admin and not invoice owner
 */
export async function requireInvoiceAccess(req: NextRequest, invoiceId: number): Promise<void>

// Similar for requireAttachmentAccess, requirePaymentAccess
```

#### File: `src/server/auth/session.ts` (3 functions)
```typescript
/**
 * Extract user from NextRequest (internal helper)
 * @internal - Use requireAuth/getAuthUser from api-helpers instead
 */
export async function getUserFromRequest(req: NextRequest): Promise<LegacyUser | null>

// Similar for requireUser, getUserFromCookies
```

**Total: 16 functions to document** (others are in services/auth.ts, already documented in Phase 5)

---

### Task 2: Create Architecture Documentation (15 min)

Create `src/server/auth/README.md`:

```markdown
# Authentication & Authorization

This directory contains authentication and authorization helpers for the 3D Print Sydney application.

## Directory Structure

```
src/
├── server/auth/
│   ├── api-helpers.ts      # For API routes (app/api/**/route.ts)
│   ├── permissions.ts      # Resource-specific access control
│   └── session.ts          # Low-level session management (internal)
└── lib/
    └── auth-utils.ts       # For Server Components (app/**/page.tsx, layout.tsx)
```

## When to Use Which Helper

### API Routes (`app/api/**/route.ts`)
Use `@/server/auth/api-helpers`:
```typescript
import { requireAdmin } from '@/server/auth/api-helpers';

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);  // Throws 401/403
  // ...
}
```

### Server Components (`app/**/page.tsx`, `layout.tsx`)
Use `@/lib/auth-utils`:
```typescript
import { requireAdmin } from '@/lib/auth-utils';

export default async function AdminPage() {
  const user = await requireAdmin();  // Redirects to login
  // ...
}
```

### Resource Access Control
Use `@/server/auth/permissions` for resource-specific checks:
```typescript
import { requireInvoiceAccess } from '@/server/auth/permissions';

export async function GET(req: NextRequest, { params }: Context) {
  const { id } = await params;
  await requireInvoiceAccess(req, Number(id));  // Admin or owner
  // ...
}
```

## Available Helpers

### API Route Helpers
- `requireAuth(req)` - Any authenticated user
- `requireAdmin(req)` - Admin role only
- `requireClient(req)` - Client role only
- `requireClientWithId(req)` - Client with clientId
- `getAuthUser(req)` - Optional auth (returns null)

### Server Component Helpers
- `requireAuth(callbackUrl?)` - Any authenticated user (redirects)
- `requireAdmin()` - Admin role (redirects)
- `requireClient()` - Client role (redirects)
- `requireClientWithId()` - Client with clientId (redirects)
- `getOptionalUser()` - Optional auth (returns null)

### Permission Helpers
- `requireInvoiceAccess(req, invoiceId)` - Admin or invoice owner
- `requireAttachmentAccess(req, attachmentId)` - Admin or attachment owner
- `requirePaymentAccess(req, paymentId)` - Admin or payment owner

## Why Two Sets of Helpers?

**API Routes** and **Server Components** have different execution contexts:

- **API routes** throw errors that become HTTP responses (401, 403)
- **Server Components** perform redirects to login/dashboard pages

Trying to unify these would require runtime context detection and make the code more complex. Separate helpers keep the code clean and explicit.
```

---

### Task 3: Extract Inline Role Checks (30 min)

Create helper in `src/lib/utils/auth-helpers.ts`:

```typescript
import type { LegacyUser } from '@/server/auth/session';

/**
 * Determine message sender type based on user role
 * @param user - Authenticated user
 * @returns "ADMIN" or "CLIENT"
 */
export function getSenderType(user: LegacyUser): 'ADMIN' | 'CLIENT' {
  return user.role === 'ADMIN' ? 'ADMIN' : 'CLIENT';
}
```

Update files using inline role checks:

1. **`/src/app/api/messages/route.ts`** (Line 44)
   ```typescript
   // Before
   const sender = user.role === "ADMIN" ? "ADMIN" : "CLIENT";
   
   // After
   import { getSenderType } from '@/lib/utils/auth-helpers';
   const sender = getSenderType(user);
   ```

2. **`/src/app/api/invoices/[id]/messages/route.ts`** (Line 58)
   - Same change as above

---

### Task 4: Update Workspace Status (5 min)

Update `workspace.md` to track progress.

---

## Implementation Order

### Step 1: Add JSDoc Documentation (45 min)
1. `src/server/auth/api-helpers.ts` - 5 functions
2. `src/lib/auth-utils.ts` - 5 functions
3. `src/server/auth/permissions.ts` - 3 functions
4. `src/server/auth/session.ts` - 3 functions
5. Verify build after completion

### Step 2: Create Documentation (15 min)
1. Create `src/server/auth/README.md`
2. Add architectural explanation
3. Add usage examples

### Step 3: Extract Inline Checks (30 min)
1. Create `src/lib/utils/auth-helpers.ts`
2. Add `getSenderType()` helper
3. Update `messages/route.ts`
4. Update `invoices/[id]/messages/route.ts`
5. Verify build

### Step 4: Final Verification (30 min)
1. Run full build
2. Deploy review agent
3. Fix any issues found
4. Commit changes

**Total Estimated Time: 2 hours**

---

## Files to Change

### New Files (2):
1. `src/server/auth/README.md` (NEW)
2. `src/lib/utils/auth-helpers.ts` (NEW)

### Modified Files (6):
1. `src/server/auth/api-helpers.ts` (add JSDoc)
2. `src/lib/auth-utils.ts` (add JSDoc)
3. `src/server/auth/permissions.ts` (add JSDoc)
4. `src/server/auth/session.ts` (add JSDoc)
5. `src/app/api/messages/route.ts` (use helper)
6. `src/app/api/invoices/[id]/messages/route.ts` (use helper)

**Total: 8 files (2 new, 6 modified)**

---

## Risk Assessment

### LOW RISK:
- Adding JSDoc comments (no behavior change)
- Creating README documentation
- Creating new helper function

### NEGLIGIBLE RISK:
- Using `getSenderType()` helper (pure function, easily testable)

### NO RISK:
- No function renames
- No signature changes
- No file moves
- No import path changes

---

## Testing Strategy

### Build Verification:
```bash
npm run typecheck  # Must pass
npm run build      # Must pass
npm run lint       # Must pass
```

### Manual Testing:
Not required (documentation changes + helper extraction only)

### Review Agent:
Will verify:
- JSDoc coverage on all auth functions
- No inline role checks remain
- All imports still work
- Documentation accuracy

---

## Success Metrics

**Quantitative:**
- 16 functions documented (100% JSDoc coverage)
- 2 inline checks removed (100% reduction)
- 1 new helper created
- 1 README added
- 0 breaking changes
- 0 build errors

**Qualitative:**
- ✅ Clear documentation on when to use which helper
- ✅ Architectural decisions explained
- ✅ No scattered role-checking logic
- ✅ Improved developer experience
- ✅ Easier onboarding for new developers

---

## Commit Strategy

Single commit after all changes verified:

```bash
git commit -m "Phase 6: Standardize authentication patterns

- Add JSDoc to all 16 auth helper functions
- Create auth/ README explaining architecture
- Extract inline role checks to getSenderType() helper
- Update 2 routes to use new helper
- Document API routes vs Server Components distinction

Pattern compliance: 100%
Files changed: 8 (2 new, 6 modified)
Build verified: ✅

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Notes for Implementation

1. **JSDoc examples** should show actual usage patterns
2. **README** should be developer-friendly, not overly technical
3. **Helper function** should be simple and pure (easy to test)
4. **No changes** to existing function behavior
5. **Verify imports** work correctly after changes

---

**Ready to Execute:** Yes ✅
**Estimated Duration:** 2 hours
**Risk Level:** LOW
**Last Updated:** 2025-10-21
