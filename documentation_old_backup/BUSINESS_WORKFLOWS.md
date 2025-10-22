# Business Workflows Documentation

Core business processes and state management for 3D Print Sydney platform.

---

## 1. Quote Management Workflow

### Lifecycle
```
DRAFT → PENDING → (ACCEPTED | DECLINED | CONVERTED)
```

### States
- **DRAFT**: Created, editable, not sent
- **PENDING**: Sent to client, awaiting response
- **ACCEPTED**: Client accepted quote
- **DECLINED**: Client rejected quote
- **CONVERTED**: Converted to invoice (one-way, irreversible)

### Key Operations

**Create Quote**
1. Validate input (client, items, totals)
2. Calculate line totals and document totals
3. Generate unique quote number (QT-XXXX)
4. Insert quote header + line items in transaction
5. Log activity: `QUOTE_CREATED`

**Send Quote**
1. Update status: DRAFT → PENDING
2. Set `sent_at` timestamp
3. Log activity: `QUOTE_SENT`

**Accept/Decline Quote**
1. Update status → ACCEPTED/DECLINED
2. Record decision timestamp and optional note
3. Log activity with note metadata

**Convert to Invoice**
1. Load quote with all items
2. Generate invoice number (INV-XXXX)
3. Copy all quote data to invoice (amount, lines, discounts, shipping)
4. Create invoice items from quote items
5. Update quote: status → CONVERTED, set `converted_invoice_id`
6. Trigger job creation if policy = ON_INVOICE
7. Log activity: `QUOTE_CONVERTED`

**Duplicate Quote**
1. Load source quote with items
2. Create new quote in DRAFT status
3. Copy all fields (terms, discounts, shipping, items)
4. Generate new quote number
5. Reset issue date to current
6. Return new quote ID and number

### Quote Calculations
- Line total: `quantity × unitPrice - lineDiscount + tax`
- Subtotal: sum of all line totals
- Document discount applied to subtotal
- Final total: subtotal + shipping + documentDiscount ± tax

---

## 2. Invoice Management Workflow

### Lifecycle
```
PENDING → (PAID | OVERDUE)
```

### States
- **PENDING**: Awaiting payment, payment due date tracked
- **PAID**: Fully paid (balance_due = 0)
- **OVERDUE**: PENDING but past due date

### Creation Methods

**Direct Creation**
1. Validate client and line items
2. Resolve payment terms from client profile or defaults
3. Calculate due date: issue_date + term.days
4. Calculate totals (same as quotes)
5. Create invoice + items in RPC transaction
6. Trigger job creation if policy = ON_INVOICE
7. Log activity: `INVOICE_CREATED`

**Convert from Quote** (see Quote workflow)

**Revert from Quote** (see section below)

### Payment Tracking

**Payment Recording**
1. Validate amount and method
2. Call `add_invoice_payment` RPC
3. System updates balance_due automatically
4. When balance_due reaches 0 → status = PAID
5. Log activity: `INVOICE_PAYMENT_ADDED`
6. If status now = PAID and policy = ON_PAYMENT → create job

**Payment Methods**
- STRIPE: Automated via webhook
- MANUAL: Admin-recorded payments
- OTHER: Generic payment type

### Actions

**Void Invoice**
- Precondition: status NOT PAID
- Effect: status → PENDING, set `voided_at`, record reason
- Use case: Cancel/mistake invoices

**Write-Off Invoice**
- Precondition: balance_due > 0
- Effect: status → PAID, balance_due = 0, set `written_off_at`, record reason
- Use case: Bad debt, forgiven balance

**Mark Paid (No Amount)**
- Mark entire invoice as paid (balance_due = 0)
- No payment record created
- Log activity: `INVOICE_MARKED_PAID`

**Revert to Quote**
- Precondition: status NOT PAID, no payments, no jobs linked
- Effect: Delete invoice, create new DRAFT quote from invoice data
- Preserves all line items
- Return quote ID and number
- Clear attachments from storage
- Log bidirectional activities

---

## 3. Payment Processing

### Stripe Checkout Flow

