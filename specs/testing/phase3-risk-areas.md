# Phase 3: High-Risk Areas Analysis

**Date:** 2025-11-12  
**Framework:** Vitest 4.0.8  
**Codebase Coverage:** ~16,052 LOC analyzed  
**Risk Assessment Depth:** Very thorough

---

## Executive Summary

High-risk areas identified across **financial transactions, security boundaries, complex calculations, and data integrity**. Current coverage: **~1.1%**. Prioritized testing on 5 critical domains yields 80% risk mitigation in 2-3 weeks.

**Identified High-Risk Issues:**
- **CRITICAL:** Multi-step mutations without transactions (invoices, credits, quotes)
- **CRITICAL:** Stripe webhook idempotency gaps (duplicate processing possible)
- **HIGH:** Missing RLS policy enforcement testing
- **HIGH:** Complex pricing calculation with multiple dependencies
- **HIGH:** File operations without cleanup verification
- **HIGH:** Race conditions in concurrent job/invoice updates

---

## 1. FINANCIAL & PAYMENT RISKS

### 1.1 Stripe Payment Processing

**Location:** `src/server/services/stripe.ts`, `src/app/api/stripe/webhook/route.ts`

**Risk Level:** CRITICAL

**Components Affected:**
- Checkout session creation: `createStripeCheckoutSession()`
- Webhook processing: `handleStripeEvent()`
- Invoice payment marking: `markInvoicePaid()`

**Severity Breakdown:**

| Risk | Impact | Likelihood | Details |
|------|--------|-----------|---------|
| Duplicate payment processing | Financial loss | MEDIUM | Webhook idempotency relies on `webhook_events` table check, but entry may not be recorded if insert fails |
| Session creation without DB persist | Orphaned sessions | LOW | Stripe session created, DB update fails → unreachable payment link |
| Signature validation bypass | Fraudulent webhooks | LOW | Signature validation only if `webhookSecret` configured; fallback allows any JSON |
| Payment without activity log | Audit gap | MEDIUM | Activity logs are non-blocking; incomplete audit trail possible |

**Affected Code Flow:**
```typescript
// Risk: Steps 4-7 not atomic
1. Check webhook idempotency
2. Mark invoice as PAID
3. Clear stripe session fields
4. Create activity log (non-blocking) ← May fail
5. Update invoice payment fields
6. Record webhook event ← May fail
7. Client not notified if email async fails
```

**Test Coverage Gaps:**
- [ ] Duplicate webhook event handling (idempotency)
- [ ] Missing webhook event record scenario
- [ ] Webhook signature verification with invalid signature
- [ ] Stripe session without secret validation
- [ ] Payment marked without activity log

**Mitigation Strategies:**
1. Record webhook event BEFORE processing (ensure idempotency marker exists first)
2. Wrap payment marking + activity log in database transaction
3. Validate Stripe webhook secret is configured in production
4. Test retry scenarios with exponential backoff for failures

---

### 1.2 Invoice Payment Marking & Credit Application

**Location:** `src/server/services/invoices.ts`, `src/server/services/credits.ts`

**Risk Level:** CRITICAL

**Components Affected:**
- `markInvoicePaid()` - Status change + metadata update
- `applyCredit()` - Deduct wallet + update invoice balance
- `addClientCredit()` - Uses RPC with row locking

**Severity Breakdown:**

| Risk | Impact | Likelihood | Details |
|------|--------|-----------|---------|
| Race condition: concurrent mark-paid | Duplicate payment recorded | MEDIUM | No row locking on invoices table; two requests may both mark as paid |
| Partial credit application | Balance discrepancy | LOW | Credit deducted but invoice not updated (email fails non-blocking) |
| Negative balance possible | Audit mismatch | LOW | `deductClientCredit()` enforces minimum via RPC but race condition on concurrent ops |
| Orphaned credit transactions | Ledger imbalance | MEDIUM | Credit transaction inserted but invoice status not updated; state inconsistency |
| Missing payment method validation | Data integrity | LOW | Payment method stored without validation; invalid enums possible |

