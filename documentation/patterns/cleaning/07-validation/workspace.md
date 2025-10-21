# Phase 7: Validation

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

Step 1: Centralize inline schemas to /lib/schemas/

---

## Implementation Progress

### Step 1: Centralize Inline Schemas (4 files)
- [ ] Add `changePasswordSchema` and `forgotPasswordSchema` to `/lib/schemas/auth.ts`
- [ ] Create `/lib/schemas/users.ts` with `userInviteSchema`
- [ ] Add `clientPreferenceSchema` to `/lib/schemas/clients.ts`
- [ ] Update `/api/auth/change-password/route.ts` to use centralized schema
- [ ] Update `/api/auth/forgot-password/route.ts` to use centralized schema
- [ ] Update `/api/admin/users/route.ts` to use centralized schema
- [ ] Update `/api/client/preferences/route.ts` to use centralized schema

### Step 2: Create Missing Schema Files (3 files)
- [ ] Create `/lib/schemas/quick-order.ts` with 5 schemas
- [ ] Create `/lib/schemas/messages.ts` with message schema
- [ ] Ensure `/lib/schemas/users.ts` exists (from Step 1)

### Step 3: Add Action Schemas (3 files)
- [ ] Add 5 action schemas to `/lib/schemas/invoices.ts`
- [ ] Add 5 action schemas to `/lib/schemas/quotes.ts`
- [ ] Add 2 action schemas to `/lib/schemas/jobs.ts`

### Step 4: Fix Validation Error Handling (10 files)
- [ ] `/api/auth/login/route.ts`
- [ ] `/api/auth/signup/route.ts`
- [ ] `/api/auth/forgot-password/route.ts`
- [ ] `/api/jobs/[id]/route.ts`
- [ ] `/api/jobs/[id]/status/route.ts`
- [ ] `/api/jobs/reorder/route.ts`
- [ ] `/api/quotes/[id]/route.ts`
- [ ] `/api/admin/users/[id]/route.ts`
- [ ] `/api/client/preferences/route.ts`
- [ ] `/api/auth/change-password/route.ts`

### Step 5: Add Validation to Routes (21 files)

**Batch 1 - Quick Order:**
- [ ] `/api/quick-order/upload/route.ts`
- [ ] `/api/quick-order/price/route.ts`
- [ ] `/api/quick-order/orient/route.ts`
- [ ] `/api/quick-order/slice/route.ts`
- [ ] `/api/quick-order/checkout/route.ts`

**Batch 2 - Messages:**
- [ ] `/api/messages/route.ts`
- [ ] `/api/invoices/[id]/messages/route.ts`
- [ ] `/api/admin/users/[id]/messages/route.ts`

**Batch 3 - Invoice Actions:**
- [ ] `/api/invoices/[id]/mark-unpaid/route.ts`
- [ ] `/api/invoices/[id]/void/route.ts`
- [ ] `/api/invoices/[id]/write-off/route.ts`
- [ ] `/api/invoices/[id]/revert/route.ts`
- [ ] `/api/invoices/[id]/attachments/route.ts`

**Batch 4 - Quote Actions:**
- [ ] `/api/quotes/[id]/accept/route.ts`
- [ ] `/api/quotes/[id]/decline/route.ts`
- [ ] `/api/quotes/[id]/convert/route.ts`
- [ ] `/api/quotes/[id]/send/route.ts`
- [ ] `/api/quotes/[id]/duplicate/route.ts`

**Batch 5 - Job Actions:**
- [ ] `/api/jobs/[id]/archive/route.ts`
- [ ] `/api/jobs/archive/route.ts`

**Batch 6 - Settings:**
- [ ] `/api/settings/route.ts`

### Step 6: Remove Service Layer Validation (7 files)
- [ ] `/server/services/settings.ts` - Remove 4 validation calls
- [ ] `/server/services/product-templates.ts` - Remove validateBusinessRules + parse
- [ ] `/server/services/clients.ts` - Remove normalizePaymentTermsCode validation
- [ ] `/server/services/materials.ts` - Remove reference check
- [ ] `/server/services/invoices.ts` - Remove validateInvoiceAttachment
- [ ] `/server/services/jobs.ts` - Remove printer status validation
- [ ] `/server/services/auth.ts` - Remove email/password validation

---

## Explore Agent Findings

### Finding 1: Schema Coverage
**Status:** ✅ Complete

**Current Coverage:**
- 7 schema files in `/lib/schemas/`
- 38 total schemas defined
- Resources covered: auth, clients, invoices, quotes, jobs, materials, printers, product-templates, settings

**Gaps:**
- 4 inline schemas (not centralized)
- 27 routes missing validation (49%)
- Missing: quick-order, messages, users, action endpoints

### Finding 2: Validation Patterns
**Status:** ✅ Complete

**Current State:**
- 20 routes (56%) - Proper Zod + error handling
- 10 routes (28%) - Zod but returns 500 errors
- 4 routes (11%) - Manual validation
- 2 routes (6%) - No validation

**Issue:** 10 routes use `.parse()` but catch with generic `handleError()`, returning 500 instead of 422

### Finding 3: Service Layer Anti-Patterns
**Status:** ✅ Complete

**Violations Found:** 7 services with 14 validation anti-patterns
- settings.ts: 4 Zod schema parsing calls (CRITICAL)
- product-templates.ts: Business rules + Zod (HIGH)
- clients.ts: Payment terms validation (HIGH)
- materials.ts, invoices.ts, jobs.ts, auth.ts: Various validations (MEDIUM)

**Problem:** Services validate inputs instead of trusting API routes

### Finding 4: Error Handling Consistency
**Status:** ✅ Complete

**Current State:**
- 16/24 routes (67%) properly catch ZodError with 422
- 23/24 routes (96%) use correct 422 status
- 16/24 routes (67%) include issue details
- 8 routes need fixes

**Good Examples:** clients, materials, printers, quotes, invoices (CRUD routes)

### Finding 5: Schema Gaps
**Status:** ✅ Complete

**Missing Schemas:**
- Quick-Order: 5 endpoints (upload, price, orient, slice, checkout)
- Messages: 3 endpoints (all message creation)
- Action Endpoints: 12+ endpoints (invoice/quote/job actions)
- Attachments: 1 endpoint (file metadata)

**Partial Coverage:**
- Settings schema exists but route doesn't use it

---

## Build Status

Last verified: Pending

```bash
npm run typecheck  # ⏳ Pending
npm run build      # ⏳ Pending
```

---

## Notes & Observations

- Phase 7 focuses on standardizing validation patterns across all API routes
- Core CRUD operations already have good validation (51% coverage)
- Main gaps are in supporting features: quick-order, messages, action endpoints
- 7 services violate the "trust input" pattern and need validation moved to API routes
- Total estimated effort: 6.75 hours across 6 steps
- ~50 files will be modified

---

**Last Updated:** 2025-10-21
**Completed:** No
