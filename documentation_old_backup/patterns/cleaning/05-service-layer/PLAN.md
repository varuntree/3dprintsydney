# Phase 5: Service Layer - Implementation Plan

**Created:** 2025-10-21
**Status:** Ready for Execution

---

## Executive Summary

Phase 5 will standardize the service layer to fully comply with STANDARDS.md Pattern 2. Current compliance is 79.6%. The main issues are:
1. **Schema validation in services** (12 services) - Should trust API validation
2. **Missing documentation** (15 services) - Need JSDoc comments
3. **Missing logging** (5 services) - Need structured logging
4. **Business logic in routes** (24 routes) - Should be in services

**Scope:** MEDIUM-HIGH (41+ files to update)
**Risk Level:** MEDIUM (touches critical flows but no breaking changes)
**Estimated Duration:** 4-6 hours

---

## Analysis Summary

### From 3 Explore Agents:

**Agent 1 (Service Files):**
- 19 total service files
- 127 exported functions
- All follow naming conventions ✅
- Clean cross-service dependencies (no circular deps) ✅

**Agent 2 (Service Patterns):**
- Overall compliance: 79.6%
- **GOOD:** 100% use getServiceSupabase(), typed errors, no HTTP concerns
- **NEEDS WORK:**
  - 79% missing JSDoc
  - 63% parse schemas (anti-pattern)
  - 26% missing logger

**Agent 3 (Business Logic in Routes):**
- 24 API routes contain business logic
- 7 HIGH severity (complex workflows)
- 14 MEDIUM severity (calculations, rules)
- 3 LOW severity (formatting)

---

## Goals & Success Criteria

### Goals:
1. ✅ Remove all schema parsing from services
2. ✅ Add JSDoc to all service functions
3. ✅ Add logger to all services
4. ✅ Extract business logic from API routes to services
5. ✅ Maintain 100% build success
6. ✅ No functionality changes

### Success Criteria:
- [ ] All services follow STANDARDS.md Pattern 2 (100% compliance)
- [ ] Zero schema `.parse()` calls in services
- [ ] 100% of service functions have JSDoc
- [ ] 100% of services use logger for important operations
- [ ] All business logic in services, not routes
- [ ] Build passes with zero TypeScript errors
- [ ] Review agent approval

---

## Implementation Strategy

### Conservative Approach:

We'll tackle this in **3 sequential streams** to minimize risk:

**Stream 1: Remove Schema Parsing (CRITICAL)**
- Move validation from services to API routes
- Affects 12 services + their corresponding API routes
- Verify build after each service

**Stream 2: Add Documentation & Logging**
- Add JSDoc to 15 services
- Add logger to 5 services
- Low risk, high value for maintainability

**Stream 3: Extract Business Logic from Routes**
- Create new service functions for complex workflows
- Extract calculations and rules to utilities
- Requires creating new functions, higher complexity

**Ordering Rationale:**
- Stream 1 fixes architectural anti-pattern (highest priority)
- Stream 2 improves code quality without changing behavior (safe)
- Stream 3 extracts logic (most complex, saved for last)

---

## Stream 1: Remove Schema Parsing from Services

### Problem:
Services currently validate input using Zod `.parse()`. Per STANDARDS.md Pattern 2, services should **trust that validation already happened** at the API boundary.

### Solution:
1. Move `.parse()` calls from service to API route
2. Pass typed objects to services
3. Remove schema imports from services

### Files to Change (24 total):

#### Batch 1 - Simple CRUD Services (Low Risk)

**1. materials.ts + API routes** (15 min)
- Service: Remove `materialInputSchema.parse()` at line 103
- Route: Add parse before calling `createMaterial()` and `updateMaterial()`
- Risk: LOW

**2. printers.ts + API routes** (15 min)
- Service: Remove `printerInputSchema.parse()` at line 99
- Route: Add parse before calling service
- Risk: LOW

**3. product-templates.ts + API routes** (15 min)
- Service: Remove `productTemplateInputSchema.parse()` at line 138
- Route: Add parse before calling service
- Risk: LOW

#### Batch 2 - Client Management (Medium Risk)

**4. clients.ts + API routes** (20 min)
- Service: Remove `clientInputSchema.parse()` at lines 140, 181
- Service: Remove `clientNoteSchema.parse()`
- Routes: Update create/update/note routes
- Risk: MEDIUM (client creation is critical)

#### Batch 3 - Complex Services (High Risk)