**Create Checkout Session**
1. Check invoice status (must be PENDING or OVERDUE)
2. Calculate balance_due (remaining amount)
3. Call Stripe API: `checkout.sessions.create()`
   - Mode: payment
   - Payment methods: card
   - Amount: balance_due (in cents)
   - Metadata: invoiceId, invoiceNumber
4. Store session ID + URL in invoice record
5. Return checkout URL for client
6. Log activity: `STRIPE_CHECKOUT_CREATED`

**Webhook: checkout.session.completed**
1. Extract invoiceId from metadata
2. Calculate payment amount: amount_total / 100
3. Call `markInvoicePaid()` with:
   - method: STRIPE
   - amount: calculated
   - processor: "stripe"
   - reference: session.id
4. Clear invoice `stripe_session_id` and `stripe_checkout_url`
5. Log activity: `STRIPE_CHECKOUT_COMPLETED`
6. Idempotency: Record processed event in `webhook_events` table

**Payment Balance Calculation**
```
balance_due = total - sum(payments.amount)
```
Updated automatically by `add_invoice_payment` RPC.

---

## 4. Job Lifecycle Management

### 11 Job Statuses

| Status | Category | Description |
|--------|----------|-------------|
| QUEUED | Queued | Initial state, waiting for processing |
| PRE_PROCESSING | Queued | Preliminary setup/validation |
| IN_QUEUE | Queued | In printer queue |
| PRINTING | Active | Currently printing |
| PAUSED | Active | Paused mid-print |
| PRINTING_COMPLETE | Post-Print | Print finished |
| POST_PROCESSING | Post-Print | Cleaning, support removal |
| PACKAGING | Post-Print | Being packaged |
| OUT_FOR_DELIVERY | Post-Print | Shipped |
| COMPLETED | Archive | Fully done |
| CANCELLED | Archive | User cancelled |

### Creation Triggers

**Policy: ON_INVOICE** (default)
- Triggered when invoice created or quote converted to invoice
- Runs before user sees invoice

**Policy: ON_PAYMENT**
- Triggered when invoice payment received and balance_due = 0
- Runs after payment confirmation

### Job Creation Process
1. Load invoice with line items
2. Generate job title: `"Invoice {number}"`
3. Detect priority:
   - Check items for "fast track" keyword
   - If found: priority = FAST_TRACK
   - Else: priority = NORMAL
4. Calculate next queue position (unassigned queue)
5. Insert job: status = PRE_PROCESSING, printer_id = null
6. Log activity: `JOB_CREATED`

### Printer Assignment
1. Validate printer is assignable:
   - Not OFFLINE (if setting enabled)
   - Not in MAINTENANCE (if setting enabled)
2. Check active job count < max_active_printing_per_printer
3. Calculate new queue position for target printer
4. Update job: printer_id, queue_position
5. Log update

### Queue Management

**Queue Position Calculation**
- Unassigned: global queue
- Assigned: per-printer queue
- Next position = max(existing positions) + 1

**Status Transitions Impact on Queue**
- PRINTING start: set `started_at`, `last_run_started_at`
- PAUSED: accumulate hours since last_run_started_at
- COMPLETED: accumulate final hours, set `completed_at`
  - If auto-detach enabled: move to unassigned (queue_position = global_max + 1)
  - If auto-archive=0: immediately archive
- QUEUED state reset: clear started_at, completed_at, actual_hours
- CANCELLED: archive immediately, clear printer assignment

**Hour Tracking**
```
actual_hours = accumulated + (now - last_run_started_at)
```
Accumulates each pause/complete cycle.

### Completion & Archival
- Manual archival: `archived_at` + optional reason
- Auto-archival: When completed and `auto_archive_completed_jobs_after_days = 0`
- Bulk archive: Archive multiple jobs with reason

---

## 5. Quick Order Self-Service Flow

### 7-Step Process

**Step 1: Upload Files**
- Client uploads 3D model files (STL, STEP, etc.)
- System stores in temp file storage
- Returns file IDs for client reference

**Step 2: Configure Items**
For each uploaded file:
- Select material and material properties (layer height, infill)
- Configure support options (disabled, normal, tree)
- Input quantity

**Step 3: Run Calculator**
- Server calculates metrics for each item:
  - Weight (grams)
  - Print time (seconds)
  - Fallback flag if estimation uncertain
