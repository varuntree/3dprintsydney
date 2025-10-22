# Database Schema Documentation

Comprehensive database schema documentation for the 3D Print Sydney application, built on PostgreSQL via Supabase.

---

## Table of Contents

1. [Overview](#overview)
2. [Schema Evolution](#schema-evolution)
3. [Custom Types & Enums](#custom-types--enums)
4. [Core Tables](#core-tables)
5. [Relationships & Foreign Keys](#relationships--foreign-keys)
6. [Indexes](#indexes)
7. [Constraints & Business Rules](#constraints--business-rules)
8. [Storage Buckets](#storage-buckets)
9. [Row-Level Security (RLS)](#row-level-security-rls)
10. [Database Functions](#database-functions)
11. [Migration History](#migration-history)

---

## Overview

### Database Provider

**Supabase** (PostgreSQL 15+)
- Hosted PostgreSQL with real-time capabilities
- Built-in authentication via `auth.users`
- File storage via Supabase Storage
- Row-Level Security for tenant isolation

### Schema Statistics

| Metric | Count |
|--------|-------|
| **Total Tables** | 20 |
| **Custom Enums** | 9 |
| **Indexes** | 15 |
| **Foreign Keys** | 28 |
| **Storage Buckets** | 4 |
| **Migrations** | 10 |

### Schema Design Principles

1. **Normalized Structure**: Follows 3NF (Third Normal Form)
2. **Audit Trails**: All tables include `created_at` and `updated_at` timestamps
3. **Soft Deletes**: Uses `archived_at` and `voided_at` instead of hard deletes
4. **Sequential IDs**: All primary keys use `bigserial` for auto-incrementing
5. **JSONB Flexibility**: Uses JSONB columns for semi-structured data (metadata, settings)
6. **Foreign Key Cascades**: Configures cascading deletes for dependent entities

---

## Schema Evolution

### Migration Timeline

```
202510161800  ┌─ init.sql (Core schema)
              │
202510161805  ├─ policies.sql (RLS policies)
              │
202510171300  ├─ users_sessions.sql (User management, messaging)
              │
202510171320  ├─ transactions.sql (Payment tracking)
              │
202510180001  ├─ grants.sql (Database permissions)
              │
202510181400  ├─ fix_missing_policies.sql (Additional RLS)
              │
202510181830  ├─ fix_next_document_number.sql (Document numbering)
              │
202510191530  ├─ seed_catalog_data.sql (Default materials/products)
              │
202510191545  ├─ webhook_idempotency.sql (Stripe webhook tracking)
              │
202510191600  └─ order_files.sql (File management)
```

### Schema Versioning Strategy

- Migrations are **append-only** (never edit existing migrations)
- Each migration is **transactional** (wrapped in BEGIN/COMMIT)
- Migration filenames follow: `YYYYMMDDHHMM_description.sql`
- Rollback migrations not used (forward-only migrations)

---

## Custom Types & Enums

### User & Authentication

```sql
create type role as enum ('ADMIN', 'CLIENT');
```

**Values**:
- `ADMIN`: Full system access (business owners, staff)
- `CLIENT`: Limited to own data (customers)

---

### Quote Management

```sql
create type quote_status as enum (
  'DRAFT',
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'CONVERTED'
);
```

**State Transitions**:
```
DRAFT → PENDING → ACCEPTED/DECLINED/CONVERTED
```

---

### Invoice Management

```sql
create type invoice_status as enum (
  'PENDING',
  'PAID',
  'OVERDUE'
);
```

**State Transitions**:
```
PENDING → PAID
PENDING → OVERDUE (automated based on due_date)
```

**Special States** (via nullable timestamps):
- `voided_at IS NOT NULL`: Invoice voided (cancelled)
- `written_off_at IS NOT NULL`: Invoice written off (uncollectible)

---

### Pricing & Discounts

```sql
create type discount_type as enum (
  'NONE',
  'PERCENT',
  'FIXED'
);
```

**Usage**:
- `NONE`: No discount applied
- `PERCENT`: Discount as percentage (e.g., 10 = 10%)
- `FIXED`: Discount as fixed amount (e.g., 50.00 = $50 off)

```sql
create type pricing_type as enum (
  'FIXED',
  'CALCULATED'
);
```

**Usage** (Product Templates):
- `FIXED`: Simple fixed price per unit
- `CALCULATED`: Dynamic pricing based on 3D model analysis

---

### Payment Processing

```sql
create type payment_method as enum (
  'STRIPE',
  'BANK_TRANSFER',
  'CASH',
  'OTHER'
);
```

**Integration Mapping**:
- `STRIPE`: Online payment via Stripe Checkout
- `BANK_TRANSFER`: Manual bank transfer (reference number required)
- `CASH`: Cash payment (recorded by admin)
- `OTHER`: Other methods (PayPal, check, etc.)

---

### Job Management

```sql
create type job_status as enum (
  'QUEUED',
  'PRE_PROCESSING',
  'IN_QUEUE',
  'PRINTING',
  'PAUSED',
  'PRINTING_COMPLETE',
  'POST_PROCESSING',
  'PACKAGING',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
  'CANCELLED'
);
```

**Workflow Stages**:
```
QUEUED → PRE_PROCESSING → IN_QUEUE → PRINTING → PRINTING_COMPLETE
  → POST_PROCESSING → PACKAGING → OUT_FOR_DELIVERY → COMPLETED
```

**Alternative Paths**:
- `PRINTING → PAUSED`: Temporarily stopped
- `ANY → CANCELLED`: Job cancelled

```sql
create type job_priority as enum (
  'NORMAL',
  'FAST_TRACK',
  'URGENT'
);
```

```sql
create type printer_status as enum (
  'ACTIVE',
  'MAINTENANCE',
  'OFFLINE'
);
```

---

### Business Configuration

```sql
create type job_creation_policy as enum (
  'ON_PAYMENT',
  'ON_INVOICE'
);
```

**Policy Behavior**:
- `ON_PAYMENT`: Jobs created when invoice is paid
- `ON_INVOICE`: Jobs created immediately when invoice is generated

---

## Core Tables

### 1. settings

**Purpose**: System-wide business configuration (singleton table)

```sql
create table settings (
  id integer primary key default 1,

  -- Business Info
  business_name text not null default '',
  business_email text,
  business_phone text,
  business_address text,
  abn text,

  -- Financial Config
  tax_rate numeric,
  default_payment_terms text default 'COD',
  default_currency text not null default 'AUD',
  bank_details text,
  payment_terms jsonb,

  -- Document Numbering
  numbering_quote_prefix text not null default 'QT-',
  numbering_invoice_prefix text not null default 'INV-',

  -- Shipping
  shipping_regions jsonb,
  default_shipping_region text default 'sydney_metro',

  -- Pricing Calculator
  calculator_config jsonb,

  -- Job Management
  job_creation_policy job_creation_policy not null default 'ON_PAYMENT',
  auto_detach_job_on_complete boolean not null default true,
  auto_archive_completed_jobs_after_days integer not null default 7,
  prevent_assign_to_offline boolean not null default true,
  prevent_assign_to_maintenance boolean not null default true,
  max_active_printing_per_printer integer not null default 1,

  -- Invoice Reminders
  overdue_days integer not null default 0,
  reminder_cadence_days integer not null default 7,
  enable_email_send boolean not null default false,

  -- Audit
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Constraints**:
- Single row enforced by `id integer primary key default 1`
- Seeded on initial migration with default values

**JSONB Structures**:

`payment_terms`:
```json
{
  "COD": { "label": "Cash on Delivery", "days": 0 },
  "NET7": { "label": "Net 7", "days": 7 },
  "NET30": { "label": "Net 30", "days": 30 }
}
```

`shipping_regions`:
```json
{
  "sydney_metro": { "label": "Sydney Metro", "cost": 15.00 },
  "nsw_regional": { "label": "NSW Regional", "cost": 25.00 },
  "interstate": { "label": "Interstate", "cost": 50.00 }
}
```

---

### 2. number_sequences

**Purpose**: Manages auto-incrementing document numbers (quotes, invoices)

```sql
create table number_sequences (
  id bigserial primary key,
  kind text not null unique,
  prefix text not null,
  current integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Sample Data**:
```
| kind    | prefix | current |
|---------|--------|---------|
| quote   | QT-    | 1042    |
| invoice | INV-   | 2567    |
```

**Generated Numbers**:
- Quote: `QT-1043`
- Invoice: `INV-2568`

**Concurrency**: Uses database function `next_document_number(kind)` with row locking

---

### 3. clients

**Purpose**: Customer/client records

```sql
create table clients (
  id bigserial primary key,
  name text not null,
  company text,
  abn text,
  email text,
  phone text,
  address jsonb,
  tags jsonb,
  payment_terms text,
  notes text,
  notify_on_job_status boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**JSONB Structures**:

`address`:
```json
{
  "street": "123 Main St",
  "city": "Sydney",
  "state": "NSW",
  "postcode": "2000",
  "country": "Australia"
}
```

`tags`:
```json
["wholesale", "vip", "repeat-customer"]
```

**Relationships**:
- 1:N with `quotes`
- 1:N with `invoices`
- 1:N with `jobs`
- 1:1 with `users` (for CLIENT role users)

---

### 4. materials

**Purpose**: Material catalog (filaments, resins)

```sql
create table materials (
  id bigserial primary key,
  name text not null,
  color text,
  category text,
  cost_per_gram numeric not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Sample Data**:
```
| id | name          | color  | category | cost_per_gram |
|----|---------------|--------|----------|---------------|
| 1  | PLA Standard  | Black  | Filament | 0.02          |
| 2  | PLA Standard  | White  | Filament | 0.02          |
| 3  | ABS           | Black  | Filament | 0.03          |
| 4  | Resin Basic   | Clear  | Resin    | 0.15          |
```

---

### 5. product_templates

**Purpose**: Pre-configured product pricing templates

```sql
create table product_templates (
  id bigserial primary key,
  name text not null,
  description text,
  unit text default 'unit',
  pricing_type pricing_type not null default 'FIXED',
  base_price numeric,
  calculator_config jsonb,
  material_id bigint references materials(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**JSONB Structure** (`calculator_config`):
```json
{
  "pricePerGram": 0.05,
  "setupFee": 20.00,
  "markup": 1.5
}
```

**Usage**:
- `FIXED`: Simple product with fixed `base_price`
- `CALCULATED`: Dynamic pricing using `calculator_config` and 3D model analysis

---

### 6. quotes

**Purpose**: Customer quotes (pre-sale documents)

```sql
create table quotes (
  id bigserial primary key,
  number text not null unique,
  client_id bigint not null references clients(id) on delete cascade,
  status quote_status not null default 'DRAFT',

  -- Dates
  issue_date timestamptz not null default now(),
  expiry_date timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  expires_at timestamptz,
  decision_note text,

  -- Pricing
  tax_rate numeric,
  discount_type discount_type not null default 'NONE',
  discount_value numeric,
  shipping_cost numeric,
  shipping_label text,
  subtotal numeric not null,
  tax_total numeric not null,
  total numeric not null,

  -- Content
  notes text,
  terms text,
  calculator_snapshot jsonb,
  source_data jsonb,

  -- Conversion
  converted_invoice_id bigint unique,

  -- Audit
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Key Fields**:
- `number`: Sequential quote number (e.g., `QT-1042`)
- `status`: Current workflow state
- `sent_at`: When quote was sent to client
- `accepted_at`/`declined_at`: Client decision timestamp
- `converted_invoice_id`: Links to invoice if converted

**JSONB Structures**:

`calculator_snapshot`: Stores pricing configuration at time of quote creation
```json
{
  "taxRate": 0.10,
  "shippingRates": { ... },
  "materialCosts": { ... }
}
```

---

### 7. quote_items

**Purpose**: Line items for quotes

```sql
create table quote_items (
  id bigserial primary key,
  quote_id bigint not null references quotes(id) on delete cascade,
  product_template_id bigint references product_templates(id) on delete set null,
  name text not null,
  description text,
  quantity numeric not null,
  unit text,
  unit_price numeric not null,
  discount_type discount_type not null default 'NONE',
  discount_value numeric,
  total numeric not null,
  order_index integer not null default 0,
  calculator_breakdown jsonb
);
```

**JSONB Structure** (`calculator_breakdown`):
```json
{
  "weight": 45.5,
  "printTime": 180,
  "materialCost": 2.28,
  "laborCost": 15.00,
  "markup": 1.5
}
```

**Ordering**: `order_index` determines display order in quote

---

### 8. invoices

**Purpose**: Customer invoices (payment requests)

```sql
create table invoices (
  id bigserial primary key,
  number text not null unique,
  client_id bigint not null references clients(id) on delete cascade,
  source_quote_id bigint references quotes(id) on delete set null,
  status invoice_status not null default 'PENDING',

  -- Dates
  issue_date timestamptz not null default now(),
  due_date timestamptz,
  paid_at timestamptz,
  voided_at timestamptz,
  void_reason text,
  written_off_at timestamptz,
  write_off_reason text,
  overdue_notified_at timestamptz,

  -- Pricing
  tax_rate numeric,
  discount_type discount_type not null default 'NONE',
  discount_value numeric,
  shipping_cost numeric,
  shipping_label text,
  subtotal numeric not null,
  tax_total numeric not null,
  total numeric not null,
  balance_due numeric not null,

  -- Stripe Integration
  stripe_session_id text,
  stripe_checkout_url text,

  -- Content
  notes text,
  terms text,
  po_number text,
  internal_notes text,
  calculator_snapshot jsonb,

  -- Quote Link
  converted_from_quote_id bigint unique,

  -- Audit
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Key Fields**:
- `balance_due`: Remaining unpaid amount (updated by payments)
- `voided_at`/`written_off_at`: Special terminal states
- `stripe_session_id`: Stripe Checkout session ID
- `overdue_notified_at`: Last reminder sent

**Indexes**:
```sql
create index idx_invoices_status_due_date on invoices(status, due_date);
create index idx_invoices_paid_at on invoices(paid_at);
```

---

### 9. invoice_items

**Purpose**: Line items for invoices

```sql
create table invoice_items (
  id bigserial primary key,
  invoice_id bigint not null references invoices(id) on delete cascade,
  product_template_id bigint references product_templates(id) on delete set null,
  name text not null,
  description text,
  quantity numeric not null,
  unit text,
  unit_price numeric not null,
  discount_type discount_type not null default 'NONE',
  discount_value numeric,
  total numeric not null,
  order_index integer not null default 0,
  calculator_breakdown jsonb
);
```

**Identical Structure** to `quote_items` (copied during quote conversion)

---

### 10. payments

**Purpose**: Payment records for invoices

```sql
create table payments (
  id bigserial primary key,
  invoice_id bigint not null references invoices(id) on delete cascade,
  method payment_method not null default 'OTHER',
  amount numeric not null,
  currency text not null default 'AUD',
  reference text,
  processor text,
  processor_id text unique,
  notes text,
  paid_at timestamptz not null,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Key Fields**:
- `processor_id`: Unique Stripe Payment Intent ID
- `reference`: Bank transfer reference, check number, etc.
- `paid_at`: When payment was received (not when recorded)

**Indexes**:
```sql
create index idx_payments_paid_at on payments(paid_at);
```

**JSONB Structure** (`metadata`):
```json
{
  "stripePaymentIntentId": "pi_xxx",
  "stripeChargeId": "ch_xxx",
  "cardLast4": "4242",
  "cardBrand": "visa"
}
```

---

### 11. printers

**Purpose**: 3D printer inventory

```sql
create table printers (
  id bigserial primary key,
  name text not null,
  model text,
  build_volume text,
  status printer_status not null default 'ACTIVE',
  notes text,
  last_maintenance_at timestamptz,
  maintenance_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Sample Data**:
```
| id | name        | model          | build_volume      | status  |
|----|-------------|----------------|-------------------|---------|
| 1  | Prusa MK4   | Prusa i3 MK4   | 250x210x220mm     | ACTIVE  |
| 2  | Ender 3 Pro | Creality Ender | 220x220x250mm     | ACTIVE  |
| 3  | Resin Mars  | Elegoo Mars 3  | 143x89x175mm      | OFFLINE |
```

---

### 12. jobs

**Purpose**: Production jobs (print queue)

```sql
create table jobs (
  id bigserial primary key,
  invoice_id bigint not null references invoices(id) on delete cascade,
  client_id bigint not null references clients(id) on delete cascade,
  printer_id bigint references printers(id) on delete set null,

  -- Job Details
  title text not null,
  description text,
  status job_status not null default 'PRE_PROCESSING',
  priority job_priority not null default 'NORMAL',
  queue_position integer not null default 0,

  -- Time Tracking
  estimated_hours numeric,
  actual_hours numeric,
  started_at timestamptz,
  paused_at timestamptz,
  completed_at timestamptz,
  last_run_started_at timestamptz,

  -- Metadata
  notes text,
  completed_by text,

  -- Archive
  archived_at timestamptz,
  archived_reason text,

  -- Audit
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Key Fields**:
- `queue_position`: Drag-and-drop ordering within printer queue
- `archived_at`: Soft delete (auto-archived after completion)
- `printer_id`: Current printer assignment (nullable)

**Indexes**:
```sql
create index idx_jobs_printer_status_position on jobs(printer_id, status, queue_position);
create index idx_jobs_status_completed_at on jobs(status, completed_at);
create index idx_jobs_archived_at on jobs(archived_at);
```

**Query Patterns**:
```sql
-- Active jobs for printer 1, ordered by queue position
SELECT * FROM jobs
WHERE printer_id = 1 AND archived_at IS NULL
ORDER BY queue_position;

-- Completed jobs ready for auto-archive
SELECT * FROM jobs
WHERE status = 'COMPLETED'
  AND completed_at < NOW() - INTERVAL '7 days'
  AND archived_at IS NULL;
```

---

### 13. attachments

**Purpose**: Files attached to invoices

```sql
create table attachments (
  id bigserial primary key,
  invoice_id bigint not null references invoices(id) on delete cascade,
  filename text not null,
  storage_key text not null,
  filetype text,
  size_bytes bigint not null,
  metadata jsonb,
  uploaded_at timestamptz not null default now()
);
```

**JSONB Structure** (`metadata`):
```json
{
  "originalFilename": "receipt.pdf",
  "uploadedBy": "admin@example.com",
  "contentType": "application/pdf"
}
```

**Storage**: Files stored in Supabase Storage bucket `attachments`

---

### 14. activity_logs

**Purpose**: Audit trail for all entity changes

```sql
create table activity_logs (
  id bigserial primary key,
  client_id bigint references clients(id) on delete set null,
  quote_id bigint references quotes(id) on delete set null,
  invoice_id bigint references invoices(id) on delete set null,
  job_id bigint references jobs(id) on delete set null,
  printer_id bigint references printers(id) on delete set null,
  action text not null,
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
```

**Sample Data**:
```
| action           | message                          | metadata                    |
|------------------|----------------------------------|-----------------------------|
| INVOICE_CREATED  | Invoice INV-2568 created         | {"total": 350.00}           |
| PAYMENT_RECEIVED | Payment of $350.00 received      | {"method": "STRIPE"}        |
| JOB_STARTED      | Job started on Prusa MK4         | {"printerId": 1}            |
| QUOTE_ACCEPTED   | Quote QT-1042 accepted by client | {"clientId": 42}            |
```

**Polymorpic Relationships**: Links to any entity via nullable foreign keys

---

### 15. users

**Purpose**: User profiles (links to Supabase Auth)

```sql
create table users (
  id bigserial primary key,
  auth_user_id uuid not null unique,
  email text not null unique,
  role role not null default 'CLIENT',
  client_id bigint references clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Key Fields**:
- `auth_user_id`: Links to Supabase `auth.users.id`
- `role`: User role (ADMIN or CLIENT)
- `client_id`: For CLIENT users, links to their client record

**Constraints**:
- CLIENT users MUST have `client_id` set
- ADMIN users have `client_id = NULL`

---

### 16. user_messages

**Purpose**: Admin-client messaging

```sql
create table user_messages (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  invoice_id bigint references invoices(id) on delete set null,
  sender role not null,
  content text not null,
  created_at timestamptz not null default now()
);
```

**Indexes**:
```sql
create index idx_user_messages_user_invoice_created on user_messages(user_id, invoice_id, created_at);
create index idx_user_messages_invoice_created on user_messages(invoice_id, created_at);
```

**Threading**: Messages grouped by `invoice_id` for context-aware threads

---

### 17. tmp_files

**Purpose**: Temporary file storage (STL uploads, slicing)

```sql
create table tmp_files (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  storage_key text not null,
  filename text not null,
  size_bytes bigint not null,
  mime_type text,
  status text not null default 'idle',
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Indexes**:
```sql
create unique index idx_tmp_files_storage_key on tmp_files(storage_key);
create index idx_tmp_files_user_created on tmp_files(user_id, created_at desc);
```

**Lifecycle**:
1. Upload: Status = `idle`
2. Processing: Status = `slicing`
3. Complete: Status = `ready`
4. Cleanup: Auto-deleted after 24 hours

**Storage**: Files stored in Supabase Storage bucket `tmp`

---

### 18. order_files

**Purpose**: Permanent storage for client-uploaded 3D models

```sql
create table order_files (
  id bigserial primary key,
  invoice_id bigint references invoices(id) on delete cascade,
  quote_id bigint references quotes(id) on delete cascade,
  client_id bigint not null references clients(id) on delete cascade,

  -- File Info
  filename text not null,
  storage_key text not null unique,
  file_type text not null,
  mime_type text,
  size_bytes bigint not null,

  -- Metadata
  metadata jsonb,

  -- Tracking
  uploaded_by bigint references users(id) on delete set null,
  uploaded_at timestamptz not null default now(),

  -- Constraint: must link to quote or invoice
  check (invoice_id is not null or quote_id is not null)
);
```

**Indexes**:
```sql
create index idx_order_files_invoice on order_files(invoice_id);
create index idx_order_files_quote on order_files(quote_id);
create index idx_order_files_client on order_files(client_id);
create index idx_order_files_storage_key on order_files(storage_key);
```

**JSONB Structure** (`metadata`):
```json
{
  "dimensions": {
    "x": 50.2,
    "y": 30.5,
    "z": 15.0
  },
  "volume": 23000.5,
  "weight": 46.0,
  "printTime": 180,
  "orientation": {
    "rx": 0,
    "ry": 0,
    "rz": 45
  }
}
```

**Storage**: Files stored in Supabase Storage bucket `order-files`

---

### 19. webhook_events

**Purpose**: Stripe webhook idempotency tracking

```sql
create table webhook_events (
  id bigserial primary key,
  stripe_event_id text not null unique,
  event_type text not null,
  processed_at timestamptz not null default now(),
  metadata jsonb
);
```

**Indexes**:
```sql
create index idx_webhook_events_stripe_event_id on webhook_events(stripe_event_id);
create index idx_webhook_events_processed_at on webhook_events(processed_at);
```

**Purpose**: Prevents duplicate webhook processing
- Webhook handler checks if `stripe_event_id` exists
- If exists, return 200 (already processed)
- If not, process and insert record

---

## Relationships & Foreign Keys

### Entity Relationship Diagram

```
┌─────────────┐
│   CLIENTS   │
└──────┬──────┘
       │ 1:N
       ├────────────────────┬────────────────┬────────────────┐
       │                    │                │                │
       ↓                    ↓                ↓                ↓
┌─────────────┐     ┌─────────────┐  ┌─────────────┐  ┌──────────────┐
│   QUOTES    │     │  INVOICES   │  │    JOBS     │  │ ORDER_FILES  │
└──────┬──────┘     └──────┬──────┘  └──────┬──────┘  └──────────────┘
       │                   │                │
       │ 1:N               │ 1:N            │ N:1
       ↓                   ↓                ↓
┌─────────────┐     ┌─────────────┐  ┌─────────────┐
│ QUOTE_ITEMS │     │INVOICE_ITEMS│  │  PRINTERS   │
└─────────────┘     └─────────────┘  └─────────────┘
                           │
                           │ 1:N
                           ↓
                    ┌─────────────┐
                    │  PAYMENTS   │
                    └─────────────┘

┌─────────────┐
│ AUTH.USERS  │ (Supabase Auth)
└──────┬──────┘
       │ 1:1
       ↓
┌─────────────┐
│    USERS    │
└──────┬──────┘
       │ 1:N
       ↓
┌─────────────┐
│USER_MESSAGES│
└─────────────┘
```

### Foreign Key Cascade Rules

#### ON DELETE CASCADE

**Deleting parent deletes children**:

```sql
clients → quotes (cascade)
clients → invoices (cascade)
clients → jobs (cascade)
quotes → quote_items (cascade)
invoices → invoice_items (cascade)
invoices → payments (cascade)
invoices → attachments (cascade)
users → user_messages (cascade)
users → tmp_files (cascade)
```

**Example**: Deleting a client deletes all their quotes, invoices, jobs, etc.

#### ON DELETE SET NULL

**Deleting parent nullifies foreign key**:

```sql
materials → product_templates.material_id
product_templates → quote_items.product_template_id
product_templates → invoice_items.product_template_id
quotes → invoices.source_quote_id
printers → jobs.printer_id
clients → activity_logs.client_id
```

**Example**: Deleting a material doesn't delete products, just sets `material_id = NULL`

#### Circular References

**Quotes ↔ Invoices**:
```sql
quotes.converted_invoice_id → invoices.id
invoices.converted_from_quote_id → quotes.id
```

Both are nullable and use `ON DELETE SET NULL` to break the cycle.

---

## Indexes

### Performance Indexes

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| `invoices` | `idx_invoices_status_due_date` | `status, due_date` | Filter invoices by status and sort by due date |
| `invoices` | `idx_invoices_paid_at` | `paid_at` | Find invoices paid within date range |
| `payments` | `idx_payments_paid_at` | `paid_at` | Revenue reports by payment date |
| `jobs` | `idx_jobs_printer_status_position` | `printer_id, status, queue_position` | Job board queries (active jobs per printer) |
| `jobs` | `idx_jobs_status_completed_at` | `status, completed_at` | Find completed jobs for auto-archive |
| `jobs` | `idx_jobs_archived_at` | `archived_at` | Exclude archived jobs from queries |
| `user_messages` | `idx_user_messages_user_invoice_created` | `user_id, invoice_id, created_at` | Fetch conversation history |
| `user_messages` | `idx_user_messages_invoice_created` | `invoice_id, created_at` | Invoice-specific messages |
| `tmp_files` | `idx_tmp_files_storage_key` | `storage_key` (UNIQUE) | Lookup by storage key |
| `tmp_files` | `idx_tmp_files_user_created` | `user_id, created_at DESC` | User's recent uploads |
| `order_files` | `idx_order_files_invoice` | `invoice_id` | Files for invoice |
| `order_files` | `idx_order_files_quote` | `quote_id` | Files for quote |
| `order_files` | `idx_order_files_client` | `client_id` | Files for client |
| `order_files` | `idx_order_files_storage_key` | `storage_key` | Lookup by storage key |
| `webhook_events` | `idx_webhook_events_stripe_event_id` | `stripe_event_id` | Idempotency check |
| `webhook_events` | `idx_webhook_events_processed_at` | `processed_at` | Cleanup old events |

---

## Constraints & Business Rules

### Unique Constraints

```sql
-- Document numbers must be unique
quotes.number UNIQUE
invoices.number UNIQUE

-- Auth integration
users.auth_user_id UNIQUE
users.email UNIQUE

-- Idempotency
payments.processor_id UNIQUE
tmp_files.storage_key UNIQUE
order_files.storage_key UNIQUE
webhook_events.stripe_event_id UNIQUE

-- Conversion tracking
quotes.converted_invoice_id UNIQUE
invoices.converted_from_quote_id UNIQUE
```

### Check Constraints

```sql
-- Order files must link to quote OR invoice (not both)
order_files: CHECK (invoice_id IS NOT NULL OR quote_id IS NOT NULL)
```

### Application-Level Business Rules

**Enforced in service layer**:

1. **Invoice Balance**:
   - `balance_due` = `total` - SUM(`payments.amount`)
   - Recalculated on every payment insert/delete

2. **Invoice Status**:
   - `PAID` when `balance_due = 0`
   - `OVERDUE` when `due_date < NOW()` and `balance_due > 0`

3. **Job Creation**:
   - Only created when invoice is PAID (if `job_creation_policy = 'ON_PAYMENT'`)
   - Or immediately when invoice is created (if `job_creation_policy = 'ON_INVOICE'`)

4. **Quote Conversion**:
   - Can only convert quote once (enforced by UNIQUE constraint on `converted_invoice_id`)
   - Sets quote status to `CONVERTED`

5. **Printer Assignment**:
   - Cannot assign job to printer with status `OFFLINE` (if `prevent_assign_to_offline = true`)
   - Cannot assign job to printer with status `MAINTENANCE` (if `prevent_assign_to_maintenance = true`)

6. **Document Numbering**:
   - Sequential numbers never reused
   - Generated atomically using database function

---

## Storage Buckets

### Supabase Storage Configuration

| Bucket Name | Purpose | Access | Max File Size |
|-------------|---------|--------|---------------|
| `attachments` | Invoice attachments | Private (RLS) | 10 MB |
| `pdfs` | Generated PDFs | Private (RLS) | 5 MB |
| `tmp` | Temporary uploads | Private (RLS) | 50 MB |
| `order-files` | 3D model files | Private (RLS) | 50 MB |

### Storage Key Patterns

**attachments**:
```
attachments/{invoice_id}/{attachment_id}/{filename}
```

**pdfs**:
```
pdfs/invoices/{invoice_id}/{timestamp}.pdf
pdfs/quotes/{quote_id}/{timestamp}.pdf
```

**tmp**:
```
tmp/{user_id}/{uuid}/{filename}
```

**order-files**:
```
order-files/{client_id}/{invoice_id}/{filename}
```

---

## Row-Level Security (RLS)

### RLS Policies

**order_files**:

```sql
-- Admins can view all files
create policy "Admins can view all order files"
  on order_files for select
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()::text::bigint
      and users.role = 'ADMIN'
    )
  );

-- Clients can view own files
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

### Service Role Bypass

- API routes use **service role** Supabase client (bypasses RLS)
- Authentication enforced at API layer, not database layer
- RLS provides defense-in-depth for direct database access

---

## Database Functions

### next_document_number(kind text)

**Purpose**: Atomically generate next document number

```sql
create or replace function next_document_number(p_kind text)
returns text as $$
declare
  v_seq record;
  v_next integer;
begin
  -- Lock row for update
  select * into v_seq
  from number_sequences
  where kind = p_kind
  for update;

  -- Increment
  v_next := v_seq.current + 1;

  -- Update sequence
  update number_sequences
  set current = v_next,
      updated_at = now()
  where kind = p_kind;

  -- Return formatted number
  return v_seq.prefix || v_next::text;
end;
$$ language plpgsql;
```

**Usage**:
```sql
SELECT next_document_number('quote');  -- Returns: QT-1043
SELECT next_document_number('invoice'); -- Returns: INV-2568
```

**Concurrency**: Row-level locking prevents race conditions

---

## Migration History

### Migration 1: Core Schema (202510161800_init.sql)

**Created**:
- 9 custom enum types
- 11 core tables: settings, number_sequences, clients, materials, product_templates, quotes, quote_items, invoices, invoice_items, payments, printers, jobs, attachments, activity_logs
- Indexes for invoices, payments, jobs
- Foreign key relationships
- Default settings row

---

### Migration 2: RLS Policies (202510161805_policies.sql)

**Created**:
- Row-Level Security policies for all tables
- Admin/Client access patterns
- Service role grants

---

### Migration 3: Users & Sessions (202510171300_users_sessions.sql)

**Created**:
- `users` table (links to auth.users)
- `user_messages` table
- `tmp_files` table
- Indexes for messages and tmp files

**Dropped**:
- Legacy `user_profiles` table
- Legacy `sessions` table

---

### Migration 4: Transactions (202510171320_transactions.sql)

**Purpose**: Invoice payment tracking enhancements

---

### Migration 5: Grants (202510180001_grants.sql)

**Purpose**: Database role permissions

---

### Migration 6: Fix Missing Policies (202510181400_fix_missing_policies.sql)

**Purpose**: Additional RLS policies for edge cases

---

### Migration 7: Fix Document Numbering (202510181830_fix_next_document_number.sql)

**Created**:
- `next_document_number()` function with proper locking

---

### Migration 8: Seed Catalog Data (202510191530_seed_catalog_data.sql)

**Seeded**:
- Default materials (PLA, ABS, PETG, Resin)
- Default product templates
- Payment terms configuration

---

### Migration 9: Webhook Idempotency (202510191545_webhook_idempotency.sql)

**Created**:
- `webhook_events` table for Stripe event tracking

---

### Migration 10: Order Files (202510191600_order_files.sql)

**Created**:
- `order_files` table for permanent 3D model storage
- RLS policies for client/admin access

---

## Query Patterns & Examples

### Common Queries

#### Get Client's Outstanding Balance

```sql
SELECT
  c.id,
  c.name,
  COALESCE(SUM(i.balance_due), 0) as outstanding_balance
FROM clients c
LEFT JOIN invoices i ON i.client_id = c.id
  AND i.status IN ('PENDING', 'OVERDUE')
  AND i.voided_at IS NULL
  AND i.written_off_at IS NULL
GROUP BY c.id, c.name;
```

#### Get Invoice Detail with All Related Data

```sql
SELECT
  i.*,
  c.name as client_name,
  c.email as client_email,
  json_agg(DISTINCT ii.*) as invoice_items,
  json_agg(DISTINCT p.*) as payments,
  json_agg(DISTINCT a.*) as attachments
FROM invoices i
JOIN clients c ON c.id = i.client_id
LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
LEFT JOIN payments p ON p.invoice_id = i.id
LEFT JOIN attachments a ON a.invoice_id = i.id
WHERE i.id = $1
GROUP BY i.id, c.name, c.email;
```

#### Get Active Jobs for Printer

```sql
SELECT
  j.*,
  c.name as client_name,
  i.number as invoice_number
FROM jobs j
JOIN clients c ON c.id = j.client_id
JOIN invoices i ON i.id = j.invoice_id
WHERE j.printer_id = $1
  AND j.archived_at IS NULL
  AND j.status IN ('IN_QUEUE', 'PRINTING')
ORDER BY j.queue_position;
```

#### Get Overdue Invoices

```sql
SELECT
  i.*,
  c.name as client_name,
  c.email as client_email,
  EXTRACT(DAY FROM NOW() - i.due_date) as days_overdue
FROM invoices i
JOIN clients c ON c.id = i.client_id
WHERE i.status = 'OVERDUE'
  AND i.voided_at IS NULL
  AND i.written_off_at IS NULL
ORDER BY i.due_date;
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-21
**Database Version**: PostgreSQL 15+ (Supabase)
**Total Tables**: 20
**Total Migrations**: 10