**5. invoices.ts + API routes** (30 min)
- Service: Remove `invoiceInputSchema.parse()` at line 370
- Service: Remove `paymentInputSchema.parse()`
- Routes: Update all invoice CRUD routes
- Risk: HIGH (invoice operations are critical)
- **Test manually after changes**

**6. quotes.ts + API routes** (30 min)
- Service: Remove `quoteInputSchema.parse()` at line 297
- Routes: Update all quote CRUD routes
- Risk: HIGH (quote → invoice conversion is critical)
- **Test manually after changes**

### Implementation Order:
1. Batch 1 (materials, printers, product-templates) - 45 min
2. Verify build ✅
3. Batch 2 (clients) - 20 min
4. Verify build ✅
5. Batch 3 (invoices, quotes) - 60 min
6. Verify build ✅
7. **Total Stream 1:** ~2 hours

---

## Stream 2: Add Documentation & Logging

### Part A: Add JSDoc to Services (15 services)

**Pattern from STANDARDS.md:**
```typescript
/**
 * Get a single client by ID
 * @param id - Client ID
 * @returns Client details
 * @throws NotFoundError if client doesn't exist
 */
export async function getClient(id: number): Promise<ClientDTO> {
  // ...
}
```

**Implementation Order** (alphabetically for consistency):

1. **clients.ts** - 8 functions (20 min)
2. **dashboard.ts** - 3 functions (10 min)
3. **exports.ts** - 6 functions (15 min)
4. **invoices.ts** - 18 functions (40 min)
5. **jobs.ts** - 10 functions (25 min)
6. **maintenance.ts** - 1 function (5 min)
7. **materials.ts** - 4 functions (10 min)
8. **numbering.ts** - 1 function (5 min)
9. **order-files.ts** - 7 functions (20 min)
10. **printers.ts** - 4 functions (10 min)
11. **product-templates.ts** - 4 functions (10 min)
12. **quick-order.ts** - 1 function (5 min)
13. **quotes.ts** - 12 functions (30 min)
14. **settings.ts** - 3 functions (10 min)
15. **stripe.ts** - 3 functions (10 min)

**Total:** ~225 min (~3.75 hours)

**Strategy:** Can be done incrementally between other tasks

### Part B: Add Logger to Services (5 services)

**Pattern from STANDARDS.md:**
```typescript
import { logger } from '@/lib/logger';

logger.info({
  scope: 'clients.create',
  message: 'Creating new client',
  data: { name: input.name }
});
```

**Files to Update:**

1. **exports.ts** - Add logging to export operations
   - Log scope: `exports.invoices`, `exports.payments`, etc.
   - Log when export starts and completes

2. **dashboard.ts** - Add logging to data fetches
   - Log scope: `dashboard.snapshot`, `dashboard.activity`
   - Log data range and filters used

3. **numbering.ts** - Add logging to document number generation
   - Log scope: `numbering.generate`
   - Log document type and generated number

4. **order-files.ts** - Add logging to file operations
   - Log scope: `orderFiles.save`, `orderFiles.delete`
   - Log file IDs and operations

5. **tmp-files.ts** - Add logging to temp file operations
   - Log scope: `tmpFiles.save`, `tmpFiles.delete`
   - Log file metadata

**Total:** ~30 min for all 5 services

**Verification:** Check logs are written during manual testing

---

## Stream 3: Extract Business Logic from API Routes

### HIGH Priority Routes (7 routes - Complex Workflows)

#### 1. quick-order/checkout/route.ts (45 min - CRITICAL)

**Current Issues:**
- Invoice line building (data transformation)
- File processing loop (workflow)
- Stripe integration inline

**Extraction Plan:**
1. Create `quick-order.ts` service function: `createQuickOrderInvoice()`
   ```typescript
   export async function createQuickOrderInvoice(
     items: QuickOrderItem[],
     userId: number,
     clientId: number
   ): Promise<{ invoice: InvoiceDetailDTO; stripeSession: StripeSession }> {
     // Build lines
     // Create invoice
     // Process files
     // Create stripe session
     // Return combined result
   }
   ```

2. Create helper: `buildQuickOrderLines(items, priced)`
3. Create helper: `processQuickOrderFiles(items, invoice, user)`
4. Update route to call single service function

**Risk:** HIGH (checkout flow is revenue-critical)
**Testing:** Full checkout flow manual test required

#### 2. quick-order/slice/route.ts (45 min - COMPLEX)

**Current Issues:**
- Retry logic with fallback
- Complex workflow coordination
- File processing

