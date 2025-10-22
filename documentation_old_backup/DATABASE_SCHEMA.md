# Database Schema Documentation

## 1. Schema Overview

**Database Type:** Supabase PostgreSQL

**Total Tables:** 19

| Category | Count | Tables |
|----------|-------|--------|
| Core entities | 5 | settings, users, clients, materials, product_templates |
| Financial | 5 | quotes, quote_items, invoices, invoice_items, payments |
| Operations | 4 | printers, jobs, attachments, order_files |
| User/Content | 2 | user_messages, tmp_files |
| Supporting | 3 | activity_logs, webhook_events, number_sequences |

**Migration Strategy:** Sequential numbered migrations applied in order. Migrations use transactions (`begin`/`commit`) to ensure atomicity. Schema includes RLS (Row-Level Security) policies and storage bucket configuration.

**Location:** `/supabase/migrations/` (10 migration files, 202510161800 - 202510191600)

---

## 2. Core Entities

### Settings
**Purpose:** Global business configuration (singleton table - id always 1)

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | integer | 1 | Primary key (constrained to 1) |
| business_name | text | '' | Business display name |
| business_email | text | NULL | Contact email |
| business_phone | text | NULL | Contact phone |
| business_address | text | NULL | Business location |
| abn | text | NULL | ABN identifier |
| tax_rate | numeric | NULL | Default tax percentage (10 = 10%) |
| numbering_quote_prefix | text | 'QT-' | Quote number prefix |
| numbering_invoice_prefix | text | 'INV-' | Invoice number prefix |
| default_payment_terms | text | 'COD' | Default payment terms code |
| bank_details | text | NULL | Bank account information |
| shipping_regions | jsonb | NULL | Shipping region configuration array |
| default_shipping_region | text | 'sydney_metro' | Default shipping region code |
| payment_terms | jsonb | NULL | Payment terms definitions |
| calculator_config | jsonb | NULL | Pricing calculator configuration |
| default_currency | text | 'AUD' | Default currency code |
| job_creation_policy | job_creation_policy | 'ON_PAYMENT' | When to create jobs |
| auto_detach_job_on_complete | boolean | true | Auto-detach jobs on completion |
| auto_archive_completed_jobs_after_days | integer | 7 | Archive threshold in days |
| prevent_assign_to_offline | boolean | true | Block job assignment to offline printers |
| prevent_assign_to_maintenance | boolean | true | Block job assignment to maintenance printers |
| max_active_printing_per_printer | integer | 1 | Maximum concurrent prints per printer |
| overdue_days | integer | 0 | Days before invoice becomes overdue |
| reminder_cadence_days | integer | 7 | Payment reminder frequency |
| enable_email_send | boolean | false | Enable email notifications |
| created_at | timestamptz | now() | Record creation timestamp |
| updated_at | timestamptz | now() | Last update timestamp |

**Key Features:**
- Single-row constraint enforced (id=1)
- JSONB fields for flexible configuration
- Contains business logic defaults for job and invoice management
- Updated via seed migration 202510191530

---

### Users
**Purpose:** Authentication and role management

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| id | bigserial | PRIMARY KEY | Internal user ID |
| auth_user_id | uuid | NOT NULL UNIQUE | References Supabase auth.users |
| email | text | NOT NULL UNIQUE | User email address |
| role | role | NOT NULL DEFAULT 'CLIENT' | ADMIN or CLIENT |
| client_id | bigint | FK clients ON DELETE CASCADE | NULL for admins, required for clients |
| created_at | timestamptz | NOT NULL DEFAULT now() | Account creation |
| updated_at | timestamptz | NOT NULL DEFAULT now() | Last modification |

**Relationships:**
- One user per Supabase auth account (auth_user_id unique)
- Optional reference to single client (NULL for admins)
- One client can have multiple user accounts

**Indexes:**
- auth_user_id (unique)
- email (unique)

**RLS:** Enabled with service-role permissive policy

---

### Clients
**Purpose:** 3D print service customers

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| id | bigserial | PRIMARY KEY | Client ID |
| name | text | NOT NULL | Client name (individual or business) |
| company | text | NULL | Company name |
| abn | text | NULL | ABN if business |
| email | text | NULL | Primary contact email |
| phone | text | NULL | Primary contact phone |
| address | jsonb | NULL | Full address object |
| tags | jsonb | NULL | Categorization/grouping tags |
| payment_terms | text | NULL | Client-specific payment terms override |
| notes | text | NULL | Internal notes about client |
| notify_on_job_status | boolean | NOT NULL DEFAULT false | Send job status notifications |
| created_at | timestamptz | NOT NULL DEFAULT now() | Client creation |
| updated_at | timestamptz | NOT NULL DEFAULT now() | Last modification |

**Cascade Deletes:**
- users (CASCADE)
- quotes (CASCADE)
- invoices (CASCADE)
- jobs (CASCADE)
- order_files (CASCADE)

**RLS:** Enabled with service-role permissive policy

---

### Materials
**Purpose:** 3D printing material catalog

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| id | bigserial | PRIMARY KEY | Material ID |
| name | text | NOT NULL | Material name (e.g., PLA, PETG) |
| color | text | NULL | Material color |
| category | text | NULL | Material type/category |
| cost_per_gram | numeric | NOT NULL | Unit cost for pricing calculations |
| notes | text | NULL | Additional material information |
| created_at | timestamptz | NOT NULL DEFAULT now() | Record creation |
| updated_at | timestamptz | NOT NULL DEFAULT now() | Last modification |

**Usage:** Referenced by product_templates for cost calculation

**Seed Data (migration 202510191530):**
- ID 1: PLA, Assorted, General, $0.05/gram
- ID 2: PETG, Clear, High Strength, $0.08/gram

**RLS:** Enabled with service-role permissive policy

---

### Product Templates
**Purpose:** Reusable product/service definitions

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| id | bigserial | PRIMARY KEY | Template ID |
| name | text | NOT NULL | Product name |
| description | text | NULL | Product description |
| unit | text | DEFAULT 'unit' | Unit of measurement |
| pricing_type | pricing_type | NOT NULL DEFAULT 'FIXED' | FIXED or CALCULATED |
| base_price | numeric | NULL | Base price if FIXED pricing |
| calculator_config | jsonb | NULL | Pricing formula for CALCULATED type |
| material_id | bigint | FK materials ON DELETE SET NULL | Optional material reference |
| created_at | timestamptz | NOT NULL DEFAULT now() | Template creation |
| updated_at | timestamptz | NOT NULL DEFAULT now() | Last modification |

**Usage:**
- Templates referenced in quote_items and invoice_items for consistency
- Supports both fixed pricing and dynamic calculation

