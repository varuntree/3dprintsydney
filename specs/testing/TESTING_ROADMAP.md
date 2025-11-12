# Testing Strategy: Complete Roadmap

**Project:** 3D Print Sydney  
**Framework:** Vitest 4.0.8  
**Current Coverage:** ~1.1% (180 LOC tested)  
**Target Coverage:** 80%+ critical services  

---

## Phase Overview

### Phase 1: Codebase Mapping & Architecture
**Status:** Complete  
**Documents:**
- `phase1-feature-modules.md` - Feature-based module organization
- `phase1-data-model.md` - Database schema & relationships
- `phase1-user-flows.md` - End-to-end user journeys
- `phase1-route-api-map.md` - API route inventory

**Deliverables:**
- Complete codebase inventory (~16K LOC)
- Feature-to-component mapping
- User flow documentation
- API endpoint catalog

---

### Phase 2: Existing Test Audit & Integration Points
**Status:** Complete  
**Documents:**
- `phase2-test-coverage-audit.md` - Current test inventory & gaps
- `phase2-side-effects.md` - State mutations & isolation strategies
- `phase2-integration-points.md` - External dependency catalog

**Key Findings:**
- Only 4 test files (180 LOC of tests for 16K LOC code)
- Critical gaps in invoicing, payments, calculations
- Multiple side effects requiring mock infrastructure
- 8+ external dependencies (Stripe, Resend, Supabase, Slicer)

**Deliverables:**
- Test gap analysis across all services
- Side effect isolation strategies
- Mock requirements checklist
- Integration testing plan

---

### Phase 3: High-Risk Areas Analysis & Prioritization
**Status:** Complete  
**Document:** `phase3-risk-areas.md` (868 lines)

**Key Findings:**

#### Critical Risks (Revenue/Security Impact)
1. **Stripe webhook idempotency** - Duplicate payment processing possible
2. **Invoice payment marking** - Race conditions, non-atomic operations
3. **Invoice access control** - RLS policies not enforced
4. **Invoice creation** - 7-step mutation without transactions
5. **Quote conversion** - State inconsistency on partial failure

#### High Risks (Data Integrity/Functionality)
1. **Quick order pricing** - Material cost fallbacks, rounding errors
2. **Invoice calculations** - Discount/tax order, negative totals
3. **File uploads** - Orphaned storage objects possible
4. **Overhang detection** - Material density hardcoded
5. **Job status updates** - Concurrent state corruption possible

**Deliverables:**
- Risk categorization matrix (5 critical, 5 high, multiple medium)
- Severity/likelihood/impact analysis
- Mitigation strategies (short/medium/long-term)
- 3-week implementation roadmap (80-100 hours)
- Success criteria & coverage targets

---

## Testing Implementation Timeline

### Week 1: Critical Financial & Security (28 tests)

**Phase 3A: Stripe & Payment Processing** (16 hours)
- [ ] Webhook event deduplication (same event ID twice)
- [ ] Webhook signature validation (valid, invalid, missing)
- [ ] Payment marked without activity log
- [ ] Session creation + DB atomicity
- [ ] Concurrent mark-paid race condition
- [ ] Credit deduction with RPC row locking
- [ ] Invalid payment method enum
- [ ] Stripe error responses

**Phase 3B: Invoice Access Control** (12 hours)
- [ ] Client ownership access check
- [ ] Non-owner client rejection
- [ ] Admin access override
- [ ] RLS policy: anon user (should fail)
- [ ] RLS policy: unrelated client (should fail)
- [ ] Non-existent invoice (404 vs 403)
- [ ] Attachment transitive access
- [ ] Supabase mock setup

**Phase 3C: Invoice Calculations** (8 hours)
- [ ] Line total: PERCENT discount
- [ ] Line total: FIXED discount
- [ ] Document totals: discount + tax + shipping
- [ ] Edge cases: 0%, 100%, negative results
- [ ] Rounding: 2 decimal precision

**Infrastructure:**
- [ ] Supabase mock client
- [ ] Stripe mock client
- [ ] Auth context builders
- [ ] Test fixtures/factories

---

### Week 2: Data Integrity & Calculations (32 tests)

