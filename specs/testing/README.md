# 3D Print Sydney - Testing Documentation

## Overview

Comprehensive test planning & execution guides for 3D Print Sydney platform. Covers business-critical workflows from design to execution.

---

## Phase Documentation

### Phase 1: User Flows (Reference)
**File:** `phase1-user-flows.md`

Foundation document mapping complete user journeys across:
- Authentication & onboarding
- Admin workflows (clients, quotes, invoices, jobs)
- Client portal (orders, projects, messaging)
- Quick-order pipeline
- Cross-cutting flows (email, activity logging, wallet/credit)
- Error handling & edge cases

**Use Case:** Understanding existing flows before testing

---

### Phase 2: Risk & Requirements (Draft)
**Files:**
- `phase3-risk-areas.md` - Identified risk areas & mitigation strategies
- `phase3-e2e-requirements.md` - End-to-end requirements & coverage checklist

**Use Case:** Understanding gaps & risks before Phase 3

---

### Phase 3: Critical Workflows (Current)
**File:** `phase3-critical-workflows.md` (2,206 lines)

Detailed comprehensive mapping of 5 business-critical workflows with:

#### 1. Quote → Invoice → Payment (6 scenarios, 48 test points)
Happy path: Quote DRAFT → SENT → ACCEPTED → convert → Invoice DRAFT → PARTIALLY_PAID → PAID
- State transitions & validation points
- Integration points (numbering, conversion, payment)
- Error scenarios (declined, write-off, void)
- Concurrency handling
- 15 success criteria

#### 2. Quick-Order Pipeline (8 scenarios, 64 test points)
5 steps: File Upload → Model Viewing → Configuration → Pricing → Checkout
- File validation (browser + server)
- Model viewer rendering
- Pricing calculation (material + shipping + tax + discounts)
- Stripe/Wallet/Hybrid payment methods
- 17 success criteria

#### 3. Job Processing (7 scenarios, 56 test points)
Full lifecycle: QUEUED → PRE_PROCESSING → IN_QUEUE → PRINTING → PRINTING_COMPLETE → POST_PROCESSING → PACKAGING → OUT_FOR_DELIVERY → COMPLETED → ARCHIVED
- State machine validation
- Job creation from invoice lines
- Admin board display & metrics
- Client notifications
- 16 success criteria

#### 4. Credit System (7 scenarios, 56 test points)
Flow: Admin adds credit → Client applies to invoice → Wallet deducted → Invoice updated
- Credit transaction tracking
- Wallet balance calculation (immutable)
- Atomic deductions (RPC with row lock)
- Audit trail & compliance
- 16 success criteria

#### 5. Client Operations (9 scenarios, 72 test points)
Onboarding: /signup → Client profile → Welcome email → Dashboard
- Registration & authentication
- Dashboard display (wallet, orders, projects)
- Orders management (list, filter, detail, payment)
- Project tracking (active, completed)
- Messaging (bi-directional)
- Profile management (address, payment terms)
- Access control (permission checks)
- 18 success criteria

#### Cross-Workflow Validation
- Data consistency checks (totals, balance_due, wallet balance)
- Integration point validation (quote→invoice→jobs)
- Atomic operations required
- Idempotency considerations

---

## Quick Reference

### Test Statistics

| Metric | Count |
|--------|-------|
| Workflows | 5 |
| Scenarios | 37 |
| Sub-tests | 259+ |
| Test Points | 296+ |
| Success Criteria | 81 |
| State Transitions | 40+ |
| Integration Points | 50+ |
| Error Paths | 20+ |

### Timeline Estimate

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 3A | Week 1 | Unit/Integration (Workflows 1, 3, 4) |
| Phase 3B | Week 2 | End-to-End (Workflows 2, 5) |
| Phase 3C | Week 3 | Concurrency & Edge Cases |
| Phase 3D | Week 4 | Regression & Sign-off |

### Key Risk Areas

1. **Stripe webhook timing** → Idempotency required
2. **Concurrent operations** → Database row locking (RPC)
3. **File handling** (tmp→permanent) → Atomic transactions
4. **Email delivery** → Fire-and-forget, retry logic
5. **Student discount logic** → Email domain + manual verification
6. **Job queue consistency** → Queue position sequencing
7. **Balance calculations** → Immutable transactions, sum-based

