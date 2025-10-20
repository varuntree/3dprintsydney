# Database Schema Documentation

## 1. Schema Overview

**Database Type:** Supabase PostgreSQL

**Total Tables:** 19

| Category | Count |
|----------|-------|
| Core entities | 5 |
| Financial | 5 |
| Operations | 4 |
| User/Content | 3 |
| Supporting | 2 |

**Migration Strategy:** Sequential numbered migrations applied in order. Migrations use transactions to ensure atomicity. Schema includes RLS (Row-Level Security) policies and storage bucket configuration.

**Location:** `/supabase/migrations/` (10 migration files, 202510161800 - 202510191600)

---

## 2. Core Entities

### Settings
**Purpose:** Global business configuration (singleton table - id always 1)

| Column | Type | Notes |
|--------|------|-------|
| business_name | text | Business display name |
| business_email | text | Contact email |
| business_phone | text | Contact phone |
| business_address | text | Business location |
| abn | text | ABN identifier |
| tax_rate | numeric | Default tax percentage |
| numbering_quote_prefix | text | Default: 'QT-' |
| numbering_invoice_prefix | text | Default: 'INV-' |
| default_currency | text | Default: 'AUD' |
| job_creation_policy | enum | ON_PAYMENT or ON_INVOICE |
| auto_detach_job_on_complete | boolean | Auto-detach on completion |
| auto_archive_completed_jobs_after_days | integer | Auto-archive threshold |
| payment_terms | jsonb | Payment term configurations |
| calculator_config | jsonb | Pricing calculator settings |
| shipping_regions | jsonb | Available shipping regions |

**Key:** Single-row constraint on id=1

---

### Users
**Purpose:** Authentication and role management

| Column | Type | Notes |
|--------|------|-------|
| auth_user_id | uuid | Supabase auth reference |
| email | text | Unique user email |
| role | enum | ADMIN, CLIENT |
| client_id | bigint | FK to clients (NULL for admins) |

**Relationships:** 
- One user per auth account
- Optional reference to single client
- Clients can have multiple users

**Indexes:**
- auth_user_id (unique)
- email (unique)

---

### Clients
**Purpose:** 3D print service customers

| Column | Type | Notes |
|--------|------|-------|
| name | text | Client name (required) |
| company | text | Company name |
| abn | text | ABN if business |
| email | text | Contact email |
| phone | text | Contact phone |
| address | jsonb | Full address object |
| tags | jsonb | Categorization tags |
| payment_terms | text | Client-specific terms |
| notify_on_job_status | boolean | Job notification flag |

**Cascade:** Deletes cascade to users, quotes, invoices, jobs

---

### Materials
**Purpose:** 3D printing material catalog

| Column | Type | Notes |
|--------|------|-------|
| name | text | Material name (required) |
| color | text | Material color |
| category | text | Material type/category |
| cost_per_gram | numeric | Unit cost for pricing |
| notes | text | Additional info |

**Usage:** Referenced by product_templates for cost calculation

---

### Product Templates
**Purpose:** Reusable product/service definitions

| Column | Type | Notes |
|--------|------|-------|
| name | text | Product name (required) |
| description | text | Product description |
| unit | text | Unit label (default: 'unit') |
| pricing_type | enum | FIXED or CALCULATED |
| base_price | numeric | Base price if FIXED |
| calculator_config | jsonb | Pricing formula for CALCULATED |
| material_id | bigint | FK to materials (optional) |

**Usage:** Templates used in quote_items and invoice_items for consistency

---

## 3. Financial Entities

### Quotes
**Purpose:** Client pricing proposals

| Column | Type | Notes |
|--------|------|-------|
| number | text | Unique document number |
| client_id | bigint | FK to clients (cascade delete) |
| status | enum | DRAFT, PENDING, ACCEPTED, DECLINED, CONVERTED |
| issue_date | timestamptz | Quote creation date |
| expiry_date | timestamptz | Quote expiration |
| sent_at | timestamptz | When sent to client |
| accepted_at | timestamptz | When client accepted |
| declined_at | timestamptz | When client declined |
| discount_type | enum | NONE, PERCENT, FIXED |
| discount_value | numeric | Discount amount |
| subtotal | numeric | Pre-tax total |
| tax_total | numeric | Tax amount |
| total | numeric | Final amount |
| shipping_cost | numeric | Shipping fee |
| converted_invoice_id | bigint | FK to invoices (unique) |
| calculator_snapshot | jsonb | Pricing calculation record |