**Affected Code Flow:**
```typescript
// markInvoicePaid()
1. Update invoice.status → PAID
2. Update invoice with payment metadata
3. Clear stripe session fields
4. Create activity log ← May fail silently

// applyCredit()
1. Fetch client + invoice
2. Call RPC deduct_client_credit()
3. Update invoice.balance_due
4. May auto-mark PAID
5. Send email notification ← May fail
```

**Critical Gap - No Transactions:**
- Multiple sequential update() calls without transaction wrapping
- Between steps, client may see inconsistent state
- Concurrent requests may corrupt invoice status

**Test Coverage Gaps:**
- [ ] Concurrent payment marking (race condition)
- [ ] Invalid payment method enum handling
- [ ] Credit deduction with insufficient balance
- [ ] Partial credit application + email failure
- [ ] Mark-paid with orphaned activity log
- [ ] Negative balance enforcement via RPC

**Mitigation Strategies:**
1. Wrap payment marking in Supabase transaction (if available) or use optimistic locking
2. Test RPC `deduct_client_credit()` insufficient balance check
3. Verify idempotency: marking PAID invoice again returns success, no double-charge
4. Add payment method enum validation before insert
5. Mock concurrent mark-paid requests to verify race condition handling

---

### 1.3 Invoice Calculations & Line Items

**Location:** `src/lib/calculations.ts`, `src/server/services/invoices.ts`

**Risk Level:** HIGH

**Severity Breakdown:**

| Risk | Impact | Likelihood | Details |
|------|--------|-----------|---------|
| Discount type/value mismatch | Incorrect total | MEDIUM | PERCENT vs FIXED applied incorrectly; negative totals possible |
| Tax calculated on wrong base | Tax underbilled/overbilled | MEDIUM | Tax applied after discount + shipping; order matters |
| Line item total precision loss | Rounding errors accumulate | LOW | Math.max(0, value) prevents negative but rounding cascades |
| Shipping cost not validated | Phantom charges | LOW | No maximum check on shipping cost; accepts any positive value |

**Calculation Order (From `calculateDocumentTotals`):**
```
1. Subtotal = sum of line totals
2. Apply document discount (PERCENT or FIXED)
3. Add shipping
4. Calculate tax on (discounted + shipping)
5. Final total = discounted + shipping + tax
```

**Risk:** Tax base calculation with shipping may not match business logic expectations.

**Test Coverage Gaps:**
- [ ] PERCENT discount edge cases (99% off, 0%, 101%)
- [ ] FIXED discount > subtotal (results in negative)
- [ ] Tax rate 0%, 10%, 100%
- [ ] Shipping + discount + tax combinations
- [ ] Floating point precision (rounds to 2 decimals)
- [ ] Negative line totals enforcement

**Mitigation Strategies:**
1. Test all discount type permutations (NONE, PERCENT, FIXED)
2. Validate shipping cost has reasonable bounds
3. Test rounding consistency across calculations
4. Document tax calculation order explicitly

---

## 2. SECURITY & AUTHORIZATION RISKS

### 2.1 Invoice Access Control

**Location:** `src/server/auth/permissions.ts`, API routes

**Risk Level:** CRITICAL

**Components Affected:**
- `requireInvoiceAccess()` - Checks admin OR invoice owner
- `requireAttachmentAccess()` - Transitively checks invoice access

**Severity Breakdown:**

| Risk | Impact | Likelihood | Details |
|------|--------|-----------|---------|
| Unbound invoice list (client access) | Data disclosure | MEDIUM | Client can fetch all invoices via generic list endpoint if RLS missing |
| Missing RLS policy enforcement | Bypass authorization | HIGH | RLS policies exist but not tested; database layer may allow anon/wrong user |
| Admin role bypass | Full system access | LOW | Role check only compares string "ADMIN"; no refresh of user context |
| Invoice owner verification skipped | Wrong client accesses data | MEDIUM | If `user.clientId` undefined, check `user.clientId === invoice.client_id` fails silently |
| Attachment access transitive (untested) | Cascade bypass | MEDIUM | `requireAttachmentAccess()` calls `requireInvoiceAccess()` but chain not verified |

**Auth Check Flow:**
```typescript
// requireInvoiceAccess()
if (user.role === "ADMIN") return ✓
if (user.clientId && invoice.client_id === user.clientId) return ✓
throw ForbiddenError
```

