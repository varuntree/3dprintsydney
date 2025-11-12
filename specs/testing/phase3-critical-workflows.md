# 3D Print Sydney - Phase 3: Critical Workflows for Comprehensive Testing

## Overview
Map revenue and operations flows requiring comprehensive test coverage. This document outlines 5 critical end-to-end workflows with detailed state transitions, validation points, integration tests, and success criteria for Phase 3 testing.

---

## 1. QUOTE → INVOICE → PAYMENT WORKFLOW

### 1.1 Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Quote-to-Payment Workflow                         │
└─────────────────────────────────────────────────────────────────────────┘

HAPPY PATH:
┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Quote DRAFT  │─────▶│ Quote SENT   │─────▶│ Quote        │─────▶│ Invoice      │
│              │      │              │      │ ACCEPTED     │      │ DRAFT        │
└──────────────┘      └──────────────┘      └──────────────┘      └──────────────┘
   Create              Email to                Admin/Client         Convert from
   with items         client w/link           approval             quote items
                      status: SENT            status:              status:
                                             ACCEPTED             DRAFT

         ↓                                                            ↓
    ┌────────────────────────────────────────────────────────────────────┐
    │                    Invoice State Transitions                       │
    └────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐      ┌──────────────────┐      ┌──────────────┐
    │ Invoice      │─────▶│ Invoice          │─────▶│ Invoice      │
    │ DRAFT        │      │ PARTIALLY_PAID   │      │ PAID         │
    └──────────────┘      └──────────────────┘      └──────────────┘
                             Add payment(s)          Final payment
                             balance_due > 0         balance_due = 0
                             OR apply credit         OR full credit

                             ↓                             ↓
                          ┌──────────────────┐       ┌──────────────┐
                          │ Jobs QUEUED      │       │ Admin sees   │
                          │ created for each │       │ job in board │
                          │ line item        │       │              │
                          └──────────────────┘       └──────────────┘

ERROR PATHS:
          ┌──────────────────┐
          │ Quote DRAFT      │
          └──────────────────┘
                ↓
          [ Admin rejects ]
                ↓
          ┌──────────────────┐
          │ Quote DECLINED   │
          └──────────────────┘
              (immutable)
          Email: quote-declined
          Cannot convert

          ┌──────────────────┐
          │ Invoice DRAFT    │
          └──────────────────┘
                ↓
          [ Admin writes off / voids ]
                ↓
          ┌──────────────────┐
          │ WRITTEN_OFF or   │
          │ VOIDED           │
          └──────────────────┘
          balance_due = 0
          No jobs created
```

### 1.2 State Transitions & Validation Points

**Quote Lifecycle:**

| State | Entry Condition | Valid Actions | Exit Condition | Next State |
|-------|-----------------|---------------|----------------|-----------|
| DRAFT | Created via /api/quotes | Edit, Send, Delete | Send or discard | SENT/Deleted |
| SENT | sendQuote() called | Resend, Accept, Decline | Admin accepts/declines | ACCEPTED/DECLINED |
| ACCEPTED | acceptQuote() called | Convert to invoice | Convert triggered | CONVERTED |
| CONVERTED | convertQuoteToInvoice() | None (read-only) | - | - |
| DECLINED | declineQuote() called | None (immutable) | - | - |

**Validation Points in Quote:**
- Quote number uniqueness (per client sequence)
- Client exists + has email (for sending)
- Line items: qty > 0, unitPrice >= 0
- Discount: type in [NONE, PERCENT, FIXED], value >= 0
- Tax rate: 0-100
- Issue date <= Expiry date (if set)
- Total calculation correct

**Invoice Lifecycle:**

| State | Entry Condition | Valid Actions | Exit Condition | Balance Rule |
|-------|-----------------|---------------|----------------|--------------|
| DRAFT | Created or converted from quote | Edit, Add payment, Mark paid, Void | Payment adds or status changes | - |
| PARTIALLY_PAID | Amount received > 0 & < total | Add more payments, Apply credit | Payment added or all paid | balance_due > 0 |
| PAID | Amount received >= total OR full credit applied | Mark unpaid (rare), Void (if recent) | Paid status reached | balance_due = 0 |
| WRITTEN_OFF | Admin writes off | None (immutable) | - | balance_due = 0 |
| VOIDED | Admin voids (pre-payment) | None (immutable) | - | balance_due = 0 |

**Validation Points in Invoice:**
- Invoice number uniqueness (global sequence)
- Client exists
- Line items: qty > 0, unitPrice >= 0
- Discount & tax same rules as quote
- Issue date <= due date (if set)
- Payment: amount > 0 & <= balance_due
- Credit apply: amount > 0 & <= min(wallet_balance, balance_due)
- No payments on VOIDED/WRITTEN_OFF invoices

### 1.3 Integration Points

**Within Workflow:**

```
Quote Create
├── Load client profile
├── Load settings (tax, numbering)
├── Validate all fields
├── Generate quote number (numbering service)
├── Insert quotes + quote_lines (atomic transaction)
├── Log activity (QUOTE_CREATED)
└── UI redirects to detail

Quote Send
├── Load full quote + client
├── Validate client has email
├── Generate quote PDF/preview
├── Send email via Resend (quote-sent template)
├── Update quote_status = SENT
├── Log activity (QUOTE_SENT)
└── UI updates status badge

Quote Accept
├── Load quote
├── Validate status = SENT
├── Update quote_status = ACCEPTED
├── Log activity (QUOTE_ACCEPTED)
├── Send email (quote-accepted template)
└── UI enables "Convert to Invoice" button

Quote → Invoice Conversion
├── Start transaction
├── Load quote + all items
├── Create invoice with:
│   ├── invoice_number (new sequence)
│   ├── client_id (from quote)
│   ├── issue_date (today)
│   ├── due_date (derived from client payment_terms)
│   ├── All line items copied
│   ├── Discount, tax, shipping same
│   └── status = DRAFT
├── Create invoice_lines (all items)
├── Update quote_status = CONVERTED, set converted_invoice_id
├── Commit transaction
├── Log activity (QUOTE_CONVERTED, INVOICE_CREATED)
└── Redirect to invoice detail

Invoice Create (Direct)
├── Load settings
├── Validate all fields
├── Generate invoice number
├── Insert invoices + invoice_lines (atomic)
├── Log activity (INVOICE_CREATED)
└── UI redirects to detail

Add Manual Payment
├── Load invoice
├── Validate invoice not VOIDED/WRITTEN_OFF
├── Validate amount > 0, <= balance_due
├── Create invoice_payments record
├── Recalculate invoice status:
│   ├── If total_paid >= total: status = PAID, balance_due = 0
│   ├── Else if total_paid > 0: status = PARTIALLY_PAID
│   └── balance_due = total - total_paid
├── IF status = PAID:
│   ├── Create jobs from invoice lines
│   │   └── For each line: create job with QUEUED status
│   └── Send email (payment-confirmation)
├── Log activity (PAYMENT_ADDED, [INVOICE_PAID], [JOB_CREATED x N])
└── UI refreshes payment list & status

Mark Paid (Admin)
├── Load invoice
├── Validate not already PAID
├── Create final payment_record with method/processor details
├── Set status = PAID, balance_due = 0
├── Create jobs (if not exist)
├── Send email
├── Log activity
└── Lock invoice from further edits

Apply Wallet Credit
├── Load invoice + client
├── Verify client ownership
├── Validate credit_amount > 0 & <= balance_due
├── Validate wallet_balance >= credit_amount
├── Deduct from wallet_balance
├── Create credit_transactions (CREDIT_DEDUCTED, invoice_id)
├── Recalculate balance_due
├── If balance_due <= 0: status = PAID, create jobs
├── Log activity
└── UI updates balance display
```

### 1.4 Test Scenario Outlines

**Scenario 1.1: Happy Path - Quote → Accepted → Converted → Paid (Manual)**
```
GIVEN: Admin logged in, client exists
WHEN:
  1. Create quote with 2 line items (qty 2 @ $100, qty 1 @ $250)
  2. Verify quote_number generated (e.g., "ABC-001")
  3. Verify subtotal = $450, total with 10% tax = $495
  4. Send quote to client
  5. Verify email sent (quote-sent template)
  6. Verify quote status = SENT
  7. Admin accepts quote
  8. Verify quote status = ACCEPTED
  9. Verify "Convert to Invoice" enabled
  10. Convert to invoice
  11. Verify invoice created with same items/pricing
  12. Verify invoice_number different from quote_number
  13. Verify quote status = CONVERTED, converted_invoice_id set
  14. Add payment of $300 (manual)
  15. Verify invoice status = PARTIALLY_PAID
  16. Verify balance_due = $195
  17. Verify no jobs created yet (not fully paid)
  18. Add payment of $195 (manual)
  19. Verify invoice status = PAID
  20. Verify balance_due = 0
  21. Verify 2 jobs created (QUEUED) from invoice lines
  22. Verify email sent (payment-confirmation)