**Indexes:** number (unique), converted_invoice_id (unique)

---

### Quote Items
**Purpose:** Line items in quotes

| Column | Type | Notes |
|--------|------|-------|
| quote_id | bigint | FK to quotes (cascade delete) |
| product_template_id | bigint | FK to product_templates (optional) |
| name | text | Line item name |
| quantity | numeric | Item quantity |
| unit | text | Unit of measurement |
| unit_price | numeric | Price per unit |
| discount_type | enum | Item-level discount |
| total | numeric | Line item total |
| calculator_breakdown | jsonb | Pricing detail |

---

### Invoices
**Purpose:** Billing documents and payment tracking

| Column | Type | Notes |
|--------|------|-------|
| number | text | Unique invoice number |
| client_id | bigint | FK to clients (cascade delete) |
| source_quote_id | bigint | FK to quotes (optional) |
| status | enum | PENDING, PAID, OVERDUE |
| issue_date | timestamptz | Invoice date |
| due_date | timestamptz | Payment due date |
| voided_at | timestamptz | Void date with reason |
| written_off_at | timestamptz | Write-off date |
| balance_due | numeric | Remaining balance |
| paid_at | timestamptz | Full payment date |
| stripe_session_id | text | Stripe payment session |
| stripe_checkout_url | text | Stripe checkout link |
| po_number | text | Purchase order number |
| internal_notes | text | Admin-only notes |

**Indexes:** 
- idx_invoices_status_due_date
- idx_invoices_paid_at

**Relationships:** One-to-many with payments and invoice_items

---

### Invoice Items
**Purpose:** Line items in invoices (mirrors quote_items structure)

| Column | Type | Notes |
|--------|------|-------|
| invoice_id | bigint | FK to invoices (cascade delete) |
| product_template_id | bigint | FK to product_templates |
| name | text | Line item name |
| quantity | numeric | Item quantity |
| unit | text | Unit of measurement |
| unit_price | numeric | Price per unit |
| discount_type | enum | Item-level discount |
| total | numeric | Line item total |
| calculator_breakdown | jsonb | Pricing detail |

---

### Payments
**Purpose:** Individual payment records for invoices

| Column | Type | Notes |
|--------|------|-------|
| invoice_id | bigint | FK to invoices (cascade delete) |
| method | enum | STRIPE, BANK_TRANSFER, CASH, OTHER |
| amount | numeric | Payment amount |
| currency | text | Default: 'AUD' |
| reference | text | Payment reference/ID |
| processor | text | Payment processor name |
| processor_id | text | External processor ID (unique) |
| notes | text | Payment notes |
| paid_at | timestamptz | Payment timestamp |
| metadata | jsonb | Additional payment data |

**Indexes:**
- idx_payments_paid_at
- processor_id (unique)

**Function:** `add_invoice_payment()` - Atomically adds payment and updates invoice balance

---

## 4. Operations Entities

### Printers
**Purpose:** 3D printing hardware inventory

| Column | Type | Notes |
|--------|------|-------|
| name | text | Printer name (required) |
| model | text | Hardware model |
| build_volume | text | Maximum build dimensions |
| status | enum | ACTIVE, MAINTENANCE, OFFLINE |
| notes | text | General notes |
| last_maintenance_at | timestamptz | Last maintenance date |
| maintenance_note | text | Maintenance details |

**Usage:** Jobs assigned to printers for queue management

---

### Jobs
**Purpose:** Print jobs linked to invoices