**Gap:** If `user.clientId` is null/undefined, second check silently fails and error is thrown. No explicit null check.

**Test Coverage Gaps:**
- [ ] Client with null clientId accessing own invoice (should fail)
- [ ] Client accessing admin user's invoice
- [ ] Admin accessing client invoice (should succeed)
- [ ] RLS policy enforcement: anon user querying invoices (should fail at DB)
- [ ] Non-existent invoice (404 vs 403 distinction)
- [ ] Concurrent auth checks (session invalidation)

**Mitigation Strategies:**
1. Test RLS policies directly: execute queries as anon, authenticated, service_role
2. Verify user.clientId is always defined for CLIENT role users
3. Test invoice list endpoint returns only client's own invoices (RLS enforcement)
4. Verify admin users can access any invoice
5. Test attachment access transitively through invoice

---

### 2.2 API Route Authorization Guards

**Location:** All `src/app/api/**/*.ts` routes

**Risk Level:** HIGH

**Analysis:**
- `requireAdmin()` used for admin-only endpoints (good)
- `requireAuth()` used for authenticated endpoints (good)
- `requireInvoiceAccess()` used inconsistently:
  - **Used in:** mark-paid, apply-credit, stripe-session, attachments
  - **NOT used in:** activity endpoint, messages, payment list (potential issue)

**Unguarded Routes (Potential Issues):**
| Route | Endpoint | Risk | Guard |
|-------|----------|------|-------|
| `/api/invoices/[id]/activity` | GET activity logs | Medium | requireAuth only? |
| `/api/invoices/[id]/messages` | GET/POST messages | Medium | requireAuth only? |
| `/api/invoices/[id]/payments` | GET/POST payments | Medium | requireAuth only? |

**Test Coverage Gaps:**
- [ ] Verify ALL invoice endpoints use `requireInvoiceAccess()`
- [ ] Test client accessing other client's activity logs (should fail)
- [ ] Test client posting messages to admin-only invoice

---

### 2.3 RLS Policies

**Location:** Supabase migrations `202511041200_base_reset.sql`

**Risk Level:** CRITICAL

**Current Status:** Service role policies are overly permissive:
```sql
create policy clients_service_role_access on clients for all using (true) with check (true);
create policy invoices_service_role_access on invoices for all using (true) with check (true);
create policy quotes_service_role_access on quotes for all using (true) with check (true);
```

**Problem:** `using (true)` and `with check (true)` means no actual security. Service role (backend) bypasses RLS, which is expected, but **no RLS for anon/authenticated users**.

**Missing RLS Checks:**
- [ ] Can anonymous user query invoices? (Should fail)
- [ ] Can authenticated user query other client's invoices? (Should fail)
- [ ] Can authenticated user update invoice status? (Should fail, only backend via service role)
- [ ] Attachment RLS: client can access only own attachments

**Test Coverage Gaps:**
- [ ] RLS policy testing with mock database
- [ ] Authenticated user unauthorized access attempts
- [ ] Anonymous user access denials
- [ ] Service role bypass verification

---

## 3. DATA INTEGRITY & TRANSACTION RISKS

### 3.1 Invoice Creation - Multi-Step Mutation

**Location:** `src/server/services/invoices.ts::createInvoice()`

**Risk Level:** CRITICAL

**Mutation Steps:**
```
1. Check invoice doesn't exist
2. Insert invoice record
3. Insert line items (loop)
4. Insert activity log
5. Send email notification ← May fail (non-blocking)
6. Save attachments (if provided) ← May fail
7. Auto-create job (if policy enabled)
```

**Failure Scenarios:**
| Step | Failure | Result | Recovery |
|------|---------|--------|----------|
| 2-3 | Partial insert (some lines inserted) | Orphaned line items | Manual cleanup required |
| 4 | Activity log fails | Incomplete audit trail | No way to detect |
| 5 | Email fails | Client unaware of invoice | Non-blocking, logged only |
| 6 | Attachment insert fails | Invoice created without files | Orphaned storage objects |
| 7 | Job creation fails | Invoice not queued for printing | Auto-create policy broken |

