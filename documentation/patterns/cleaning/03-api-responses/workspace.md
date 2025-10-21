# Phase 3: API Response Format

**Started:** 2025-10-21
**Status:** 🔄 In Progress

---

## Progress Checklist

- [x] Analysis Complete
- [x] Plan Approved
- [ ] Implementation Complete
- [ ] Review Complete
- [ ] Build Verified
- [ ] Phase Complete

---

## Current Task

Step 1: Exporting response types from respond.ts (5 min)

---

## Explore Agent Findings

### Agent 1: Find All API Route Files
**Status:** ✅ Complete

**Findings:**
- **Total API Route Files:** 77 routes
- **Using respond helpers:** 67 routes (87%)
- **Mixed patterns (helpers + NextResponse.json):** 21 routes (27%)
- **Custom NextResponse.json only:** 4 routes (5%)
- **File exports (Response constructor):** 6 routes (8%)
- **Key Issue:** 13 routes inconsistently mix both patterns within same file

**Critical Inconsistencies:**
- Auth routes (6 files): Mix NextResponse.json() with fail()
- Quick-order routes (5 files): Use NextResponse.json() for validation, fail() for errors
- Admin routes (4 files): Custom error handling instead of fail()

### Agent 2: Find All Frontend API Calls
**Status:** ✅ Complete

**Findings:**
- **Total Files Making API Calls:** 30 files
- **Central HTTP Wrapper:** `/src/lib/http.ts` (handles 77% of all calls)
- **Expected Response Format:** `{ data: T }` for success, `{ error: { message } }` for errors
- **React Query Usage:** 18 components using useQuery/useMutation
- **Direct Fetch:** 2 files (use-stripe-status.ts, http.ts itself)

**Critical Finding:**
- **Only 2 files need updates** when response format changes (http.ts + use-stripe-status.ts)
- All 28 other components automatically inherit changes from central wrapper

### Agent 3: Analyze Current Response Patterns
**Status:** ✅ Complete

**Findings:**
- **respond.ts EXISTS:** Already has ok(), fail(), handleError() helpers
- **Current Standard:** `{ data: T }` success, `{ error: { code, message, details } }` error
- **Adoption:** 83% of routes use standard helpers
- **Type Definitions:** Success<T> and Failure interfaces exist but not exported

**Risk Areas:**
1. Auth routes (HIGH) - Could break authentication flow
2. Quick-order routes (HIGH) - Could break checkout flow
3. HTTP utilities dependency (HIGH) - 18 components depend on format
4. Mixed pattern routes (MEDIUM) - 25 files need standardization

---

## Files to Change

**Total: 26 files (25 routes + 1 type export)**

**Priority 1 - Auth Routes (6 files):**
- [ ] /src/app/api/auth/login/route.ts
- [ ] /src/app/api/auth/signup/route.ts
- [ ] /src/app/api/auth/me/route.ts
- [ ] /src/app/api/auth/change-password/route.ts
- [ ] /src/app/api/auth/forgot-password/route.ts
- [ ] /src/app/api/auth/logout/route.ts

**Priority 2 - Quick Order Routes (5 files):**
- [ ] /src/app/api/quick-order/upload/route.ts
- [ ] /src/app/api/quick-order/checkout/route.ts
- [ ] /src/app/api/quick-order/price/route.ts
- [ ] /src/app/api/quick-order/slice/route.ts
- [ ] /src/app/api/quick-order/orient/route.ts

**Priority 3 - Admin Routes (4 files):**
- [ ] /src/app/api/admin/clients/route.ts
- [ ] /src/app/api/admin/users/route.ts
- [ ] /src/app/api/admin/users/[id]/route.ts
- [ ] /src/app/api/admin/users/[id]/messages/route.ts

**Priority 4 - Client Routes (3 files):**
- [ ] /src/app/api/client/invoices/route.ts
- [ ] /src/app/api/client/jobs/route.ts
- [ ] /src/app/api/client/preferences/route.ts

**Priority 5 - Message Route (1 file):**
- [ ] /src/app/api/messages/route.ts

**Priority 6 - Other Routes (4 files):**
- [ ] /src/app/api/invoices/[id]/activity/route.ts
- [ ] /src/app/api/invoices/[id]/messages/route.ts
- [ ] /src/app/api/invoices/[id]/files/route.ts
- [ ] /src/app/api/order-files/[id]/route.ts

**Priority 7 - Type Export (1 file):**
- [ ] /src/server/api/respond.ts

**Frontend Verification (2 files):**
- [ ] /src/lib/http.ts
- [ ] /src/hooks/use-stripe-status.ts

---

## Build Status

Last verified: [timestamp]

```bash
npm run typecheck  # ⏳ Pending
npm run build      # ⏳ Pending
npm run lint       # ⏳ Pending
```

---

## Notes & Observations

- Phase 3 focuses on standardizing API response format
- Must update ALL layers: API routes, frontend components, API client functions
- No functionality changes - only response structure standardization
- Pattern from STANDARDS.md: `{ data: T }` for success, `{ error: { code, message, details } }` for errors

---

**Last Updated:** 2025-10-21
**Completed:** No
