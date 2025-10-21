# Phase 7: Validation - Implementation Plan

**Created:** 2025-10-21
**Pattern Reference:** STANDARDS.md Pattern 7

---

## Goal

Achieve 100% compliance with Pattern 7: Validation at API boundary with Zod schemas.

**Current State:**
- 28 routes (51%) have proper Zod validation
- 27 routes (49%) missing or improperly validated
- 4 inline schemas (not centralized)
- 10 routes return 500 instead of 422 for validation errors
- 7 services validate inputs (anti-pattern)

**Target State:**
- 100% of API routes validate inputs with Zod
- All schemas centralized in `/lib/schemas/`
- Consistent 422 error responses with issue details
- Services trust input (no validation in service layer)

---

## Analysis Summary

### Schema Coverage
- ✅ **Complete:** Clients, Invoices, Quotes, Jobs, Materials, Printers, Product Templates, Settings
- ❌ **Missing:** Quick-Order (5 endpoints), Messages (3 endpoints), Attachments (1 endpoint)
- ❌ **Action Endpoints:** 12 endpoints (invoice/quote/job actions)
- ⚠️ **Inline Schemas:** 4 locations (auth, preferences, users)

### Validation Issues
- **10 routes:** Return 500 for validation errors (should be 422)
- **4 routes:** Manual validation instead of Zod
- **2 routes:** No validation at all
- **7 services:** Validate inputs (should trust API routes)

---

## Implementation Steps

### Step 1: Centralize Inline Schemas (4 files)

Move inline schemas to centralized `/lib/schemas/`:

**1.1 Auth Schemas → `/lib/schemas/auth.ts`**
- Add `changePasswordSchema` from `/api/auth/change-password/route.ts:7-10`
- Add `forgotPasswordSchema` from `/api/auth/forgot-password/route.ts:9`

**1.2 User Schemas → Create `/lib/schemas/users.ts`**
- Move `inviteSchema` from `/api/admin/users/route.ts:17-21`

**1.3 Client Preference → `/lib/schemas/clients.ts`**
- Move `preferenceSchema` from `/api/client/preferences/route.ts:12-14`

**Files to Modify:** 4 API routes + 3 schema files
**Estimated Time:** 30 minutes

---

### Step 2: Create Missing Schema Files (3 new files)

**2.1 Create `/lib/schemas/quick-order.ts`**
```typescript
export const quickOrderUploadSchema = z.object({...});
export const quickOrderPriceSchema = z.object({...});
export const quickOrderOrientSchema = z.object({...});
export const quickOrderSliceSchema = z.object({...});
export const quickOrderCheckoutSchema = z.object({...});
```

**2.2 Create `/lib/schemas/messages.ts`**
```typescript
export const messageInputSchema = z.object({
  content: z.string().min(1).max(5000),
  // Additional fields as needed
});
```

**2.3 Create `/lib/schemas/users.ts`** (if not created in Step 1.2)
```typescript
export const userInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'CLIENT']),
  clientId: z.number().optional(),
});
```

**Files to Create:** 3 new schema files
**Estimated Time:** 45 minutes

---

### Step 3: Add Action Schemas (3 files)

Extend existing schema files with action-specific schemas:

**3.1 `/lib/schemas/invoices.ts`**
- `invoiceVoidSchema` - Void invoice with reason
- `invoiceWriteOffSchema` - Write off invoice
- `invoiceRevertSchema` - Revert status
- `invoiceMarkUnpaidSchema` - Mark unpaid with reason
- `invoiceAttachmentSchema` - File attachment metadata

**3.2 `/lib/schemas/quotes.ts`**
- `quoteAcceptSchema` - Accept quote with optional note
- `quoteDeclineSchema` - Decline quote with reason
- `quoteConvertSchema` - Convert to invoice
- `quoteDuplicateSchema` - Duplicate quote
- `quoteSendSchema` - Send email (may be empty)

**3.3 `/lib/schemas/jobs.ts`**
- `jobArchiveSchema` - Archive single job
- `jobBulkArchiveSchema` - Bulk archive jobs

**Files to Modify:** 3 existing schema files
**Estimated Time:** 30 minutes

---

### Step 4: Fix Validation Error Handling (10 files)

Fix routes returning 500 for validation errors:

**Routes to Fix:**
1. `/api/auth/login/route.ts`
2. `/api/auth/signup/route.ts`
3. `/api/auth/forgot-password/route.ts`
4. `/api/jobs/[id]/route.ts`
5. `/api/jobs/[id]/status/route.ts`
6. `/api/jobs/reorder/route.ts`
7. `/api/quotes/[id]/route.ts`
8. `/api/admin/users/[id]/route.ts`
9. `/api/client/preferences/route.ts`
10. `/api/auth/change-password/route.ts`

**Pattern to Apply:**
```typescript
import { ZodError } from "zod";

try {
  const validated = schema.parse(body);
  // ... process
} catch (error) {
  if (error instanceof ZodError) {
    return fail("VALIDATION_ERROR", "Invalid input", 422, {
      issues: error.issues,
    });
  }
  return handleError(error, 'scope');
}
```

**Files to Modify:** 10 API routes
**Estimated Time:** 1 hour

---

### Step 5: Add Validation to Routes (27 files)

Add Zod schemas to routes currently missing validation:

**Batch 1 - Quick Order (5 routes):**
- `/api/quick-order/upload/route.ts`
- `/api/quick-order/price/route.ts`
- `/api/quick-order/orient/route.ts`
- `/api/quick-order/slice/route.ts`
- `/api/quick-order/checkout/route.ts`