**Current Status:** No transaction wrapping. Each step succeeds/fails independently.

**Test Coverage Gaps:**
- [ ] Simulate step 2 failure (invoice insert) → rollback all
- [ ] Simulate step 3 failure (line item insert) → orphaned invoice
- [ ] Simulate step 4 failure (activity log insert) → invoice created, no audit
- [ ] Simulate step 5 failure (email) → invoice created, client notified async
- [ ] Simulate step 6 failure (attachment) → orphaned file storage
- [ ] Simulate step 7 failure (job creation) → invoice created but not queued

---

### 3.2 Quote Conversion to Invoice

**Location:** `src/server/services/quotes.ts`

**Risk Level:** HIGH

**Mutation Steps:**
```
1. Fetch quote with line items
2. Create invoice from quote data
3. Update quote status → CONVERTED
4. Create new invoice line items
5. Mark quote as invoice_id ← Linking step
6. Create activity log
7. Send notification email
```

**Critical Gap:** If step 3 succeeds but step 4 fails:
- Quote marked CONVERTED (step 3)
- But invoice has no line items (step 4)
- Quote's invoice_id not set (step 5)
- State inconsistency: quote says "converted" but references broken invoice

**Test Coverage Gaps:**
- [ ] Successful quote conversion (happy path)
- [ ] Quote not found (404)
- [ ] Quote already converted (idempotency)
- [ ] Line item insert fails mid-conversion
- [ ] Quote status update fails after invoice created (orphaned invoice)

---

### 3.3 Job Status Updates with Notifications

**Location:** `src/server/services/jobs.ts`

**Risk Level:** HIGH

**Mutation Steps:**
```
1. Update job status
2. Check auto-detach policy
3. Update invoice (if job complete)
4. Send client notification email
5. Create activity log
```

**Failure Scenarios:**
- Job marked COMPLETED (step 1) but invoice not updated (step 3)
- Email fails (step 4) but job already marked complete
- No rollback path if step 4-5 fail

**Test Coverage Gaps:**
- [ ] Job status transition validation (valid state machine)
- [ ] Auto-detach logic (when should job auto-complete?)
- [ ] Invoice auto-mark-complete (when job = done)
- [ ] Email failure doesn't revert job status

---

## 4. CALCULATION & PRICING RISKS

### 4.1 Quick Order Pricing - Complex Multi-Factor Calculation

**Location:** `src/server/services/quick-order.ts::priceQuickOrder()`

**Risk Level:** HIGH

**Calculation Formula:**
```
For each item:
  modelMaterialCost = grams × costPerGram
  supportMaterialCost = supportGrams × supportCostPerGram
  timeCost = hours × hourlyRate
  base = materialCost + timeCost + setupFee
  unitPrice = max(minimumPrice, round(base × 100) / 100)
  total = unitPrice × quantity

Subtotal = sum of all item totals
Discounted = subtotal - discount
ShippingBase = discounted + shipping
Tax = shippingBase × taxRate
Final = shippingBase + tax
```

**Severity Breakdown:**

| Risk | Impact | Likelihood | Details |
|------|--------|-----------|---------|
| Material cost lookup failure | Price calculation error | MEDIUM | If material not found, defaults to 0.05/g (hardcoded) |
| Support material not found | Underpriced | MEDIUM | Falls back to primary material cost if ID mismatch |
| Negative support grams | Negative cost | LOW | `Math.max(0, supportGrams)` prevents, but metric source untested |
| Rounding precision loss | Micro-imbalances | MEDIUM | Multiple Math.round() calls; small errors cascade |
| Settings cache stale | Old pricing applied | LOW | 60s TTL, but manual updates not invalidated |
| Hourly rate 0 or null | Pricing formula breaks | MEDIUM | Defaults to 45 if null; but what if explicitly 0? |
| Minimum price bypass | Underpriced small items | LOW | `Math.max(minimumPrice)` enforces, but config not validated |

