# Phase 3: Critical Workflows - Executive Summary

## Document Overview

**File:** `phase3-critical-workflows.md`  
**Lines:** 2,206  
**Test Scenarios:** 37  
**Sub-tests:** 259+  
**Total Test Points:** 296+  

---

## Critical Workflows Mapped

### 1. Quote → Invoice → Payment (6 scenarios, 48 test points)

**Happy Path:** Quote DRAFT → SENT → ACCEPTED → converted to Invoice DRAFT → PARTIALLY_PAID → PAID

**State Transitions:**
- Quote: DRAFT → SENT → ACCEPTED → CONVERTED (or DECLINED for error path)
- Invoice: DRAFT → PARTIALLY_PAID → PAID (with jobs created on PAID)
- Jobs created only after full payment received

**Key Integration Points:**
- Quote numbering (per-client sequence)
- Quote→Invoice conversion (atomic: items + pricing copied)
- Payment tracking (balance_due recalculated on each payment)
- Job creation (one per invoice line after PAID status)

**Error Paths:**
- Quote DECLINED → cannot convert
- Invoice WRITTEN_OFF/VOIDED → immutable, no jobs
- Concurrent payments → last-write-wins, deterministic state

**Success Criteria:** 15 checkpoints
- Quote number uniqueness ✓
- Invoice status auto-update ✓
- Jobs queued after full payment ✓
- State transitions immutable ✓

---

### 2. Quick-Order Pipeline (8 scenarios, 64 test points)

**5 Steps:** File Upload → Model Viewing → Configuration → Pricing → Checkout

**File Upload Validation:**
- Type check (browser + server): .stl, .obj, .3mf
- Size check: 0 < size < 100MB
- Server-side MIME validation required

**Configuration & Pricing:**
- Material + color selection
- Quantity per item (1-100)
- Shipping by postcode/state (region-based)
- Student discount auto-applied if eligible
- Tax calculated at configurable rate

**Payment Methods:**
- Stripe (creates session, webhook confirms)
- Wallet credit (deducted immediately)
- Hybrid (wallet + Stripe for remainder)

**Checkout Flow:**
- Tmp files moved → order_files (atomic)
- Invoice created from pricing
- Jobs created immediately (status=QUEUED)
- Emails sent (invoice-created or payment-confirmation)

**Error Paths:**
- Invalid file types/sizes rejected
- Insufficient credit → Stripe required
- Pricing changes on material/location change

**Success Criteria:** 17 checkpoints
- File validation (browser + server) ✓
- Model viewer renders correctly ✓
- Pricing accurate (material + shipping + tax) ✓
- Stripe webhook updates status ✓
- Jobs created after PAID ✓

---

### 3. Job Processing (7 scenarios, 56 test points)

**Job Lifecycle:** QUEUED → PRE_PROCESSING → IN_QUEUE → PRINTING → PRINTING_COMPLETE → POST_PROCESSING → PACKAGING → OUT_FOR_DELIVERY → COMPLETED → ARCHIVED

**State Machine:**
- Valid transitions enforced (no skipping states)
- Timestamps set correctly (started_at, completed_at, paused_at)
- Pause/resume supported (IN_QUEUE ↔ PAUSED)
- FAILED path with reason tracking

**Integration Points:**
- Jobs created from invoice lines (payment-triggered)
- Admin board displays active jobs (columns per status)
- Client notified on COMPLETED/FAILED
- Auto-archive after 30 days or manual

**Metrics Calculated:**
- Total jobs in queue
- Jobs printing per printer
- Estimated hours to clear
- Printer utilization %

**Error Paths:**
- Job deleted while in progress
- Printer offline but assigned → validation prevents
- Concurrent status updates → last-write-wins

**Success Criteria:** 16 checkpoints
- Auto-create on invoice PAID ✓
- State transitions valid ✓
- Client notifications sent ✓
- Job board metrics accurate ✓
- Timestamps set correctly ✓

---

### 4. Credit System (7 scenarios, 56 test points)

**Credit Flow:** Admin adds credit → Client applies to invoice → Balance recalculated

**Admin Operations:**
- Add credit with reason (GIFT, ADJUSTMENT, RETURN, OTHER)
- Credit tracked in credit_transactions table
- Wallet balance updated immediately

**Client Operations:**
- Apply credit to invoice (capped at min(wallet, balance_due))
- Wallet deducted immediately (database RPC with row lock)
- Invoice status updated (PAID if full credit, else PARTIALLY_PAID)
- Jobs created if invoice now PAID

**Validation:**
- Amount > 0
- Wallet never negative
- Credit can only be applied by invoice owner
- Transactions immutable (no edit/delete)

**Audit Trail:**
- All transactions recorded with timestamps
- Balance_before/after calculated
- Reason tracked for compliance
- Invoice linked (if applicable)

**Error Paths:**
- Insufficient credit balance → API returns 400
- Client applies credit to other client's invoice → 403 Forbidden
- Concurrent credit operations → atomic RPC prevents race conditions

**Success Criteria:** 16 checkpoints
- Credit added immediately ✓
- Wallet deducted on apply ✓
- Invoice status updated ✓
- Jobs created after full payment ✓
- Transactions immutable ✓
- Concurrent ops atomic ✓

---

### 5. Client Operations (9 scenarios, 72 test points)

