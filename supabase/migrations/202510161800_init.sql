-- Initialize core schema translated from Prisma models
-- NOTE: Supabase CLI applies migrations in transaction by default
begin;

-- Enumerations
create type role as enum ('ADMIN', 'CLIENT');
create type quote_status as enum ('DRAFT','PENDING','ACCEPTED','DECLINED','CONVERTED');
create type invoice_status as enum ('PENDING','PAID','OVERDUE');
create type discount_type as enum ('NONE','PERCENT','FIXED');
create type pricing_type as enum ('FIXED','CALCULATED');
create type payment_method as enum ('STRIPE','BANK_TRANSFER','CASH','OTHER');
create type job_status as enum (
  'QUEUED','PRE_PROCESSING','IN_QUEUE','PRINTING','PAUSED','PRINTING_COMPLETE','POST_PROCESSING','PACKAGING','OUT_FOR_DELIVERY','COMPLETED','CANCELLED'
);
create type job_priority as enum ('NORMAL','FAST_TRACK','URGENT');
create type printer_status as enum ('ACTIVE','MAINTENANCE','OFFLINE');
create type job_creation_policy as enum ('ON_PAYMENT','ON_INVOICE');

-- Core settings table (single row)
create table if not exists settings (
  id integer primary key default 1,
  business_name text not null default '',
  business_email text,
  business_phone text,
  business_address text,
  abn text,
  tax_rate numeric,
  numbering_quote_prefix text not null default 'QT-',
  numbering_invoice_prefix text not null default 'INV-',
  default_payment_terms text default 'COD',
  bank_details text,
  shipping_regions jsonb,
  default_shipping_region text default 'sydney_metro',
  payment_terms jsonb,
  calculator_config jsonb,
  default_currency text not null default 'AUD',
  job_creation_policy job_creation_policy not null default 'ON_PAYMENT',
  auto_detach_job_on_complete boolean not null default true,
  auto_archive_completed_jobs_after_days integer not null default 7,
  prevent_assign_to_offline boolean not null default true,
  prevent_assign_to_maintenance boolean not null default true,
  max_active_printing_per_printer integer not null default 1,
  overdue_days integer not null default 0,
  reminder_cadence_days integer not null default 7,
  enable_email_send boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists number_sequences (
  id bigserial primary key,
  kind text not null unique,
  prefix text not null,
  current integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists clients (
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

create table if not exists materials (
  id bigserial primary key,
  name text not null,
  color text,
  category text,
  cost_per_gram numeric not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_templates (
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

create table if not exists quotes (
  id bigserial primary key,
  number text not null unique,
  client_id bigint not null references clients(id) on delete cascade,
  status quote_status not null default 'DRAFT',
  issue_date timestamptz not null default now(),
  expiry_date timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  expires_at timestamptz,
  decision_note text,
  tax_rate numeric,
  discount_type discount_type not null default 'NONE',
  discount_value numeric,
  shipping_cost numeric,
  shipping_label text,
  subtotal numeric not null,
  tax_total numeric not null,
  total numeric not null,
  notes text,
  terms text,
  calculator_snapshot jsonb,
  source_data jsonb,
  converted_invoice_id bigint unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists invoices (
  id bigserial primary key,
  number text not null unique,
  client_id bigint not null references clients(id) on delete cascade,
  source_quote_id bigint references quotes(id) on delete set null,
  status invoice_status not null default 'PENDING',
  issue_date timestamptz not null default now(),
  due_date timestamptz,
  voided_at timestamptz,
  void_reason text,
  written_off_at timestamptz,
  write_off_reason text,
  overdue_notified_at timestamptz,
  tax_rate numeric,
  discount_type discount_type not null default 'NONE',
  discount_value numeric,
  shipping_cost numeric,
  shipping_label text,
  subtotal numeric not null,
  tax_total numeric not null,
  total numeric not null,
  balance_due numeric not null,
  stripe_session_id text,
  stripe_checkout_url text,
  notes text,
  terms text,
  po_number text,
  internal_notes text,
  paid_at timestamptz,
  calculator_snapshot jsonb,
  converted_from_quote_id bigint unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table quotes
  add constraint quotes_converted_invoice_fk foreign key (converted_invoice_id) references invoices(id) on delete set null;

alter table invoices
  add constraint invoices_source_quote_fk foreign key (source_quote_id) references quotes(id) on delete set null;

alter table invoices
  add constraint invoices_converted_from_quote_fk foreign key (converted_from_quote_id) references quotes(id) on delete set null;

create index idx_invoices_status_due_date on invoices(status, due_date);
create index idx_invoices_paid_at on invoices(paid_at);

create table if not exists quote_items (
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

create table if not exists invoice_items (
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

create table if not exists payments (
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
create index idx_payments_paid_at on payments(paid_at);

create table if not exists printers (
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

create table if not exists jobs (
  id bigserial primary key,
  invoice_id bigint not null references invoices(id) on delete cascade,
  client_id bigint not null references clients(id) on delete cascade,
  printer_id bigint references printers(id) on delete set null,
  title text not null,
  description text,
  status job_status not null default 'PRE_PROCESSING',
  priority job_priority not null default 'NORMAL',
  queue_position integer not null default 0,
  estimated_hours numeric,
  actual_hours numeric,
  started_at timestamptz,
  paused_at timestamptz,
  completed_at timestamptz,
  last_run_started_at timestamptz,
  notes text,
  archived_at timestamptz,
  archived_reason text,
  completed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_jobs_printer_status_position on jobs(printer_id, status, queue_position);
create index idx_jobs_status_completed_at on jobs(status, completed_at);
create index idx_jobs_archived_at on jobs(archived_at);

create table if not exists attachments (
  id bigserial primary key,
  invoice_id bigint not null references invoices(id) on delete cascade,
  filename text not null,
  storage_key text not null,
  filetype text,
  size_bytes bigint not null,
  metadata jsonb,
  uploaded_at timestamptz not null default now()
);

create table if not exists activity_logs (
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

-- Supabase auth integration: profile table referencing auth.users
-- Reset sequences for singleton tables
insert into settings(id) values (1)
  on conflict (id) do nothing;

commit;