| Column | Type | Notes |
|--------|------|-------|
| invoice_id | bigint | FK to invoices (cascade delete) |
| client_id | bigint | FK to clients (cascade delete) |
| printer_id | bigint | FK to printers (set null if removed) |
| title | text | Job title (required) |
| description | text | Job description |
| status | enum | QUEUED, PRE_PROCESSING, IN_QUEUE, PRINTING, PAUSED, PRINTING_COMPLETE, POST_PROCESSING, PACKAGING, OUT_FOR_DELIVERY, COMPLETED, CANCELLED |
| priority | enum | NORMAL, FAST_TRACK, URGENT |
| queue_position | integer | Position in printer queue |
| estimated_hours | numeric | Estimated print time |
| actual_hours | numeric | Actual print time |
| started_at | timestamptz | Print start time |
| paused_at | timestamptz | Print pause time |
| completed_at | timestamptz | Print completion time |
| archived_at | timestamptz | Archive date |
| archived_reason | text | Why job was archived |
| completed_by | text | User who completed job |

**Indexes:**
- idx_jobs_printer_status_position (queue filtering)
- idx_jobs_status_completed_at (status tracking)
- idx_jobs_archived_at (archive queries)

**Constraints:** 
- prevent_assign_to_offline (setting)
- prevent_assign_to_maintenance (setting)
- max_active_printing_per_printer (setting)

---

### Attachments
**Purpose:** File storage references for invoices

| Column | Type | Notes |
|--------|------|-------|
| invoice_id | bigint | FK to invoices (cascade delete) |
| filename | text | Original filename |
| storage_key | text | Storage bucket path |
| filetype | text | MIME type |
| size_bytes | bigint | File size |
| metadata | jsonb | File metadata |
| uploaded_at | timestamptz | Upload timestamp |

**Storage:** Files in `attachments` Supabase bucket

---

## 5. User Content & Supporting Entities

### Activity Logs
**Purpose:** Audit trail for all entity changes

| Column | Type | Notes |
|--------|------|-------|
| client_id | bigint | FK to clients (set null on delete) |
| quote_id | bigint | FK to quotes (set null on delete) |
| invoice_id | bigint | FK to invoices (set null on delete) |
| job_id | bigint | FK to jobs (set null on delete) |
| printer_id | bigint | FK to printers (set null on delete) |
| action | text | Action type (CREATE, UPDATE, DELETE, etc) |
| message | text | Human-readable description |
| metadata | jsonb | Additional context |

**Function:** `log_activity()` - Helper to insert activity records

---

### User Messages
**Purpose:** Client-admin communications on invoices

| Column | Type | Notes |
|--------|------|-------|
| user_id | bigint | FK to users (cascade delete) |
| invoice_id | bigint | FK to invoices (set null on delete) |
| sender | enum | ADMIN or CLIENT |
| content | text | Message text |

**Indexes:**
- idx_user_messages_user_invoice_created
- idx_user_messages_invoice_created

**Scope:** Conversation threads per invoice

---

### Tmp Files
**Purpose:** Temporary file staging for uploads

| Column | Type | Notes |
|--------|------|-------|
| user_id | bigint | FK to users (cascade delete) |
| storage_key | text | Storage bucket path (unique) |
| filename | text | Original filename |
| size_bytes | bigint | File size |
| mime_type | text | File MIME type |
| status | text | idle, processing, ready |
| metadata | jsonb | Upload metadata |

**Storage:** Files in `tmp` Supabase bucket (cleanup handled by policy)

---

### Order Files
**Purpose:** Permanent storage of client 3D model files

| Column | Type | Notes |
|--------|------|-------|
| invoice_id | bigint | FK to invoices (optional, cascade delete) |
| quote_id | bigint | FK to quotes (optional, cascade delete) |
| client_id | bigint | FK to clients (cascade delete) |
| filename | text | Original filename |
| storage_key | text | Storage bucket path (unique) |
| file_type | text | 'model' or 'settings' |
| mime_type | text | File MIME type |
| size_bytes | bigint | File size |
| metadata | jsonb | Print settings, slicing metrics |
| uploaded_by | bigint | FK to users (set null on delete) |

**Constraint:** At least one of invoice_id or quote_id must be set

**Storage:** Files in `pdfs` Supabase bucket

---

### Webhook Events
**Purpose:** Stripe webhook idempotency tracking

| Column | Type | Notes |
|--------|------|-------|
| stripe_event_id | text | External event ID (unique) |
| event_type | text | Event type (payment_intent.succeeded, etc) |
| processed_at | timestamptz | Processing timestamp |
| metadata | jsonb | Event data payload |

**Indexes:**
- idx_webhook_events_stripe_event_id
- idx_webhook_events_processed_at