**Seed Data (migration 202510191530):**
- ID 1: Small Print (CALCULATED, references PLA)
- ID 2: Design Consultation (FIXED, $90/hour)

**RLS:** Enabled with service-role permissive policy

---

## 3. Financial Entities

### Quotes
**Purpose:** Client pricing proposals

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| id | bigserial | PRIMARY KEY | Quote ID |
| number | text | NOT NULL UNIQUE | Document number (e.g., QT-0001) |
| client_id | bigint | NOT NULL FK clients ON DELETE CASCADE | Quote recipient |
| status | quote_status | NOT NULL DEFAULT 'DRAFT' | Quote lifecycle status |
| issue_date | timestamptz | NOT NULL DEFAULT now() | Quote creation date |
| expiry_date | timestamptz | NULL | Quote expiration |
| sent_at | timestamptz | NULL | When sent to client |
| accepted_at | timestamptz | NULL | When client accepted |
| declined_at | timestamptz | NULL | When client declined |
| expires_at | timestamptz | NULL | Expiration timestamp |
| decision_note | text | NULL | Client's acceptance/rejection note |
| tax_rate | numeric | NULL | Quote-specific tax rate |
| discount_type | discount_type | NOT NULL DEFAULT 'NONE' | NONE, PERCENT, or FIXED |
| discount_value | numeric | NULL | Discount amount |
| shipping_cost | numeric | NULL | Shipping fee |
| shipping_label | text | NULL | Shipping description |
| subtotal | numeric | NOT NULL | Pre-tax total |
| tax_total | numeric | NOT NULL | Tax amount |
| total | numeric | NOT NULL | Final amount |
| notes | text | NULL | Quote notes/terms |
| terms | text | NULL | Payment/delivery terms |
| calculator_snapshot | jsonb | NULL | Pricing calculation record |
| source_data | jsonb | NULL | Original quote request data |
| converted_invoice_id | bigint | UNIQUE FK invoices ON DELETE SET NULL | Resulting invoice if converted |
| created_at | timestamptz | NOT NULL DEFAULT now() | Record creation |
| updated_at | timestamptz | NOT NULL DEFAULT now() | Last modification |

**Relationships:**
- One-to-many with quote_items (CASCADE delete)
- Optional one-to-one with invoices (conversion relationship)

**Indexes:**
- number (unique)
- converted_invoice_id (unique)

**RLS:** Enabled with service-role permissive policy

---

### Quote Items
**Purpose:** Line items in quotes

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| id | bigserial | PRIMARY KEY | Line item ID |
| quote_id | bigint | NOT NULL FK quotes ON DELETE CASCADE | Parent quote |
| product_template_id | bigint | FK product_templates ON DELETE SET NULL | Optional template reference |
| name | text | NOT NULL | Line item name |
| description | text | NULL | Item description |
| quantity | numeric | NOT NULL | Item quantity |
| unit | text | NULL | Unit of measurement |
| unit_price | numeric | NOT NULL | Price per unit |
| discount_type | discount_type | NOT NULL DEFAULT 'NONE' | Item-level discount type |
| discount_value | numeric | NULL | Item-level discount amount |
| total | numeric | NOT NULL | Line item total |
| order_index | integer | NOT NULL DEFAULT 0 | Display order |
| calculator_breakdown | jsonb | NULL | Pricing calculation details |

**RLS:** Enabled with service-role permissive policy

---

### Invoices
**Purpose:** Billing documents and payment tracking

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| id | bigserial | PRIMARY KEY | Invoice ID |
| number | text | NOT NULL UNIQUE | Invoice number (e.g., INV-0001) |
| client_id | bigint | NOT NULL FK clients ON DELETE CASCADE | Invoice recipient |
| source_quote_id | bigint | FK quotes ON DELETE SET NULL | Original quote if converted |
| status | invoice_status | NOT NULL DEFAULT 'PENDING' | PENDING, PAID, OVERDUE |
| issue_date | timestamptz | NOT NULL DEFAULT now() | Invoice date |
| due_date | timestamptz | NULL | Payment due date |
| voided_at | timestamptz | NULL | Void timestamp |
| void_reason | text | NULL | Why invoice was voided |
| written_off_at | timestamptz | NULL | Write-off timestamp |
| write_off_reason | text | NULL | Why invoice was written off |
| overdue_notified_at | timestamptz | NULL | Last overdue notification sent |
| tax_rate | numeric | NULL | Invoice-specific tax rate |
| discount_type | discount_type | NOT NULL DEFAULT 'NONE' | NONE, PERCENT, or FIXED |
| discount_value | numeric | NULL | Discount amount |
| shipping_cost | numeric | NULL | Shipping fee |
| shipping_label | text | NULL | Shipping description |
| subtotal | numeric | NOT NULL | Pre-tax total |
| tax_total | numeric | NOT NULL | Tax amount |
| total | numeric | NOT NULL | Final amount |
| balance_due | numeric | NOT NULL | Remaining unpaid amount |
| stripe_session_id | text | NULL | Stripe payment session ID |
| stripe_checkout_url | text | NULL | Stripe checkout link |
| notes | text | NULL | Invoice notes |
| terms | text | NULL | Payment/delivery terms |
| po_number | text | NULL | Client purchase order number |
| internal_notes | text | NULL | Admin-only notes |
| paid_at | timestamptz | NULL | Full payment completion date |
| calculator_snapshot | jsonb | NULL | Pricing calculation record |
| converted_from_quote_id | bigint | UNIQUE FK quotes ON DELETE SET NULL | Source quote if converted |
| created_at | timestamptz | NOT NULL DEFAULT now() | Record creation |
| updated_at | timestamptz | NOT NULL DEFAULT now() | Last modification |

**Relationships:**
- One-to-many with invoice_items (CASCADE delete)
- One-to-many with payments (CASCADE delete)
- One-to-many with jobs (CASCADE delete)
- One-to-many with attachments (CASCADE delete)
- Optional bidirectional reference to quotes

**Indexes:**
- number (unique)
- converted_from_quote_id (unique)
- idx_invoices_status_due_date (composite for overdue detection)
- idx_invoices_paid_at (payment history queries)

**Functions:**
- `create_invoice_with_items(payload jsonb)` - Atomically create invoice + items
- `update_invoice_with_items(p_invoice_id, payload jsonb)` - Atomically update invoice + items
- `add_invoice_payment(payload jsonb)` - Add payment and update balance/status
- `delete_invoice_payment(p_payment_id)` - Remove payment and recalculate balance

**RLS:** Enabled with service-role permissive policy

---