THEN: Workflow complete, jobs in queue for admin
```

**Scenario 1.2: Quote Declined - No Conversion**
```
GIVEN: Quote in SENT status
WHEN:
  1. Admin views quote detail
  2. Clicks "Decline" button with note "Client unavailable"
  3. Verify quote status = DECLINED (immutable)
  4. Verify email sent to client (quote-declined template)
  5. Verify "Convert to Invoice" button disabled
  6. Try to manually convert via API: POST /api/quotes/[id]/convert
THEN: API returns 400 "Quote cannot be converted (status: DECLINED)"
```

**Scenario 1.3: Partial Payment → Full Credit**
```
GIVEN: Invoice created ($500 total), client has $300 wallet credit
WHEN:
  1. Client applies $300 wallet credit
  2. Verify wallet_balance decreases to $0
  3. Verify credit_transaction created (CREDIT_DEDUCTED, amount=$300)
  4. Verify invoice status = PARTIALLY_PAID, balance_due = $200
  5. Verify 0 jobs created (still unpaid)
  6. Admin adds manual payment $200
  7. Verify invoice status = PAID
  8. Verify 1 job created (QUEUED)
THEN: Jobs queued after full payment received
```

**Scenario 1.4: Write-off Invoice**
```
GIVEN: Invoice $500 total, $200 paid (PARTIALLY_PAID), balance_due=$300
WHEN:
  1. Admin clicks "Write Off" button
  2. Enters reason: "Client bankruptcy"
  3. Verify invoice status = WRITTEN_OFF
  4. Verify balance_due = 0
  5. Verify activity log entry with reason
  6. Try to add payment: POST /api/invoices/[id]/payments
THEN: API returns 400 "Cannot add payment to WRITTEN_OFF invoice"
```

**Scenario 1.5: Void Invoice**
```
GIVEN: Invoice $500, status=DRAFT (no payments)
WHEN:
  1. Admin clicks "Void" button, enters reason: "Duplicate created"
  2. Verify invoice status = VOIDED
  3. Verify balance_due remains 0 (no change)
  4. Verify activity log with reason
  5. Try to convert via API (if DRAFT→CONVERTED possible)
THEN: API returns 400 "Cannot modify VOIDED invoice"
```

**Scenario 1.6: Concurrency - Two Admins Add Payments**
```
GIVEN: Invoice $500 total, status=DRAFT
WHEN:
  1. Admin A starts adding $300 payment
  2. Admin B simultaneously adds $200 payment
  3. Both requests hit the database
THEN: One succeeds (last-write-wins), other gets conflict
      Final state: status=PARTIALLY_PAID or PAID (deterministic)
      Both payments recorded in activity log
```

### 1.5 Success Criteria

- [ ] Quote created with correct number sequence (unique per client)
- [ ] Quote totals calculated correctly (subtotal, discount, tax)
- [ ] Quote can be sent to client (email delivered)
- [ ] Quote status transitions are immutable after SENT
- [ ] Quote→Invoice conversion creates invoice with identical items/pricing
- [ ] Invoice payments tracked accurately (balance_due recalculated)
- [ ] Invoice status auto-updates: DRAFT→PARTIALLY_PAID→PAID
- [ ] Jobs created only after full payment (or on PAID status)
- [ ] Credit applications deduct from wallet immediately
- [ ] Write-off/Void lock invoice from further modifications
- [ ] All state changes logged in activity trail
- [ ] Emails sent at correct workflow points (quote-sent, quote-accepted, payment-confirmation)
- [ ] Stripe-paid invoices update correctly via webhook
- [ ] Admin cannot convert DECLINED quotes
- [ ] Client cannot modify quote after SENT

---

## 2. QUICK-ORDER PIPELINE

### 2.1 Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Quick-Order Complete Pipeline                         │
└─────────────────────────────────────────────────────────────────────────┘

CLIENT AUTHENTICATION
┌────────────────┐
│ /quick-order   │
│ (Login check)  │
└────────────────┘
     ↓
  [Authenticated?]
     ├─ No → Redirect to /login?callbackUrl=/quick-order
     └─ Yes → Continue

STEP 1: FILE UPLOAD & VALIDATION
┌────────────────────┐
│ File Upload Zone   │
│ (Drag & drop)      │
└────────────────────┘
     ↓
  [Browser Validation]
  ├─ File type in [.stl, .obj, .3mf]
  ├─ File size < 100MB
  └─ No duplicate filenames
     ├─ Invalid → Display error, reject
     └─ Valid → Continue to server
     
     ↓
  POST /api/quick-order/upload (FormData)
     ↓
  [Server Validation]
  ├─ MIME type check
  ├─ File size check
  ├─ Scan for malware (optional)
  └─ Create tmp_files record
     ├─ Error → Return 422/500, show toast
     └─ Success → Return tmpId + metadata
     
     ↓
  ┌─────────────────────┐
  │ File stored         │
  │ tmp_files.id = ABC  │
  │ Status: PENDING     │
  └─────────────────────┘
     ↓
  [Client State Updated]
  ├─ Store tmpId in Zustand
  ├─ Display filename + size
  └─ Enable "Continue" button

STEP 2: MODEL VIEWING & ORIENTATION (Optional)
┌────────────────────┐
│ 3D Model Viewer    │
│ (THREE.js)         │
└────────────────────┘
     ↓
  [ Load model from tmp_files ]
     ↓
  [ Render + Display bounding box ]
     ↓
  [ Client actions (optional) ]
  ├─ Rotate model
  ├─ Pan/Zoom
  ├─ Reset view
  └─ [Optional] Request optimal orientation
      ↓ POST /api/quick-order/orient
      → Calculate support material
      → Return metrics + recommendation
      ↓
      [ Accept OR keep manual ]

STEP 3: CONFIGURATION
┌────────────────────┐
│ Config Panel       │
│ For each item:     │
├─ Material (dropdown)
├─ Color (tied to material)
├─ Quality level
├─ Quantity
└─ View dimensions
└────────────────────┘
     ↓
  [ Client selects all options ]
     ↓
  ┌─────────────────────────┐
  │ Ready for pricing       │
  └─────────────────────────┘

STEP 4: PRICING CALCULATION
┌────────────────────────┐
│ POST /api/quick-order/ │
│ price { items, state, │
│ postcode }             │
└────────────────────────┘
     ↓
  [ Service: priceQuickOrder() ]
  ├─ Load settings (tax, materials, regions)
  ├─ For each item:
  │  ├─ Load material cost/gram
  │  ├─ Load model weight from tmp_files
  │  ├─ Calculate: (weight × cost) + setup fee
  │  ├─ Apply material upcharge (if any)
  │  └─ Apply quality upcharge (if any)
  ├─ Calculate shipping:
  │  ├─ Resolve region by state/postcode
  │  ├─ Load base rate for region
  │  └─ Apply remote surcharge (if applicable)
  ├─ Resolve discounts:
  │  ├─ Check student discount eligibility
  │  ├─ Apply if eligible
  │  └─ Admin-applied discount (if any)
  ├─ Apply tax at tax_rate%
  └─ Return itemized breakdown
     ↓
  ┌──────────────────────┐
  │ Pricing Response:    │
  ├─ Per-item breakdown  │
  ├─ Subtotal           │
  ├─ Discount (%)       │
  ├─ Shipping           │
  ├─ Tax                │
  └─ Total              │
  └──────────────────────┘
     ↓
  [ Client reviews & can reconfigure ]

STEP 5: CHECKOUT & PAYMENT
┌──────────────────────────┐
│ Checkout Form            │
│ ├─ Shipping address      │
│ ├─ Payment method        │
│ │  ├─ Stripe            │
│ │  ├─ Wallet credit     │
│ │  └─ Both              │
│ └─ [Optional] Credit req │
└──────────────────────────┘
     ↓
  [ Client submits checkout ]
     ↓
  POST /api/quick-order/checkout
  {
    items: [ { tmpId, material, color, qty, ... } ],
    address: { ... },
    paymentPreference,
    creditRequestedAmount?
  }
     ↓
  [ Service: createQuickOrderInvoice() ]
  ├─ [ Begin transaction ]
  ├─ Move tmp_files → order_files
  ├─ Create invoice:
  │  ├─ From pricing (items, totals)
  │  ├─ Set client_id, created_by
  │  ├─ Set address from input
  │  └─ status = DRAFT (not paid yet)
  ├─ Based on paymentPreference:
  │  ├─ [STRIPE]
  │  │  └─ Create Stripe session, return URL
  │  ├─ [WALLET]
  │  │  ├─ Apply credit to invoice
  │  │  ├─ If sufficient: status = PAID
  │  │  └─ Else: status = PARTIALLY_PAID
  │  ├─ [BOTH]
  │  │  ├─ Apply wallet first
  │  │  ├─ Create Stripe for remainder
  │  │  └─ status = depends on amounts
  ├─ Create jobs from invoice lines:
  │  └─ For each line: job (status=QUEUED)
  ├─ Log activity (INVOICE_CREATED, JOB_CREATED x N)
  ├─ Revalidate: /invoices, /jobs, /client/orders
  ├─ [ Commit transaction ]
  └─ Return { invoiceId, stripeUrl?, status }
     ├─ Error → Rollback, return 500
     └─ Success → Continue
     
  ↓ [IF STRIPE]
  ┌──────────────────────┐
  │ Stripe Checkout      │
  │ (External)           │
  └──────────────────────┘
     ↓
  [ Client completes payment on Stripe ]
     ↓
  [ Stripe webhook: POST /api/stripe/webhook ]
  ├─ Validate signature
  ├─ Update invoice status = PAID
  ├─ Send email (payment-confirmation)
  └─ Log activity (STRIPE_PAYMENT_CONFIRMED)
  
  ↓ [IF WALLET ONLY]
  ┌────────────────────────┐
  │ Invoice status = PAID   │
  │ (if full credit applied)│
  └────────────────────────┘
     ↓
  [ Email sent (invoice-created) ]

COMPLETION
┌─────────────────────┐
│ Order Confirmation  │
├─ Invoice created    │
├─ Jobs queued        │
├─ Jobs visible to    │
│  admin (board)      │
├─ Invoice visible to │
│  client (/orders)   │
└─────────────────────┘
```