---

## How to Use

### For Test Planning
1. Read Phase 1 to understand existing flows
2. Review Phase 3 risk areas
3. Map Phase 3 critical workflows to your test framework
4. Create test cases from 37 scenarios (use template provided)

### For Test Execution
1. Pre-test setup: database, Stripe, email service, users
2. Execute Phase 3A (Week 1): Workflows 1, 3, 4
3. Execute Phase 3B (Week 2): Workflows 2, 5
4. Execute Phase 3C (Week 3): Concurrency & edge cases
5. Execute Phase 3D (Week 4): Full regression

### For Validation
1. Verify all 81 success criteria met
2. Check all 296+ test points passing
3. Confirm data consistency across workflows
4. Validate state transitions & integrations
5. Sign off on critical path coverage

---

## Document Structure

### phase3-critical-workflows.md

```
1. Quote → Invoice → Payment
   ├─ Workflow diagram (happy path + error paths)
   ├─ State transitions & validation points (tables)
   ├─ Integration points (detailed flow)
   ├─ Test scenarios (6 scenarios with detailed steps)
   └─ Success criteria (15 checkpoints)

2. Quick-Order Pipeline
   ├─ Workflow diagram (5 steps + payment flows)
   ├─ State transitions & validation points
   ├─ Integration points (upload → pricing → checkout)
   ├─ Test scenarios (8 scenarios with detailed steps)
   └─ Success criteria (17 checkpoints)

3. Job Processing
   ├─ Workflow diagram (lifecycle + archive flow)
   ├─ State transitions & validation points
   ├─ Integration points (creation → board → completion)
   ├─ Test scenarios (7 scenarios with detailed steps)
   └─ Success criteria (16 checkpoints)

4. Credit System
   ├─ Workflow diagram (admin add → client apply)
   ├─ State transitions & validation points
   ├─ Integration points (add → deduct → update)
   ├─ Test scenarios (7 scenarios with detailed steps)
   └─ Success criteria (16 checkpoints)

5. Client Operations
   ├─ Workflow diagram (signup → dashboard → orders)
   ├─ State transitions & validation points
   ├─ Integration points (auth → profile → orders)
   ├─ Test scenarios (9 scenarios with detailed steps)
   └─ Success criteria (18 checkpoints)

6. Cross-Workflow Validation
   ├─ Data consistency checks
   ├─ Integration point matrix
   ├─ Atomic operations required
   ├─ Error scenarios to test

7. Test Execution Summary
   ├─ Scenario count by workflow
   ├─ Success criteria checklist
   ├─ Technical notes (atomicity, idempotency, rates)
```

---

## Related Files

- `/src/server/services/invoices.ts` - Invoice creation & payment
- `/src/server/services/quotes.ts` - Quote management
- `/src/server/services/quick-order.ts` - Quick-order pricing & checkout
- `/src/server/services/jobs.ts` - Job creation & status updates
- `/src/server/services/credits.ts` - Credit system (add/deduct)
- `/src/lib/constants/enums.ts` - Status enums & constants
- `/src/app/api/invoices/[id]/*.ts` - Invoice API routes
- `/src/app/api/quotes/[id]/*.ts` - Quote API routes
- `/src/app/(client)/quick-order/page.tsx` - Quick-order UI

---

## Success Criteria (All Phases)

- [ ] 37 scenarios fully tested
- [ ] 296+ test points passing
- [ ] 0 critical failures in happy path
- [ ] 100% error path coverage
- [ ] All state transitions valid
- [ ] All integrations atomic
- [ ] All validations enforced
- [ ] All emails sent correctly
- [ ] All access control working
- [ ] Data consistency verified across workflows

---

## Next Steps

1. **Import workflows** into your test management tool
2. **Create test cases** from 37 scenarios
3. **Set up test data** (clients, materials, regions, users)
4. **Configure test environment** (Stripe, email, database)
5. **Execute Phase 3A-D** per timeline above
6. **Track results** against 81 success criteria
7. **Sign off** on critical path validation

---

Generated: 2025-11-12
Last Updated: Phase 3 Critical Workflows
Status: Ready for Test Execution