**Usage:** Prevents duplicate webhook processing for same event

---

### Number Sequences
**Purpose:** Auto-incrementing document number generation

| Column | Type | Notes |
|--------|------|-------|
| kind | text | Document type (unique, e.g., 'quote', 'invoice') |
| prefix | text | Number prefix ('QT-', 'INV-', etc) |
| current | integer | Current sequence number |

**Function:** `next_document_number(kind, default_prefix)` - Thread-safe sequence generator

**Format:** Generates `prefix + 4-digit-padded-number` (e.g., QT-0001)

---

## 6. Entity Relationships

### Relationship Diagram

```
Settings (singleton)
    |
    +-- Default numbering & job policies
    +-- Tax & payment terms
    +-- Shipping & calc config

Clients
    ├── Users (1:M) ←→ Auth.users
    ├── Quotes (1:M)
    │   ├── Quote Items (1:M)
    │   │   └── Product Templates (optional ref)
    │   └── Invoices (quote → invoice conversion)
    │
    ├── Invoices (1:M)
    │   ├── Invoice Items (1:M)
    │   │   └── Product Templates (optional ref)
    │   ├── Payments (1:M)
    │   ├── Jobs (1:M)
    │   │   ├── Printers (M:1)
    │   │   └── Activity Logs
    │   └── Attachments (1:M)
    │
    ├── Jobs (1:M)
    │   ├── Invoices (1:M)
    │   ├── Printers (M:1)
    │   └── Activity Logs
    │
    ├── Order Files (1:M)
    ├── Activity Logs (1:M)
    └── User Messages (1:M)

Materials
    └── Product Templates (1:M)

Printers
    └── Jobs (1:M)

Number Sequences
    └── Global lookup table

Webhook Events
    └── Global Stripe event tracking
```

### Cascade Rules

| Relationship | Delete Behavior |
|--------------|-----------------|
| Client → Users | CASCADE |
| Client → Quotes | CASCADE |
| Client → Invoices | CASCADE |
| Client → Jobs | CASCADE |
| Client → Order Files | CASCADE |
| Invoice → Invoice Items | CASCADE |
| Invoice → Jobs | CASCADE |
| Invoice → Payments | CASCADE |
| Invoice → Attachments | CASCADE |
| Quote → Quote Items | CASCADE |
| Quote → Invoice (reverse ref) | SET NULL |
| Material → Product Templates | SET NULL |
| Printer → Jobs | SET NULL |
| User → Temp Files | CASCADE |
| User → Order Files (uploader) | SET NULL |
| User → User Messages | CASCADE |
| Activity Log references | SET NULL (all) |

---

## 7. Enums and Custom Types

### Role
- `ADMIN` - Full system access
- `CLIENT` - Limited access to own data

### Quote Status
- `DRAFT` - Under preparation
- `PENDING` - Awaiting client response
- `ACCEPTED` - Client approved
- `DECLINED` - Client rejected
- `CONVERTED` - Converted to invoice

### Invoice Status
- `PENDING` - Awaiting payment
- `PAID` - Fully paid
- `OVERDUE` - Past due date

### Job Status (11 states)
- `QUEUED` - Scheduled for processing
- `PRE_PROCESSING` - Model preparation
- `IN_QUEUE` - Waiting for printer
- `PRINTING` - Currently printing
- `PAUSED` - Print paused
- `PRINTING_COMPLETE` - Print finished
- `POST_PROCESSING` - Finishing work
- `PACKAGING` - Preparing for delivery
- `OUT_FOR_DELIVERY` - In transit
- `COMPLETED` - Delivered
- `CANCELLED` - Job cancelled

### Job Priority
- `NORMAL` - Standard priority
- `FAST_TRACK` - Expedited
- `URGENT` - Critical

### Printer Status
- `ACTIVE` - Ready for jobs
- `MAINTENANCE` - Under maintenance
- `OFFLINE` - Not available

### Job Creation Policy
- `ON_PAYMENT` - Jobs created after payment
- `ON_INVOICE` - Jobs created on invoice

### Payment Method
- `STRIPE` - Credit card via Stripe
- `BANK_TRANSFER` - Direct transfer
- `CASH` - Cash payment
- `OTHER` - Other method