- Accept or recalculate with different settings

**Step 4: Get Pricing**
- Call `priceQuickOrder()`:
  - Unit price = max(minimumPrice, materialCost + timeCost + setupFee)
  - Line total = unitPrice × quantity
  - Subtotal = sum(line totals)
  - Shipping = region-based lookup + remote surcharge
  - Tax = taxRate applied to subtotal
- Display itemized breakdown

**Step 5: Confirm Shipping**
- Client provides state/postcode
- System matches to shipping region
- Apply remote surcharge if applicable
- Display final total

**Step 6: Create Invoice**
- Create invoice from quick order:
  - Line items from configured items
  - Shipping from selected region
  - Auto-calculated totals
- Generate invoice number
- Log activity

**Step 7: Trigger Job Creation**
- If policy = ON_INVOICE: create job immediately
- If policy = ON_PAYMENT: await payment
- Return invoice + checkout link (if Stripe enabled)

### Configuration Options

**Calculator Pricing**
- hourlyRate: $/hour for print time
- setupFee: per-item fixed fee
- minimumPrice: minimum charge regardless of calculation

**Shipping Regions**
- baseAmount: standard shipping
- remoteSurcharge: extra for remote postcodes
- postcodePrefix: identify remote areas
- states: which states covered

**Tax**
- taxRate: percentage applied to subtotal (0-100%)

### Pricing Calculation
```
materialCost = grams × costPerGram
timeCost = (timeSec / 3600) × hourlyRate
base = materialCost + timeCost + setupFee
unitPrice = max(minimumPrice, base)
total = unitPrice × quantity
```

---

## 6. Client Onboarding & Management

### Registration Methods

**Admin Creation**
- Admin creates client profile:
  - Name, company, email, phone, ABN
  - Payment terms (defaults to system default)
  - Address, tags, notes
- Client receives email invitation (future)
- Activity logged: `CLIENT_CREATED`

**Self-Registration** (future)
- Client signs up via portal
- Creates account and profile simultaneously
- Auto-verified via email

### Portal Access
- Clients see own quotes, invoices, jobs
- View job status updates
- Download invoices and attachments
- Submit quick orders
- Update notification preferences

### Payment Terms
- Set per-client from dropdown
- Defaults to system default if not set
- Used for due date calculation:
  - due_date = issue_date + term.days
- Options: NET30, NET60, DUE_ON_RECEIPT, CUSTOM, etc.

### Client Profiles
- Payment terms code stored
- Notification preference for job status emails
- Tags for categorization
- Outstanding balance calculated from unpaid invoices
- Related data: invoices, quotes, jobs, activity

---

## 7. Document Numbering

### Sequence Management

**Quote Numbers**: QT-0001, QT-0002, ...
**Invoice Numbers**: INV-0001, INV-0002, ...

**Generation Process**
1. Call RPC: `next_document_number(kind, prefix)`
2. RPC logic:
   - Query max existing number for kind
   - Increment sequence
   - Format with prefix + 4-digit zero-padded number
3. Atomicity: RPC ensures no duplicates across concurrent requests
4. Return formatted number string

**Usage**
- Called during quote creation
- Called during invoice creation (direct or from quote)
- Called during quote-to-invoice conversion
- Called during invoice-to-quote revert

---

## 8. Activity Logging

### Logged Events