**Test Coverage Gaps:**
- [ ] Material not found → fallback to default 0.05
- [ ] Support material not found → fallback to primary material
- [ ] Support material same as primary (no extra cost)
- [ ] Zero/negative grams handling (edge case)
- [ ] Hourly rate variations (5, 45, 100, 0, null)
- [ ] Setup fee variations
- [ ] Minimum price enforced
- [ ] Settings cache invalidation (TTL expiry)
- [ ] Discount application (NONE, PERCENT, FIXED, edge values)
- [ ] Shipping cost edge cases (0, 999, invalid)
- [ ] Tax rate edge cases (0%, 10%, 100%, null)
- [ ] Rounding consistency across all operations

---

### 4.2 Overhang Detection & Support Weight Estimation

**Location:** `src/lib/3d/overhang-detector.ts`, `src/workers/overhang-worker.ts`

**Risk Level:** MEDIUM

**Calculation Formula:**
```
1. Filter faces by angle > threshold (default 45°)
2. Calculate support area per face
3. Estimate support volume (area × height)
4. Estimate support weight (volume × density factor)
5. Return face indices + total weight
```

**Severity Breakdown:**

| Risk | Impact | Likelihood | Details |
|------|--------|-----------|---------|
| Angle threshold mismatch | Over/under support | MEDIUM | Default 45°; but user may select different → pricing mismatch |
| Support density hardcoded | Weight estimation error | MEDIUM | `PLA_DENSITY_G_PER_MM3 = 0.00124` only; other materials ignored |
| Vertex rotation precision | Angle calculation error | LOW | Uses Quaternion.applyQuaternion(); numerical stability depends on implementation |
| Empty geometry handling | Support calculated as 0 | LOW | Returns EMPTY_RESULT if no position; may be misinterpreted |
| Face area calculation | Support area underestimated | MEDIUM | Uses triangle area; precision depends on vertex density |

**Test Coverage Gaps:**
- [ ] Angle threshold 0, 45, 90 degrees
- [ ] Geometry with zero faces
- [ ] Inverted quaternion (negative rotation)
- [ ] Support density fallback for non-PLA materials
- [ ] Very small vs very large geometries
- [ ] Support weight consistency with UI predictions

---

## 5. EXTERNAL DEPENDENCIES & INTEGRATION RISKS

### 5.1 File Upload & Storage Operations

**Location:** `src/server/storage/supabase.ts`, `src/server/services/tmp-files.ts`

**Risk Level:** HIGH

**Mutation Steps:**
```
1. Upload file to Supabase Storage
2. Create metadata record in tmp_files table
3. Update metadata with processing results
4. Move to permanent storage
5. Delete temp files
```

