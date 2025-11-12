# Phase 1: Data Model Analysis

## Overview
Complete database schema documenting 3D Print Sydney's core business operations covering clients, quotes, invoices, jobs, printing management, and financial tracking.

**Database**: PostgreSQL with Supabase
**Migrations**: 4 sequential migrations (base reset + 3 incremental updates)
**RLS Status**: Enabled on all tables (service role override + minimal client policies)

---

## Enumerations (System Constants)

### Role
- `ADMIN` - Administrator with full system access
- `CLIENT` - Customer account with limited access

### Quote Status
- `DRAFT` - Initial creation, not sent
- `PENDING` - Sent to client, awaiting response
- `ACCEPTED` - Client approved, can convert to invoice
- `DECLINED` - Client rejected
- `CONVERTED` - Converted to invoice (linked via `converted_invoice_id`)

### Invoice Status
- `PENDING` - Created, awaiting payment
- `PAID` - Fully paid
- `OVERDUE` - Past due date, unpaid or partial payment

### Discount Type
- `NONE` - No discount applied
- `PERCENT` - Percentage-based discount (0-100%)
- `FIXED` - Fixed dollar amount discount

### Pricing Type
- `FIXED` - Static price, no calculator
- `CALCULATED` - Dynamic pricing via calculator config

### Payment Method
- `STRIPE` - Online payment via Stripe
- `BANK_TRANSFER` - Direct bank transfer
- `CASH` - Cash payment
- `OTHER` - Other payment method

### Job Status
- `QUEUED` - Waiting to be processed
- `PRE_PROCESSING` - Preparing files/model
- `IN_QUEUE` - In printer queue
- `PRINTING` - Currently printing
- `PAUSED` - Paused mid-print
- `PRINTING_COMPLETE` - Print finished
- `POST_PROCESSING` - Cleaning, finishing
- `PACKAGING` - Being packaged for delivery
- `OUT_FOR_DELIVERY` - In transit
- `COMPLETED` - Delivered to client
- `CANCELLED` - Job cancelled

### Job Priority
- `NORMAL` - Standard priority
- `FAST_TRACK` - Expedited processing
- `URGENT` - High priority, process ASAP

### Printer Status
- `ACTIVE` - Operational, can accept jobs
- `MAINTENANCE` - Under maintenance, cannot accept jobs
- `OFFLINE` - Non-functional, blocked from assignments

### Job Creation Policy
- `ON_PAYMENT` - Auto-create jobs when invoice paid
- `ON_INVOICE` - Auto-create jobs when invoice issued

---

## Core Tables & Relationships

### 1. Settings (Singleton Configuration)
**Purpose**: Single-row table storing system configuration
**Rows**: Exactly 1 (enforced via `id=1` primary key)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `integer` | PK, default 1 |
| `business_name` | `text` | Company name |
| `business_email` | `text` | Sender email |
| `business_phone` | `text` | Contact phone |
| `business_address` | `text` | Registered address |
| `abn` | `text` | ABN (Australian Business Number) |
| `tax_rate` | `numeric` | Default tax/GST rate |
| `numbering_quote_prefix` | `text` | Quote number prefix (default: `QT-`) |
| `numbering_invoice_prefix` | `text` | Invoice number prefix (default: `INV-`) |
| `default_payment_terms` | `text` | Default payment terms code |
| `bank_details` | `text` | Bank account info for invoices |
| `shipping_regions` | `jsonb` | Shipping region config |
| `default_shipping_region` | `text` | Default shipping zone |
| `payment_terms` | `jsonb` | Payment terms definitions |
| `calculator_config` | `jsonb` | Pricing calculator settings |
| `default_currency` | `text` | Default currency (AUD) |
| `job_creation_policy` | `job_creation_policy` | When to auto-create jobs |
| `auto_detach_job_on_complete` | `boolean` | Auto-unlink completed jobs |
| `auto_archive_completed_jobs_after_days` | `integer` | Auto-archive delay (days) |
| `prevent_assign_to_offline` | `boolean` | Block job assignment to offline printers |
| `prevent_assign_to_maintenance` | `boolean` | Block job assignment to maintenance printers |
| `max_active_printing_per_printer` | `integer` | Max simultaneous prints per printer |
| `overdue_days` | `integer` | Days past due to trigger overdue status |
| `reminder_cadence_days` | `integer` | Days between overdue reminders |
| `enable_email_send` | `boolean` | Enable email notifications |
| `email_templates` | `jsonb` | Email template definitions (quote_sent, invoice_created, payment_confirmation, job_status, welcome, quote_accepted, quote_declined) |
| `email_from_address` | `text` | Sender email address |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Last modification timestamp |

**Constraints**: None (singleton by design)

---

### 2. Number Sequences
**Purpose**: Track and generate sequential document numbers
**Usage**: Called via `next_document_number()` function

| Field | Type | Notes |
|-------|------|-------|
| `id` | `bigserial` | PK |
| `kind` | `text` | Unique document type (quote, invoice, etc) |
| `prefix` | `text` | Number prefix |
| `current` | `integer` | Current counter value |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Last increment timestamp |

**Constraints**: 
- `UNIQUE(kind)` - One sequence per document type

---

### 3. Clients
**Purpose**: Customer records with billing info and preferences
**Indexes**: `idx_clients_wallet_balance`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `bigserial` | PK |
| `name` | `text NOT NULL` | Contact name |
| `first_name` | `text` | First name |
| `last_name` | `text` | Last name |
| `position` | `text` | Job title |
| `company` | `text` | Company name |
| `abn` | `text` | ABN |
| `email` | `text` | Primary email |
| `phone` | `text` | Primary phone |
| `address` | `jsonb` | Address (street, suburb, state, postcode) |
| `tags` | `jsonb` | Client tags (array) |
| `payment_terms` | `text` | Default payment terms |
| `notes` | `text` | Internal notes |
| `wallet_balance` | `numeric NOT NULL DEFAULT 0` | Account credit balance |
| `notify_on_job_status` | `boolean NOT NULL DEFAULT false` | Email job status updates |
| `created_at` | `timestamptz NOT NULL` | Creation timestamp |
| `updated_at` | `timestamptz NOT NULL` | Last modification timestamp |