**Batch 2 - Messages (3 routes):**
- `/api/messages/route.ts`
- `/api/invoices/[id]/messages/route.ts`
- `/api/admin/users/[id]/messages/route.ts`

**Batch 3 - Invoice Actions (5 routes):**
- `/api/invoices/[id]/mark-unpaid/route.ts`
- `/api/invoices/[id]/void/route.ts`
- `/api/invoices/[id]/write-off/route.ts`
- `/api/invoices/[id]/revert/route.ts`
- `/api/invoices/[id]/attachments/route.ts`

**Batch 4 - Quote Actions (5 routes):**
- `/api/quotes/[id]/accept/route.ts`
- `/api/quotes/[id]/decline/route.ts`
- `/api/quotes/[id]/convert/route.ts`
- `/api/quotes/[id]/send/route.ts`
- `/api/quotes/[id]/duplicate/route.ts`

**Batch 5 - Job Actions (2 routes):**
- `/api/jobs/[id]/archive/route.ts`
- `/api/jobs/archive/route.ts`

**Batch 6 - Settings (1 route):**
- `/api/settings/route.ts` - Use existing `settingsInputSchema`

**Files to Modify:** 21 API routes
**Estimated Time:** 2 hours

---

### Step 6: Remove Service Layer Validation (7 files)

Move validation from services to API routes:

**6.1 `/server/services/settings.ts`**
- Remove lines 72-84: `shippingRegionSchema.safeParse()`
- Remove lines 91-103: `paymentTermSchema.safeParse()`
- Remove line 117: `calculatorConfigSchema.parse()`
- Remove line 190: `settingsInputSchema.parse()`
- Move these validations to `/api/settings/route.ts`

**6.2 `/server/services/product-templates.ts`**
- Remove lines 41-51: `validateBusinessRules()` function
- Remove line 57: `productCalculatorSchema.parse()`
- Move to `/api/product-templates/route.ts`

**6.3 `/server/services/clients.ts`**
- Remove lines 15-39: `normalizePaymentTermsCode()` validation
- Move to `/api/clients/route.ts` and related routes

**6.4 `/server/services/materials.ts`**
- Remove line 199: Reference check validation
- Move to DELETE `/api/materials/[id]/route.ts`

**6.5 `/server/services/invoices.ts`**
- Remove line 660: `validateInvoiceAttachment()` call
- Move to `/api/invoices/[id]/attachments/route.ts`

**6.6 `/server/services/jobs.ts`**
- Remove lines 98-108: Printer status validation
- Move to `/api/jobs/[id]/route.ts`

**6.7 `/server/services/auth.ts`**
- Remove lines 62-64: Email existence check
- Remove lines 155-164: `validatePasswordChange()` call
- Move to respective API routes

**Files to Modify:** 7 service files + their corresponding API routes
**Estimated Time:** 2 hours

---

## Risk Assessment

### Low Risk
- Step 1: Centralizing schemas (no logic change)
- Step 2: Creating new schemas (additive)
- Step 3: Adding action schemas (additive)

### Medium Risk
- Step 4: Fixing error handling (changes error responses)
- Step 5: Adding validation (could reject previously accepted payloads)

### High Risk
- Step 6: Removing service validation (must ensure API routes validate first)

---

## Testing Strategy

**After Each Step:**
1. Run `npm run typecheck` to verify no type errors
2. Test affected API routes manually or with existing tests
3. Verify error responses match expected format

**After Step 4:**
- Verify validation errors return 422 (not 500)
- Verify `issues` array is included in response

**After Step 5:**
- Test each route with invalid payloads
- Verify proper validation error responses

**After Step 6:**
- Verify services still function correctly
- Ensure API routes now perform all validation
- No validation logic should remain in services

---

## Success Criteria

- ✅ All schemas centralized in `/lib/schemas/` (0 inline schemas)
- ✅ 100% of POST/PUT/PATCH routes validate with Zod
- ✅ All validation errors return 422 with issue details
- ✅ 0 services validate inputs (trust API boundary)
- ✅ Build passes with no type errors
- ✅ All routes tested with invalid payloads

---

## Estimated Timeline

| Step | Task | Time | Risk |
|------|------|------|------|
| 1 | Centralize inline schemas | 30min | Low |
| 2 | Create missing schema files | 45min | Low |
| 3 | Add action schemas | 30min | Low |
| 4 | Fix error handling | 1hr | Medium |
| 5 | Add validation to routes | 2hr | Medium |
| 6 | Remove service validation | 2hr | High |
| **Total** | | **6.75hr** | |

---

## Files Summary

**New Files (3):**
- `/src/lib/schemas/quick-order.ts`
- `/src/lib/schemas/messages.ts`
- `/src/lib/schemas/users.ts`

**Modified Schema Files (3):**
- `/src/lib/schemas/auth.ts`
- `/src/lib/schemas/invoices.ts`
- `/src/lib/schemas/quotes.ts`
- `/src/lib/schemas/jobs.ts`
- `/src/lib/schemas/clients.ts`

**Modified API Routes (~35 files):**
- 4 routes: Centralize inline schemas
- 10 routes: Fix error handling
- 21 routes: Add validation
- ~7 routes: Accept validation moved from services

**Modified Services (7):**
- All service validation removed

**Total Files Changed:** ~50 files