### 2.2 State Transitions & Validation Points

**File Upload States:**

| State | When | Valid Actions | Transitions | Notes |
|-------|------|---------------|-------------|-------|
| PENDING | Created in tmp_files | Download, Delete |→ PERMANENT (checkout) or Deleted | Cleanup after 24h |
| PERMANENT | Moved to order_files | View, Include in invoice | - | Immutable |
| DELETED | User removes before checkout | - | - | Can re-upload |

**Quick-Order Invoice States:**

| State | Entry Point | Total | Balance Due | Jobs Status |
|-------|-------------|-------|-------------|------------|
| DRAFT | Created before payment | Calculated | = Total | NONE (not created yet) |
| PARTIALLY_PAID | Wallet partial + Stripe pending | Calculated | > 0 | NONE until fully paid |
| PAID | Full payment received | Calculated | = 0 | All QUEUED |

**Validation Points:**

*File Upload:*
- File size: 0 < size < 100MB
- File type: MIME in [model/stl, model/obj, model/3mf] or extension in [.stl, .obj, .3mf]
- Filename: length <= 255 chars, no null bytes, valid UTF-8
- Duplicate check: same file (by hash) not already uploaded by user

*Configuration:*
- Material: must exist in materials table, not deprecated
- Color: must be valid for selected material
- Quality: must be valid enum if applicable
- Quantity: > 0, integer, <= 100 (per item)
- Location: state/postcode must be in shipping_regions (or default)

*Pricing:*
- All items have weights (from model or calculated)
- Tax rate: 0-50%
- Student discount: if eligible, auto-applied
- Total > 0 (no free orders)

*Checkout:*
- Address provided or use default client address
- Payment method: STRIPE, WALLET, or BOTH
- Credit amount: if requesting credit, amount > 0
- Stripe SKU/amount >= stripe minimum (0.50 AUD)

### 2.3 Integration Points

```
File Upload
├── Client authentication check
├── Validate file (browser + server)
├── Create tmp_files record (Supabase)
├── Stream to storage (Supabase Storage)
├── Return tmpId + metadata
└── Zustand state: add to items[]

Model Viewer
├── Load tmp file from storage URL
├── Render with THREE.js
└── Client manipulates (no persistence yet)

[Optional] Orientation
├── Load tmp file + model data
├── Calculate optimal orientation
├── Calculate support material needed
├── Update tmp_files.metadata (orientation_data)
└── Return metrics for client review

Configuration
├── Client selects material, color, quality, qty
├── Zustand state: update items with selections
└── Display in UI

Pricing
├── Load settings (tax_rate, materials, regions, discounts)
├── For each item:
│  ├── Load material (cost_per_gram)
│  ├── Load tmp file weight
│  ├── Calculate line total
│  └── Apply upcharges
├── Calculate shipping by region
├── Apply student discount (if eligible)
├── Calculate tax
└── Return breakdown

Checkout
├── Validate all items configured
├── Validate address provided
├── Create invoice:
│  ├── Load pricing (recalculate)
│  ├── Insert invoices record
│  ├── Insert invoice_lines (one per item)
│  ├── Move tmp_files → order_files (one per line)
│  └── status = DRAFT
├── Process payment:
│  ├── [STRIPE] Create Stripe session
│  ├── [WALLET] Deduct from wallet_balance
│  └── [BOTH] Deduct wallet, Stripe for remainder
├── Create jobs:
│  └── For each invoice_line: create job (QUEUED)
├── Email notifications
├── Log activities
├── Revalidate paths
└── Return result

Stripe Webhook
├── Validate signature
├── Update invoice.status = PAID
├── Log activity
└── Send email (payment-confirmation)
```

### 2.4 Test Scenario Outlines

**Scenario 2.1: Happy Path - Upload → Price → Stripe Checkout → Paid**
```
GIVEN: Client logged in, has no wallet credit
WHEN:
  1. Upload valid STL file (5MB, valid MIME)
  2. Verify tmpId created, file stored
  3. Verify file size displayed in UI
  4. Click "Continue"
  5. Configure: Material=Resin Blue, Color=Blue, Quality=Standard, Qty=2
  6. Click "Get Price"
  7. Verify pricing call completes
  8. Verify breakdown shown:
     - Per-item: material cost + setup fee
     - Subtotal: item total × qty
     - Shipping: $X based on postcode
     - Tax: 10%
     - Total: $Y
  9. Click "Proceed to Checkout"
  10. Enter shipping address (or use default)
  11. Select payment method: "Stripe"
  12. Click "Pay Now"
  13. Verify Stripe session created
  14. Verify redirected to Stripe checkout
  15. [Simulate] Complete Stripe payment
  16. Verify Stripe webhook received
  17. Verify invoice status = PAID
  18. Verify 1 job created (QUEUED)
  19. Verify email sent (payment-confirmation)
  20. Verify client sees order in /client/orders
  21. Verify admin sees invoice + job in board
THEN: Full quick-order workflow complete
```

**Scenario 2.2: File Validation - Invalid File**
```
GIVEN: Client on quick-order page
WHEN:
  1. Try to upload .pdf file (invalid type)
  2. Verify browser validation rejects
  3. Try to upload 150MB file (too large)
  4. Verify browser validation rejects
  5. Upload valid file, then try to upload same filename again
  6. Verify duplicate check prevents or shows warning
THEN: All invalid uploads rejected gracefully
```

**Scenario 2.3: Pricing Recalculation**
```
GIVEN: Items configured, pricing displayed ($100)
WHEN:
  1. Change material (Resin Blue → Resin Red)
  2. Click "Recalculate Price"
  3. Verify new pricing shown
  4. Change quantity (2 → 5)
  5. Click "Recalculate"
  6. Verify subtotal = unitPrice × 5
  7. Change location (postcode: 2000 → 4000)
  8. Click "Recalculate"
  9. Verify shipping changed (different region)
  10. Verify tax recalculated
THEN: Pricing updates instantly on changes
```

**Scenario 2.4: Wallet + Stripe (Partial Credit)**
```
GIVEN: Client has $50 wallet credit, total=$150
WHEN:
  1. Select payment method: "Wallet + Stripe"
  2. Verify $50 deducted from wallet
  3. Verify Stripe needed for $100 only
  4. Checkout with Stripe for $100
  5. Verify Stripe webhook updates invoice
  6. Verify invoice status = PAID
  7. Verify wallet_balance = $0
  8. Verify job created (QUEUED)
THEN: Hybrid payment works correctly
```

**Scenario 2.5: Wallet Only (Sufficient Credit)**
```
GIVEN: Client has $500 wallet credit, total=$200
WHEN:
  1. Select payment method: "Wallet Credit"
  2. Click "Pay with Wallet"
  3. Verify wallet_balance decreases by $200
  4. Verify invoice status = PAID (no Stripe)
  5. Verify job created immediately
  6. Verify email sent (invoice-created, not payment-confirmation)
THEN: Wallet-only payment completes without Stripe
```

**Scenario 2.6: Student Discount Applied**
```
GIVEN: Client is eligible for student discount (10%)
WHEN:
  1. Configure items and get pricing
  2. Verify subtotal shown
  3. Verify discount line: "-10% (Student)" applied
  4. Verify discounted subtotal = subtotal × 0.9
  5. Verify tax applied to discounted amount
THEN: Student discount auto-applied to pricing
```

**Scenario 2.7: Address Override**
```
GIVEN: Client with saved address on file
WHEN:
  1. Start quick-order
  2. On checkout, address pre-filled
  3. Change address (different state)
  4. Verify shipping region recalculated
  5. Complete checkout with new address
  6. Verify invoice.address = new address (not client default)
THEN: Checkout address overrides client default
```

**Scenario 2.8: Concurrent Uploads (Race Condition)**
```
GIVEN: Client uploads 3 files in quick succession
WHEN:
  1. Upload file1 → tmpId1 created
  2. Simultaneously upload file2 → tmpId2 created
  3. Simultaneously upload file3 → tmpId3 created
  4. All complete without errors
  5. Configure all 3 items
  6. Checkout
THEN: All files stored, all items invoiced
```

### 2.5 Success Criteria