| Action | Trigger | Metadata |
|--------|---------|----------|
| QUOTE_CREATED | New quote | quote_id, number |
| QUOTE_UPDATED | Quote edited | quote_id, number |
| QUOTE_SENT | Quote sent to client | quote_id, number |
| QUOTE_ACCEPTED | Client accepts | quote_id, note |
| QUOTE_DECLINED | Client declines | quote_id, note |
| QUOTE_CONVERTED | Convert to invoice | quote_id, invoice_id |
| QUOTE_DUPLICATED | Duplicate action | quote_id, source_id |
| INVOICE_CREATED | New invoice | invoice_id, number |
| INVOICE_UPDATED | Invoice edited | invoice_id, number |
| INVOICE_PAYMENT_ADDED | Payment recorded | invoice_id, payment_id |
| INVOICE_MARKED_PAID | Manual mark paid | invoice_id, amount |
| INVOICE_WRITTEN_OFF | Bad debt write-off | invoice_id, reason |
| INVOICE_VOIDED | Invoice voided | invoice_id, reason |
| INVOICE_REVERTED_TO_QUOTE | Invoice → Quote | invoice_id, quote_id |
| JOB_CREATED | Auto or manual creation | job_id, invoice_id |
| JOB_STATUS | Status change | job_id, new_status, note |
| JOB_ARCHIVED | Job archived | job_id, reason |
| CLIENT_CREATED | New client | client_id, name |
| CLIENT_UPDATED | Client profile updated | client_id, name |
| CLIENT_NOTE | Admin adds note | client_id, message |
| STRIPE_CHECKOUT_CREATED | Checkout session created | invoice_id, session_id |
| STRIPE_CHECKOUT_COMPLETED | Payment received | invoice_id, amount |

### Audit Trail
- Chronological record per client
- Links to related documents (invoices, quotes, jobs)
- Searchable by action, date, document type
- Retention: permanent (for compliance)

---

## State Transition Rules

### Quote → Invoice
- Quote must exist (any status)
- Creates PENDING invoice
- Updates quote: status = CONVERTED
- One-way (quote locked)

### Invoice → Quote (Revert)
- Invoice must be PENDING or OVERDUE
- No payments recorded
- No jobs linked
- Creates new DRAFT quote
- Deletes invoice permanently
- Clears attachments

### Job Creation Policy
- **ON_INVOICE**: Jobs created when invoice created or quote converted
- **ON_PAYMENT**: Jobs created only when payment received (balance_due = 0)
- Configured globally in settings

### Printer Assignment Constraints
- Prevent assignment to OFFLINE printers (configurable)
- Prevent assignment to MAINTENANCE printers (configurable)
- Max active printing jobs per printer enforced
- Cannot start PRINTING without printer assigned

---

## Calculation Engines

### Totals Calculation
```
subtotal = sum(line_totals)
document_discount = apply(discountType, discountValue) to subtotal
discounted_subtotal = subtotal - document_discount
taxable = discounted_subtotal + shipping
tax_total = taxable × (taxRate / 100)
total = discounted_subtotal + shipping + tax_total
balance_due = total - sum(payments)
```

### Quick Order Pricing
```
Per-item unit price:
  materialCost = grams × costPerGram
  timeCost = (timeSec / 3600) × hourlyRate
  base = materialCost + timeCost + setupFee
  unitPrice = max(minimumPrice, base)

Shipping by region:
  baseAmount + (isRemote ? remoteSurcharge : 0)
```

---

## Error Handling

### Precondition Validation
- Quote must exist before operations
- Invoice must have at least one line item
- Client must exist for document creation
- Printer must be assignable before job printing

### Transaction Safety
- Multi-step operations use RPC transactions (quotes, invoices)
- Activity logs recorded even if primary operation fails
- Cascade deletes handled (e.g., quote deletion)

### Idempotency
- Stripe webhooks: deduplicate by event ID in webhook_events table
- Numbering: RPC ensures atomic sequence generation
- Payment recording: Prevent duplicate payments via unique constraints

---

## Configuration Settings

### Operations
- `auto_detach_job_on_complete`: Move job to unassigned when done
- `auto_archive_completed_jobs_after_days`: Archive threshold (0 = immediate)
- `prevent_assign_to_offline`: Block offline printer assignment
- `prevent_assign_to_maintenance`: Block maintenance printer assignment
- `max_active_printing_per_printer`: Concurrent job limit

### Payments
- `job_creation_policy`: ON_INVOICE or ON_PAYMENT
- `enable_email_send`: Enable/disable notification emails

### Billing
- `default_payment_terms`: Fallback term code
- `payment_terms`: Array of term objects (code, label, days)
- `tax_rate`: Global tax rate (0-100%)
- `calculatorConfig.hourlyRate`: Print time cost
- `calculatorConfig.setupFee`: Per-item setup cost
- `calculatorConfig.minimumPrice`: Minimum charge
- `shippingRegions`: Array of region objects
- `defaultShippingRegion`: Fallback region code