### Invoice Items
**Purpose:** Line items in invoices (mirrors quote_items structure)

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| id | bigserial | PRIMARY KEY | Line item ID |
| invoice_id | bigint | NOT NULL FK invoices ON DELETE CASCADE | Parent invoice |
| product_template_id | bigint | FK product_templates ON DELETE SET NULL | Optional template reference |
| name | text | NOT NULL | Line item name |
| description | text | NULL | Item description |
| quantity | numeric | NOT NULL | Item quantity |
| unit | text | NULL | Unit of measurement |
| unit_price | numeric | NOT NULL | Price per unit |
| discount_type | discount_type | NOT NULL DEFAULT 'NONE' | Item-level discount type |
| discount_value | numeric | NULL | Item-level discount amount |
| total | numeric | NOT NULL | Line item total |
| order_index | integer | NOT NULL DEFAULT 0 | Display order |
| calculator_breakdown | jsonb | NULL | Pricing calculation details |

**RLS:** Enabled with service-role permissive policy

---

### Payments
**Purpose:** Individual payment records for invoices

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| id | bigserial | PRIMARY KEY | Payment ID |
| invoice_id | bigint | NOT NULL FK invoices ON DELETE CASCADE | Parent invoice |
| method | payment_method | NOT NULL DEFAULT 'OTHER' | Payment method type |
| amount | numeric | NOT NULL | Payment amount |
| currency | text | NOT NULL DEFAULT 'AUD' | Payment currency |
| reference | text | NULL | Payment reference/ID |
| processor | text | NULL | Payment processor name (e.g., 'stripe') |
| processor_id | text | UNIQUE | External processor transaction ID |
| notes | text | NULL | Payment notes |
| paid_at | timestamptz | NOT NULL | Payment timestamp |
| metadata | jsonb | NULL | Additional payment data (processor response) |
| created_at | timestamptz | NOT NULL DEFAULT now() | Record creation |
| updated_at | timestamptz | NOT NULL DEFAULT now() | Last modification |

**Indexes:**
- processor_id (unique)
- idx_payments_paid_at (payment history queries)

**Functions:**
- `add_invoice_payment()` - Atomically adds payment and updates invoice balance/status
- `delete_invoice_payment()` - Removes payment and recalculates invoice balance

**RLS:** Enabled with service-role permissive policy

---

## 4. Operations Entities

### Printers
**Purpose:** 3D printing hardware inventory

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| id | bigserial | PRIMARY KEY | Printer ID |
| name | text | NOT NULL | Printer name |
| model | text | NULL | Hardware model (e.g., "BambuLab X1 Carbon") |
| build_volume | text | NULL | Maximum build dimensions |
| status | printer_status | NOT NULL DEFAULT 'ACTIVE' | ACTIVE, MAINTENANCE, OFFLINE |
| notes | text | NULL | General printer notes |
| last_maintenance_at | timestamptz | NULL | Last maintenance date |
| maintenance_note | text | NULL | Maintenance details |
| created_at | timestamptz | NOT NULL DEFAULT now() | Record creation |
| updated_at | timestamptz | NOT NULL DEFAULT now() | Last modification |

**Usage:** Jobs assigned to printers for queue management

**Seed Data (migration 202510191530):**
- ID 1: Bambu X1 (BambuLab X1 Carbon, ACTIVE)
- ID 2: Prusa MK4 (Original Prusa MK4, MAINTENANCE)

**RLS:** Enabled with service-role permissive policy

---

### Jobs
**Purpose:** Print jobs linked to invoices

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| id | bigserial | PRIMARY KEY | Job ID |
| invoice_id | bigint | NOT NULL FK invoices ON DELETE CASCADE | Parent invoice |
| client_id | bigint | NOT NULL FK clients ON DELETE CASCADE | Job owner |
| printer_id | bigint | FK printers ON DELETE SET NULL | Assigned printer (nullable) |
| title | text | NOT NULL | Job title |
| description | text | NULL | Job description |
| status | job_status | NOT NULL DEFAULT 'PRE_PROCESSING' | Job lifecycle status (11 states) |
| priority | job_priority | NOT NULL DEFAULT 'NORMAL' | NORMAL, FAST_TRACK, URGENT |
| queue_position | integer | NOT NULL DEFAULT 0 | Position in printer queue |
| estimated_hours | numeric | NULL | Estimated print time |
| actual_hours | numeric | NULL | Actual print time |
| started_at | timestamptz | NULL | Print start time |
| paused_at | timestamptz | NULL | Print pause time |
| completed_at | timestamptz | NULL | Print completion time |
| last_run_started_at | timestamptz | NULL | Most recent print session start |
| notes | text | NULL | Job notes |
| archived_at | timestamptz | NULL | Archive timestamp |
| archived_reason | text | NULL | Why job was archived |
| completed_by | text | NULL | User who completed job |
| created_at | timestamptz | NOT NULL DEFAULT now() | Record creation |
| updated_at | timestamptz | NOT NULL DEFAULT now() | Last modification |

**Indexes:**
- idx_jobs_printer_status_position (queue filtering and sorting)
- idx_jobs_status_completed_at (status tracking)
- idx_jobs_archived_at (archive queries)

**Business Rules (from settings):**
- prevent_assign_to_offline: Block job assignment to offline printers
- prevent_assign_to_maintenance: Block job assignment to maintenance printers
- max_active_printing_per_printer: Limit concurrent prints per printer
- auto_detach_job_on_complete: Auto-detach jobs on completion
- auto_archive_completed_jobs_after_days: Archive threshold

**RLS:** Enabled with service-role permissive policy

---

### Attachments
**Purpose:** File storage references for invoices (general attachments)

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| id | bigserial | PRIMARY KEY | Attachment ID |
| invoice_id | bigint | NOT NULL FK invoices ON DELETE CASCADE | Parent invoice |
| filename | text | NOT NULL | Original filename |
| storage_key | text | NOT NULL | Storage bucket path |
| filetype | text | NULL | MIME type |
| size_bytes | bigint | NOT NULL | File size |
| metadata | jsonb | NULL | File metadata |
| uploaded_at | timestamptz | NOT NULL DEFAULT now() | Upload timestamp |

**Storage:** Files stored in `attachments` Supabase bucket (configured in migration 202510171320)

**RLS:** Enabled with service-role permissive policy

---

### Order Files
**Purpose:** Permanent storage of client 3D model files

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| id | bigserial | PRIMARY KEY | File ID |
| invoice_id | bigint | FK invoices ON DELETE CASCADE | Associated invoice (optional) |
| quote_id | bigint | FK quotes ON DELETE CASCADE | Associated quote (optional) |
| client_id | bigint | NOT NULL FK clients ON DELETE CASCADE | File owner |
| filename | text | NOT NULL | Original filename |
| storage_key | text | NOT NULL UNIQUE | Storage bucket path |
| file_type | text | NOT NULL | 'model' or 'settings' |
| mime_type | text | NULL | File MIME type |
| size_bytes | bigint | NOT NULL | File size |
| metadata | jsonb | NULL | Print settings, slicing metrics, orientation data |
| uploaded_by | bigint | FK users ON DELETE SET NULL | User who uploaded (optional) |
| uploaded_at | timestamptz | NOT NULL DEFAULT now() | Upload timestamp |