- [ ] File upload validates type + size (browser + server)
- [ ] Tmp files stored temporarily, moved to permanent on checkout
- [ ] Model viewer renders STL/OBJ/3MF correctly
- [ ] Configuration persists in client state
- [ ] Pricing calculated correctly (material + shipping + tax)
- [ ] Shipping region resolves by postcode
- [ ] Student discount auto-applied if eligible
- [ ] Stripe session created with correct amount
- [ ] Webhook updates invoice status = PAID
- [ ] Jobs created only after invoice PAID
- [ ] Wallet credit deducted immediately on apply
- [ ] Hybrid payment (wallet + Stripe) works
- [ ] Wallet-only payment skips Stripe
- [ ] All files moved to permanent storage on checkout
- [ ] Email notifications sent at correct points
- [ ] Client sees order in /client/orders immediately
- [ ] Admin sees job in board after payment
- [ ] Pricing display updates on config changes

---

## 3. JOB PROCESSING WORKFLOW

### 3.1 Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  Job Processing Complete Workflow                        │
└─────────────────────────────────────────────────────────────────────────┘

JOB CREATION (from invoice payment)
┌─────────────────────┐
│ Invoice status =    │
│ PAID or             │
│ PARTIALLY_PAID      │
│ (if policy allows)  │
└─────────────────────┘
     ↓
  [ For each invoice_line: create job ]
     ↓
  ┌──────────────────┐
  │ Job QUEUED       │
  │ ├─ invoice_id    │
  │ ├─ client_id     │
  │ ├─ queue_position│
  │ ├─ priority: NORMAL
  │ └─ created_at: now
  └──────────────────┘
     ↓
  [ Admin sees job in Job Board (/jobs) ]
     ↓
  [ Job displayed in QUEUED column ]

JOB LIFECYCLE
┌───────────────────┐      ┌─────────────┐      ┌────────────┐
│ QUEUED            │─────▶│ PRE_         │─────▶│ IN_        │
│ (waiting)         │      │ PROCESSING  │      │ QUEUE      │
│                   │      │ (slicing)   │      │ (on printer)
└───────────────────┘      └─────────────┘      └────────────┘
  ↑                                                   ↓
  └───────────────────────────────────────────────────┘
           [ Can pause, resume ]
           
          ↓
  ┌─────────────────┐
  │ PRINTING        │
  └─────────────────┘
       ├─ started_at set
       └─ printer assigned
       
       ↓ [Success]       ↓ [Failure]
       
  ┌───────────────────┐  ┌─────────────┐
  │ PRINTING_COMPLETE │  │ FAILED      │
  └───────────────────┘  │ (manual or  │
       ↓                 │  error)     │
  ┌───────────────────┐  └─────────────┘
  │ POST_PROCESSING   │       ↓
  └───────────────────┘  [ Log failure, notify client ]
       ↓
  ┌───────────────────┐
  │ PACKAGING         │
  └───────────────────┘
       ↓
  ┌───────────────────┐
  │ OUT_FOR_DELIVERY  │
  └───────────────────┘
       ↓
  ┌───────────────────┐
  │ COMPLETED         │
  │ completed_at: now │
  └───────────────────┘
       ↓
  [ Send email: job-status-update (COMPLETED) ]
       ↓
  [ Client sees "Order Complete" ]

ARCHIVE FLOW
┌───────────────────┐
│ Job COMPLETED     │
│ or FAILED         │
│ (after 30 days)   │
└───────────────────┘
     ↓
  [ Admin manual archive OR auto-archive ]
     ↓
  ┌───────────────────┐
  │ Job ARCHIVED      │
  │ archived_at: now  │
  │ archived_reason:  │
  │ "auto" | "manual" │
  └───────────────────┘
     ↓
  [ Job removed from active board ]
```

### 3.2 State Transitions & Validation Points

**Job Status Lifecycle:**

| Status | Entry | Valid Actions | Exit Condition | Notifications |
|--------|-------|---------------|----------------|---|
| QUEUED | Created from invoice line | Pause, Assign printer, Delete | Move to PRE_PROCESSING | None |
| PRE_PROCESSING | Admin action or auto | Resume, Cancel | Move to IN_QUEUE | None |
| IN_QUEUE | Printer assigned, ready to print | Pause, Start printing | Move to PRINTING | None |
| PRINTING | Printer starts | Pause, Complete | Move to PRINTING_COMPLETE | None |
| PAUSED | From PRINTING/IN_QUEUE | Resume, Cancel | Move back to IN_QUEUE | None |
| PRINTING_COMPLETE | Print finished (success) | Continue to post | Move to POST_PROCESSING | None |
| POST_PROCESSING | Cleanup/finishing | Continue | Move to PACKAGING | None |
| PACKAGING | Packing items | Continue | Move to OUT_FOR_DELIVERY | None |
| OUT_FOR_DELIVERY | Shipped | Complete | Move to COMPLETED | Email (job-status-update) |
| COMPLETED | All done, shipped | Archive | Move to ARCHIVED | Final email sent |
| FAILED | Print failed, error, or manual cancel | Note reason, Archive or Retry | ARCHIVED | Email (job-failed) |
| ARCHIVED | After COMPLETED/FAILED (30d) | None | - | None |

**Validation Points:**

- Job number uniqueness (auto-increment)
- Client exists (from invoice)
- Invoice exists + PAID (or policy allows)
- Printer (if assigned): must exist + not OFFLINE/MAINTENANCE
- Status transition: must follow enum + valid state machine
- Queue position: sequential within status groups
- Timestamps:
  - started_at set only when PRINTING
  - completed_at set only when COMPLETED
  - paused_at set only when PAUSED
- Priority: NORMAL, FAST_TRACK, URGENT
- No duplicate jobs per invoice_line

### 3.3 Integration Points

```
Job Creation (from Invoice Payment)
├── Load invoice + all lines
├── For each line:
│  ├── Create job:
│  │  ├─ job.title = line.name
│  │  ├─ job.description = "Order #{invoice.number}"
│  │  ├─ job.client_id = invoice.client_id
│  │  ├─ job.invoice_id = invoice.id
│  │  ├─ job.status = QUEUED
│  │  ├─ job.priority = NORMAL (or from line)
│  │  ├─ job.queue_position = auto-increment
│  │  └─ job.created_at = now
│  ├── Insert into jobs table
│  └── Log activity (JOB_CREATED)
├── Revalidate /jobs board
└── If client.notify_on_job_status: send "Job queued" email

Update Job Status
├── Load job + printer (if assigned)
├── Validate new status in enum
├── Validate state transition is allowed
├── Update job.status = new_status
├── Set timestamp based on status:
│  ├─ PRINTING: started_at = now
│  ├─ COMPLETED: completed_at = now
│  ├─ PAUSED: paused_at = now
│  └─ FAILED: log error_message
├── Log activity (JOB_STATUS_CHANGED)
├── If status in [COMPLETED, FAILED]:
│  └── Send email to client (job-status-update)
├── If status = COMPLETED:
│  └── Increment client's completed_job_count (for metrics)
├── Revalidate /jobs board
└── Return updated job

View Job Board
├── Load settings (active statuses to display)
├── Query jobs where status in [QUEUED, PRE_PROCESSING, IN_QUEUE, PRINTING, PAUSED]
├── Group by printer (or status columns)
├── For each job:
│  ├─ Load client + invoice
│  ├─ Calculate estimated completion
│  └─ Map to JobCardDTO
├── Calculate board metrics:
│  ├─ Total jobs in queue
│  ├─ Jobs in PRINTING
│  ├─ Estimated hours to clear
│  └─ Printer utilization %
├── Return JobBoardSnapshotDTO (columns + cards)
└── UI displays Kanban board

Drag-Drop Status Update
├── User drags job card to new column
├── New status = column name
├── POST /api/jobs/[id]/status { status, note? }
├── [ Execute Update Job Status above ]
└── Board refreshes (local + server validation)

Archive Job
├── Load job (must be COMPLETED or FAILED)
├── Validate > 30 days old (or manual override)
├── Set job.status = ARCHIVED
├── Set job.archived_at = now
├── Set job.archived_reason = "auto" | "manual"
├── Log activity (JOB_ARCHIVED)
├── Revalidate /jobs board (job removed from display)
└── Retain in DB for reporting

Client Job Status Notification
├── Job status changes to COMPLETED
├── Check client.notify_on_job_status = true
├── Load client + job + invoice details
├── Send email (job-status-update template)
├── Include:
│  ├─ Invoice number
│  ├─ Job title/description
│  ├─ Completion date/time
│  └─ Link to order detail page
└── Log activity (EMAIL_SENT)
```

### 3.4 Test Scenario Outlines

**Scenario 3.1: Happy Path - Job Queued → Completed**
```
GIVEN: Invoice PAID with 1 line item
WHEN:
  1. Verify job created automatically (QUEUED)
  2. Verify job visible in /jobs board (QUEUED column)
  3. Verify job contains invoice number, client name
  4. Admin clicks job, updates status = PRE_PROCESSING
  5. Verify job moves to PRE_PROCESSING column
  6. Verify started_at NOT set yet
  7. Admin assigns printer (Printer A)
  8. Update status = IN_QUEUE
  9. Admin updates status = PRINTING
  10. Verify started_at = now
  11. Admin updates status = PRINTING_COMPLETE
  12. Admin updates status = POST_PROCESSING
  13. Admin updates status = PACKAGING
  14. Admin updates status = OUT_FOR_DELIVERY
  15. Admin updates status = COMPLETED with date
  16. Verify completed_at = now
  17. Verify email sent to client (job-status-update)
  18. Verify job removed from board (or moved to COMPLETED column)
