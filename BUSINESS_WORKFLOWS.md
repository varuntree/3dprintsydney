# Business Workflows Documentation

This document describes the actual business workflows, state machines, business rules, and automated processes as implemented in the 3D Print Sydney application.

---

## Table of Contents

1. [Quote Lifecycle](#quote-lifecycle)
2. [Invoice Management](#invoice-management)
3. [Payment Processing](#payment-processing)
4. [Job Lifecycle](#job-lifecycle)
5. [Quick Order Flow](#quick-order-flow)
6. [Client Onboarding](#client-onboarding)
7. [Document Numbering](#document-numbering)
8. [Automated Workflows](#automated-workflows)
9. [Business Rules & Calculations](#business-rules--calculations)

---

## Quote Lifecycle

### Quote States

```
DRAFT → PENDING → ACCEPTED/DECLINED/CONVERTED
```

| Status | Description | Can Transition To |
|--------|-------------|------------------|
| `DRAFT` | Initial state, quote being prepared | PENDING |
| `PENDING` | Quote sent to client, awaiting decision | ACCEPTED, DECLINED, CONVERTED |
| `ACCEPTED` | Client accepted the quote | CONVERTED |
| `DECLINED` | Client declined the quote | (Terminal state) |
| `CONVERTED` | Quote converted to invoice | (Terminal state) |

### Quote Operations & State Transitions

#### 1. **Create Quote**
- **Initial State**: `DRAFT`
- **Actions**:
  - Generates sequential quote number (via `nextDocumentNumber('quote')`)
  - Calculates line item totals using discount logic
  - Calculates document totals (subtotal, tax, shipping)
  - Records `QUOTE_CREATED` activity log

#### 2. **Send Quote**
- **Transition**: `DRAFT` → `PENDING`
- **Actions**:
  - Sets `sent_at` timestamp to current datetime
  - Updates status to `PENDING`
  - Records `QUOTE_SENT` activity log
- **Implementation**: `sendQuote(id)`

#### 3. **Accept Quote**
- **Transition**: `PENDING` → `ACCEPTED`
- **Actions**:
  - Sets `accepted_at` timestamp
  - Updates status to `ACCEPTED`
  - Optionally stores `decision_note`
  - Records `QUOTE_ACCEPTED` activity log
- **Implementation**: `acceptQuote(id, note?)`

#### 4. **Decline Quote**
- **Transition**: `PENDING` → `DECLINED`
- **Actions**:
  - Sets `declined_at` timestamp
  - Updates status to `DECLINED`
  - Optionally stores `decision_note`
  - Records `QUOTE_DECLINED` activity log
- **Implementation**: `declineQuote(id, note?)`

#### 5. **Convert Quote to Invoice**
- **Transition**: `ANY` → `CONVERTED`
- **Actions**:
  1. Generates new invoice number
  2. Creates invoice with status `PENDING`
  3. Copies all line items to invoice
  4. Copies pricing configuration (tax, discounts, shipping)
  5. Sets quote status to `CONVERTED`
  6. Links quote to invoice via `converted_invoice_id`
  7. Records `QUOTE_CONVERTED` activity log
  8. **Triggers Job Creation** based on `job_creation_policy`:
     - If policy is `ON_INVOICE`: Creates job immediately
- **Implementation**: `convertQuoteToInvoice(id)`

#### 6. **Update Quote**
- **Allowed States**: `DRAFT`, `PENDING`
- **Actions**:
  - Updates quote details and line items
  - Recalculates all totals
  - Replaces all line items (delete + insert)
  - Records `QUOTE_UPDATED` activity log

#### 7. **Duplicate Quote**
- **Actions**:
  - Creates new quote with status `DRAFT`
  - Generates new quote number
  - Copies all line items and settings
  - Sets new `issue_date` to current datetime
  - Records `QUOTE_DUPLICATED` activity log

### Quote Business Rules

- Quotes calculate totals using the same logic as invoices
- Payment terms are resolved from client settings or system defaults
- Expiry dates are optional
- All financial calculations use `calculateLineTotal()` and `calculateDocumentTotals()`

---

## Invoice Management

### Invoice States

```
PENDING → PAID
         ↓
      OVERDUE (status check based on due_date)
```

| Status | Description | Balance Characteristics |
|--------|-------------|------------------------|
| `PENDING` | Invoice created, awaiting payment | balance_due > 0 |
| `PAID` | Invoice fully paid | balance_due = 0 |
| `OVERDUE` | Invoice past due date (computed) | balance_due > 0, past due_date |

### Invoice Operations & State Transitions

#### 1. **Create Invoice**
- **Initial State**: `PENDING`
- **Actions**:
  1. Generates sequential invoice number
  2. Calculates due date from payment terms (via `deriveDueDate()`)
  3. Resolves payment terms from client or defaults
  4. Calculates all totals
  5. Sets `balance_due = total`
  6. Records `INVOICE_CREATED` activity log
  7. **Triggers Job Creation** based on `job_creation_policy`:
     - If policy is `ON_INVOICE`: Creates job immediately
- **Implementation**: Uses RPC `create_invoice_with_items`

#### 2. **Add Manual Payment**
- **Actions**:
  1. Records payment with amount, method, reference
  2. Recalculates `balance_due = total - sum(payments)`
  3. If `balance_due <= 0`:
     - Sets status to `PAID`
     - Sets `paid_at` timestamp
  4. Records `INVOICE_PAYMENT_ADDED` activity log
  5. **Triggers Job Creation** if status becomes `PAID` and policy is `ON_PAYMENT`
- **Implementation**: Uses RPC `add_invoice_payment`
- **Payment Methods**: `STRIPE`, `BANK_TRANSFER`, `CASH`, `OTHER`

#### 3. **Delete Payment**
- **Actions**:
  1. Removes payment record
  2. Recalculates `balance_due`
  3. If `balance_due > 0`: Sets status back to `PENDING`
  4. Clears `paid_at` timestamp
  5. Records `INVOICE_PAYMENT_DELETED` activity log
- **Implementation**: Uses RPC `delete_invoice_payment`

#### 4. **Mark Invoice Paid**
- **Transition**: `PENDING` → `PAID`
- **Validation**: Rejects if already `PAID`
- **Actions**:
  - Option A (with payment amount):
    1. Calls `addManualPayment()` with provided amount
  - Option B (without payment):
    1. Sets `balance_due = 0`
    2. Sets status to `PAID`
    3. Sets `paid_at` timestamp
    4. Records `INVOICE_MARKED_PAID` activity log
- **Implementation**: `markInvoicePaid(id, options?)`

#### 5. **Mark Invoice Unpaid**
- **Transition**: `PAID` → `PENDING`
- **Actions**:
  1. Recalculates `balance_due` from total and payments
  2. Sets status to `PENDING`
  3. Clears `paid_at` timestamp
  4. Records `INVOICE_MARKED_UNPAID` activity log
- **Implementation**: `markInvoiceUnpaid(id)`

#### 6. **Write Off Invoice**
- **Transition**: `PENDING` → `PAID`
- **Validation**: Rejects if already fully paid
- **Actions**:
  1. Sets `balance_due = 0`
  2. Sets status to `PAID`
  3. Sets `written_off_at` timestamp
  4. Stores `write_off_reason`
  5. Records `INVOICE_WRITTEN_OFF` activity log
- **Implementation**: `writeOffInvoice(id, reason?)`

#### 7. **Void Invoice**
- **Validation**: Cannot void a paid invoice
- **Actions**:
  1. Keeps status as `PENDING`
  2. Sets `voided_at` timestamp
  3. Stores `void_reason`
  4. Records `INVOICE_VOIDED` activity log
- **Implementation**: `voidInvoice(id, reason?)`

#### 8. **Revert Invoice to Quote**
- **Validation**:
  - Rejects if status is `PAID`
  - Rejects if invoice has payments
  - Rejects if invoice has associated jobs
- **Actions**:
  1. Creates new quote with status `DRAFT`
  2. Copies all line items and settings
  3. Deletes all invoice attachments from storage
  4. Deletes invoice record
  5. Records `INVOICE_REVERTED_TO_QUOTE` and `QUOTE_RESTORED_FROM_INVOICE` activity logs
- **Implementation**: `revertInvoiceToQuote(id)`

### Invoice Attachments

#### Upload Attachment
- **Validation**:
  - Max file size: 200 MB
  - Allowed types: PDF, PNG, JPEG, WebP, TXT, ZIP
- **Actions**:
  1. Validates file using `validateInvoiceAttachment()`
  2. Uploads to storage bucket
  3. Records attachment metadata in database
  4. Records `INVOICE_ATTACHMENT_ADDED` activity log

#### Remove Attachment
- **Actions**:
  1. Deletes file from storage
  2. Removes attachment record
  3. Records `INVOICE_ATTACHMENT_DELETED` activity log

#### Read Attachment
- **Actions**:
  1. Retrieves attachment metadata
  2. Generates signed URL (60-second expiry)
  3. Returns URL for client download

### Invoice Due Date Calculation

```typescript
function deriveDueDate(issueDate, paymentTerm, explicitDate?) {
  if (explicitDate) return explicitDate;
  if (!paymentTerm || paymentTerm.days <= 0) return issueDate;
  return addDays(issueDate, paymentTerm.days);
}
```

**Payment Terms Resolution**:
1. Check client's `payment_terms` field
2. Validate against system payment terms list
3. Fall back to `default_payment_terms` from settings
4. Fall back to first available payment term

---

## Payment Processing

### Stripe Integration Flow

#### 1. **Create Checkout Session**
- **Validation**:
  - Invoice cannot be already `PAID`
  - Balance due must be > 0
- **Actions**:
  1. Calculates amount in minor units (cents): `Math.round(balanceDue * 100)`
  2. Creates Stripe checkout session:
     - Mode: `payment`
     - Payment methods: `card`
     - Line item: Invoice number and client name
     - Metadata: `invoiceId`, `invoiceNumber`
  3. Stores `stripe_session_id` and `stripe_checkout_url` on invoice
  4. Records `STRIPE_CHECKOUT_CREATED` activity log
- **Implementation**: `createStripeCheckoutSession(invoiceId, options?)`
- **Refresh**: Setting `options.refresh = true` forces new session creation

#### 2. **Webhook: checkout.session.completed**
- **Idempotency**: Checks `webhook_events` table for duplicate event processing
- **Actions**:
  1. Extracts `invoiceId` from session metadata
  2. Calculates payment amount from `session.amount_total / 100`
  3. Calls `markInvoicePaid()` with:
     - Method: `STRIPE`
     - Processor: `stripe`
     - Processor ID: `session.payment_intent` or `session.id`
     - Reference: `session.id`
  4. Clears `stripe_session_id` and `stripe_checkout_url` from invoice
  5. Records `STRIPE_CHECKOUT_COMPLETED` activity log
  6. Records event in `webhook_events` for idempotency
  7. **Triggers Job Creation** if policy is `ON_PAYMENT`
- **Implementation**: `handleStripeEvent(event)`

### Payment Tracking

**Payment Fields**:
- `amount`: Payment amount (decimal)
- `method`: Payment method enum (STRIPE, BANK_TRANSFER, CASH, OTHER)
- `reference`: External reference (e.g., transaction ID)
- `processor`: Payment processor name (e.g., "stripe")
- `processor_id`: Processor's internal ID (e.g., payment intent ID)
- `notes`: Optional payment notes
- `paid_at`: Payment timestamp

**Balance Calculation**:
```typescript
balance_due = total - sum(payments.amount)
status = (balance_due <= 0) ? 'PAID' : 'PENDING'
```

---

## Job Lifecycle

### Job States (11 States)

```
PRE_PROCESSING → IN_QUEUE → QUEUED → PRINTING → PRINTING_COMPLETE
                                           ↓
                                        PAUSED → (back to PRINTING)

POST_PROCESSING → PACKAGING → OUT_FOR_DELIVERY → COMPLETED

                     CANCELLED (from any state)
```

| Status | Category | Description | Automatic Actions |
|--------|----------|-------------|------------------|
| `PRE_PROCESSING` | Queued | Initial state, preparing files | None |
| `IN_QUEUE` | Queued | Ready to print, in queue | None |
| `QUEUED` | Queued | Generic queued state | None |
| `PRINTING` | Active | Currently printing | Sets `started_at`, `last_run_started_at` |
| `PAUSED` | Active | Print paused | Accumulates run time, sets `paused_at` |
| `PRINTING_COMPLETE` | Post-Print | Print finished, needs post-processing | Accumulates run time |
| `POST_PROCESSING` | Post-Print | Removing supports, finishing | Accumulates run time |
| `PACKAGING` | Post-Print | Packaging for delivery | None |
| `OUT_FOR_DELIVERY` | Post-Print | Out for delivery | None |
| `COMPLETED` | Terminal | Job complete | Auto-detach, auto-archive |
| `CANCELLED` | Terminal | Job cancelled | Archives immediately |

### Job Priority Levels

| Priority | Usage | Special Rules |
|----------|-------|---------------|
| `NORMAL` | Default priority | Standard queue order |
| `FAST_TRACK` | Express service | Auto-assigned if invoice line contains "fast track" |
| `URGENT` | Critical jobs | Manual assignment only |

### Job Operations & State Transitions

#### 1. **Create Job (Manual)**
- **Triggered by**: Admin creating job manually
- **Initial State**: `PRE_PROCESSING`
- **Actions**:
  1. Links to invoice and client
  2. Assigns to printer (or `null` for unassigned)
  3. Sets initial `queue_position`
  4. Auto-detects `FAST_TRACK` priority if invoice items contain "fast track"
  5. Records `JOB_CREATED` activity log

#### 2. **Auto-Create Job (Triggered)**
- **Triggers**:
  - Invoice created (if `job_creation_policy = ON_INVOICE`)
  - Quote converted to invoice (if `job_creation_policy = ON_INVOICE`)
  - Invoice marked paid (if `job_creation_policy = ON_PAYMENT`)
- **Initial State**: `PRE_PROCESSING`
- **Actions**:
  1. Generates title: `"Invoice {invoice.number}"`
  2. Auto-assigns priority based on invoice line item inspection
  3. Places at end of unassigned queue
  4. Records `JOB_CREATED` activity log
- **Implementation**: `ensureJobForInvoice(invoiceId)`

#### 3. **Start Printing**
- **Transition**: `ANY_QUEUED_STATUS` → `PRINTING`
- **Validation**:
  - Job must have printer assigned
  - Printer must not be `OFFLINE` (if `prevent_assign_to_offline = true`)
  - Printer must not be in `MAINTENANCE` (if `prevent_assign_to_maintenance = true`)
  - Printer active job count must be < `max_active_printing_per_printer` (default: 1)
- **Actions**:
  1. Sets `started_at` (if not already set)
  2. Sets `last_run_started_at` to current timestamp
  3. Clears `paused_at`
  4. Records `JOB_STATUS` activity log
- **Implementation**: `updateJobStatus(id, 'PRINTING')`

#### 4. **Pause Printing**
- **Transition**: `PRINTING` → `PAUSED`
- **Actions**:
  1. Accumulates run time into `actual_hours`:
     - `deltaHours = (now - last_run_started_at) / 3,600,000 ms`
     - `actual_hours += deltaHours`
  2. Sets `paused_at` timestamp
  3. Clears `last_run_started_at`
  4. Records `JOB_STATUS` activity log

#### 5. **Resume Printing**
- **Transition**: `PAUSED` → `PRINTING`
- **Actions**: Same as "Start Printing"

#### 6. **Complete Printing**
- **Transition**: `PRINTING` or `ANY_POST_PRINT` → `PRINTING_COMPLETE`
- **Actions**:
  1. Accumulates run time (if coming from `PRINTING`)
  2. Clears `paused_at` and `last_run_started_at`

#### 7. **Complete Job**
- **Transition**: `ANY` → `COMPLETED`
- **Actions**:
  1. Accumulates run time (if applicable)
  2. Sets `completed_at` timestamp
  3. Sets `completed_by = "operator"` (if not set)
  4. **Auto-Detach**: If `auto_detach_job_on_complete = true`:
     - Sets `printer_id = null`
     - Moves to end of unassigned queue
  5. **Auto-Archive**: If `auto_archive_completed_jobs_after_days = 0`:
     - Sets `archived_at` timestamp
     - Sets `archived_reason = "auto-archive (immediate)"`
  6. Records `JOB_STATUS` activity log
  7. **Triggers Notification**: If client has `notify_on_job_status = true` and email enabled

#### 8. **Cancel Job**
- **Transition**: `ANY` → `CANCELLED`
- **Actions**:
  1. Clears `completed_at`, `paused_at`, `actual_hours`, `last_run_started_at`
  2. Detaches from printer (`printer_id = null`)
  3. Archives immediately with reason from note
  4. Records `JOB_STATUS` activity log

#### 9. **Requeue Job**
- **Transition**: `ANY_ACTIVE_OR_POST_PRINT` → `QUEUED` (or other queued status)
- **Actions**:
  1. Clears `started_at`, `completed_at`, `paused_at`, `actual_hours`, `last_run_started_at`
  2. Resets job to fresh queued state

#### 10. **Assign to Printer**
- **Validation**: Same printer assignment rules as "Start Printing"
- **Actions**:
  1. Sets `printer_id`
  2. Recalculates `queue_position` (places at end of printer's queue)

#### 11. **Reorder Jobs**
- **Actions**:
  1. Updates `queue_position` for multiple jobs
  2. Optionally reassigns `printer_id`
- **Implementation**: `reorderJobs(entries[])`

#### 12. **Clear Printer Queue**
- **Actions**:
  1. Finds all jobs with status `QUEUED` or `PAUSED` for printer
  2. Detaches from printer (`printer_id = null`)
  3. Moves to end of unassigned queue
- **Implementation**: `clearPrinterQueue(printerId)`

#### 13. **Archive Job**
- **Actions**:
  1. Sets `archived_at` timestamp
  2. Optionally sets `archived_reason`
  3. Records `JOB_ARCHIVED` activity log
- **Implementation**: `archiveJob(id, reason?)`

### Job Time Tracking

**Run Time Accumulation**:
```typescript
// When pausing or completing
deltaHours = (currentTime - last_run_started_at) / 3,600,000;
actual_hours += deltaHours;
last_run_started_at = null;
```

**Fields**:
- `started_at`: First time job started printing
- `completed_at`: When job reached COMPLETED status
- `paused_at`: When job was paused
- `last_run_started_at`: Start of current run (for accumulation)
- `estimated_hours`: Estimated time from slicer
- `actual_hours`: Accumulated printing time

### Job Assignment Rules

**Printer Status Checks** (configurable):
- `prevent_assign_to_offline`: Blocks assignment to `OFFLINE` printers
- `prevent_assign_to_maintenance`: Blocks assignment to `MAINTENANCE` printers

**Capacity Limits**:
- `max_active_printing_per_printer`: Maximum concurrent `PRINTING` jobs per printer (default: 1)
- Enforced on state transition to `PRINTING`

### Job Auto-Archive

**Configuration**:
- `auto_archive_completed_jobs_after_days`:
  - `0`: Archive immediately on completion
  - `> 0`: Archive after N days (requires scheduled job)
  - Default: 7 days

### Job Notifications

**Conditions**:
- Status change must occur (not same status update)
- System setting `enable_email_send` must be `true`
- Client must have `notify_on_job_status = true`
- Client must have valid email address

**Implementation**: Currently logs notification intent; email delivery to be implemented

---

## Quick Order Flow

### Self-Service Order Process

The Quick Order flow is a complete self-service workflow for clients to upload 3D model files, configure print settings, receive instant pricing, and checkout.

### Step-by-Step Flow

#### 1. **Upload 3D Model Files**
- Client uploads STL/3MF files to temporary storage
- Each file receives unique `fileId`
- Files stored with metadata (filename, size, MIME type)

#### 2. **Configure Print Settings (Per File)**
- **Material Selection**: Choose from available materials
- **Layer Height**: 0.1mm - 0.3mm typical
- **Infill Percentage**: 0% - 100%
- **Quantity**: Number of copies
- **Support Settings**:
  - Enabled/Disabled
  - Pattern: `normal` or `tree` (organic)
  - Angle: Support angle threshold

#### 3. **Automatic Slicing**
- Triggered for each file with settings
- **Implementation**: `sliceQuickOrderFile(fileId, userId, settings)`
- **Actions**:
  1. Downloads file from temp storage
  2. Executes CLI slicer with settings
  3. Extracts metrics:
     - `grams`: Material weight
     - `timeSec`: Print duration in seconds
     - `gcodePath`: Generated G-code file path (optional)
  4. Saves G-code as new temp file
  5. Updates temp file status and metadata
- **Retry Logic**: Attempts slicing up to 2 times
- **Fallback Metrics**: If slicing fails:
  - `timeSec = 3600` (1 hour)
  - `grams = 80`
  - `fallback = true`
  - Records error details

#### 4. **Calculate Pricing**
- **Implementation**: `priceQuickOrder(items, location)`
- **Inputs**:
  - Items with metrics (grams, timeSec)
  - Shipping location (state, postcode)
- **Calculation Per Item**:
  ```typescript
  materialCost = grams * costPerGram
  timeCost = hours * hourlyRate
  setupFee = fixed setup fee
  unitPrice = max(minimumPrice, materialCost + timeCost + setupFee)
  total = unitPrice * quantity
  ```
- **Settings** (from calculator config):
  - `hourlyRate`: Default 45 AUD/hour
  - `setupFee`: Default 20 AUD per item
  - `minimumPrice`: Default 35 AUD per item
- **Shipping**: Resolved via `resolveShippingRegion(settings, location)`
- **Tax**: Applied from `settings.taxRate`

#### 5. **Shipping Region Resolution**
- **Implementation**: `resolveShippingRegion(settings, location)`
- **Logic**:
  1. Match by state from shipping regions
  2. If multiple matches, filter by postcode prefix
  3. Calculate remote surcharge if postcode matches prefix
  4. Fall back to default shipping region if no match
- **Output**:
  - `code`: Region code
  - `label`: Display label
  - `baseAmount`: Base shipping cost
  - `remoteSurcharge`: Additional remote area fee
  - `amount`: Total shipping cost
  - `remoteApplied`: Whether surcharge was applied

#### 6. **Create Invoice**
- **Implementation**: `createQuickOrderInvoice(items, userId, clientId, address)`
- **Actions**:
  1. Recalculates pricing server-side (security validation)
  2. Builds invoice lines with item details
  3. Creates invoice via standard `createInvoice()` flow
  4. Processes and saves files:
     - **Model Files**: Saves to `order_files` table (type: `model`)
     - **Settings Files**: Saves JSON with configuration (type: `settings`)
     - **Attachments**: Saves both to invoice attachments for backward compatibility
  5. Deletes temporary files
  6. Creates Stripe checkout session
  7. Returns invoice ID and checkout URL

#### 7. **Payment via Stripe**
- Client redirected to Stripe checkout
- On success, webhook marks invoice as paid
- Job creation triggered per `job_creation_policy`

### Quick Order File Processing

**File Types Saved**:
1. **3D Model File** (original STL/3MF)
   - Stored in: `order_files` table
   - File type: `model`
   - Metadata: Original size, upload source

2. **Settings File** (JSON)
   - Stored in: `order_files` table
   - File type: `settings`
   - Contents:
     ```json
     {
       "filename": "part.stl",
       "materialId": 1,
       "materialName": "PLA",
       "layerHeight": 0.2,
       "infill": 20,
       "quantity": 2,
       "metrics": { "grams": 45, "timeSec": 3600 },
       "supports": { "enabled": true, "pattern": "tree", "angle": 45 },
       "address": { ... },
       "shipping": { ... }
     }
     ```

3. **G-code File** (if slicing succeeded)
   - Stored in: Temporary files (for preview)
   - Can be retrieved for 3D printer use

**Backward Compatibility**: All files also saved to invoice attachments table

### Quick Order Line Item Format

```typescript
{
  name: "3D Print: part.stl",
  description: "Qty 2 • Material PLA • Layer 0.2mm • Infill 20% • Supports Organic",
  quantity: 2,
  unitPrice: 45.00,
  calculatorBreakdown: {
    grams: 45,
    hours: 1.0,
    materialCost: 2.25,
    timeCost: 45.00,
    setupFee: 20.00
  }
}
```

---

## Client Onboarding

### Client Creation Flow

#### 1. **User Signup (Self-Service)**
- **Endpoint**: `/api/auth/signup`
- **Implementation**: `handleSignup(email, password)`
- **Atomic Transaction Steps**:
  1. **Validate**: Check if email already exists
  2. **Create Auth User**: Via Supabase Auth Admin API
     - Email confirmation auto-enabled
     - Password stored securely by Supabase
  3. **Create Client Record**:
     - Name: Derived from email prefix (e.g., "john" from "john@example.com")
     - Email: User's email
     - Default settings:
       - `notify_on_job_status = false`
       - Payment terms inherited from system defaults
  4. **Create User Profile**:
     - Links auth user to client
     - Role: `CLIENT`
     - Client ID: Links to created client
  5. **Rollback on Failure**: Deletes auth user and client if profile creation fails
  6. **Establish Session**: Signs in user automatically
  7. **Return**: Session tokens and user profile

#### 2. **Admin Creates Client**
- **Implementation**: `createClient(input)`
- **Actions**:
  1. Validates payment terms against system settings
  2. Creates client with full details:
     - Name, company, ABN
     - Email, phone
     - Address (stored as `{ raw: string }`)
     - Payment terms, notification preferences
     - Tags, notes
  3. Records `CLIENT_CREATED` activity log
- **Note**: Does not create user account (admin must do separately)

### Client Profile Management

#### Update Client
- **Implementation**: `updateClient(id, input)`
- **Validation**: Payment terms must exist in system settings
- **Actions**:
  - Updates all client fields
  - Normalizes nullable text fields (empty strings → null)
  - Records `CLIENT_UPDATED` activity log

#### Delete Client
- **Implementation**: `deleteClient(id)`
- **Cascade Behavior**: Database handles cascading deletes to related records
- **Actions**:
  - Deletes client record
  - Records `CLIENT_DELETED` activity log

### Client Notification Preferences

#### Update Preference
- **Implementation**: `updateClientNotificationPreference(clientId, notify)`
- **Actions**:
  - Updates `notify_on_job_status` flag
  - Records `CLIENT_PREF_UPDATED` activity log

### Client User Account

**Relationship**:
- One client → zero or one client user account
- Client user has role `CLIENT` and linked `client_id`
- Admin creates client separately from user account

**Client Portal Access**:
- User must sign up or be created by admin
- User authenticated via Supabase Auth
- Session includes `clientId` for data scoping

---

## Document Numbering

### Sequential Numbering System

**Implementation**: `nextDocumentNumber(kind)`

**Database Function**: `next_document_number(p_kind, p_default_prefix)`

### Quote Numbers

- **Prefix**: Configurable via `settings.numbering_quote_prefix` (default: `"QT-"`)
- **Format**: `{prefix}{sequence}`
- **Example**: `QT-001`, `QT-002`, `QT-003`
- **Sequence**: Auto-incrementing, globally unique per document type

### Invoice Numbers

- **Prefix**: Configurable via `settings.numbering_invoice_prefix` (default: `"INV-"`)
- **Format**: `{prefix}{sequence}`
- **Example**: `INV-001`, `INV-002`, `INV-003`
- **Sequence**: Auto-incrementing, globally unique per document type

### Sequence Management

**Database Implementation**:
- Sequences stored in `settings` table
- Atomic increment via RPC function
- Thread-safe, handles concurrent requests
- No gaps in sequence (continuous numbering)

**Prefix Configuration**:
- Editable via Settings UI
- Applied to all new documents
- Existing documents retain their original numbers

---

## Automated Workflows

### 1. Job Auto-Creation

**Trigger Points**:

1. **On Invoice Creation** (`job_creation_policy = ON_INVOICE`)
   - When: `createInvoice()` completes
   - Action: `ensureJobForInvoice(invoiceId)`

2. **On Quote Conversion** (`job_creation_policy = ON_INVOICE`)
   - When: `convertQuoteToInvoice()` completes
   - Action: `ensureJobForInvoice(invoiceId)`

3. **On Payment Received** (`job_creation_policy = ON_PAYMENT`)
   - When: Invoice status changes to `PAID`
   - Triggered by: `markInvoicePaid()`, `addManualPayment()`, Stripe webhook
   - Action: `ensureJobForInvoice(invoiceId)`

**Job Creation Logic**:
- **Idempotent**: Checks if job already exists for invoice
- **Initial State**: `PRE_PROCESSING`
- **Title**: `"Invoice {invoice.number}"`
- **Priority Detection**: Scans invoice line items for "fast track" → sets `FAST_TRACK` priority
- **Queue Position**: Placed at end of unassigned queue
- **Records Activity**: `JOB_CREATED` activity log

### 2. Job Auto-Detach on Completion

**Trigger**: Job status changes to `COMPLETED`

**Condition**: `settings.auto_detach_job_on_complete = true` (default: true)

**Actions**:
1. Sets `printer_id = null`
2. Recalculates `queue_position` (moves to end of unassigned queue)
3. Keeps job visible but removes from printer workload

**Purpose**: Frees up printer queue for next jobs

### 3. Job Auto-Archive

**Trigger**: Job status changes to `COMPLETED`

**Condition**: `settings.auto_archive_completed_jobs_after_days = 0`

**Actions**:
1. Sets `archived_at = now`
2. Sets `archived_reason = "auto-archive (immediate)"`

**Future Enhancement**: Scheduled job to archive completed jobs after N days

### 4. Payment Terms Auto-Resolution

**Trigger**: Invoice or quote creation/update

**Logic**:
1. Check client's `payment_terms` field
2. Validate against `settings.payment_terms` list
3. If invalid or missing, use `settings.default_payment_terms`
4. If default invalid, use first available payment term
5. Calculate due date: `issue_date + payment_term.days`

**Implementation**: `resolveClientPaymentTerm(clientId)`

### 5. Stripe Session Auto-Cleanup

**Trigger**: Stripe webhook `checkout.session.completed`

**Actions**:
1. Clears `stripe_session_id` from invoice
2. Clears `stripe_checkout_url` from invoice
3. Prevents reuse of completed checkout sessions

### 6. Activity Logging Automation

**Trigger**: All major entity operations (create, update, delete, status change)

**Actions**:
- Automatically inserts record into `activity_logs` table
- Links to related entities (client, quote, invoice, job)
- Stores action type and human-readable message
- Optionally stores metadata JSON

**Action Types**:
- `QUOTE_CREATED`, `QUOTE_SENT`, `QUOTE_ACCEPTED`, `QUOTE_DECLINED`, `QUOTE_CONVERTED`
- `INVOICE_CREATED`, `INVOICE_UPDATED`, `INVOICE_PAYMENT_ADDED`, `INVOICE_MARKED_PAID`
- `JOB_CREATED`, `JOB_STATUS`, `JOB_ARCHIVED`
- `CLIENT_CREATED`, `CLIENT_UPDATED`, `CLIENT_NOTE`
- `STRIPE_CHECKOUT_CREATED`, `STRIPE_CHECKOUT_COMPLETED`

### 7. Idempotent Webhook Processing

**Trigger**: Stripe webhook events

**Implementation**: `handleStripeEvent(event)`

**Actions**:
1. Checks `webhook_events` table for `stripe_event_id`
2. If exists, skips processing (idempotency)
3. If new, processes event
4. Records event in `webhook_events` table after processing

**Purpose**: Prevents duplicate payment processing from webhook retries

---

## Business Rules & Calculations

### Line Item Total Calculation

```typescript
function calculateLineTotal({
  quantity,
  unitPrice,
  discountType,
  discountValue,
}) {
  const subtotal = quantity * unitPrice;

  if (discountType === 'PERCENT') {
    const discount = subtotal * (discountValue / 100);
    return subtotal - discount;
  }

  if (discountType === 'FIXED') {
    return Math.max(0, subtotal - discountValue);
  }

  return subtotal; // NONE
}
```

### Document Total Calculation

```typescript
function calculateDocumentTotals({
  lines,              // Array of { total }
  discountType,
  discountValue,
  shippingCost,
  taxRate,
}) {
  // Sum line totals
  const lineSubtotal = lines.reduce((sum, line) => sum + line.total, 0);

  // Apply document-level discount
  let subtotal = lineSubtotal;
  if (discountType === 'PERCENT') {
    const discount = lineSubtotal * (discountValue / 100);
    subtotal = lineSubtotal - discount;
  } else if (discountType === 'FIXED') {
    subtotal = Math.max(0, lineSubtotal - discountValue);
  }

  // Add shipping
  const subtotalWithShipping = subtotal + shippingCost;

  // Calculate tax
  const tax = subtotalWithShipping * (taxRate / 100);

  // Final total
  const total = subtotalWithShipping + tax;

  return {
    subtotal: lineSubtotal,
    total,
    tax,
  };
}
```

**Note**: Document-level discount applies to line items subtotal, before shipping and tax

### Quick Order Pricing Calculation

```typescript
function priceQuickOrderItem({
  grams,
  timeSec,
  quantity,
  materialCostPerGram,
  hourlyRate,        // Default: 45 AUD
  setupFee,          // Default: 20 AUD
  minimumPrice,      // Default: 35 AUD
}) {
  const hours = timeSec / 3600;
  const materialCost = grams * materialCostPerGram;
  const timeCost = hours * hourlyRate;
  const basePrice = materialCost + timeCost + setupFee;

  const unitPrice = Math.max(minimumPrice, basePrice);
  const total = unitPrice * quantity;

  return {
    unitPrice: roundToTwoDecimals(unitPrice),
    total: roundToTwoDecimals(total),
    breakdown: { grams, hours, materialCost, timeCost, setupFee }
  };
}
```

### Shipping Region Rules

**Matching Logic**:
1. **State Match**: Filter regions by matching `location.state` in `region.states[]`
2. **Postcode Prefix Match**: If multiple regions match state, filter by `location.postcode` starting with any `region.postcodePrefixes[]`
3. **Remote Surcharge**: If postcode matches prefix, add `region.remoteSurcharge` to base amount
4. **Fallback**: If no match, use `settings.default_shipping_region`

**Example Configuration**:
```typescript
{
  code: 'sydney_metro',
  label: 'Sydney Metro',
  states: ['NSW'],
  baseAmount: 12.50,
  remoteSurcharge: 0,
}
{
  code: 'remote',
  label: 'Remote & Islands',
  states: ['TAS', 'WA', 'NT'],
  postcodePrefixes: ['7', '08', '09'],
  baseAmount: 45.00,
  remoteSurcharge: 15.00,
}
```

### Payment Terms Resolution Rules

**Priority Order**:
1. **Client-Specific**: `clients.payment_terms` (if valid)
2. **System Default**: `settings.default_payment_terms`
3. **First Available**: First payment term in `settings.payment_terms`

**Validation**: Payment term code must exist in `settings.payment_terms[]` list

**Due Date Calculation**:
- If explicit due date provided: Use it
- If payment term has `days > 0`: `due_date = issue_date + days`
- Otherwise: `due_date = issue_date` (immediate payment)

### Job Priority Auto-Assignment

**Rule**: Scan invoice line items for keyword "fast track" (case-insensitive)

**Implementation**:
```typescript
const hasFastTrackLine = invoice.invoice_items.some(item => {
  const text = [item.name, item.description]
    .filter(Boolean)
    .map(s => s.toLowerCase())
    .join(' ');
  return text.includes('fast track');
});

const priority = hasFastTrackLine ? 'FAST_TRACK' : 'NORMAL';
```

### Printer Assignment Validation

**Rules**:
1. **Prevent Offline Assignment**: If `settings.prevent_assign_to_offline = true`, cannot assign to `OFFLINE` printers
2. **Prevent Maintenance Assignment**: If `settings.prevent_assign_to_maintenance = true`, cannot assign to `MAINTENANCE` printers
3. **Capacity Limit**: Cannot start printing if printer has ≥ `settings.max_active_printing_per_printer` jobs in `PRINTING` status (default: 1)

**Enforcement Points**:
- Job assignment to printer
- Job status transition to `PRINTING`
- Job reordering with printer change

### Invoice Status Rules

**Overdue Status** (computed):
- `status = PENDING`
- `balance_due > 0`
- `due_date < current_date`

**Payment Status Transition**:
- Add payment → Recalculate balance → If `balance_due <= 0`: Set `PAID`
- Delete payment → Recalculate balance → If `balance_due > 0`: Set `PENDING`

### Quote to Invoice Conversion Rules

**Allowed**: Any quote status can be converted

**Data Copied**:
- All line items (items, quantities, pricing, discounts)
- Tax rate
- Shipping cost and label
- Discount type and value
- Notes and terms

**New Data**:
- Invoice number (new sequential)
- Invoice status: `PENDING`
- Issue date: Current datetime
- Due date: Calculated from payment terms
- Balance due: Equals total

**Links Created**:
- Quote: `converted_invoice_id` → Invoice ID
- Invoice: `converted_from_quote_id` → Quote ID
- Invoice: `source_quote_id` → Quote ID

### Invoice Revert Rules

**Validation**:
- Invoice status must NOT be `PAID`
- Invoice must have zero payments
- Invoice must have zero linked jobs

**Actions on Revert**:
- Creates quote with status `DRAFT`
- Sets quote `converted_invoice_id` → original invoice ID
- Deletes all invoice attachments from storage
- Deletes invoice record

**Purpose**: Allows correction of mistakes before work begins

### Rounding Rules

**Financial Values**: All monetary calculations rounded to 2 decimal places

**Time Calculations**: Job `actual_hours` rounded to 2 decimal places

**Storage**: Database stores as `DECIMAL` or `TEXT` (decimal string)

---

## State Diagrams

### Quote State Machine

```
    ┌─────────┐
    │  DRAFT  │ (Initial)
    └────┬────┘
         │ sendQuote()
         ↓
    ┌─────────┐
    │ PENDING │
    └────┬────┘
         │
         ├─────→ acceptQuote() ──→ ACCEPTED
         │
         ├─────→ declineQuote() ─→ DECLINED
         │
         └─────→ convertQuoteToInvoice() ─→ CONVERTED
```

### Invoice State Machine

```
    ┌─────────┐
    │ PENDING │ (Initial)
    └────┬────┘
         │
         ├─────→ markInvoicePaid() ────────┐
         │                                  ↓
         ├─────→ addManualPayment() ───→ ┌──────┐
         │       (if balance = 0)         │ PAID │
         │                                └──┬───┘
         │                                   │
         │                                   │ markInvoiceUnpaid()
         └───────────────────────────────────┘

    Note: OVERDUE is computed status, not stored state
```

### Job State Machine

```
                        ┌──────────────────┐
                        │ PRE_PROCESSING   │ (Initial)
                        └────────┬─────────┘
                                 ↓
                        ┌──────────────────┐
                        │    IN_QUEUE      │
                        └────────┬─────────┘
                                 ↓
                        ┌──────────────────┐
    ┌──────────────────→│     QUEUED       │←─────────┐
    │                   └────────┬─────────┘          │
    │                            ↓                     │
    │                   ┌──────────────────┐          │
    │              ┌───→│    PRINTING      │──┐       │
    │              │    └────────┬─────────┘  │       │
    │              │             ↓             │       │
    │  (resume)    │    ┌──────────────────┐  │(pause)│
    │              └────│     PAUSED       │←─┘       │
    │                   └──────────────────┘          │
    │                                                  │
    │  (requeue)                                       │
    │                   ┌──────────────────┐          │
    └───────────────────│PRINTING_COMPLETE │          │
                        └────────┬─────────┘          │
                                 ↓                     │
                        ┌──────────────────┐          │
                        │ POST_PROCESSING  │          │
                        └────────┬─────────┘          │
                                 ↓                     │
                        ┌──────────────────┐          │
                        │    PACKAGING     │          │
                        └────────┬─────────┘          │
                                 ↓                     │
                        ┌──────────────────┐          │
                        │ OUT_FOR_DELIVERY │          │
                        └────────┬─────────┘          │
                                 ↓                     │
                        ┌──────────────────┐          │
                        │    COMPLETED     │          │
                        └──────────────────┘          │
                                                       │
                           CANCELLED ←─────────────────┘
                         (from any state)
```

---

## End of Document

This documentation reflects the **actual implementation** as of the current codebase analysis. All state transitions, business rules, calculations, and automated workflows are extracted directly from the service layer code.