**Relationships**:
- 1→M `users` (via `client_id`)
- 1→M `quotes` (via `client_id`, cascade delete)
- 1→M `invoices` (via `client_id`, cascade delete)
- 1→M `jobs` (via `client_id`, cascade delete)
- 1→M `credit_transactions` (via `client_id`, cascade delete)

---

### 4. Materials
**Purpose**: Printing material catalog with cost tracking
**Usage**: Referenced in product templates for per-gram calculations

| Field | Type | Notes |
|-------|------|-------|
| `id` | `bigserial` | PK |
| `name` | `text NOT NULL` | Material name (e.g., PLA, Resin) |
| `color` | `text` | Color variant |
| `category` | `text` | Material category |
| `cost_per_gram` | `numeric NOT NULL` | Unit cost for calculations |
| `notes` | `text` | Material notes |
| `created_at` | `timestamptz NOT NULL` | Creation timestamp |
| `updated_at` | `timestamptz NOT NULL` | Last modification timestamp |

**Relationships**:
- 1→M `product_templates` (via `material_id`, set null on delete)

---

### 5. Product Templates
**Purpose**: Reusable service/product definitions for quotes/invoices
**Usage**: Configure fixed or calculator-based pricing

| Field | Type | Notes |
|-------|------|-------|
| `id` | `bigserial` | PK |
| `name` | `text NOT NULL` | Template name |
| `description` | `text` | Description |
| `unit` | `text DEFAULT 'unit'` | Unit of measurement |
| `pricing_type` | `pricing_type NOT NULL DEFAULT 'FIXED'` | `FIXED` or `CALCULATED` |
| `base_price` | `numeric` | Fixed price (null if CALCULATED) |
| `calculator_config` | `jsonb` | Pricing logic (null if FIXED) |
| `material_id` | `bigint REFERENCES materials` | Material for cost calculations |
| `created_at` | `timestamptz NOT NULL` | Creation timestamp |
| `updated_at` | `timestamptz NOT NULL` | Last modification timestamp |

**Relationships**:
- M→1 `materials` (optional)
- 1→M `quote_items` (via `product_template_id`, set null on delete)
- 1→M `invoice_items` (via `product_template_id`, set null on delete)

---

### 6. Quotes
**Purpose**: Sales quotes/proposals sent to clients
**Indexes**: None (frequent filters: `status`, `client_id`, `number`)
**Quote → Invoice Flow**: `converted_invoice_id` links approved quotes to created invoices

| Field | Type | Notes |
|-------|------|-------|
| `id` | `bigserial` | PK |
| `number` | `text UNIQUE NOT NULL` | Quote number (e.g., QT-0001) |
| `client_id` | `bigint NOT NULL` | FK→clients (cascade delete) |
| `status` | `quote_status NOT NULL DEFAULT 'DRAFT'` | Quote lifecycle |
| `issue_date` | `timestamptz NOT NULL DEFAULT now()` | Quote creation date |
| `expiry_date` | `timestamptz` | Quote validity date |
| `sent_at` | `timestamptz` | When sent to client |
| `accepted_at` | `timestamptz` | When accepted |
| `declined_at` | `timestamptz` | When declined |
| `expires_at` | `timestamptz` | Expiry calculation field |
| `decision_note` | `text` | Client's acceptance/decline reason |
| `tax_rate` | `numeric` | Applied tax rate |
| `discount_type` | `discount_type NOT NULL DEFAULT 'NONE'` | Discount method |
| `discount_value` | `numeric` | Discount amount or percent |
| `shipping_cost` | `numeric` | Shipping charge |
| `shipping_label` | `text` | Shipping description |
| `subtotal` | `numeric NOT NULL` | Pre-tax, post-discount |
| `tax_total` | `numeric NOT NULL` | Tax amount |
| `total` | `numeric NOT NULL` | Final total |
| `notes` | `text` | Notes to client |
| `terms` | `text` | Payment terms text |
| `calculator_snapshot` | `jsonb` | Frozen calculator state |
| `source_data` | `jsonb` | Original input data |
| `converted_invoice_id` | `bigint UNIQUE` | FK→invoices (set null on delete) |
| `created_at` | `timestamptz NOT NULL` | Creation timestamp |
| `updated_at` | `timestamptz NOT NULL` | Last modification timestamp |

**Foreign Keys**:
- `client_id` → `clients.id` (cascade delete)
- `converted_invoice_id` → `invoices.id` (set null)

**Relationships**:
- M→1 `clients` (required)
- M→1 `invoices` (optional, reverse link)
- 1→M `quote_items` (via `quote_id`, cascade delete)
- 1→M `order_files` (via `quote_id`, cascade delete)
- 1→M `activity_logs` (via `quote_id`, set null)

---

### 7. Invoices
**Purpose**: Billing documents with payment tracking
**Indexes**:
- `idx_invoices_status_due_date` - Status queries with aging
- `idx_invoices_paid_at` - Payment report queries

**Key Fields**:
- `balance_due` - Calculated from `total - payments_sum`
- `status` - Auto-calculated: PAID if balance ≤ 0.000001 else PENDING
- `original_total` - Pre-credit amount