THEN: Job lifecycle complete, client notified
```

**Scenario 3.2: Job Pause & Resume**
```
GIVEN: Job in PRINTING status
WHEN:
  1. Admin clicks job, selects "Pause"
  2. Verify job.status = PAUSED
  3. Verify paused_at = now
  4. Admin later selects "Resume"
  5. Verify job.status = IN_QUEUE (or PRINTING depending on impl)
  6. Verify paused_at cleared
THEN: Job can be paused/resumed mid-print
```

**Scenario 3.3: Job Failed**
```
GIVEN: Job in PRINTING status
WHEN:
  1. Admin updates status = FAILED
  2. Enters reason: "Nozzle clogged"
  3. Verify job.status = FAILED
  4. Verify reason logged in notes/activity
  5. Verify email sent to client (job-failed template)
  6. Verify job visible in board (FAILED column) or archived
THEN: Failed jobs tracked with reason, client notified
```

**Scenario 3.4: Multiple Jobs from Single Invoice**
```
GIVEN: Invoice with 3 line items (different materials)
WHEN:
  1. Verify 3 jobs created automatically
  2. Verify all in QUEUED status
  3. Verify queue_positions are unique (1, 2, 3)
  4. Verify can update each independently
  5. Move job 1 → PRINTING, job 2 → PRE_PROCESSING, job 3 → QUEUED
THEN: Multiple jobs per invoice managed independently
```

**Scenario 3.5: Auto-Archive Completed Jobs**
```
GIVEN: Job in COMPLETED status, created 35 days ago
WHEN:
  1. Run archive job (daily cron)
  2. Verify job.status = ARCHIVED
  3. Verify archived_at = now
  4. Verify archived_reason = "auto"
  5. Verify job no longer shows in active board
  6. Verify job still in DB (for reporting)
THEN: Old completed jobs auto-archived
```

**Scenario 3.6: Job Board Metrics**
```
GIVEN: 5 jobs in various statuses (2 QUEUED, 2 PRINTING, 1 IN_QUEUE)
WHEN:
  1. Admin views /jobs board
  2. Verify board shows columns: QUEUED, PRE_PROCESSING, IN_QUEUE, PRINTING
  3. Verify KPI card shows:
     - Total jobs: 5
     - Jobs printing: 2
     - Estimated hours to clear: X
     - Printer utilization: Y%
THEN: Metrics calculated correctly
```

**Scenario 3.7: Concurrency - Two Admins Update Job**
```
GIVEN: Job in IN_QUEUE status
WHEN:
  1. Admin A starts updating status = PRINTING
  2. Admin B simultaneously updates status = PAUSED
  3. Both requests hit DB
THEN: One succeeds (last-write-wins)
      Final state is deterministic (PRINTING or PAUSED)
      Activity log shows both attempts
```

### 3.5 Success Criteria

- [ ] Jobs created automatically when invoice PAID
- [ ] One job per invoice line item
- [ ] Job status transitions follow valid state machine
- [ ] Timestamps set correctly (started_at, completed_at, paused_at)
- [ ] Job board displays all active jobs with correct columns
- [ ] Admin can drag-drop jobs between statuses
- [ ] Job status updates tracked in activity log
- [ ] Client notified when job COMPLETED
- [ ] Failed jobs tracked with reason + client notified
- [ ] Multiple jobs from same invoice managed independently
- [ ] Old completed jobs auto-archived after 30 days
- [ ] Board metrics calculated correctly (queue depth, utilization)
- [ ] Printer assignment validation (not OFFLINE/MAINTENANCE)
- [ ] Job pause/resume works correctly
- [ ] Queue positions maintained consistently
- [ ] Jobs searchable by client name, invoice number, status

---

## 4. CREDIT SYSTEM WORKFLOW

### 4.1 Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Credit System Complete Workflow                      │
└─────────────────────────────────────────────────────────────────────────┘

ADMIN ADDS CREDIT
┌─────────────────────────┐
│ Admin views             │
│ /admin/clients/[id]     │
└─────────────────────────┘
     ↓
  [ Click "Add Credit" button ]
     ↓
  ┌─────────────────────────┐
  │ Modal:                  │
  │ ├─ Amount: $X          │
  │ ├─ Reason: GIFT |      │
  │ │  ADJUSTMENT |        │
  │ │  RETURN | OTHER       │
  │ └─ Notes: optional      │
  └─────────────────────────┘
     ↓
  POST /api/clients/[id]/credit
  { amount, reason, notes }
     ↓
  [ Service: addClientCredit() ]
  ├─ Validate amount > 0
  ├─ Validate reason enum
  ├─ Database RPC: add_client_credit()
  │  ├─ Row lock on clients row
  │  ├─ Calculate new balance
  │  ├─ Insert credit_transaction (CREDIT_ADDED)
  │  ├─ Update clients.wallet_balance
  │  └─ Return new_balance
  ├─ Log activity (CLIENT_CREDIT_ADDED)
  └─ Return { newBalance, transactionId }
     ↓
  [ UI updates wallet display ]
  ┌─────────────────────────┐
  │ Client wallet_balance   │
  │ increases by $X         │
  └─────────────────────────┘

CLIENT APPLIES CREDIT TO INVOICE
┌─────────────────────────────────┐
│ Client views                    │
│ /client/orders/[id]             │
│ (Invoice DRAFT/PENDING)         │
│ balance_due > 0                 │
│ wallet_balance > 0              │
└─────────────────────────────────┘
     ↓
  [ Click "Use Wallet Credit" ]
     ↓
  ┌─────────────────────────────┐
  │ Modal:                      │
  │ Amount (auto-calc max):     │
  │ max = min(wallet_balance,   │
  │          balance_due)       │
  │                             │
  │ [ ] Slider or input field   │
  └─────────────────────────────┘
     ↓
  POST /api/invoices/[id]/apply-credit
  { amount }
     ↓
  [ Service: applyWalletCreditToInvoice() ]
  ├─ Load invoice + client
  ├─ Verify client.id == invoice.client_id
  ├─ Validate amount > 0 & <= balance_due
  ├─ Database RPC: deduct_client_credit()
  │  ├─ Row lock on clients row
  │  ├─ Validate wallet_balance >= amount
  │  ├─ Insert credit_transaction (CREDIT_DEDUCTED)
  │  ├─ Update clients.wallet_balance -= amount
  │  └─ Return deducted, newBalance
  ├─ Update invoice:
  │  ├─ Create invoice_payments record
  │  │  ├─ amount = credit_amount
  │  │  └─ method = "WALLET_CREDIT"
  │  ├─ Recalculate balance_due
  │  ├─ If balance_due <= 0:
  │  │  ├─ status = PAID
  │  │  ├─ completed_at = now
  │  │  └─ Create jobs from lines
  │  └─ Else: status = PARTIALLY_PAID
  ├─ Log activity (CREDIT_APPLIED_TO_INVOICE)
  └─ Return { appliedAmount, newBalance, invoiceStatus }
     ↓
  [ UI updates ]
  ├─ Wallet balance display
  ├─ Invoice balance_due
  ├─ Invoice status
  └─ Jobs (if PAID)

CREDIT TRANSACTION HISTORY
┌──────────────────────────┐
│ Admin views:             │
│ /admin/clients/[id]      │
│ → Transactions tab       │
└──────────────────────────┘
     ↓
  [ Load credit_transactions for client ]
     ↓
  GET /api/clients/[id]/credit-history
     ↓
  [ Service: getClientCreditHistory() ]
  ├─ Query credit_transactions
  │  where client_id = id
  │  order by created_at DESC
  ├─ For each transaction:
  │  ├─ type: CREDIT_ADDED | DEDUCTED | REFUNDED
  │  ├─ amount: positive (stored as deduction for DEDUCTED)
  │  ├─ reason: enum or string
  │  ├─ balance_before, balance_after
  │  ├─ invoice_id (if associated)
  │  └─ created_at
  └─ Return paginated list
     ↓
  [ Display transaction table ]
  ├─ Date | Type | Reason | Amount | Balance
  └─ Linked invoice (if applicable)

WALLET BALANCE CALCULATION
┌────────────────────────────┐
│ At any point:              │
│                            │
│ wallet_balance =           │
│   SUM(ADDED) -             │
│   SUM(DEDUCTED) +          │
│   SUM(REFUNDED)            │
│                            │
│ Never negative             │
└────────────────────────────┘

REFUND FLOW (Future)
┌─────────────────────┐
│ Invoice PAID via    │
│ credit, later       │
│ reversed            │
└─────────────────────┘
     ↓
  [ Admin clicks "Refund Credit" ]
     ↓
  POST /api/invoices/[id]/refund-credit
  { amount }
     ↓
  [ Service: refundCreditFromInvoice() ]
  ├─ Validate invoice was PAID via credit
  ├─ Create refund transaction
  │  ├─ type = REFUNDED
  │  └─ amount = credit_amount
  ├─ Update clients.wallet_balance += amount
  ├─ Update invoice status (if partial refund)
  └─ Log activity
```