**Phase 3D: Invoice Transactions** (12 hours)
- [ ] Invoice creation success (happy path)
- [ ] Line item insert failure
- [ ] Activity log failure
- [ ] Attachment save failure
- [ ] Quote conversion success
- [ ] Quote conversion with orphaned invoice
- [ ] Job status update success
- [ ] Concurrent invoice updates

**Phase 3E: Quick Order Pricing** (16 hours)
- [ ] Material cost lookup (found/not found)
- [ ] Support material fallback
- [ ] Hourly rate variations
- [ ] Setup fee variations
- [ ] Minimum price enforcement
- [ ] Settings cache TTL
- [ ] Discount validation (PERCENT, FIXED)
- [ ] Shipping + tax edge cases
- [ ] Rounding consistency

**Phase 3F: Quote Conversion** (8 hours)
- [ ] Successful conversion
- [ ] Quote status update
- [ ] Invoice line creation
- [ ] Email failure handling
- [ ] Orphaned invoice detection

**Infrastructure:**
- [ ] Invoice test factories
- [ ] Quote test builders
- [ ] Resend email mock
- [ ] Transaction wrappers

---

### Week 3: Integration & Edge Cases (28 tests)

**Phase 3G: File Operations** (12 hours)
- [ ] Storage upload + metadata insertion
- [ ] Upload failure (no orphan)
- [ ] Metadata insert failure (orphan detection)
- [ ] File move/cleanup
- [ ] Concurrent uploads
- [ ] Quota limit handling

**Phase 3H: 3D Geometry** (8 hours)
- [ ] Overhang detection: angle thresholds
- [ ] Support weight estimation
- [ ] Geometry edge cases (zero faces, inverted)
- [ ] Density material handling

**Phase 3I: Email & Slicer** (8 hours)
- [ ] Email send success + retry
- [ ] Email failure (silent, logged)
- [ ] Slicer timeout → fallback
- [ ] Gcode parsing (valid, malformed)
- [ ] Concurrent slicer requests
- [ ] Temp file cleanup

**Infrastructure:**
- [ ] Storage mock (Supabase)
- [ ] File operation utilities
- [ ] Email mock with retry
- [ ] 3D geometry test fixtures

---

## Coverage Targets

### Current State
```
Source LOC:       16,052
Tested LOC:       ~180 (4 files)
Coverage:         ~1.1%
Test Count:       12
Framework:        Vitest 4.0.8
```

### End of Phase 3
```
Source LOC:       16,052
Tested LOC:       ~3,500 (80+ test files)
Coverage:         ~20-25%
Test Count:       90-100
Critical services: 80%+ (invoices, stripe, credits, quick-order)
Framework:        Vitest 4.0.8 with coverage reporting
```

### Critical Services Breakdown
| Service | Current | Target | Test Count |
|---------|---------|--------|-----------|
| invoices.ts | ~0.5% | 80% | 25-30 |
| stripe.ts | ~0% | 90% | 15-20 |
| credits.ts | ~0% | 85% | 10-15 |
| quick-order.ts | ~2% | 75% | 20-25 |
| calculations.ts | ~0% | 85% | 10-15 |
| permissions.ts | ~0% | 80% | 8-12 |

---

## Key Testing Areas by Priority

### 🔴 CRITICAL (Test First)

1. **Payment Processing Path**
   - Stripe webhook → invoice marked paid
   - Activity log recording
   - Idempotency verification
   - Race condition testing

2. **Access Control & Security**
   - Invoice ownership verification
   - RLS policy enforcement
   - Admin role verification
   - Client isolation

3. **Financial Calculations**
   - Discount/tax order
   - Rounding precision
   - Edge cases (0%, 100%)
   - Negative total prevention

4. **Multi-Step Transactions**
   - Invoice creation (7 steps)
   - Quote conversion (5 steps)
   - Job status updates (5 steps)
   - Failure scenario handling

### 🟠 HIGH (Test by Week 2)

1. **Pricing Calculations**
   - Material cost lookup & fallback
   - Support weight estimation
   - Settings cache behavior
   - Floating point precision

2. **File Operations**
   - Upload + metadata atomicity
   - Orphaned file detection
   - Cleanup verification