| Field | Type | Notes |
|-------|------|-------|
| `id` | `bigserial` | PK |
| `number` | `text UNIQUE NOT NULL` | Invoice number (e.g., INV-0001) |
| `client_id` | `bigint NOT NULL` | FK→clients (cascade delete) |
| `source_quote_id` | `bigint` | FK→quotes (set null) - Original quote |
| `status` | `invoice_status NOT NULL DEFAULT 'PENDING'` | Payment status |
| `issue_date` | `timestamptz NOT NULL DEFAULT now()` | Invoice creation date |
| `due_date` | `timestamptz` | Payment due date |
| `voided_at` | `timestamptz` | When voided |
| `void_reason` | `text` | Void reason |
| `written_off_at` | `timestamptz` | When written off |
| `write_off_reason` | `text` | Write-off reason |
| `overdue_notified_at` | `timestamptz` | Last overdue notification sent |
| `tax_rate` | `numeric` | Applied tax rate |
| `discount_type` | `discount_type NOT NULL DEFAULT 'NONE'` | Discount method |
| `discount_value` | `numeric` | Discount amount or percent |
| `shipping_cost` | `numeric` | Shipping charge |
| `shipping_label` | `text` | Shipping description |
| `subtotal` | `numeric NOT NULL` | Pre-tax, post-discount |
| `tax_total` | `numeric NOT NULL` | Tax amount |
| `total` | `numeric NOT NULL` | Final amount due |
| `balance_due` | `numeric NOT NULL` | Remaining unpaid amount |
| `credit_applied` | `numeric DEFAULT 0` | Client credit used |
| `original_total` | `numeric` | Amount before credit |
| `stripe_session_id` | `text` | Stripe checkout session ID |
| `stripe_checkout_url` | `text` | Stripe payment link |
| `notes` | `text` | Notes to client |
| `terms` | `text` | Payment terms text |
| `po_number` | `text` | Purchase order reference |
| `internal_notes` | `text` | Admin-only notes |
| `paid_at` | `timestamptz` | When fully paid |
| `payment_preference` | `text` | Client's preferred payment method |
| `credit_requested_amount` | `numeric NOT NULL DEFAULT 0` | Credit requested for this invoice |
| `delivery_quote_snapshot` | `jsonb` | Delivery cost snapshot |
| `calculator_snapshot` | `jsonb` | Frozen calculator state |
| `converted_from_quote_id` | `bigint UNIQUE` | FK→quotes (set null) - Quote converted to this invoice |
| `created_at` | `timestamptz NOT NULL` | Creation timestamp |
| `updated_at` | `timestamptz NOT NULL` | Last modification timestamp |

**Foreign Keys**:
- `client_id` → `clients.id` (cascade delete)
- `source_quote_id` → `quotes.id` (set null)
- `converted_from_quote_id` → `quotes.id` (set null)
- Reverse link from `quotes.converted_invoice_id`

**Relationships**:
- M→1 `clients` (required)
- M→1 `quotes` (optional, source)
- 1→M `invoice_items` (cascade delete)
- 1→M `payments` (cascade delete)
- 1→M `jobs` (cascade delete)
- 1→M `attachments` (cascade delete)
- 1→M `user_messages` (set null)
- 1→M `order_files` (cascade delete)
- 1→M `credit_transactions` (set null)
- 1→M `activity_logs` (set null)

**Data Integrity**:
- Balance = `total - SUM(payments)`
- Status transitions: PENDING → PAID or OVERDUE (via cron/trigger)
- Cannot void/write-off PAID invoices
- Cannot delete if referenced by jobs

---

### 8. Quote Items
**Purpose**: Line items within a quote
**Cascade Behavior**: Delete when parent quote deleted

| Field | Type | Notes |
|-------|------|-------|
| `id` | `bigserial` | PK |
| `quote_id` | `bigint NOT NULL` | FK→quotes (cascade delete) |
| `product_template_id` | `bigint` | FK→product_templates (set null) |
| `name` | `text NOT NULL` | Line item name |
| `description` | `text` | Item description |
| `quantity` | `numeric NOT NULL` | Quantity (can be fractional) |
| `unit` | `text` | Unit of measurement |
| `unit_price` | `numeric NOT NULL` | Price per unit |
| `discount_type` | `discount_type NOT NULL DEFAULT 'NONE'` | Line-level discount |
| `discount_value` | `numeric` | Line discount amount/percent |
| `total` | `numeric NOT NULL` | Final line total |
| `order_index` | `integer NOT NULL DEFAULT 0` | Display order |
| `calculator_breakdown` | `jsonb` | Detailed pricing calculation |

**Modelling-specific Fields** (when `invoiceLineType = 'MODELLING'`):
- `modellingBrief` - Project description
- `modellingComplexity` - SIMPLE/MODERATE/COMPLEX
- `modellingRevisionCount` - Included revisions
- `modellingHourlyRate` - Design hourly rate
- `modellingEstimatedHours` - Estimated design time

**Relationships**:
- M→1 `quotes` (required, cascade delete)
- M→1 `product_templates` (optional)

---

### 9. Invoice Items
**Purpose**: Line items within an invoice
**Cascade Behavior**: Delete when parent invoice deleted
**Structure**: Identical to quote items

| Field | Type | Notes |
|-------|------|-------|
| `id` | `bigserial` | PK |
| `invoice_id` | `bigint NOT NULL` | FK→invoices (cascade delete) |
| `product_template_id` | `bigint` | FK→product_templates (set null) |
| `name` | `text NOT NULL` | Line item name |
| `description` | `text` | Item description |
| `quantity` | `numeric NOT NULL` | Quantity |
| `unit` | `text` | Unit of measurement |
| `unit_price` | `numeric NOT NULL` | Price per unit |
| `discount_type` | `discount_type NOT NULL DEFAULT 'NONE'` | Line-level discount |
| `discount_value` | `numeric` | Line discount amount/percent |
| `total` | `numeric NOT NULL` | Final line total |
| `order_index` | `integer NOT NULL DEFAULT 0` | Display order |
| `calculator_breakdown` | `jsonb` | Detailed pricing calculation |