### 4.2 State Transitions & Validation Points

**Credit Transaction Types:**

| Type | Direction | When | Reversible | Notes |
|------|-----------|------|-----------|-------|
| CREDIT_ADDED | + | Admin adds credit | No (recorded) | Tracked for audit |
| CREDIT_DEDUCTED | - | Client applies to invoice | Yes (refund) | Immediate wallet update |
| CREDIT_REFUNDED | + | Admin refunds previous deduction | No (recorded) | Reverses transaction |

**Validation Points:**

*Add Credit:*
- Admin role required
- Amount > 0
- Reason in enum: [GIFT, ADJUSTMENT, RETURN, OTHER]
- Client exists
- No max limit (admin controlled)

*Apply Credit:*
- Client role required (must own invoice)
- Amount > 0
- Amount <= balance_due (cannot overpay)
- Amount <= wallet_balance (sufficient funds)
- Invoice status not VOIDED/WRITTEN_OFF
- Invoice not already PAID

*Balance Calculation:*
- Wallet never negative
- Balance = sum of all transactions (immutable)
- Not stored in clients table, calculated on read

### 4.3 Integration Points

```
Add Client Credit
├── Load client (verify exists)
├── Validate amount + reason
├── Call database RPC: add_client_credit()
│  ├─ Acquire row lock on clients
│  ├─ Query sum(transactions ADDED - DEDUCTED + REFUNDED)
│  ├─ Calculate new_balance = balance + amount
│  ├─ Insert credit_transaction
│  │  ├─ type: CREDIT_ADDED
│  │  ├─ amount
│  │  ├─ reason (enum)
│  │  ├─ notes
│  │  ├─ balance_before, balance_after
│  │  └─ created_by: admin_user_id
│  └─ Update clients.wallet_balance = new_balance
├── Revalidate client detail pages
├── Log activity (CLIENT_CREDIT_ADDED)
└── Return { newBalance, transactionId }

Apply Credit to Invoice
├── Load invoice + client
├── Verify client ownership
├── Validate amount (> 0, <= balance_due, <= wallet_balance)
├── Call database RPC: deduct_client_credit()
│  ├─ Acquire row lock on clients
│  ├─ Verify wallet_balance >= amount
│  ├─ Insert credit_transaction
│  │  ├─ type: CREDIT_DEDUCTED
│  │  ├─ amount
│  │  ├─ reason: "invoice_payment"
│  │  ├─ invoice_id
│  │  ├─ balance_before, balance_after
│  │  └─ created_by: user_id
│  ├─ Update clients.wallet_balance -= amount
│  └─ Return { deducted, newBalance }
├── Create invoice_payments record
│  ├─ amount
│  ├─ method: "WALLET_CREDIT"
│  ├─ created_at
│  └─ invoice_id
├── Recalculate invoice status:
│  ├─ If balance_due <= 0: status = PAID
│  └─ Else: status = PARTIALLY_PAID
├── If status = PAID:
│  └── Create jobs from invoice lines
├── Revalidate /client/orders, /invoices
├── Log activity (CREDIT_APPLIED_TO_INVOICE)
└── Return { appliedAmount, newBalance, invoiceStatus }

Get Credit History
├── Load credit_transactions for client
├── Order by created_at DESC
├── Paginate results
├── For each transaction:
│  ├─ Map to CreditTransactionDTO
│  ├─ Include linked invoice (if any)
│  └─ Calculate cumulative balance
└── Return paginated list

View Wallet Balance
├── Load client
├── Query all credit_transactions for client
├── Calculate: balance = sum(added) - sum(deducted) + sum(refunded)
├── Clamp to >= 0
└── Return balance
```

### 4.4 Test Scenario Outlines

**Scenario 4.1: Happy Path - Add Credit → Apply to Invoice**
```
GIVEN: Admin logged in, client exists with $0 wallet
WHEN:
  1. Admin visits /admin/clients/[id]
  2. Clicks "Add Credit" button
  3. Enters amount: $100, reason: GIFT, notes: "Loyalty bonus"
  4. Clicks "Add"
  5. Verify wallet_balance displays $100
  6. Verify activity log shows credit addition
  7. Verify credit_transaction created (CREDIT_ADDED, amount=$100)
  8. Admin creates invoice for same client ($75)
  9. Invoice status = DRAFT, balance_due = $75
  10. Admin sends invoice to client
  11. Client logs in, views invoice
  12. Clicks "Use Wallet Credit"
  13. Modal shows max amount: $75 (min of wallet & due)
  14. Client applies $75 credit
  15. Verify wallet_balance decreases to $25
  16. Verify invoice status = PAID
  17. Verify balance_due = $0
  18. Verify credit_transaction created (CREDIT_DEDUCTED, amount=$75)
  19. Verify 1 job created (QUEUED)
  20. Verify email sent (payment-confirmation)
THEN: Credit lifecycle complete, invoice paid via credit
```

**Scenario 4.2: Partial Credit Application**
```
GIVEN: Client has $50 wallet, invoice = $200
WHEN:
  1. Client applies $50 credit
  2. Verify wallet_balance = $0
  3. Verify invoice status = PARTIALLY_PAID
  4. Verify balance_due = $150
  5. Verify no jobs created (not fully paid)
  6. Admin adds manual payment $150
  7. Verify invoice status = PAID
  8. Verify jobs created
THEN: Partial credit combined with other payments
```

**Scenario 4.3: Credit History Audit**
```
GIVEN: Client with multiple credit transactions
WHEN:
  1. Admin visits /admin/clients/[id]
  2. Clicks "Credit History" tab
  3. Verify all transactions listed:
     - Date | Type | Reason | Amount | Balance
  4. Verify CREDIT_ADDED entries show + amount
  5. Verify CREDIT_DEDUCTED entries show - amount
  6. Verify balance_before/after calculated correctly
  7. Verify invoice_id linked (if applicable)
THEN: Complete audit trail visible
```

**Scenario 4.4: Insufficient Credit Check**
```
GIVEN: Client has $50 wallet, invoice = $100
WHEN:
  1. Client tries to apply $100 credit
  2. Modal max amount auto-set to $50
  3. Client tries to apply $100 anyway (manual input)
  4. API returns 400: "Insufficient credit balance"
THEN: Credit validation prevents overapplication
```

**Scenario 4.5: Zero Wallet After Credit**
```
GIVEN: Client has $100 wallet, invoice = $100
WHEN:
  1. Client applies entire $100 credit
  2. Verify wallet_balance = $0 (not negative)
  3. Verify invoice status = PAID
THEN: Wallet cannot go negative
```

**Scenario 4.6: Multiple Invoices, Single Wallet**
```
GIVEN: Client has $100 wallet, 2 invoices ($50 + $40)
WHEN:
  1. Client applies $50 credit to invoice 1
  2. Verify wallet_balance = $50
  3. Verify invoice 1 status = PAID
  4. Client applies $40 credit to invoice 2
  5. Verify wallet_balance = $10
  6. Verify invoice 2 status = PAID
  7. Verify both invoices' jobs created
THEN: Wallet shared across invoices
```

**Scenario 4.7: Reason Tracking for Compliance**
```
GIVEN: Multiple credit additions with different reasons
WHEN:
  1. Admin adds $50 with reason: ADJUSTMENT
  2. Admin adds $100 with reason: RETURN
  3. Admin adds $75 with reason: GIFT
  4. View credit history
  5. Verify each has correct reason
THEN: Reasons tracked for audit/compliance
```

### 4.5 Success Criteria

- [ ] Admin can add credit to client wallet
- [ ] Credit reason tracked for audit
- [ ] Wallet balance updates immediately on add/deduct
- [ ] Client can apply credit only to own invoices
- [ ] Credit amount capped at min(wallet_balance, balance_due)
- [ ] Invoice status = PAID only after full payment (or credit)
- [ ] Jobs created after full payment
- [ ] Credit transactions immutable (no edit/delete)
- [ ] Transaction history shows all credits added/deducted
- [ ] Balance_before/after calculated correctly
- [ ] Wallet cannot go negative
- [ ] Multiple invoices share single wallet
- [ ] Concurrent credit operations atomic (database RPC)
- [ ] Email sent when credit applied to invoice
- [ ] Activity log tracks all credit operations
- [ ] Invoice linked in credit history (if applicable)

---

## 5. CLIENT OPERATIONS WORKFLOW

### 5.1 Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│              Client Operations Complete Workflow                         │
└─────────────────────────────────────────────────────────────────────────┘