**Extraction Plan:**
1. Create `quick-order.ts` function: `sliceQuickOrderFile()`
   ```typescript
   export async function sliceQuickOrderFile(
     fileId: string,
     settings: SlicingSettings
   ): Promise<SlicingResult> {
     // Retry logic
     // Fallback metrics
     // Gcode processing
     // Return result
   }
   ```

2. Create helper: `executeSlicingWithRetry()`
3. Create helper: `generateFallbackMetrics()`
4. Update route to call service function

**Risk:** HIGH (file processing is core functionality)

#### 3-5. Auth Routes (3 routes - 30 min each)

**Routes:** login, signup, change-password

**Extraction Plan:**
1. Enhance `auth.ts` service with:
   - `handleLogin(email, password)`
   - `handleSignup(userData)`
   - `changePassword(userId, currentPassword, newPassword)`

2. Create `auth-utils.ts` for cookie management:
   - `calculateCookieExpiration(session)`
   - `buildAuthCookies(session)`

3. Update routes to call service functions

**Risk:** HIGH (auth is critical)
**Testing:** Full auth flow manual test required

#### 6. invoices/[id]/attachments/route.ts (20 min)

**Extraction Plan:**
1. Create `invoices.ts` function: `uploadInvoiceAttachment()`
2. Create helper: `validateAttachmentFile()`
3. Move validation constants to service
4. Update route

**Risk:** MEDIUM

#### 7. quick-order/orient/route.ts (15 min)

**Extraction Plan:**
1. Create `quick-order.ts` function: `processOrientedFile()`
2. Update route

**Risk:** LOW

### MEDIUM Priority Routes (14 routes - Business Rules)

Most can be handled with simple utility extraction:

1. **Create utilities file** `/src/lib/utils/api-params.ts`:
   - `parsePaginationParams(searchParams)`
   - `parseNumericId(id)`
   - `parseJobIds(ids)`
   - `calculateDateWindow(window)`

2. **Create utilities file** `/src/lib/utils/validators.ts`:
   - `validatePasswordChange(current, new)`
   - `validateFileSize(size, max)`
   - `validateFileType(type, allowed)`

3. **Update routes** to use utilities (5 min each)

**Total:** ~2 hours for utilities + route updates

### LOW Priority Routes (3 routes - Formatting)

**Decision:** Keep as-is or include in utilities
**Risk:** NEGLIGIBLE

**Total Stream 3:** ~6 hours

---

## Implementation Order (All Streams)

### Week 1 - Days 1-2: Stream 1 (Remove Schema Parsing)

**Day 1 Morning:**
- Batch 1: materials, printers, product-templates (45 min)
- Verify build
- Commit

**Day 1 Afternoon:**
- Batch 2: clients (20 min)
- Verify build
- Commit

**Day 2 Morning:**
- Batch 3: invoices (30 min)
- Verify build
- Test invoice operations manually
- Commit

**Day 2 Afternoon:**
- Batch 3: quotes (30 min)
- Verify build
- Test quote operations manually
- Commit

### Week 1 - Days 3-4: Stream 2 (Documentation & Logging)

**Day 3:**
- Add JSDoc to 8 services (clients through jobs) - 2.5 hours
- Verify build after each service
- Commit incrementally

**Day 4:**
- Add JSDoc to 7 services (maintenance through stripe) - 1.5 hours
- Add logger to 5 services - 30 min
- Verify build
- Commit

### Week 2 - Day 5-7: Stream 3 (Extract Business Logic)

**Day 5:**
- Extract quick-order checkout workflow (45 min)
- Extract quick-order slice workflow (45 min)
- Test quick order flow manually
- Verify build
- Commit

**Day 6:**
- Extract auth workflows (3 routes × 30 min = 90 min)
- Test auth flow manually
- Verify build
- Commit

**Day 7:**
- Create API utilities (parsers, validators) - 2 hours
- Extract remaining business logic from routes - 2 hours
- Verify build
- Commit

### Final Day: Review & Verification

- Run full build verification
- Deploy review agent
- Fix any issues found
- Final commit

---

## Risk Assessment

### HIGH RISK Areas:

1. **Schema Parsing Removal in invoices/quotes**
   - Impact: Could break invoice/quote creation
   - Mitigation: Manual testing of create/update flows
   - Rollback: Per-service commits allow granular rollback

2. **Quick Order Checkout Extraction**
   - Impact: Could break checkout flow (revenue)
   - Mitigation: Comprehensive manual testing
   - Rollback: Keep original logic in comments initially

3. **Auth Route Extraction**
   - Impact: Could break login/signup
   - Mitigation: Test all auth flows manually
   - Rollback: Auth service already handles most logic

### MEDIUM RISK Areas:

1. **Adding JSDoc** - Could have typos in types
   - Mitigation: TypeScript will catch type errors

2. **Adding Logger** - Could add performance overhead
   - Mitigation: Logger is already used elsewhere, proven

### LOW RISK Areas:

1. **Schema parsing removal in CRUD services** - Simple pattern
2. **Utility function extraction** - Pure functions, easy to test

---

## Testing Strategy

### After Each Service (Stream 1):
```bash
npm run typecheck
npm run build
```

### After Each Batch:
- Manual testing of affected operations
- Verify API responses unchanged

### Before Final Commit:
```bash
# Full clean build
rm -rf .next
npm run build

# Start dev server
npm run dev
```

### Manual Testing Checklist:
- [ ] Client create/update works
- [ ] Material create/update works
- [ ] Printer create/update works
- [ ] Invoice create/update/payment works
- [ ] Quote create/update/convert works
- [ ] Quick order checkout works
- [ ] Quick order slicing works
- [ ] Login works
- [ ] Signup works
- [ ] Password change works
- [ ] File attachments work

---

## Success Metrics

### Quantitative:
- **Services updated:** 19/19 (100%)
- **Schema parsing removed:** 12 services
- **JSDoc added:** 127 functions across 15 services
- **Logger added:** 5 services
- **Business logic extracted:** 24 routes
- **Build errors:** 0
- **Pattern compliance:** 79.6% → 100%

### Qualitative:
- ✅ All services trust API validation
- ✅ All service functions documented
- ✅ All services log important operations
- ✅ Business logic centralized in services
- ✅ API routes thin and focused on HTTP concerns
- ✅ Improved maintainability and readability

---

## Rollback Plan

If issues arise:

1. **Immediate Rollback:**
   ```bash
   git reset --hard [last-working-commit]
   ```

2. **Partial Rollback:**
   - Each stream is separate commits
   - Each batch within stream is separate commit
   - Can rollback specific portions

3. **Forward Fix:**
   - Document issue in workspace.md
   - Fix in place
   - Re-verify

---

## Commit Strategy

**Granular commits for safety:**

```bash
# Stream 1
git commit -m "Phase 5: Remove schema parsing from materials, printers, product-templates"
git commit -m "Phase 5: Remove schema parsing from clients service"
git commit -m "Phase 5: Remove schema parsing from invoices service"
git commit -m "Phase 5: Remove schema parsing from quotes service"

# Stream 2
git commit -m "Phase 5: Add JSDoc to services batch 1 (clients-jobs)"
git commit -m "Phase 5: Add JSDoc to services batch 2 (maintenance-stripe)"
git commit -m "Phase 5: Add logger to exports, dashboard, numbering, order-files, tmp-files"

# Stream 3
git commit -m "Phase 5: Extract quick-order business logic to services"
git commit -m "Phase 5: Extract auth workflows to services"
git commit -m "Phase 5: Create API utilities and extract remaining business logic"

# Final
git commit -m "Phase 5 Complete: Service layer standardization"
```

---

## Notes for Implementation

1. **Keep original code in comments** during Stream 3 initially
2. **Test critical flows manually** (checkout, auth, invoice operations)
3. **Verify build after each service** in Stream 1
4. **Document any deviations** from plan in workspace.md
5. **Update workspace.md** after each batch completion
6. **Don't skip testing** for HIGH risk areas

---

## Estimated Timeline

| Stream | Task | Duration | Cumulative |
|--------|------|----------|------------|
| 1 | Remove schema parsing (Batch 1) | 45 min | 45 min |
| 1 | Remove schema parsing (Batch 2) | 20 min | 65 min |
| 1 | Remove schema parsing (Batch 3) | 60 min | 125 min |
| **Stream 1 Total** | | **2 hours** | |
| 2 | Add JSDoc (8 services) | 150 min | 275 min |
| 2 | Add JSDoc (7 services) | 90 min | 365 min |
| 2 | Add logger (5 services) | 30 min | 395 min |
| **Stream 2 Total** | | **4.5 hours** | |
| 3 | Quick order extraction | 90 min | 485 min |
| 3 | Auth extraction | 90 min | 575 min |
| 3 | Utilities + routes | 240 min | 815 min |
| **Stream 3 Total** | | **7 hours** | |
| Final | Review & verification | 60 min | 875 min |
| **GRAND TOTAL** | | **14.5 hours** | |

**Note:** Timeline assumes sequential execution. JSDoc can be done incrementally in parallel with other work.

---

**Ready to Execute:** Yes ✅
**Last Updated:** 2025-10-21