3. **Email Service**
   - Send success/failure
   - Retry logic
   - Template rendering

4. **3D Processing**
   - Overhang detection accuracy
   - Geometry edge cases
   - Rotation calculations

### 🟡 MEDIUM (Test by Week 3)

1. **Integration Points**
   - Slicer CLI invocation
   - Webhook processing
   - Session management

2. **Edge Cases**
   - Concurrent requests
   - Timeout handling
   - Invalid input

---

## Files to Test First (Priority Order)

### Tier 1: Financial & Security (40+ hours)
```
src/server/services/invoices.ts          (1501 LOC) - Invoice CRUD, calculations
src/server/services/stripe.ts            (303 LOC) - Payment processing
src/server/auth/permissions.ts           (100 LOC) - Access control
src/server/services/credits.ts           (150 LOC) - Credit transactions
src/lib/calculations.ts                  (60 LOC) - Discount/tax logic
```

### Tier 2: Pricing & Calculations (30+ hours)
```
src/server/services/quick-order.ts       (882 LOC) - Order pricing
src/lib/3d/overhang-detector.ts          (150 LOC) - Support estimation
src/server/services/quotes.ts            (1111 LOC) - Quote workflow
```

### Tier 3: Integration & Data (20+ hours)
```
src/server/services/tmp-files.ts         (200 LOC) - File operations
src/server/services/email.ts             (300 LOC) - Email service
src/server/services/jobs.ts              (1205 LOC) - Job management
```

---

## Mock Infrastructure Checklist

### Supabase Mocks
- [ ] Client initialization + configuration
- [ ] Table operations (select, insert, update, delete)
- [ ] RPC functions (add_client_credit, deduct_client_credit)
- [ ] RLS policy enforcement
- [ ] Error simulation (404, 500, constraint violations)

### Stripe Mocks
- [ ] Webhook event signing
- [ ] Checkout session creation
- [ ] Signature verification
- [ ] Error responses

### Resend Mocks
- [ ] Email send success/failure
- [ ] Retry logic
- [ ] Template rendering
- [ ] Rate limiting

### Utilities
- [ ] Auth context builders (admin, client, invalid)
- [ ] Invoice/quote factories
- [ ] Payment fixtures
- [ ] Transaction wrappers
- [ ] File cleanup helpers

---

## Success Criteria

**Phase 3 Complete When:**
- [x] Risk analysis complete (5 critical, 5+ high risks identified)
- [ ] 80+ new tests written
- [ ] 90%+ critical financial services tested
- [ ] 70%+ security boundaries tested
- [ ] Mock infrastructure in place
- [ ] Coverage report shows 20%+ coverage
- [ ] No unmitigated critical vulnerabilities

**Metrics to Track:**
- Test count (target: 90-100)
- Coverage % (target: 20-25%)
- Critical risk reduction: 70%+
- High risk reduction: 60%+

---

## Documentation References

### Test Architecture
- **Mocking:** See Phase 2 side-effects
- **Fixtures:** See implementation checklist in phase3-risk-areas.md
- **Integration Points:** See phase2-integration-points.md

### Business Logic
- **Calculations:** Section 4 of phase3-risk-areas.md
- **Payment Flow:** Section 1.1 of phase3-risk-areas.md
- **Access Control:** Section 2 of phase3-risk-areas.md

### Dependencies
- **Stripe:** Phase 2 Integration Points (Section 2)
- **Resend:** Phase 2 Integration Points (Section 3)
- **Supabase:** Phase 2 Integration Points (Section 1)

---

## Related Documents

```
specs/testing/
├── README.md (overview)
├── TESTING_ROADMAP.md (this file)
├── phase1-feature-modules.md
├── phase1-data-model.md
├── phase1-user-flows.md
├── phase1-route-api-map.md
├── phase2-test-coverage-audit.md
├── phase2-side-effects.md
├── phase2-integration-points.md
└── phase3-risk-areas.md (detailed risk analysis)
```

---

**Last Updated:** 2025-11-12  
**Status:** Phase 3 Analysis Complete - Ready for Implementation  
**Estimated Implementation Time:** 3 weeks (80-100 hours)  
**Recommended Start:** Immediate (critical risks identified)