**Constraints:**
- CHECK: At least one of invoice_id or quote_id must be set
- storage_key UNIQUE

**Indexes:**
- idx_order_files_invoice (invoice lookups)
- idx_order_files_quote (quote lookups)
- idx_order_files_client (client file listings)
- idx_order_files_storage_key (file retrieval)

**RLS Policies:**
- "Admins can view all order files" - Admin users can see all files
- "Clients can view own order files" - Clients can only see files linked to their client_id

**Storage:** Files stored in `pdfs` Supabase bucket

**Added:** Migration 202510191600

---

## 5. User Content & Supporting Entities

### Activity Logs
**Purpose:** Audit trail for all entity changes

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| id | bigserial | PRIMARY KEY | Log ID |
| client_id | bigint | FK clients ON DELETE SET NULL | Related client |
| quote_id | bigint | FK quotes ON DELETE SET NULL | Related quote |
| invoice_id | bigint | FK invoices ON DELETE SET NULL | Related invoice |
| job_id | bigint | FK jobs ON DELETE SET NULL | Related job |
| printer_id | bigint | FK printers ON DELETE SET NULL | Related printer |
| action | text | NOT NULL | Action type (CREATE, UPDATE, DELETE, etc) |
| message | text | NOT NULL | Human-readable description |
| metadata | jsonb | NULL | Additional context data |
| created_at | timestamptz | NOT NULL DEFAULT now() | Log timestamp |

**Function:**
- `log_activity(p_client_id, p_quote_id, p_invoice_id, p_job_id, p_printer_id, p_action, p_message, p_metadata)`
- Helper to insert activity records with optional metadata

**Note:** All foreign keys use SET NULL to preserve audit trail even after entity deletion

**RLS:** Enabled with service-role permissive policy

---

### User Messages
**Purpose:** Client-admin communications on invoices

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| id | bigserial | PRIMARY KEY | Message ID |
| user_id | bigint | NOT NULL FK users ON DELETE CASCADE | Message author |
| invoice_id | bigint | FK invoices ON DELETE SET NULL | Associated invoice (optional) |
| sender | role | NOT NULL | ADMIN or CLIENT (message author role) |
| content | text | NOT NULL | Message text |
| created_at | timestamptz | NOT NULL DEFAULT now() | Message timestamp |