**Onboarding:** /signup → Client profile created → Welcome email → /client dashboard

**Client Dashboard:**
- Wallet balance (view-only)
- Recent orders (5 most recent)
- Active projects (jobs in QUEUED/PRINTING/etc.)
- Quick actions (New order, View all)

**Orders Management:**
- View all invoices with status badges
- Filter by status, search by number
- View order detail (items, payments, balance due)
- Payment options (Stripe, wallet, admin)

**Project Tracking:**
- List active projects (with job count + status breakdown)
- View completed projects (read-only)
- Job status updates (visible to client)
- Estimated completion times

**Messaging:**
- Send message to admin (linked to invoice optional)
- Bi-directional conversation
- Admin notified (email or in-app)

**Profile Management:**
- View/edit phone, address, business name
- Payment terms (from settings)
- Student discount (auto-verified by email domain or manual)
- Address used in quick-order checkout

**Access Control:**
- Client sees only own invoices/projects
- Client cannot access /admin routes
- Permission checked before processing
- Clear error responses (403 Forbidden)

**Error Paths:**
- Unauthenticated user → redirect to /login?callbackUrl={pathname}
- Client accessing other client's invoice → 403
- Admin role trying /client routes → redirected to /dashboard

**Success Criteria:** 18 checkpoints
- Registration creates user + client ✓
- Dashboard displays correct data ✓
- Orders filterable + searchable ✓
- Project tracking works ✓
- Messaging bi-directional ✓
- Student discount auto-applied ✓
- Access control enforced ✓

---

## Cross-Workflow Validation

**Data Consistency:**
- Invoice totals = sum of line items (minus discount, plus tax/shipping)
- Balance_due = total - amount_paid (or credit_applied)
- Wallet balance = sum(transactions added) - sum(deducted) + sum(refunded)
- Quote → Invoice: items, pricing, discounts identical
- Jobs created only after invoice PAID (or policy allows)

**Integration Points:**
```
Quote → Invoice (atomic)
Invoice → Payment (balance recalculated)
Invoice → Credit (wallet deducted)
Invoice → Jobs (created after PAID)
Client ← Jobs (notifications sent)
Credit ← Wallet (immutable transactions)
```

**Atomic Operations Required:**
1. Quote → Invoice conversion
2. Quick-order checkout (tmp→order files + invoice + jobs + payment)
3. Credit deduction (RPC with row lock)
4. Job status update (status + timestamps + activity + email)

**Idempotency:**
- Stripe webhook must be idempotent (may retry)
- Email sending fire-and-forget (don't block order)
- Revalidation uses Next.js ISR (on-demand)

---

## Test Execution Roadmap

### Pre-Testing Setup
- [ ] Database seeded with test data (clients, materials, regions)
- [ ] Stripe test keys configured
- [ ] Email service mocked or test inbox set up
- [ ] Test user accounts created (admin + 3+ clients)
- [ ] Settings configured (tax rate, regions, discounts)

### Phase 3A: Unit/Integration (Week 1)
- [ ] Workflow 1: Quote → Invoice → Payment (6 scenarios)
- [ ] Workflow 3: Job Processing (7 scenarios)
- [ ] Workflow 4: Credit System (7 scenarios)

### Phase 3B: End-to-End (Week 2)
- [ ] Workflow 2: Quick-Order Pipeline (8 scenarios)
- [ ] Workflow 5: Client Operations (9 scenarios)

### Phase 3C: Concurrency & Edge Cases (Week 3)
- [ ] Race condition tests (concurrent updates)
- [ ] Error path recovery
- [ ] Data consistency verification
- [ ] Performance benchmarks

### Phase 3D: Regression & Sign-off (Week 4)
- [ ] Full workflow regression (all scenarios)
- [ ] Critical path validation
- [ ] Documentation updates
- [ ] Sign-off checklist

---

## Key Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Stripe webhook timing | Idempotency key, retry logic, webhook validation |
| Concurrent operations | Database row locking (RPC), transaction isolation |
| File handling (tmp→permanent) | Atomic transactions, cleanup jobs, validation |
| Email delivery | Fire-and-forget pattern, retry logic, test inbox |
| Student discount logic | Email domain check + manual verification |
| Job queue consistency | Queue position sequencing, order validation |
| Balance calculations | Immutable transactions, sum-based calculation |

---

## Success Metrics

**Coverage:**
- [ ] 37 scenarios fully tested
- [ ] 296+ test points executed
- [ ] 0 critical failures
- [ ] 100% happy path coverage
- [ ] 100% error path coverage

**Quality:**
- [ ] All state transitions valid
- [ ] All integrations atomic
- [ ] All validations enforced
- [ ] All emails sent correctly
- [ ] All access control working
- [ ] All data consistent

**Performance:**
- [ ] Quote creation < 500ms
- [ ] Invoice payment < 1s
- [ ] Quick-order checkout < 3s
- [ ] Job board load < 2s
- [ ] Credit apply < 500ms

---

## References

- Phase 1: `/specs/testing/phase1-user-flows.md` - Base user flows
- Phase 3: `/specs/testing/phase3-critical-workflows.md` - This detailed mapping

---

Generated: 2025-11-12  
Workflows: 5  
Scenarios: 37  
Test Points: 296+