CLIENT ONBOARDING
┌──────────────────┐
│ /signup          │
│ Client fills:    │
│ ├─ Email         │
│ ├─ Password      │
│ ├─ Name          │
│ ├─ Phone         │
│ ├─ Business name │
│ └─ Position      │
└──────────────────┘
     ↓
  POST /api/auth/signup
  {
    email,
    password,
    firstName,
    lastName,
    phone,
    businessName,
    position
  }
     ↓
  [ Service: handleSignup() ]
  ├─ Validate email format (unique)
  ├─ Validate password strength
  ├─ Create Supabase Auth user
  ├─ Create clients record:
  │  ├─ name
  │  ├─ email
  │  ├─ phone
  │  ├─ company: businessName
  │  ├─ position
  │  ├─ wallet_balance: 0
  │  ├─ student_discount_verified: false
  │  └─ payment_terms: default
  ├─ Create users record:
  │  ├─ user_id: from Supabase Auth
  │  ├─ role: CLIENT
  │  ├─ client_id: from clients
  │  └─ created_at
  ├─ Send welcome email
  ├─ Log activity (CLIENT_REGISTERED)
  └─ Create session
     ↓
  ┌──────────────────────┐
  │ Client redirected to │
  │ /client (dashboard)  │
  └──────────────────────┘

CLIENT DASHBOARD
┌──────────────────────┐
│ /client              │
│ Dashboard displays:  │
│ ├─ Wallet balance    │
│ ├─ Recent orders     │
│ ├─ Active projects   │
│ └─ Quick actions     │
└──────────────────────┘
     ↓
  [ Load dashboard data ]
  ├─ listClientInvoices(limit: 5)
  ├─ getClientWalletBalance()
  ├─ listActiveProjects()
  └─ getUnreadMessageCount()

CLIENT ORDER PLACEMENT
┌──────────────────┐
│ /client/orders   │
│ (list invoices)  │
└──────────────────┘
     ├─ View all invoices
     ├─ Filter by status
     ├─ Search by number
     └─ Pagination
     
     ↓ or
     
┌──────────────────────┐
│ /quick-order         │
│ (place new order)    │
└──────────────────────┘
     ├─ Upload STL files
     ├─ Configure options
     ├─ Review pricing
     └─ Checkout with payment

CLIENT PAYMENT OPTIONS
┌───────────────────┐
│ /client/orders/[id]
│ (Invoice detail)  │
├─ Balance due > 0  │
└───────────────────┘
     ↓
  [ Three payment methods ]
  ├─ [Stripe]
  │  ├─ Click "Pay Online"
  │  ├─ Redirected to Stripe checkout
  │  ├─ Enter card details
  │  ├─ Stripe webhook confirms
  │  └─ Invoice marked PAID
  ├─ [Wallet Credit]
  │  ├─ Click "Use Wallet Credit"
  │  ├─ Select amount (max = min(wallet, due))
  │  ├─ Confirm
  │  ├─ Wallet deducted immediately
  │  └─ Invoice status updated
  └─ [Admin Manual]
      ├─ Admin adds payment via API
      └─ Email sent to client

CLIENT PROJECT TRACKING
┌─────────────────────────┐
│ /client/projects/active │
│ View:                   │
│ ├─ Project names        │
│ ├─ Job status summary   │
│ ├─ Queue depth          │
│ └─ Est. completion      │
└─────────────────────────┘
     ↓
  [ Click project to view jobs ]
     ↓
  ┌──────────────────────┐
  │ Job status tiles:    │
  │ ├─ Status: PRINTING  │
  │ ├─ Progress: 45%     │
  │ ├─ Time remaining    │
  │ └─ Last update time  │
  └──────────────────────┘

CLIENT MESSAGING
┌────────────────────┐
│ /client/messages   │
│ Conversation view  │
├─ Read all messages │
├─ From admin + self │
└─ Linked to invoice │
└────────────────────┘
     ↓
  [ Client types message ]
     ↓
  POST /api/messages
  {
    content,
    invoiceId? (optional)
  }
     ↓
  [ Service: createMessage() ]
  ├─ Validate content (not empty)
  ├─ Create messages record:
  │  ├─ sender: CLIENT
  │  ├─ user_id: client user_id
  │  ├─ content
  │  ├─ invoice_id (if linked)
  │  └─ created_at
  ├─ Log activity
  ├─ Notify admin (email)
  └─ Return message
     ↓
  [ Message appears in conversation ]
  ├─ Displayed immediately (local optimistic)
  └─ Admin notified of new message

CLIENT ADDRESS MANAGEMENT
┌─────────────────────┐
│ /client/profile     │
│ (or settings)       │
│ ├─ View address     │
│ ├─ Edit address     │
│ └─ Set default      │
└─────────────────────┘
     ↓
  [ Client edits address ]
     ↓
  POST /api/clients/[id]
  { address, ... }
     ↓
  [ Service: updateClientProfile() ]
  ├─ Verify ownership
  ├─ Update clients.address
  ├─ Log activity
  └─ Revalidate profile pages
     ↓
  [ Address used in quick-order checkout ]

CLIENT PROFILE
┌──────────────────────────┐
│ /client/profile          │
│ View/Edit:               │
│ ├─ Name                  │
│ ├─ Email                 │
│ ├─ Phone                 │
│ ├─ Business name         │
│ ├─ Address               │
│ ├─ Wallet balance (view) │
│ └─ Recent orders link    │
└──────────────────────────┘

STUDENT DISCOUNT VERIFICATION
┌──────────────────────────┐
│ Student discount check:  │
│ ├─ Email domain check    │
│ │  (.edu.au, etc.)       │
│ ├─ Manual verification   │
│ │  by admin              │
│ └─ Flag in DB            │
└──────────────────────────┘
     ↓
  [ If verified ]
     ↓
  [ Auto-applied on quick-order pricing ]
  ├─ Shows in pricing breakdown
  ├─ Can be toggled by client (if verified)
  └─ Saved for future orders
```

### 5.2 State Transitions & Validation Points

**Client Onboarding States:**

| Stage | Status | Actions | Next |
|-------|--------|---------|------|
| Registration | Unverified email | Verify email (optional) | Active |
| Active | Ready to order | Place orders, view projects | - |
| Suspended | Disabled by admin | None (admin action to reactivate) | Suspended/Active |

**Client Profile Validation:**

*Registration:*
- Email: valid format, unique in Supabase Auth + clients table
- Password: >= 8 chars, mixed case, numbers (configurable)
- Name: not empty, <= 100 chars
- Phone: valid format (optional)
- Business name: <= 100 chars (optional)
- Position: <= 50 chars (optional)

*Profile Updates:*
- Email: cannot be changed by client (admin-only)
- Phone: valid format or empty
- Address: valid structure (optional)
- Payment terms: must exist in settings

*Order Permissions:*
- Client can only view own invoices
- Client can only apply own wallet credit
- Client can only access own projects
- Client cannot access admin routes

### 5.3 Integration Points

```
Client Registration (Signup)
├── Validate email + password
├── Create Supabase Auth user
├── Create clients record:
│  ├─ name (firstName + lastName)
│  ├─ email
│  ├─ phone
│  ├─ company: businessName
│  ├─ position
│  ├─ wallet_balance: 0
│  ├─ payment_terms: default (from settings)
│  └─ student_discount_verified: false
├── Create users record:
│  ├─ user_id (from Supabase)
│  ├─ role: CLIENT
│  └─ client_id (from clients)
├── Send welcome email (email service)
├── Log activity (CLIENT_REGISTERED)
├── Create session (auth cookies)
└── Redirect to /client dashboard

Client Login
├── Authenticate via Supabase Auth
├── Load user profile (users table)
├── Load client profile (if role = CLIENT)
├── Resolve student discount status
├── Create session (auth cookies)
├── Redirect based on role:
│  ├─ CLIENT → /client
│  └─ ADMIN → /dashboard

View Client Dashboard
├── Load wallet_balance
├── List invoices (limit 5, DESC by created_at)
├── List active projects (jobs in QUEUED, PRINTING, etc.)
├── Count unread messages
└── Return dashboard data

View Orders List
├── Load client's invoices
├── Filter by status (optional)
├── Search by number/client name
├── Paginate (limit, offset)
├── Include payment status + balance_due
└── Return paginated list

View Order Detail
├── Load invoice
├── Verify client ownership
├── Load invoice_lines
├── Load invoice_payments
├── Load activity (messages, status changes)
├── Calculate balance_due
├── Return complete invoice detail

View Active Projects
├── Query projects where any job is in active status
├── Group by project
├── Calculate metrics:
│  ├─ Total jobs
│  ├─ Status breakdown
│  ├─ Estimated completion
│  └─ Total cost
└── Return project list with job summary

Send Message
├── Load client
├── Validate content not empty
├── Create messages record:
│  ├─ sender: CLIENT
│  ├─ user_id
│  ├─ content
│  ├─ invoice_id (if linked)
│  └─ created_at
├── Log activity
├── Email admin (if enabled)
└── Return message

Update Client Profile
├── Load client
├── Verify ownership (user_id matches)
├── Update allowed fields:
│  ├─ phone
│  ├─ business name (company)
│  ├─ position
│  ├─ address
│  └─ payment_terms
├── Log activity
└── Revalidate profile pages