**Modelling-specific Fields**:
Same as quote items for MODELLING line type

**Relationships**:
- M→1 `invoices` (required, cascade delete)
- M→1 `product_templates` (optional)

---

### 10. Payments
**Purpose**: Payment records against invoices
**Indexes**: `idx_payments_paid_at` - Payment report queries

| Field | Type | Notes |
|-------|------|-------|
| `id` | `bigserial` | PK |
| `invoice_id` | `bigint NOT NULL` | FK→invoices (cascade delete) |
| `method` | `payment_method NOT NULL DEFAULT 'OTHER'` | Payment method |
| `amount` | `numeric NOT NULL` | Payment amount |
| `currency` | `text NOT NULL DEFAULT 'AUD'` | Payment currency |
| `reference` | `text` | Payment reference (check #, transfer ref) |
| `processor` | `text` | Payment processor name |
| `processor_id` | `text UNIQUE` | Processor transaction ID |
| `notes` | `text` | Payment notes |
| `paid_at` | `timestamptz NOT NULL` | Payment date/time |
| `metadata` | `jsonb` | Additional payment data (Stripe webhook data) |
| `created_at` | `timestamptz NOT NULL` | Record creation timestamp |
| `updated_at` | `timestamptz NOT NULL` | Record modification timestamp |

**Relationships**:
- M→1 `invoices` (required, cascade delete)

**Data Integrity**:
- Deleting a payment triggers `delete_invoice_payment()` function
- Function recalculates invoice balance and status
- Multiple payments per invoice allowed

---

### 11. Printers
**Purpose**: Printing equipment catalog and status tracking

| Field | Type | Notes |
|-------|------|-------|
| `id` | `bigserial` | PK |
| `name` | `text NOT NULL` | Printer name/identifier |
| `model` | `text` | Printer model number |
| `build_volume` | `text` | Build volume specs |
| `status` | `printer_status NOT NULL DEFAULT 'ACTIVE'` | Operational status |
| `notes` | `text` | Notes/capabilities |
| `last_maintenance_at` | `timestamptz` | Last maintenance date |
| `maintenance_note` | `text` | Maintenance notes |
| `created_at` | `timestamptz NOT NULL` | Creation timestamp |
| `updated_at` | `timestamptz NOT NULL` | Last modification timestamp |

**Relationships**:
- 1→M `jobs` (via `printer_id`, set null)
- 1→M `activity_logs` (via `printer_id`, set null)

**Business Rules**:
- Jobs cannot be assigned if status is OFFLINE or MAINTENANCE (if `prevent_*` settings enabled)
- Max concurrent printing jobs per printer (via `max_active_printing_per_printer` setting)

---

### 12. Jobs
**Purpose**: Print job tracking and queue management
**Indexes**:
- `idx_jobs_printer_status_position` - Job queue queries
- `idx_jobs_status_completed_at` - Job status reports
- `idx_jobs_archived_at` - Archive queries

**Queue Position**: 0 = first in queue

| Field | Type | Notes |
|-------|------|-------|
| `id` | `bigserial` | PK |
| `invoice_id` | `bigint NOT NULL` | FK→invoices (cascade delete) |
| `client_id` | `bigint NOT NULL` | FK→clients (cascade delete) |
| `printer_id` | `bigint` | FK→printers (set null) |
| `title` | `text NOT NULL` | Job title/name |
| `description` | `text` | Job description/notes |
| `status` | `job_status NOT NULL DEFAULT 'PRE_PROCESSING'` | Lifecycle status |
| `priority` | `job_priority NOT NULL DEFAULT 'NORMAL'` | Priority level |
| `queue_position` | `integer NOT NULL DEFAULT 0` | Queue order (0 = first) |
| `estimated_hours` | `numeric` | Estimated print duration |
| `actual_hours` | `numeric` | Actual print duration |
| `started_at` | `timestamptz` | When printing started |
| `paused_at` | `timestamptz` | When last paused |
| `completed_at` | `timestamptz` | When completed |
| `last_run_started_at` | `timestamptz` | Last start timestamp |
| `notes` | `text` | Job notes |
| `archived_at` | `timestamptz` | When archived (after completion) |
| `archived_reason` | `text` | Reason for archival |
| `completed_by` | `text` | Who completed the job |
| `created_at` | `timestamptz NOT NULL` | Creation timestamp |
| `updated_at` | `timestamptz NOT NULL` | Last modification timestamp |

**Relationships**:
- M→1 `invoices` (required, cascade delete)
- M→1 `clients` (required, cascade delete)
- M→1 `printers` (optional, set null)
- 1→M `activity_logs` (via `job_id`, set null)

**Business Rules**:
- Auto-created when invoice issued if `job_creation_policy = ON_INVOICE`
- Auto-created when invoice fully paid if `job_creation_policy = ON_PAYMENT`
- Cannot reassign to OFFLINE printer if `prevent_assign_to_offline = true`
- Cannot reassign to MAINTENANCE printer if `prevent_assign_to_maintenance = true`
- Auto-archived N days after completion (via `auto_archive_completed_jobs_after_days` setting)
- Can be detached (set `printer_id = null`) on completion if `auto_detach_job_on_complete = true`

---

### 13. Attachments
**Purpose**: Files attached to invoices (not line-item files)
**Cascade Behavior**: Delete when parent invoice deleted

| Field | Type | Notes |
|-------|------|-------|
| `id` | `bigserial` | PK |
| `invoice_id` | `bigint NOT NULL` | FK→invoices (cascade delete) |
| `filename` | `text NOT NULL` | Original filename |
| `storage_key` | `text NOT NULL` | Storage path in bucket |
| `filetype` | `text` | File MIME type |
| `size_bytes` | `bigint NOT NULL` | File size in bytes |
| `metadata` | `jsonb` | Additional file metadata |
| `uploaded_at` | `timestamptz NOT NULL DEFAULT now()` | Upload timestamp |

**Relationships**:
- M→1 `invoices` (required, cascade delete)

**Storage**: Files stored in `attachments` bucket (not queryable via DB)

---

### 14. Order Files
**Purpose**: Project files for quotes/invoices (CAD, STL, images, etc)
**Constraint**: Each record must reference either quote OR invoice (check constraint)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `bigserial` | PK |
| `invoice_id` | `bigint` | FK→invoices (cascade delete, optional) |
| `quote_id` | `bigint` | FK→quotes (cascade delete, optional) |
| `client_id` | `bigint NOT NULL` | FK→clients (cascade delete) |
| `filename` | `text NOT NULL` | Original filename |
| `storage_key` | `text NOT NULL UNIQUE` | Storage path in bucket |
| `file_type` | `text NOT NULL` | File extension/type |
| `mime_type` | `text` | MIME type |
| `size_bytes` | `bigint NOT NULL` | File size in bytes |
| `metadata` | `jsonb` | File metadata |
| `orientation_data` | `jsonb` | 3D model orientation/view data |
| `uploaded_by` | `bigint` | FK→users (set null) |
| `uploaded_at` | `timestamptz NOT NULL DEFAULT now()` | Upload timestamp |

**Indexes**:
- `idx_order_files_invoice` - Invoice file queries
- `idx_order_files_quote` - Quote file queries
- `idx_order_files_client` - Client file queries
- `idx_order_files_storage_key` - Lookup by storage key
- `idx_order_files_orientation_data` - GIN index on orientation JSONB

**Constraints**:
- `CHECK(invoice_id IS NOT NULL OR quote_id IS NOT NULL)` - Must reference one

**Relationships**:
- M→1 `invoices` (optional)
- M→1 `quotes` (optional)
- M→1 `clients` (required)
- M→1 `users` (optional)

**Storage**: Files in `order-files` bucket

---

### 15. Activity Logs
**Purpose**: Audit trail of system actions on entities
**Granularity**: Per-action logging (not entity-level change tracking)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `bigserial` | PK |
| `client_id` | `bigint` | FK→clients (set null) - Related client |
| `quote_id` | `bigint` | FK→quotes (set null) - Related quote |
| `invoice_id` | `bigint` | FK→invoices (set null) - Related invoice |
| `job_id` | `bigint` | FK→jobs (set null) - Related job |
| `printer_id` | `bigint` | FK→printers (set null) - Related printer |
| `action` | `text NOT NULL` | Action type (e.g., 'invoice_created', 'payment_received') |
| `message` | `text NOT NULL` | Human-readable message |
| `metadata` | `jsonb` | Additional context (old values, calculated fields) |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | Log timestamp |

**Relationships**:
- M→1 `clients` (optional)
- M→1 `quotes` (optional)
- M→1 `invoices` (optional)
- M→1 `jobs` (optional)
- M→1 `printers` (optional)

**Logging Function**:
```sql
log_activity(client_id, quote_id, invoice_id, job_id, printer_id, action, message, metadata)
```
- Called by application when significant actions occur
- Not transaction-scoped (logs all events)

---

### 16. Credit Transactions
**Purpose**: Audit trail for client wallet credit adjustments
**Usage**: Track all credit additions, deductions, refunds

| Field | Type | Notes |
|-------|------|-------|
| `id` | `bigserial` | PK |
| `client_id` | `bigint NOT NULL` | FK→clients (cascade delete) |
| `invoice_id` | `bigint` | FK→invoices (set null) - Related invoice (for credit deductions) |
| `amount` | `numeric NOT NULL` | Transaction amount |
| `transaction_type` | `text NOT NULL` | CREDIT_ADDED, CREDIT_DEDUCTED, CREDIT_REFUNDED |
| `reason` | `text` | Transaction reason |
| `notes` | `text` | Additional notes |
| `admin_user_id` | `bigint` | FK→users (set null) - Admin who initiated |
| `balance_before` | `numeric NOT NULL` | Balance prior to transaction |
| `balance_after` | `numeric NOT NULL` | Balance after transaction |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | Transaction timestamp |

**Indexes**:
- `idx_credit_transactions_client` - Client credit history
- `idx_credit_transactions_invoice` - Invoice credit queries
- `idx_credit_transactions_created` - Timeline queries

**Relationships**:
- M→1 `clients` (required)
- M→1 `invoices` (optional)
- M→1 `users` (optional)

**Functions**:
- `add_client_credit(client_id, amount, reason, notes, admin_user_id)` - Add credit
- `deduct_client_credit(client_id, amount, reason, invoice_id)` - Deduct credit

---

### 17. Users
**Purpose**: Login accounts (admins and client contacts)
**Auth Integration**: Linked to Supabase auth via `auth_user_id`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `bigserial` | PK |
| `auth_user_id` | `uuid NOT NULL UNIQUE` | Supabase auth UID |
| `email` | `text NOT NULL UNIQUE` | Email address |
| `role` | `role NOT NULL DEFAULT 'CLIENT'` | ADMIN or CLIENT |
| `client_id` | `bigint` | FK→clients (cascade delete, optional) |
| `message_last_seen_at` | `timestamptz` | Last message view timestamp |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | Account creation timestamp |
| `updated_at` | `timestamptz NOT NULL DEFAULT now()` | Last modification timestamp |

**Indexes**:
- `idx_users_message_last_seen_at` - Message notification queries

**Relationships**:
- M→1 `clients` (optional)
- 1→M `user_messages` (cascade delete)
- 1→M `tmp_files` (cascade delete)
- 1→M `credit_transactions` (set null)
- 1→M `conversation_last_seen` (cascade delete, both directions)
- 1→M `order_files` (set null)

**Business Rules**:
- ADMIN users have `client_id = NULL`
- CLIENT users must have `client_id` (enforced in app)
- One user per client contact (not one-to-one)

---

### 18. User Messages
**Purpose**: Chat/messaging between clients and admins, linked to invoices
**Indexing**: Multi-dimensional for common query patterns

| Field | Type | Notes |
|-------|------|-------|
| `id` | `bigserial` | PK |
| `user_id` | `bigint NOT NULL` | FK→users (cascade delete) |
| `invoice_id` | `bigint` | FK→invoices (set null, optional) |
| `sender` | `role NOT NULL` | ADMIN or CLIENT (who sent) |
| `content` | `text NOT NULL` | Message text |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | Message timestamp |

**Indexes**:
- `idx_user_messages_user_invoice_created` - User + invoice messages
- `idx_user_messages_invoice_created` - Invoice message timeline
- `idx_user_messages_sender_created` - Message feed by sender
- `idx_user_messages_user_sender_created` - User-specific messages
- `idx_user_messages_created_sender` - Recent messages by role

**Relationships**:
- M→1 `users` (required)
- M→1 `invoices` (optional)

**Use Cases**:
- Invoice-specific chat (nullable `invoice_id`)
- Direct messages between user and admin
- Client portal notifications

---

### 19. Conversation Last Seen
**Purpose**: Track last read message per user conversation
**Primary Key**: Composite (user_id, conversation_user_id)

| Field | Type | Notes |
|-------|------|-------|
| `user_id` | `bigint NOT NULL` | FK→users (cascade delete) - Reader |
| `conversation_user_id` | `bigint NOT NULL` | FK→users (cascade delete) - Conversation partner |
| `last_seen_message_id` | `bigint` | FK→user_messages (set null) |
| `last_seen_at` | `timestamptz NOT NULL DEFAULT now()` | Last view timestamp |
| `updated_at` | `timestamptz NOT NULL DEFAULT now()` | Last update (auto via trigger) |

**Trigger**: `trigger_update_conversation_last_seen_timestamp()` - Auto-updates `updated_at`

**Indexes**:
- `idx_conversation_last_seen_user` - User's conversations
- `idx_conversation_last_seen_conversation_user` - Partner's conversations
- `idx_conversation_last_seen_timestamp` - Recent activity

**Relationships**:
- M→1 `users` (required, as reader)
- M→1 `users` (required, as partner)
- M→1 `user_messages` (optional)

---

### 20. Temporary Files (tmp_files)
**Purpose**: Staging area for uploaded files before processing/attachment
**Lifecycle**: Manual or auto-cleanup (status tracking)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `bigserial` | PK |
| `user_id` | `bigint NOT NULL` | FK→users (cascade delete) |
| `storage_key` | `text NOT NULL` | Storage path in `tmp` bucket |
| `filename` | `text NOT NULL` | Original filename |
| `size_bytes` | `bigint NOT NULL` | File size in bytes |
| `mime_type` | `text` | MIME type |
| `status` | `text NOT NULL DEFAULT 'idle'` | Processing status (idle, processing, error, etc) |
| `metadata` | `jsonb` | Upload metadata |
| `orientation_data` | `jsonb` | 3D model orientation data |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | Upload timestamp |
| `updated_at` | `timestamptz NOT NULL DEFAULT now()` | Last modification timestamp |

**Indexes**:
- `idx_tmp_files_storage_key` - UNIQUE lookup by key
- `idx_tmp_files_user_created` - User's recent uploads

**Relationships**:
- M→1 `users` (required)

**Storage**: Files in `tmp` bucket

---

### 21. Webhook Events
**Purpose**: Idempotency tracking for payment webhook processing (Stripe)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `bigserial` | PK |
| `stripe_event_id` | `text NOT NULL UNIQUE` | Stripe webhook event ID |
| `event_type` | `text NOT NULL` | Event type (e.g., 'payment_intent.succeeded') |
| `processed_at` | `timestamptz NOT NULL DEFAULT now()` | Processing timestamp |
| `metadata` | `jsonb` | Event payload snapshot |

**Indexes**:
- `idx_webhook_events_stripe_event_id` - UNIQUE lookup
- `idx_webhook_events_processed_at` - Processing history

**Purpose**: Prevent duplicate webhook processing

---

### 22. Account Deletion Requests
**Purpose**: GDPR/privacy compliance - schedule and track account deletion
**Status Flow**: REQUESTED → SCHEDULED → ANONYMIZED (or CANCELLED)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `bigserial` | PK |
| `user_id` | `bigint NOT NULL` | FK→users (cascade delete) |
| `client_id` | `bigint` | FK→clients (set null, optional) |
| `email` | `text NOT NULL UNIQUE` | Email at request time |
| `status` | `text NOT NULL DEFAULT 'REQUESTED'` | REQUESTED, SCHEDULED, ANONYMIZED, CANCELLED |
| `requested_at` | `timestamptz NOT NULL DEFAULT now()` | Request timestamp |
| `effective_at` | `timestamptz NOT NULL` | When deletion takes effect |
| `processed_at` | `timestamptz` | When actually processed |
| `retention_until` | `timestamptz NOT NULL` | Compliance data retention deadline |
| `anonymized_data` | `jsonb` | Snapshot of anonymized personal data |
| `notes` | `text` | Admin notes on deletion |

**Indexes**:
- `idx_account_deletion_user` - User deletion requests
- `idx_account_deletion_status` - Deletion queue

**Relationships**:
- M→1 `users` (required)
- M→1 `clients` (optional)

---

## Row-Level Security (RLS) Policies

### Current Implementation
**Status**: RLS enabled on all tables
**Default Policy**: Service-role-only access for all tables

All tables have a blanket `*_service_role_access` policy:
```sql
CREATE POLICY [table_name]_service_role_access ON [table]
  FOR ALL USING (true) WITH CHECK (true)
```

This allows unrestricted access when using service-role key, no client-level filtering.

### Exception: order_files (Partial RLS)
Two specific policies for client file access:

1. **Admins can view all order files**
   - Condition: User role = ADMIN
   - Scope: SELECT

2. **Clients can view own order files**
   - Condition: User linked to order_files.client_id
   - Scope: SELECT

### Storage Bucket Policies
**order-files bucket**:
- Service role: Full access (all operations)
- Authenticated: READ-only

**Other buckets** (attachments, pdfs, tmp):
- No explicit policies (service-role default)

### Security Gap
Current RLS is permissive (service-role override). Consider implementing:
- Row-level filters for invoices/quotes by client ownership
- Job access restrictions (only assigned printer staff)
- Message access control

---

## Database Functions & Helpers

### 1. log_activity()
Creates audit log entries. Parameters: client_id, quote_id, invoice_id, job_id, printer_id, action, message, metadata (optional)

### 2. next_document_number(kind, default_prefix)
Generates sequential document numbers (quotes, invoices). Upserts into `number_sequences` table and returns formatted number.

### 3. create_invoice_with_items(payload)
Atomic invoice creation with line items from JSONB payload. Returns created invoice record.

### 4. update_invoice_with_items(invoice_id, payload)
Update invoice and replace all line items. Deletes old items, inserts new ones.

### 5. add_invoice_payment(payload)
Add payment to invoice, recalculate balance, auto-mark PAID if balance ≤ 0.000001. Returns payment, invoice, balance, paid_amount.

### 6. delete_invoice_payment(payment_id)
Delete payment, recalculate invoice balance and status. Returns payment, invoice, balance, paid_amount.

### 7. add_client_credit(client_id, amount, reason, notes, admin_user_id)
Add credit to client wallet and log transaction. Returns new_balance, transaction_id.

### 8. deduct_client_credit(client_id, amount, reason, invoice_id)
Deduct credit from wallet with balance check. Returns deducted, new_balance.

### 9. update_conversation_last_seen_timestamp() [Trigger]
Auto-updates `updated_at` timestamp on `conversation_last_seen` table before update.

---

## TypeScript Type Mapping

### Input Schemas (Zod Validation)
| Schema | Usage | Validation |
|--------|-------|-----------|
| `invoiceInputSchema` | POST/PUT invoices | Lines required (min 1), quantities ≥ 0.01, modelling fields conditional |
| `quoteInputSchema` | POST/PUT quotes | Lines required (min 1), modelling fields conditional |
| `clientInputSchema` | POST/PUT clients | ABN pattern validation (11 digits), email optional |
| `jobUpdateSchema` | PUT jobs | Title required (1-120 chars), description max 2000 |
| `paymentInputSchema` | POST payments | Amount ≥ 0.01, method enum, paid_at optional |
| `messageInputSchema` | POST messages | Content 1-5000 chars |

### DTO Types (Read/Response)
| DTO | Usage | Fields |
|-----|-------|--------|
| `InvoiceDetailDTO` | GET /invoices/:id | Full invoice + client + items + payments + jobs + attachments |
| `InvoiceSummaryDTO` | GET /invoices | Minimal (id, number, clientName, status, total, dates) |
| `QuoteDetailDTO` | GET /quotes/:id | Full quote + client + items + dates + status |
| `QuoteSummaryDTO` | GET /quotes | Minimal (id, number, clientName, status, total, dates) |
| `ClientDetailDTO` | GET /clients/:id | Full client + invoices + quotes + jobs + activity + totals |
| `ClientSummaryDTO` | GET /clients | Minimal (id, name, company, email, phone, balances, counts) |
| `JobCardDTO` | Job board cells | Job + printer + invoice + client info |
| `JobBoardSnapshotDTO` | GET /jobs/board | Columns (by printer) + summary metrics |
| `MessageDTO` | Message list | id, userId, invoiceId, sender, content, createdAt |
| `PaymentDTO` | Invoice payments | id, amount, method, reference, processor, paidAt |

### Enums (Constants)
Exported from `src/lib/constants/enums.ts` and re-exported in types:
- QuoteStatus, InvoiceStatus, DiscountType, PricingType, PaymentMethod
- JobStatus, JobPriority, PrinterStatus, JobCreationPolicy, Role

---

## Data Integrity Constraints

### Financial Consistency
1. **Invoice Balance Calculation**
   - `balance_due = total - SUM(payments.amount)`
   - Calculated in `add_invoice_payment()` and `delete_invoice_payment()` functions
   - Must be ≥ 0 at all times
   - PAID when balance ≤ 0.000001 (floating-point safe)

2. **Credit Application**
   - `credit_applied ≤ wallet_balance` (enforced in app)
   - `credit_applied ≤ balance_due` (enforced in app)
   - Deduction via `deduct_client_credit()` function

3. **Tax and Discount Calculations**
   - `subtotal = SUM(items.total)`
   - `subtotal = (subtotal - discount) if discount_type=FIXED`
   - `subtotal = (subtotal * (1 - discount/100)) if discount_type=PERCENT`
   - `tax_total = subtotal * tax_rate / 100`
   - `total = subtotal + tax_total + shipping_cost`

### Quote to Invoice Flow
1. Quote created with status DRAFT
2. Quote sent → status PENDING
3. Quote accepted → status ACCEPTED
4. Convert to invoice → status CONVERTED
5. Bidirectional link: `quotes.converted_invoice_id` ↔ `invoices.converted_from_quote_id`
6. Can duplicate quote from PENDING/ACCEPTED/DECLINED

### Job Lifecycle
1. Auto-created on invoice issue or payment (policy-dependent)
2. Status progression: QUEUED → PRE_PROCESSING → IN_QUEUE → PRINTING → PAUSED → PRINTING_COMPLETE → POST_PROCESSING → PACKAGING → OUT_FOR_DELIVERY → COMPLETED
3. Can cancel at any point
4. Auto-archived N days after COMPLETED (configurable)
5. Can be manually archived with reason
6. Printer assignment updates queue_position

### Payment Processing
1. Multiple payments per invoice allowed
2. Can delete payment (refund scenario)
3. Balance and status auto-recalculated
4. Stripe idempotency via `webhook_events` table (stripe_event_id unique)

### Modelling Line Items
Conditional validation (lines with `lineType = 'MODELLING'` require):
- `modellingBrief` (non-empty)
- `modellingComplexity` (SIMPLE/MODERATE/COMPLEX)
- `modellingRevisionCount` (≥ 0)
- `modellingHourlyRate` (> 0)
- `modellingEstimatedHours` (> 0)

### Order Files Constraint
Each `order_file` must reference exactly one of:
- `invoice_id` (for order-specific files)
- `quote_id` (for quote-specific files)
Enforced via CHECK constraint

---

## Storage Buckets

### Defined Buckets
| Bucket | Purpose | Access | Lifecycle |
|--------|---------|--------|-----------|
| `attachments` | Invoice attachments | Service-role only | Keep indefinitely |
| `pdfs` | Generated PDFs (quotes/invoices) | Service-role only | Keep indefinitely |
| `tmp` | Temporary file uploads | Service-role + user | Auto-delete old |
| `order-files` | Project files (CAD, STL, images) | Service-role + authenticated (read) | Keep indefinitely |

### Metadata Tracking
- `tmp_files.orientation_data` - 3D model view/orientation
- `order_files.orientation_data` - Same for permanent files
- `attachments.metadata` - Custom file metadata

---

## Key Design Patterns

### Singleton Configuration
Settings table enforces single row via `id=1` PK. Application loads at startup, caches in memory.

### Atomic Operations
Complex operations (invoice creation, payment, credit adjustment) use functions to ensure transactional consistency:
- `create_invoice_with_items()` - Single INSERT for invoice + N INSERTs for items
- `add_invoice_payment()` - INSERT payment + UPDATE invoice balance/status
- `add_client_credit()` - UPDATE client wallet + INSERT transaction record

### Cascading Deletes
- Delete client → cascades to quotes, invoices, jobs, credit_transactions
- Delete quote → cascades to quote_items, order_files
- Delete invoice → cascades to invoice_items, payments, jobs, attachments, order_files, messages, credit_transactions (set null only for audit tables)

### Soft Deletes (Status-Based)
No hard deletes for financial records. Instead:
- Invoices: mark `voided_at` + `void_reason`
- Invoices: mark `written_off_at` + `write_off_reason`
- Jobs: mark `archived_at` + `archived_reason`
- Messages: Kept with creator ID (no delete)

### JSONB Storage
- `address` (clients) - Structured address data
- `tags` (clients) - Array of tags
- `payment_terms` (settings) - Term definitions
- `shipping_regions` (settings) - Region config
- `calculator_config` (settings, product_templates) - Pricing logic
- `calculator_snapshot` (quotes, invoices) - Frozen state
- `calculator_breakdown` (items) - Itemized pricing
- `metadata` (payments, activity_logs, etc) - Extensible data
- `orientation_data` (files) - 3D model view state

---

## Critical Unresolved Questions

1. **RLS Policy Completeness**: Current policies allow service-role unrestricted access. Should implement row-level filtering for client-owned records?

2. **Payment Method Defaults**: Is "OTHER" appropriate default for `payments.method`? Should integrate Stripe detection?

3. **Overdue Status Calculation**: Is overdue status calculated on query (based on `overdue_days` setting + `due_date`) or set via cron job?

4. **Job Auto-Archival**: Is this enforced via scheduled job/function or manual process?

5. **Email Template Enforcement**: How are `email_templates` in settings actually rendered and sent?

6. **Credit Refund Logic**: Is "CREDIT_REFUNDED" transaction type used? When/how is it triggered?

7. **Order File Versioning**: Can multiple versions of same file be uploaded (no constraints preventing duplicate names)?

8. **Printer Assignment Rules**: Are assignment restrictions enforced in DB or application layer only?

---

## Summary

**31 tables** covering complete lifecycle: client management → quoting → invoicing → payment → job production → file management → audit logging

**Key Strengths**:
- Comprehensive audit trail (activity_logs, credit_transactions)
- Transactional integrity via functions
- Cascading deletes prevent orphans
- JSONB flexibility for calculators and metadata

**Key Weaknesses**:
- RLS overly permissive (service-role bypass)
- No temporal versioning (hard to reconstruct history)
- Soft deletes lack enforcement (anyone can query "deleted" records)
- Limited field-level constraints (validation in app)

**Financial Reporting Ready**: Indexed on status, dates, and amounts for standard queries

**Compliance Ready**: Account deletion tracking, credit audit trail, activity logging