### Discount Type
- `NONE` - No discount
- `PERCENT` - Percentage discount
- `FIXED` - Fixed amount discount

### Pricing Type
- `FIXED` - Fixed price product
- `CALCULATED` - Price calculated by formula

---

## 8. Data Integrity

### Constraints

| Type | Details |
|------|---------|
| **Primary Keys** | All tables use `id bigserial primary key` |
| **Unique Constraints** | quotes.number, invoices.number, auth_user_id, email, product_template_id refs |
| **JSONB Validation** | Used for flexible config/metadata storage without schema |
| **Not Null** | Core fields like names, amounts, dates marked as NOT NULL |
| **Check Constraint** | order_files requires at least invoice_id or quote_id |
| **Foreign Keys** | All FKs defined with ON DELETE cascade/set null as appropriate |

### Index Strategy

**Performance Indexes:**
- Quote/Invoice lookups: document numbers (unique)
- Job queue: `(printer_id, status, queue_position)`
- Job tracking: `(status, completed_at)`, `archived_at`
- Payment history: `(paid_at)`, `processor_id (unique)`
- Invoice aging: `(status, due_date)` for overdue detection
- Message threads: `(user_id, invoice_id, created_at)`, `(invoice_id, created_at)`
- File lookups: `(invoice_id)`, `(quote_id)`, `(client_id)`, `storage_key (unique)`
- Webhook dedup: `stripe_event_id (unique)`, `processed_at`

### JSONB Fields (Flexible Storage)

| Table | Field | Purpose |
|-------|-------|---------|
| Settings | payment_terms, shipping_regions, calculator_config | Config lists |
| Clients | address, tags | Variable data |
| Product Templates | calculator_config | Pricing logic |
| Quotes/Invoices | calculator_snapshot, source_data | Pricing history |
| Quote/Invoice Items | calculator_breakdown | Line-item detail |
| Attachments/Files | metadata | File details |
| Payments | metadata | Processor response |
| Activity Logs | metadata | Context data |
| Order Files | metadata | 3D model settings |
| Webhook Events | metadata | Event payload |

### Row-Level Security (RLS)

All key tables have RLS enabled with service-role-only permissive policies:
- clients, quotes, invoices, quote_items, invoice_items
- payments, printers, jobs, attachments, activity_logs
- user_messages, tmp_files, order_files

Application uses Supabase service role exclusively for server operations.

---

## 9. Migration Management

### Directory
`/supabase/migrations/`

### Naming Convention
`YYYYMMDDhhMM_description.sql` (e.g., `202510161800_init.sql`)

### Migration Files (In Order)

1. **202510161800_init.sql** - Core schema with 11 enums and 10 base tables
2. **202510161805_policies.sql** - RLS policies and helper functions (log_activity, next_document_number)
3. **202510171300_users_sessions.sql** - Users, user_messages, tmp_files tables
4. **202510171320_transactions.sql** - Invoice transaction functions (create, update, payment management)
5. **202510180001_grants.sql** - Supabase role privilege grants
6. **202510181400_fix_missing_policies.sql** - Additional RLS policies
7. **202510181830_fix_next_document_number.sql** - Document number function fixes
8. **202510191530_seed_catalog_data.sql** - Initial material and product template data
9. **202510191545_webhook_idempotency.sql** - webhook_events table for Stripe dedup
10. **202510191600_order_files.sql** - order_files table with RLS for 3D model tracking

### How to Apply

**Development:**
```bash
supabase migration up
```

**Production (via Supabase Dashboard):**
1. Navigate to SQL Editor
2. Execute migrations in order
3. Verify table structure and policies

**Verification:**
```sql
-- Check migration status
select * from supabase_migrations;

-- Verify table count
select count(*) from information_schema.tables 
where table_schema = 'public';

-- Check RLS status
select tablename, rowsecurity 
from pg_tables where schemaname = 'public';
```

**Rollback:** Migrations are transactional. On failure, all changes in that migration are rolled back.

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total Tables | 19 |
| Total Enums | 10 |
| Foreign Keys | 35+ |
| Indexes | 15+ |
| Functions | 4 |
| Storage Buckets | 3 |
| Migrations | 10 |

**Last Updated:** 2025-10-21