Verify Student Discount
├── Check email domain (auto)
│  ├─ If .edu.au: auto-approve
│  ├─ Else: flag for admin review
├── Admin manually reviews + approves
├── Set student_discount_verified = true
├── Log activity
└── Auto-applied on quick-order pricing
```

### 5.4 Test Scenario Outlines

**Scenario 5.1: Happy Path - Signup → Dashboard → Quick-Order → Payment**
```
GIVEN: New user, not signed up
WHEN:
  1. Visit /signup
  2. Enter: email, password, name, phone, business name, position
  3. Click "Sign Up"
  4. Verify client record created in DB
  5. Verify users record created (role=CLIENT)
  6. Verify wallet_balance = 0
  7. Verify welcome email sent
  8. Verify redirected to /client dashboard
  9. Verify dashboard displays:
     - Wallet balance: $0
     - Recent orders: empty
     - Quick action: "New Order"
  10. Click "New Order" → /quick-order
  11. [Complete quick-order workflow]
  12. Verify invoice created with client_id
  13. Verify invoice visible in /client/orders
  14. Verify job visible in /jobs board
THEN: Full onboarding to first order
```

**Scenario 5.2: Login with Student Discount**
```
GIVEN: Client registered with .edu.au email
WHEN:
  1. Admin views client profile
  2. Verify student_discount_verified = true (auto)
  3. Client places quick-order
  4. Verify student discount applied (10% off)
  5. Verify "Student Discount" shown in pricing
THEN: Student discount auto-applied
```

**Scenario 5.3: View Orders with Status Filtering**
```
GIVEN: Client has 3 invoices (PAID, PARTIALLY_PAID, DRAFT)
WHEN:
  1. Client visits /client/orders
  2. Verify all 3 invoices listed
  3. Verify status badges colored correctly
  4. Click filter: "Unpaid"
  5. Verify only PARTIALLY_PAID + DRAFT shown
  6. Click filter: "Paid"
  7. Verify only PAID shown
THEN: Order filtering works
```

**Scenario 5.4: View Order Detail & Apply Credit**
```
GIVEN: Client has $50 wallet, invoice = $100 (DRAFT)
WHEN:
  1. Client visits /client/orders/[id]
  2. Verify invoice detail displayed:
     - Items table
     - Totals breakdown
     - Balance due: $100
     - Payment section
  3. Verify "Use Wallet Credit" button available
  4. Verify "Pay with Stripe" button available
  5. Click "Use Wallet Credit"
  6. Modal shows amount: $50 (max = min(wallet, due))
  7. Client applies $50
  8. Verify balance due updates to $50
  9. Verify invoice status = PARTIALLY_PAID
  10. Verify wallet_balance = $0 in dashboard
  11. Verify no jobs created yet
THEN: Partial payment via credit
```

**Scenario 5.5: Track Project Status**
```
GIVEN: Client has 2 active projects with jobs
WHEN:
  1. Client visits /client/projects/active
  2. Verify both projects listed:
     - Project name
     - Job count (2, 1)
     - Status breakdown (QUEUED, PRINTING)
     - Est. completion time
  3. Click project 1 to view jobs
  4. Verify job status tiles shown:
     - Job title
     - Status: PRINTING
     - Progress bar
     - Time remaining
     - Last update time
THEN: Project tracking visible to client
```

**Scenario 5.6: Send Message to Admin**
```
GIVEN: Client viewing invoice detail
WHEN:
  1. Click "Send Message" (linked to invoice)
  2. Type message: "Can you rush this?"
  3. Click "Send"
  4. Verify message appears in conversation
  5. Verify admin receives email notification
  6. Admin replies in /admin/clients/[id] → Messages
  7. Verify client sees reply in conversation
THEN: Bi-directional messaging works
```

**Scenario 5.7: Update Profile Address**
```
GIVEN: Client on /client/profile
WHEN:
  1. Click "Edit Address"
  2. Change postcode: 2000 → 4000
  3. Click "Save"
  4. Verify address updated in DB
  5. Place new quick-order
  6. On checkout, address pre-filled with new postcode
  7. Verify shipping calculated for new region
THEN: Profile changes affect new orders
```

**Scenario 5.8: Concurrent Logins**
```
GIVEN: Client with 2 devices (browser + mobile)
WHEN:
  1. Login on browser → session A
  2. Login on mobile → session B
  3. Both have valid tokens
  4. View /client on browser
  5. View /client on mobile
THEN: Both sessions work independently
```

**Scenario 5.9: Access Control - Client Cannot View Other Clients' Orders**
```
GIVEN: Client A logged in
WHEN:
  1. Try to access /client/orders/[invoice_id_of_client_B]
  2. API returns 403 Forbidden
  3. Try to access /admin/invoices
  4. Middleware redirects to /client
THEN: Access control enforced
```

### 5.5 Success Criteria

- [ ] Client registration creates user + client records
- [ ] Welcome email sent on signup
- [ ] Client redirected to /client dashboard
- [ ] Client can view only own invoices
- [ ] Client can view only own projects/jobs
- [ ] Client can send messages to admin
- [ ] Client can update own profile (phone, address)
- [ ] Student discount auto-applied if eligible
- [ ] Wallet balance tracked and displayed
- [ ] Recent orders shown on dashboard
- [ ] Active projects visible with job summaries
- [ ] Payment options available (Stripe, wallet, admin)
- [ ] Orders searchable + filterable
- [ ] Messages linked to invoices
- [ ] Profile changes affect new orders
- [ ] Concurrent login sessions work independently
- [ ] Client cannot access /admin routes
- [ ] Client cannot modify other clients' data

---

## 6. CROSS-WORKFLOW VALIDATION

### 6.1 Data Consistency Checks

```
After each workflow:
1. Invoice totals recalculated correctly
2. Balance_due = total - amount_paid (or credit_applied)
3. Jobs created only after full payment (or policy allows)
4. Wallet balance = sum(transactions)
5. Credit transactions immutable + linked to invoices
6. Activity log complete + no missing entries
7. Email notifications sent at correct points
8. Status transitions follow valid state machine
```

### 6.2 Integration Points Between Workflows

```
Quote → Invoice
  - Items copied exactly
  - Pricing inherited
  - Discount/tax same
  - Quote marked CONVERTED

Invoice → Payment
  - Balance recalculated
  - Status auto-updated
  - Jobs created after PAID

Invoice → Credit
  - Wallet deducted immediately
  - Invoice status updated
  - Jobs created if fully paid

Jobs ← Invoice
  - One job per line item
  - Created after payment
  - Status: QUEUED initially

Client ← Invoice/Job
  - Notifications sent
  - Projects updated
  - Dashboard refreshed
```

### 6.3 Error Scenarios to Test

```
1. Duplicate invoice number (race condition)
2. Quote conversion while admin editing
3. Payment added while client applies credit
4. Job status update while job being archived
5. Client deleted while invoice pending
6. Printer removed while job assigned
7. Material deprecated while quick-order in progress
8. Stripe session expired before client pays
9. File deleted while quick-order checkout in progress
10. Two concurrent quick-order checkouts (same user)
```

---

## 7. TEST EXECUTION SUMMARY

### Phase 3 Test Scenarios Count

| Workflow | Scenarios | Sub-tests | Total Test Points |
|----------|-----------|-----------|------------------|
| Quote → Invoice → Payment | 6 | 42 | 48 |
| Quick-Order Pipeline | 8 | 56 | 64 |
| Job Processing | 7 | 49 | 56 |
| Credit System | 7 | 49 | 56 |
| Client Operations | 9 | 63 | 72 |
| **Total** | **37** | **259** | **296** |

### Success Criteria Across All Workflows

- [ ] 100% of happy path scenarios pass
- [ ] 100% of error path scenarios handled gracefully
- [ ] All state transitions follow valid machine
- [ ] All validation points enforced
- [ ] All integration points working atomically
- [ ] All email notifications sent
- [ ] All activity logged
- [ ] All concurrent operations atomic
- [ ] All access control enforced
- [ ] All API responses correct

---

## 8. TECHNICAL NOTES

### Atomic Operations Required

```
Quote → Invoice Conversion:
  ├─ Create invoice
  ├─ Create invoice_lines
  ├─ Update quote_status = CONVERTED
  └─ Must succeed or fail together

Quick-Order Checkout:
  ├─ Move tmp_files → order_files
  ├─ Create invoice + lines
  ├─ Create jobs
  ├─ Process payment
  └─ Must succeed or fail together

Apply Credit:
  ├─ Deduct from wallet (RPC with row lock)
  ├─ Create invoice_payments
  ├─ Update invoice status
  └─ Create jobs (if fully paid)

Job Status Update:
  ├─ Update job status
  ├─ Set timestamps
  ├─ Create activity
  ├─ Send email (if COMPLETED/FAILED)
  └─ Revalidate board
```

### Idempotency Considerations

```
Stripe Webhook:
  - Must be idempotent (webhook may retry)
  - Check payment_intent already processed
  - Don't create duplicate invoice_payments

Email Sending:
  - Fire-and-forget (don't block order)
  - Retry logic in email service
  - Track sent status in activity

Revalidation:
  - Use Next.js ISR (on-demand)
  - Paths: /invoices, /jobs, /client/orders, /client/projects
```

---