**Failure Scenarios:**
| Step | Failure | Result |
|------|---------|--------|
| 1 | Storage upload fails | No orphan (not created) |
| 2 | Metadata insert fails | Orphaned file in storage (can't track) |
| 3 | Update fails | Temp file marked incomplete forever |
| 4 | Move fails | File stuck in tmp bucket |
| 5 | Delete fails | Cleanup incomplete (quota issues possible) |

**Critical Issue:** `saveTmpFile()` combines storage upload + DB insert, but not atomic:
```typescript
1. uploadToStorage() // Succeeds
2. insertMetadata() // Fails → File orphaned
```

**Test Coverage Gaps:**
- [ ] Storage upload failure → no DB insert
- [ ] DB insert failure → file orphaned
- [ ] Update metadata failure → incomplete processing
- [ ] File move failure → temp file persists
- [ ] Cleanup failure → storage bloat
- [ ] Concurrent uploads of same file (race condition)

---

### 5.2 Email Service Reliability

**Location:** `src/server/services/email.ts`

**Risk Level:** MEDIUM

**Components:**
- `sendInvoiceCreated()`, `sendQuoteSent()`, `sendPaymentConfirmation()`
- Retry logic: 3 attempts with exponential backoff (2s, 4s, 8s)
- Non-blocking: email failures don't rollback DB operations

**Severity Breakdown:**

| Risk | Impact | Likelihood | Details |
|------|--------|-----------|---------|
| Email delivery failure (silent) | Client unaware of action | MEDIUM | Non-blocking; logged but no notification to admin |
| Retry exhaustion | Email never sent | LOW | 3 retries, then gives up |
| Template missing/invalid | Rendering error | MEDIUM | Template loaded from settings; fallback exists |
| Development mode redirect | Wrong recipient | LOW | Dev emails sent to delivered@resend.dev (intentional) |
| API rate limit | Retry loop may be throttled | MEDIUM | No explicit rate limit handling |

**Test Coverage Gaps:**
- [ ] Email send success path
- [ ] Email send failure → retry logic
- [ ] Retry exhaustion (3 attempts all fail)
- [ ] Template not found → fallback template
- [ ] Development mode redirect to delivered@resend.dev
- [ ] Settings.enableEmailSend = false → skips send
- [ ] Concurrent email sends (Resend queue depth)

---

### 5.3 3D Slicer Integration

**Location:** `src/server/slicer/runner.ts`

**Risk Level:** MEDIUM

**Components:**
- CLI invocation: `spawn('prusaslicer', [args...])`
- File I/O: read STL, write gcode
- Metric parsing: extract time, weight from gcode
- Timeout: 120s default

**Severity Breakdown:**

| Risk | Impact | Likelihood | Details |
|------|--------|-----------|---------|
| Slicer binary missing | All slicing fails | MEDIUM | No fallback; uses estimate metrics if disabled |
| Gcode parsing error | Metrics incorrect | MEDIUM | Regex-based extraction; malformed gcode breaks |
| Timeout exceeded | Hung process | LOW | 120s timeout configurable, may be too low for large files |
| Concurrent slicer runs | Resource contention | MEDIUM | Concurrency set to 1 by default (serialized) |
| Temp file cleanup | Disk bloat | MEDIUM | Temp gcode files may persist if process killed |

**Test Coverage Gaps:**
- [ ] Successful slicer run → metrics extracted
- [ ] Slicer timeout → fallback to estimate
- [ ] Slicer disabled → uses estimate directly
- [ ] Gcode parsing (various formats)
- [ ] Temp file cleanup on success/failure
- [ ] Concurrent slicer requests (queuing)

---

## 6. RISK CATEGORIZATION MATRIX

### Critical Risks (Test Immediately)
| Category | Component | Risk | Impact |
|----------|-----------|------|--------|
| Financial | Stripe webhook idempotency | Duplicate processing | Revenue loss |
| Financial | Invoice payment + activity log | Non-atomic mutation | Audit gap |
| Security | Invoice access control | Unverified owner check | Data disclosure |
| Security | RLS policies | Not enforced for anon/auth users | Unauthorized access |
| Data | Invoice creation | Multi-step without transaction | Orphaned records |
| Data | Quote conversion | Quote marked converted but invoice broken | Inconsistent state |

### High Risks (Test Within 1 Week)
| Category | Component | Risk | Impact |
|----------|-----------|------|--------|
| Financial | Invoice calculations | Discount/tax order | Wrong totals |
| Calculation | Quick order pricing | Multi-factor calculation errors | Underpriced items |
| Calculation | Overhang detection | Support weight estimation | Inaccurate pricing |
| Integration | File upload | Orphaned storage objects | Quota issues |
| Integration | Email service | Delivery failure (silent) | Client notification gap |
| Integration | Slicer integration | Gcode parsing error | Metric inaccuracy |

---

## 7. PRIORITIZED TEST COVERAGE ROADMAP

### Week 1 (Critical Financial & Security)
**Goal:** Reduce critical risk by 70%

1. **Stripe Payment Processing** (16 hours)
   - Webhook idempotency (duplicate event handling)
   - Session creation + DB persistence
   - Payment marking atomicity
   - Signature validation edge cases

2. **Invoice Access Control** (12 hours)
   - RLS policy enforcement (mock database queries)
   - Client ownership verification
   - Admin override
   - Non-existent invoice access

3. **Invoice Calculations** (8 hours)
   - Discount/tax combinations
   - Rounding precision
   - Negative total enforcement

**Test Count Target:** 25-30 tests

---

### Week 2 (Data Integrity & Complex Calculations)
**Goal:** Reduce high risk by 60%

1. **Invoice Creation Transactions** (12 hours)
   - Line item insertion failure
   - Activity log non-blocking behavior
   - Attachment storage failure
   - Job auto-creation

2. **Quick Order Pricing** (16 hours)
   - Material cost lookup (found/not found)
   - Support material fallback
   - Hourly rate/setup fee variations
   - Discount/tax edge cases
   - Settings cache TTL

3. **Quote Conversion** (8 hours)
   - Quote status update
   - Invoice line item creation
   - Email notification failure

**Test Count Target:** 30-35 tests

---

### Week 3 (Integration & Edge Cases)
**Goal:** Reduce medium risk by 50%

1. **File Operations** (12 hours)
   - Storage upload failure → orphan detection
   - Metadata insert failure
   - File move/cleanup
   - Concurrent uploads

2. **3D Geometry & Overhang Detection** (8 hours)
   - Angle threshold variations
   - Support weight estimation accuracy
   - Geometry edge cases

3. **Email & Slicer Integration** (8 hours)
   - Email retry logic
   - Slicer timeout handling
   - Gcode parsing edge cases

**Test Count Target:** 25-30 tests

---

## 8. TESTING INFRASTRUCTURE REQUIRED

### Mock Fixtures

**Supabase Database Mocks:**
```typescript
// Invoice test data
mockInvoice = { id: 1, status: 'DRAFT', client_id: 5, total: 100.00 }
mockLineItem = { invoice_id: 1, quantity: 2, unit_price: 50 }

// Payment test data
mockPayment = { id: 1, invoice_id: 1, amount: 100, method: 'STRIPE' }

// Material pricing
mockMaterial = { id: 1, cost_per_gram: 0.05 }
```

**Stripe Webhook Fixtures:**
```typescript
// Valid webhook event
mockWebhookEvent = {
  id: 'evt_test_...',
  type: 'checkout.session.completed',
  data: { object: { id: 'cs_test_...', metadata: { invoiceId: '1' } } }
}

// Duplicate event (same ID)
duplicateEvent = { ...mockWebhookEvent } // Should be idempotent
```

**Test Utilities:**
```typescript
// Transaction wrapper for DB tests
async function withTestTransaction(fn) {
  // Begin transaction
  // Run test
  // Rollback
}

// Auth context builder
function createTestUser(role, clientId?) { }

// Invoice builder
function createMockInvoice(overrides) { }
```

---

## 9. MITIGATION STRATEGIES

### Short-term (Weeks 1-3)
1. **Add comprehensive test suite** for critical paths (80+ tests)
2. **Implement transaction wrapping** for multi-step mutations
3. **Add input validation** (enums, ranges, string limits)
4. **Document calculation order** explicitly
5. **Verify RLS policies** with mock queries

### Medium-term (Months 2-3)
1. **Implement optimistic locking** for invoice updates (prevent concurrent modification)
2. **Add webhook event pre-recording** (ensure idempotency marker exists first)
3. **Implement file upload atomicity** (store upload + metadata in transaction)
4. **Add integration tests** for Stripe, Resend, Slicer
5. **Coverage thresholds:** 80%+ lines, 70%+ branches for services

### Long-term (Month 3+)
1. **Database transaction support** (use Supabase RPC for atomic ops)
2. **E2E testing** (full payment flow, invoice creation, quote conversion)
3. **Chaos testing** (simulate Stripe/email/storage failures)
4. **Performance testing** (pricing calculation under load)

---

## 10. IMPLEMENTATION CHECKLIST

### Phase 3A: Stripe & Payment (Week 1)

- [ ] Test webhook event deduplication (same event ID twice)
- [ ] Test webhook signature validation (valid, invalid, missing)
- [ ] Test payment marked paid without activity log
- [ ] Test stripe session creation + DB update atomicity
- [ ] Test concurrent mark-paid requests (race condition)
- [ ] Test credit deduction with RPC row locking
- [ ] Test invalid payment method enum
- [ ] Mock Stripe client + test error responses

### Phase 3B: Invoice & Security (Week 1)

- [ ] Test invoice access by client (owner)
- [ ] Test invoice access by client (non-owner, should fail)
- [ ] Test invoice access by admin (should succeed)
- [ ] Test RLS policy: anon query invoices (should fail)
- [ ] Test RLS policy: authenticated user other client's invoice (should fail)
- [ ] Test non-existent invoice (404 vs 403)
- [ ] Test attachment access via parent invoice
- [ ] Mock Supabase service client for tests

### Phase 3C: Calculations (Week 2)

- [ ] Test line total: PERCENT discount
- [ ] Test line total: FIXED discount
- [ ] Test line total: negative result enforcement
- [ ] Test document totals: discount + tax + shipping order
- [ ] Test edge cases: 0%, 100% discount, 0 shipping, 0 tax
- [ ] Test rounding: 2 decimal precision
- [ ] Test quick order pricing: material cost lookup
- [ ] Test quick order pricing: support material fallback
- [ ] Test quick order pricing: hourly rate variations
- [ ] Test quick order pricing: minimum price enforcement
- [ ] Test discount validation (PERCENT 0-100, FIXED ≥ 0)

### Phase 3D: Data Integrity (Week 2)

- [ ] Test invoice creation success (all steps)
- [ ] Test invoice creation with line item insert failure
- [ ] Test invoice creation with activity log failure
- [ ] Test invoice creation with attachment failure
- [ ] Test quote conversion success
- [ ] Test quote conversion with line item failure (orphaned invoice)
- [ ] Test job status update success
- [ ] Test job status update with email failure
- [ ] Test concurrent invoice updates (race condition)

### Phase 3E: Integration (Week 3)

- [ ] Test file upload + metadata insertion
- [ ] Test file upload failure (no orphan)
- [ ] Test metadata insert failure (orphan)
- [ ] Test email send success + retry
- [ ] Test email send failure (silent, logged)
- [ ] Test slicer timeout → fallback to estimate
- [ ] Test gcode parsing (valid, malformed)
- [ ] Test concurrent slicer requests

---

## 11. SUCCESS CRITERIA

**Phase 3 Complete When:**
- [ ] 80+ new tests written
- [ ] 90%+ of critical financial services tested
- [ ] 70%+ of security boundaries tested
- [ ] All transaction patterns identified + documented
- [ ] Test infrastructure (mocks, fixtures, utilities) in place
- [ ] Coverage report shows baseline + targets
- [ ] No critical vulnerabilities remain in payment path
- [ ] RLS policies verified with mock queries

**Metrics:**
- Starting coverage: ~1.1% (180 LOC tested)
- Target after Phase 3: ~20-25% (3,000+ LOC tested)
- Services with 80%+ coverage: invoices, stripe, credits, quick-order

---

## 12. APPENDIX: High-Risk Code Locations

### Critical Files (Test First)
```
src/server/services/invoices.ts (1501 LOC) - Invoice CRUD, calculations
src/server/services/stripe.ts (303 LOC) - Payment processing
src/server/services/credits.ts (? LOC) - Credit transactions
src/server/services/quick-order.ts (882 LOC) - Order pricing
src/server/auth/permissions.ts (? LOC) - Access control
src/lib/calculations.ts (60 LOC) - Discount/tax logic
src/lib/3d/overhang-detector.ts (150 LOC) - Support estimation
src/server/services/tmp-files.ts (? LOC) - File operations
src/server/services/jobs.ts (1205 LOC) - Job management
```

### API Routes (Test Authorization)
```
src/app/api/invoices/[id]/mark-paid/route.ts - Payment endpoint
src/app/api/invoices/[id]/apply-credit/route.ts - Credit endpoint
src/app/api/invoices/[id]/stripe-session/route.ts - Stripe session
src/app/api/stripe/webhook/route.ts - Webhook handler
src/app/api/quick-order/price/route.ts - Pricing endpoint
src/app/api/quotes/[id]/convert/route.ts - Quote conversion
```

### Database Queries (Test RLS)
```
SELECT invoices WHERE client_id = auth.uid() - Client invoices
SELECT * FROM invoices - Should fail for anon/unrelated client
UPDATE invoices SET status = 'PAID' - Service role only
DELETE FROM tmp_files - Admin cleanup
```

---

**Next Steps:**
1. Create Vitest test files for critical services (Week 1)
2. Build mock infrastructure (Supabase, Stripe, Resend)
3. Write 25-30 tests for critical paths
4. Generate coverage report + baseline
5. Execute Phase 3B-E tests

**Generated:** 2025-11-12  
**Estimated Implementation Time:** 3 weeks (80-100 hours)