**Indexes:**
- idx_user_messages_user_invoice_created (user's messages on invoice, chronological)
- idx_user_messages_invoice_created (all messages on invoice, chronological)

**Scope:** Conversation threads per invoice or general messages (invoice_id nullable)

**RLS:** Enabled with service-role permissive policy

---

### Tmp Files
**Purpose:** Temporary file staging for uploads

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| id | bigserial | PRIMARY KEY | File ID |
| user_id | bigint | NOT NULL FK users ON DELETE CASCADE | File uploader |
| storage_key | text | NOT NULL UNIQUE | Storage bucket path |
| filename | text | NOT NULL | Original filename |
| size_bytes | bigint | NOT NULL | File size |
| mime_type | text | NULL | File MIME type |
| status | text | NOT NULL DEFAULT 'idle' | idle, processing, ready |
| metadata | jsonb | NULL | Upload metadata |
| created_at | timestamptz | NOT NULL DEFAULT now() | Upload timestamp |
| updated_at | timestamptz | NOT NULL DEFAULT now() | Last modification |

**Indexes:**
- idx_tmp_files_storage_key (unique, file retrieval)
- idx_tmp_files_user_created (user's files, newest first)

**Storage:** Files stored in `tmp` Supabase bucket (cleanup handled by application logic)

**RLS:** Enabled with service-role permissive policy

---

### Webhook Events
**Purpose:** Stripe webhook idempotency tracking

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| id | bigserial | PRIMARY KEY | Event ID |
| stripe_event_id | text | NOT NULL UNIQUE | External Stripe event ID |
| event_type | text | NOT NULL | Event type (payment_intent.succeeded, etc) |
| processed_at | timestamptz | NOT NULL DEFAULT now() | Processing timestamp |
| metadata | jsonb | NULL | Event data payload |

**Indexes:**
- idx_webhook_events_stripe_event_id (deduplication lookups)
- idx_webhook_events_processed_at (cleanup queries)

**Usage:** Prevents duplicate webhook processing for same Stripe event

**Added:** Migration 202510191545

---

### Number Sequences
**Purpose:** Auto-incrementing document number generation

| Column | Type | Constraint | Notes |
|--------|------|------------|-------|
| id | bigserial | PRIMARY KEY | Sequence ID |
| kind | text | NOT NULL UNIQUE | Document type ('quote', 'invoice', etc) |
| prefix | text | NOT NULL | Number prefix ('QT-', 'INV-', etc) |
| current | integer | NOT NULL DEFAULT 0 | Current sequence number |
| created_at | timestamptz | NOT NULL DEFAULT now() | Record creation |
| updated_at | timestamptz | NOT NULL DEFAULT now() | Last increment |

**Function:**
- `next_document_number(p_kind text, p_default_prefix text)` returns text
- Thread-safe sequence generator using INSERT ... ON CONFLICT
- Returns formatted document number: `prefix + 4-digit-padded-number`
- Example: `next_document_number('quote', 'QT-')` → 'QT-0001'

**Format:** Generates `prefix + lpad(number, 4, '0')` (e.g., QT-0001, INV-2345)

**Seed Data (migration 202510191530):**
- kind='quote', prefix='QT-', current=1000
- kind='invoice', prefix='INV-', current=2000

**RLS:** Enabled with service-role permissive policy

---

## 6. Entity Relationships

### Relationship Diagram

```
Settings (singleton, id=1)
    │
    ├── Default numbering prefixes
    ├── Tax & payment terms (JSONB)
    ├── Shipping regions (JSONB)
    ├── Calculator config (JSONB)
    └── Job creation policies

Number Sequences
    │
    └── Document numbering (quotes, invoices)

Materials
    │
    └── Product Templates (M:1, optional, SET NULL on delete)

Product Templates
    │
    ├── Quote Items (1:M, optional reference, SET NULL on delete)
    └── Invoice Items (1:M, optional reference, SET NULL on delete)

Clients
    │
    ├── Users (1:M, CASCADE) ←→ auth.users (via auth_user_id)
    │   ├── User Messages (1:M, CASCADE)
    │   └── Tmp Files (1:M, CASCADE)
    │
    ├── Quotes (1:M, CASCADE)
    │   ├── Quote Items (1:M, CASCADE)
    │   ├── Order Files (1:M, CASCADE, quote_id optional)
    │   └── ↔ Invoices (conversion: converted_invoice_id ↔ source_quote_id)
    │
    ├── Invoices (1:M, CASCADE)
    │   ├── Invoice Items (1:M, CASCADE)
    │   ├── Payments (1:M, CASCADE)
    │   ├── Jobs (1:M, CASCADE)
    │   ├── Attachments (1:M, CASCADE)
    │   ├── Order Files (1:M, CASCADE, invoice_id optional)
    │   └── User Messages (M:1, SET NULL on invoice delete)
    │
    ├── Jobs (1:M, CASCADE)
    │   └── Printer (M:1, SET NULL on printer delete)
    │
    ├── Order Files (1:M, CASCADE)
    └── Activity Logs (M:1, SET NULL)

Printers
    │
    ├── Jobs (1:M, SET NULL on printer delete)
    └── Activity Logs (M:1, SET NULL)

Users
    │
    ├── Order Files.uploaded_by (1:M, SET NULL on user delete)
    ├── User Messages (1:M, CASCADE)
    └── Tmp Files (1:M, CASCADE)

Activity Logs
    │
    └── References all entities (SET NULL on delete to preserve audit trail)

Webhook Events
    │
    └── Global Stripe event tracking (idempotency)
```

### Quote-Invoice Conversion Relationship

```
Quote ←→ Invoice (Bidirectional, 1:1)
  │         │
  │         └── source_quote_id → Quote.id (SET NULL)
  └── converted_invoice_id → Invoice.id (SET NULL)
           │
           └── converted_from_quote_id → Quote.id (SET NULL, UNIQUE)

Constraints:
- quotes.converted_invoice_id UNIQUE (one quote → one invoice)
- invoices.converted_from_quote_id UNIQUE (one invoice ← one quote)
- invoices.source_quote_id allows multiple invoices from same quote (non-unique)
```

---

## 7. Cascade Rules

| Parent Table | Child Table | FK Column | Delete Behavior | Notes |
|--------------|-------------|-----------|-----------------|-------|
| clients | users | client_id | CASCADE | Delete all client users |
| clients | quotes | client_id | CASCADE | Delete all client quotes |
| clients | invoices | client_id | CASCADE | Delete all client invoices |
| clients | jobs | client_id | CASCADE | Delete all client jobs |
| clients | order_files | client_id | CASCADE | Delete all client files |
| clients | activity_logs | client_id | SET NULL | Preserve audit trail |
| quotes | quote_items | quote_id | CASCADE | Delete all quote line items |
| quotes | invoices | source_quote_id | SET NULL | Preserve invoice if quote deleted |
| quotes | invoices | converted_from_quote_id | SET NULL | Preserve invoice if quote deleted |
| quotes | order_files | quote_id | CASCADE | Delete quote files |
| quotes | activity_logs | quote_id | SET NULL | Preserve audit trail |
| invoices | quotes | converted_invoice_id | SET NULL | Preserve quote if invoice deleted |
| invoices | invoice_items | invoice_id | CASCADE | Delete all invoice line items |
| invoices | payments | invoice_id | CASCADE | Delete all invoice payments |
| invoices | jobs | invoice_id | CASCADE | Delete all invoice jobs |
| invoices | attachments | invoice_id | CASCADE | Delete all invoice attachments |
| invoices | order_files | invoice_id | CASCADE | Delete invoice files |
| invoices | user_messages | invoice_id | SET NULL | Preserve messages (orphaned) |
| invoices | activity_logs | invoice_id | SET NULL | Preserve audit trail |
| materials | product_templates | material_id | SET NULL | Preserve template, clear material ref |
| product_templates | quote_items | product_template_id | SET NULL | Preserve item, clear template ref |
| product_templates | invoice_items | product_template_id | SET NULL | Preserve item, clear template ref |
| printers | jobs | printer_id | SET NULL | Preserve job, clear printer assignment |
| printers | activity_logs | printer_id | SET NULL | Preserve audit trail |
| users | user_messages | user_id | CASCADE | Delete all user messages |
| users | tmp_files | user_id | CASCADE | Delete all user temp files |
| users | order_files | uploaded_by | SET NULL | Preserve file, clear uploader ref |
| jobs | activity_logs | job_id | SET NULL | Preserve audit trail |

**Pattern Summary:**
- **CASCADE:** Used for dependent data (items, payments, files owned by entity)
- **SET NULL:** Used for reference data (audit logs, optional relationships, soft dependencies)

---

## 8. Enums and Custom Types

### Role
```sql
create type role as enum ('ADMIN', 'CLIENT');
```
- **ADMIN** - Full system access, can manage all entities
- **CLIENT** - Limited access to own data via RLS

### Quote Status
```sql
create type quote_status as enum ('DRAFT','PENDING','ACCEPTED','DECLINED','CONVERTED');
```
- **DRAFT** - Under preparation, not sent to client
- **PENDING** - Sent to client, awaiting response
- **ACCEPTED** - Client approved quote
- **DECLINED** - Client rejected quote
- **CONVERTED** - Converted to invoice (terminal state)

### Invoice Status
```sql
create type invoice_status as enum ('PENDING','PAID','OVERDUE');
```
- **PENDING** - Awaiting payment (balance_due > 0, not overdue)
- **PAID** - Fully paid (balance_due = 0)
- **OVERDUE** - Past due date with outstanding balance

### Job Status (11 states)
```sql
create type job_status as enum (
  'QUEUED','PRE_PROCESSING','IN_QUEUE','PRINTING','PAUSED',
  'PRINTING_COMPLETE','POST_PROCESSING','PACKAGING',
  'OUT_FOR_DELIVERY','COMPLETED','CANCELLED'
);
```
- **QUEUED** - Scheduled for processing
- **PRE_PROCESSING** - Model preparation, slicing
- **IN_QUEUE** - Waiting for printer availability
- **PRINTING** - Currently printing
- **PAUSED** - Print paused (can resume)
- **PRINTING_COMPLETE** - Print finished, needs post-processing
- **POST_PROCESSING** - Finishing work (support removal, sanding, etc)
- **PACKAGING** - Preparing for delivery
- **OUT_FOR_DELIVERY** - In transit to client
- **COMPLETED** - Delivered to client (terminal state)
- **CANCELLED** - Job cancelled (terminal state)

### Job Priority
```sql
create type job_priority as enum ('NORMAL','FAST_TRACK','URGENT');
```
- **NORMAL** - Standard priority
- **FAST_TRACK** - Expedited processing
- **URGENT** - Critical, highest priority

### Printer Status
```sql
create type printer_status as enum ('ACTIVE','MAINTENANCE','OFFLINE');
```
- **ACTIVE** - Ready for job assignments
- **MAINTENANCE** - Under maintenance (conditional assignment blocking)
- **OFFLINE** - Not available (conditional assignment blocking)

### Job Creation Policy
```sql
create type job_creation_policy as enum ('ON_PAYMENT','ON_INVOICE');
```
- **ON_PAYMENT** - Jobs created only after invoice payment received
- **ON_INVOICE** - Jobs created when invoice is issued

### Payment Method
```sql
create type payment_method as enum ('STRIPE','BANK_TRANSFER','CASH','OTHER');
```
- **STRIPE** - Credit card via Stripe integration
- **BANK_TRANSFER** - Direct bank transfer
- **CASH** - Cash payment
- **OTHER** - Other payment method

### Discount Type
```sql
create type discount_type as enum ('NONE','PERCENT','FIXED');
```
- **NONE** - No discount applied
- **PERCENT** - Percentage discount (discount_value = percentage)
- **FIXED** - Fixed amount discount (discount_value = amount)

### Pricing Type
```sql
create type pricing_type as enum ('FIXED','CALCULATED');
```
- **FIXED** - Fixed price product (uses base_price)
- **CALCULATED** - Price calculated by formula (uses calculator_config)

---

## 9. Data Integrity

### Primary Keys
All tables use `id bigserial primary key` for consistent auto-incrementing integer IDs.

### Unique Constraints

| Table | Column | Purpose |
|-------|--------|---------|
| quotes | number | Document number uniqueness |
| quotes | converted_invoice_id | One-to-one quote→invoice conversion |
| invoices | number | Document number uniqueness |
| invoices | converted_from_quote_id | One-to-one invoice←quote conversion |
| users | auth_user_id | One Supabase auth account per user |
| users | email | Email uniqueness across all users |
| payments | processor_id | External payment ID uniqueness |
| number_sequences | kind | One sequence per document type |
| webhook_events | stripe_event_id | Idempotent webhook processing |
| order_files | storage_key | File path uniqueness |
| tmp_files | storage_key | File path uniqueness |

### Check Constraints

| Table | Constraint | Description |
|-------|------------|-------------|
| order_files | `check (invoice_id is not null or quote_id is not null)` | Must be linked to invoice OR quote (or both) |

### NOT NULL Constraints

**Core entity identifiers:**
- All table names, document numbers, amounts
- Timestamps: created_at, updated_at, paid_at, uploaded_at

**Referential integrity:**
- Foreign keys for required relationships (e.g., invoice_id in payments)
- Optional relationships use nullable FKs (e.g., printer_id in jobs)

### JSONB Validation

JSONB fields provide flexible storage without schema constraints:
- Used for configuration objects (calculator_config, payment_terms, shipping_regions)
- Metadata storage (file details, payment processor responses)
- Historical snapshots (calculator_snapshot in quotes/invoices)

**No validation at database level** - application layer responsible for JSONB structure.

---

## 10. Index Strategy

### Document Lookups (Unique Indexes)
```sql
-- Implicit from UNIQUE constraints
quotes.number
invoices.number
users.auth_user_id
users.email
payments.processor_id
number_sequences.kind
webhook_events.stripe_event_id
tmp_files.storage_key
order_files.storage_key
```

### Invoice Management
```sql
create index idx_invoices_status_due_date on invoices(status, due_date);
-- Purpose: Overdue invoice detection, payment status filtering

create index idx_invoices_paid_at on invoices(paid_at);
-- Purpose: Payment history queries, revenue reporting
```

### Payment Tracking
```sql
create index idx_payments_paid_at on payments(paid_at);
-- Purpose: Payment history queries, revenue analytics
```

### Job Queue Management
```sql
create index idx_jobs_printer_status_position on jobs(printer_id, status, queue_position);
-- Purpose: Printer queue filtering and ordering, job assignment

create index idx_jobs_status_completed_at on jobs(status, completed_at);
-- Purpose: Job status tracking, completion analytics

create index idx_jobs_archived_at on jobs(archived_at);
-- Purpose: Archive queries, cleanup operations
```

### Message Threads
```sql
create index idx_user_messages_user_invoice_created on user_messages(user_id, invoice_id, created_at);
-- Purpose: User's messages on specific invoice, chronological order

create index idx_user_messages_invoice_created on user_messages(invoice_id, created_at);
-- Purpose: All messages on invoice, chronological order (admin view)
```

### File Management
```sql
create index idx_order_files_invoice on order_files(invoice_id);
-- Purpose: Invoice file lookups

create index idx_order_files_quote on order_files(quote_id);
-- Purpose: Quote file lookups

create index idx_order_files_client on order_files(client_id);
-- Purpose: Client file listings

create index idx_order_files_storage_key on order_files(storage_key);
-- Purpose: File retrieval by storage path

create unique index idx_tmp_files_storage_key on tmp_files(storage_key);
-- Purpose: Temp file retrieval, uniqueness enforcement

create index idx_tmp_files_user_created on tmp_files(user_id, created_at desc);
-- Purpose: User's temp files, newest first
```

### Webhook Deduplication
```sql
create index idx_webhook_events_stripe_event_id on webhook_events(stripe_event_id);
-- Purpose: Fast idempotency checks (also UNIQUE)

create index idx_webhook_events_processed_at on webhook_events(processed_at);
-- Purpose: Cleanup queries, event history
```

**Total Indexes:** 16 explicit indexes + 9 implicit unique indexes = **25 total**

---

## 11. JSONB Fields (Flexible Storage)

| Table | Field | Purpose | Example Structure |
|-------|-------|---------|-------------------|
| settings | payment_terms | Payment term configurations | `[{"code":"COD","label":"COD","days":0},...]` |
| settings | shipping_regions | Shipping region definitions | `[{"code":"sydney_metro","label":"Sydney Metro","states":["NSW"],"baseAmount":12.5},...]` |
| settings | calculator_config | Pricing calculator settings | `{"hourlyRate":45,"setupFee":20,"minimumPrice":35,"qualityMultipliers":{...}}` |
| clients | address | Full address object | `{"street":"123 Main St","city":"Sydney","state":"NSW","postcode":"2000"}` |
| clients | tags | Categorization/grouping tags | `["vip","repeat-customer","commercial"]` |
| product_templates | calculator_config | Pricing formula configuration | `{"baseHours":4,"materialGrams":60,"quality":"standard","infill":"medium"}` |
| quotes | calculator_snapshot | Pricing calculation record | Calculator state at quote creation time |
| quotes | source_data | Original quote request data | Raw input from quote request form |
| invoices | calculator_snapshot | Pricing calculation record | Calculator state at invoice creation time |
| quote_items | calculator_breakdown | Line-item pricing detail | Detailed calculation for this item |
| invoice_items | calculator_breakdown | Line-item pricing detail | Detailed calculation for this item |
| payments | metadata | Processor response data | `{"stripe_charge_id":"ch_xxx","card_last4":"4242"}` |
| attachments | metadata | File metadata | `{"width":1920,"height":1080,"format":"pdf"}` |
| order_files | metadata | 3D model settings | `{"printSettings":{...},"slicingMetrics":{...},"orientation":{...}}` |
| activity_logs | metadata | Additional context data | Structured context for audit event |
| tmp_files | metadata | Upload metadata | `{"checksum":"abc123","chunks":5}` |
| webhook_events | metadata | Event payload | Full Stripe webhook event data |

**Pattern:** JSONB used for:
1. Configuration objects (varying structure, user-customizable)
2. Metadata/context (non-queryable, archival)
3. Historical snapshots (preserve state at point in time)
4. External API responses (variable structure)

**No indexing on JSONB fields** - application handles structure validation and querying.

---

## 12. Row-Level Security (RLS)

### Enabled Tables (19 tables)
All tables have RLS enabled:
- Core: settings, users, clients, materials, product_templates, number_sequences
- Financial: quotes, quote_items, invoices, invoice_items, payments
- Operations: printers, jobs, attachments, order_files
- Supporting: activity_logs, user_messages, tmp_files, webhook_events

### Policy Strategy

**Service-Role Permissive Policies:**
Most tables use blanket permissive policies for service role:
```sql
create policy {table}_service_role_access on {table}
  for all using (true) with check (true);
```

**Application Architecture:**
- Application uses Supabase **service role exclusively** for server operations
- RLS serves as safety net for direct database access
- Fine-grained access control handled at application layer

**Special RLS Policies (order_files):**
```sql
-- Admins can view all order files
create policy "Admins can view all order files"
  on order_files for select
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()::text::bigint
      and users.role = 'ADMIN'
    )
  );

-- Clients can view own order files
create policy "Clients can view own order files"
  on order_files for select
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()::text::bigint
      and users.client_id = order_files.client_id
    )
  );
```

**Note:** order_files implements role-based access control via RLS for direct client file access.

---

## 13. Database Functions

### 1. next_document_number
```sql
create or replace function public.next_document_number(p_kind text, p_default_prefix text)
returns text
language plpgsql
```

**Purpose:** Thread-safe document number generation

**Algorithm:**
1. INSERT new sequence OR UPDATE existing (ON CONFLICT)
2. Increment current counter
3. Return formatted number: `prefix + lpad(current, 4, '0')`

**Example:**
```sql
select next_document_number('quote', 'QT-');  -- Returns: 'QT-0001'
select next_document_number('invoice', 'INV-');  -- Returns: 'INV-0001'
```

**Migration:** Initially created in 202510161805_policies.sql, fixed in 202510181830_fix_next_document_number.sql

---

### 2. log_activity
```sql
create or replace function public.log_activity(
  p_client_id bigint,
  p_quote_id bigint,
  p_invoice_id bigint,
  p_job_id bigint,
  p_printer_id bigint,
  p_action text,
  p_message text,
  p_metadata jsonb default null
)
returns void
language sql
```

**Purpose:** Simplified activity log insertion

**Example:**
```sql
select log_activity(
  NULL, NULL, 123, NULL, NULL,
  'PAYMENT_RECEIVED',
  'Payment of $150 received via Stripe',
  '{"payment_id": 456}'::jsonb
);
```

**Migration:** Created in 202510161805_policies.sql

---

### 3. create_invoice_with_items
```sql
create or replace function public.create_invoice_with_items(payload jsonb)
returns jsonb
language plpgsql
```

**Purpose:** Atomically create invoice with line items

**Input:**
```json
{
  "invoice": {
    "number": "INV-0001",
    "client_id": 123,
    "subtotal": 100.00,
    "tax_total": 10.00,
    "total": 110.00,
    "balance_due": 110.00,
    ...
  },
  "lines": [
    {
      "name": "Small Print",
      "quantity": 1,
      "unit_price": 100.00,
      "total": 100.00,
      ...
    }
  ]
}
```

**Returns:**
```json
{
  "invoice": { /* invoice row as JSONB */ }
}
```

**Migration:** Created in 202510171320_transactions.sql

---

### 4. update_invoice_with_items
```sql
create or replace function public.update_invoice_with_items(p_invoice_id bigint, payload jsonb)
returns jsonb
language plpgsql
```

**Purpose:** Atomically update invoice and replace line items

**Process:**
1. Update invoice fields
2. Delete all existing invoice_items
3. Insert new invoice_items from payload

**Input:** Same structure as create_invoice_with_items

**Returns:** Same structure as create_invoice_with_items

**Migration:** Created in 202510171320_transactions.sql

---

### 5. add_invoice_payment
```sql
create or replace function public.add_invoice_payment(payload jsonb)
returns jsonb
language plpgsql
```

**Purpose:** Atomically add payment and update invoice balance/status

**Process:**
1. Lock invoice row (FOR UPDATE)
2. Insert payment record
3. Calculate total paid amount
4. Update invoice:
   - balance_due = total - paid_amount
   - status = 'PAID' if balance ≤ 0, else 'PENDING'
   - paid_at = payment timestamp if fully paid

**Input:**
```json
{
  "invoice_id": 123,
  "payment": {
    "amount": 110.00,
    "method": "STRIPE",
    "processor_id": "ch_xxx",
    "paid_at": "2025-10-21T10:00:00Z"
  }
}
```

**Returns:**
```json
{
  "payment": { /* payment row */ },
  "invoice": { /* updated invoice row */ },
  "balance": 0.00,
  "paid_amount": 110.00
}
```

**Migration:** Created in 202510171320_transactions.sql

---

### 6. delete_invoice_payment
```sql
create or replace function public.delete_invoice_payment(p_payment_id bigint)
returns jsonb
language plpgsql
```

**Purpose:** Atomically delete payment and recalculate invoice balance

**Process:**
1. Delete payment record
2. Lock invoice row (FOR UPDATE)
3. Recalculate total paid amount from remaining payments
4. Update invoice balance and status

**Returns:**
```json
{
  "payment": { /* deleted payment row */ },
  "invoice": { /* updated invoice row */ },
  "balance": 110.00,
  "paid_amount": 0.00
}
```

**Migration:** Created in 202510171320_transactions.sql

---

## 14. Storage Buckets

Created in migration 202510171320_transactions.sql:

```sql
insert into storage.buckets (id, name, public)
values
  ('attachments', 'attachments', false),
  ('pdfs', 'pdfs', false),
  ('tmp', 'tmp', false)
on conflict (id) do nothing;
```

| Bucket | Public | Purpose | Used By |
|--------|--------|---------|---------|
| attachments | false | Invoice attachments (general files) | attachments table |
| pdfs | false | 3D model files and order documents | order_files table |
| tmp | false | Temporary upload staging | tmp_files table |

**Access Control:** All buckets are private (public=false), access controlled via RLS and signed URLs.

---

## 15. Migration Management

### Directory
`/supabase/migrations/`

### Naming Convention
`YYYYMMDDhhMM_description.sql` (e.g., `202510161800_init.sql`)

### Migration Files (In Order)

| # | File | Description |
|---|------|-------------|
| 1 | **202510161800_init.sql** | Core schema initialization: 10 enums, 14 tables (settings, number_sequences, clients, materials, product_templates, quotes, invoices, quote_items, invoice_items, payments, printers, jobs, attachments, activity_logs) |
| 2 | **202510161805_policies.sql** | RLS policies, helper functions (log_activity, next_document_number), storage bucket creation |
| 3 | **202510171300_users_sessions.sql** | User authentication tables: users, user_messages, tmp_files |
| 4 | **202510171320_transactions.sql** | Storage bucket setup, invoice transaction functions (create_invoice_with_items, update_invoice_with_items, add_invoice_payment, delete_invoice_payment) |
| 5 | **202510180001_grants.sql** | Supabase role privilege grants for public schema |
| 6 | **202510181400_fix_missing_policies.sql** | Additional RLS policies for users, settings, number_sequences, materials, product_templates |
| 7 | **202510181830_fix_next_document_number.sql** | Fix next_document_number function (parameter naming, null handling) |
| 8 | **202510191530_seed_catalog_data.sql** | Seed data: materials (PLA, PETG), printers (Bambu X1, Prusa MK4), product templates, settings configuration, number sequences |
| 9 | **202510191545_webhook_idempotency.sql** | webhook_events table for Stripe event deduplication |
| 10 | **202510191600_order_files.sql** | order_files table for 3D model file tracking with RLS policies |

### How to Apply

**Development (Supabase CLI):**
```bash
supabase migration up
```

**Production (via Supabase Dashboard):**
1. Navigate to SQL Editor
2. Execute migrations in order (from 1 to 10)
3. Verify table structure and policies

**Verification:**
```sql
-- Check migration status
select * from supabase_migrations.schema_migrations;

-- Verify table count (should be 19)
select count(*) from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE';

-- Check RLS status (should be 19 enabled)
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

-- Verify enum types (should be 10)
select typname
from pg_type
where typtype = 'e' and typnamespace = (select oid from pg_namespace where nspname = 'public')
order by typname;

-- Check functions (should be 6)
select proname, prosrc
from pg_proc
where pronamespace = (select oid from pg_namespace where nspname = 'public')
and prokind = 'f'
order by proname;
```

**Rollback:** All migrations wrapped in `begin`/`commit` transactions. On failure, all changes in that migration are automatically rolled back.

---

## 16. Summary Statistics

| Metric | Count | Details |
|--------|-------|---------|
| **Total Tables** | 19 | All base tables in public schema |
| **Core Entities** | 5 | settings, users, clients, materials, product_templates |
| **Financial Entities** | 5 | quotes, quote_items, invoices, invoice_items, payments |
| **Operations Entities** | 4 | printers, jobs, attachments, order_files |
| **User/Content Entities** | 2 | user_messages, tmp_files |
| **Supporting Entities** | 3 | activity_logs, webhook_events, number_sequences |
| **Total Enums** | 10 | role, quote_status, invoice_status, discount_type, pricing_type, payment_method, job_status, job_priority, printer_status, job_creation_policy |
| **Foreign Keys** | 30 | All FK relationships with ON DELETE behaviors |
| **Explicit Indexes** | 16 | Performance indexes for queries |
| **Unique Constraints** | 9 | Document numbers, auth references, storage keys |
| **Total Indexes** | 25 | Explicit + unique constraint indexes |
| **Database Functions** | 6 | next_document_number, log_activity, create_invoice_with_items, update_invoice_with_items, add_invoice_payment, delete_invoice_payment |
| **Storage Buckets** | 3 | attachments, pdfs, tmp |
| **Migrations** | 10 | 202510161800 through 202510191600 |
| **JSONB Fields** | 17 | Flexible configuration and metadata storage |
| **RLS Enabled Tables** | 19 | All tables have RLS enabled |

### Table Size Distribution

| Category | Tables | Percentage |
|----------|--------|------------|
| Core entities | 5 | 26.3% |
| Financial entities | 5 | 26.3% |
| Operations entities | 4 | 21.1% |
| User/Content entities | 2 | 10.5% |
| Supporting entities | 3 | 15.8% |

### Relationship Summary

| Relationship Type | Count | Examples |
|-------------------|-------|----------|
| CASCADE delete | 20 | clients→quotes, invoices→payments, jobs→activity_logs |
| SET NULL delete | 10 | quotes→invoices (conversion refs), materials→product_templates |
| One-to-Many | 25+ | clients→invoices, invoices→payments, printers→jobs |
| One-to-One | 2 | quote↔invoice (conversion), auth.users↔users |
| Many-to-One | 30+ | All foreign key relationships |

---

## 17. Schema Evolution Notes

### Key Design Decisions

1. **Singleton Settings Table:** Enforced via primary key constraint (id=1), seeded in init migration
2. **Bidirectional Quote-Invoice Conversion:** Dual foreign keys support both directions with SET NULL cascade
3. **JSONB for Configuration:** Flexible storage for business logic without schema changes
4. **Thread-Safe Document Numbering:** INSERT...ON CONFLICT pattern in next_document_number function
5. **Atomic Invoice Operations:** Transactional functions for invoice+items+payments
6. **Soft References in Activity Logs:** SET NULL cascade preserves audit trail after entity deletion
7. **RLS Safety Net:** Service-role permissive policies with application-layer access control
8. **File Storage Separation:** Dedicated buckets for attachments, 3D models, and temp files
9. **Webhook Idempotency:** stripe_event_id uniqueness prevents duplicate processing
10. **Job Queue Composite Index:** (printer_id, status, queue_position) for efficient queue queries

### Migration History

- **Phase 1 (202510161800-161805):** Core schema with enums, tables, RLS, functions
- **Phase 2 (202510171300-171320):** User auth, messaging, file storage, invoice transactions
- **Phase 3 (202510180001-181830):** Permission grants, policy fixes, function fixes
- **Phase 4 (202510191530-191600):** Seed data, webhook tracking, 3D model file management

---

**Last Updated:** 2025-10-21

**Schema Version:** Migration 202510191600 (order_files)

**Next Review:** After any schema changes or new migrations
