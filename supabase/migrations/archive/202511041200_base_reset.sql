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
  first_name text,
  last_name text,
  position text,
  company text,
  abn text,
  email text,
  phone text,
  address jsonb,
  tags jsonb,
  payment_terms text,
  notes text,
  wallet_balance numeric not null default 0,
  notify_on_job_status boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_clients_wallet_balance on clients(wallet_balance);

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
  credit_applied numeric default 0,
  original_total numeric,
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

create index if not exists idx_invoices_status_due_date on invoices(status, due_date);
create index if not exists idx_invoices_paid_at on invoices(paid_at);

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
create index if not exists idx_payments_paid_at on payments(paid_at);

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
create index if not exists idx_jobs_printer_status_position on jobs(printer_id, status, queue_position);
create index if not exists idx_jobs_status_completed_at on jobs(status, completed_at);
create index if not exists idx_jobs_archived_at on jobs(archived_at);

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

create table if not exists users (
  id bigserial primary key,
  auth_user_id uuid not null unique,
  email text not null unique,
  role role not null default 'CLIENT',
  client_id bigint references clients(id) on delete cascade,
  message_last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_users_message_last_seen_at on users(message_last_seen_at);

create table if not exists user_messages (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  invoice_id bigint references invoices(id) on delete set null,
  sender role not null,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_user_messages_user_invoice_created on user_messages(user_id, invoice_id, created_at);
create index if not exists idx_user_messages_invoice_created on user_messages(invoice_id, created_at);
create index if not exists idx_user_messages_sender_created on user_messages(sender, created_at desc);
create index if not exists idx_user_messages_user_sender_created on user_messages(user_id, sender, created_at desc);
create index if not exists idx_user_messages_created_sender on user_messages(created_at desc, sender);

create table if not exists tmp_files (
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
create unique index if not exists idx_tmp_files_storage_key on tmp_files(storage_key);
create index if not exists idx_tmp_files_user_created on tmp_files(user_id, created_at desc);

create table if not exists webhook_events (
  id bigserial primary key,
  stripe_event_id text not null unique,
  event_type text not null,
  processed_at timestamptz not null default now(),
  metadata jsonb
);
create index if not exists idx_webhook_events_stripe_event_id on webhook_events(stripe_event_id);
create index if not exists idx_webhook_events_processed_at on webhook_events(processed_at);

create table if not exists order_files (
  id bigserial primary key,
  invoice_id bigint references invoices(id) on delete cascade,
  quote_id bigint references quotes(id) on delete cascade,
  client_id bigint not null references clients(id) on delete cascade,
  filename text not null,
  storage_key text not null unique,
  file_type text not null,
  mime_type text,
  size_bytes bigint not null,
  metadata jsonb,
  uploaded_by bigint references users(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  check (invoice_id is not null or quote_id is not null)
);
create index if not exists idx_order_files_invoice on order_files(invoice_id);
create index if not exists idx_order_files_quote on order_files(quote_id);
create index if not exists idx_order_files_client on order_files(client_id);
create index if not exists idx_order_files_storage_key on order_files(storage_key);

create table if not exists credit_transactions (
  id bigserial primary key,
  client_id bigint not null references clients(id) on delete cascade,
  invoice_id bigint references invoices(id) on delete set null,
  amount numeric not null,
  transaction_type text not null check (transaction_type in ('CREDIT_ADDED', 'CREDIT_DEDUCTED', 'CREDIT_REFUNDED')),
  reason text,
  notes text,
  admin_user_id bigint references users(id) on delete set null,
  balance_before numeric not null,
  balance_after numeric not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_credit_transactions_client on credit_transactions(client_id);
create index if not exists idx_credit_transactions_invoice on credit_transactions(invoice_id);
create index if not exists idx_credit_transactions_created on credit_transactions(created_at);
comment on table credit_transactions is 'Audit trail for all client credit transactions';

create table if not exists conversation_last_seen (
  user_id bigint not null references users(id) on delete cascade,
  conversation_user_id bigint not null references users(id) on delete cascade,
  last_seen_message_id bigint references user_messages(id) on delete set null,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, conversation_user_id)
);
create index if not exists idx_conversation_last_seen_user on conversation_last_seen(user_id);
create index if not exists idx_conversation_last_seen_conversation_user on conversation_last_seen(conversation_user_id);
create index if not exists idx_conversation_last_seen_timestamp on conversation_last_seen(last_seen_at desc);

-- Helper functions
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
as $$
  insert into activity_logs(client_id, quote_id, invoice_id, job_id, printer_id, action, message, metadata)
  values (p_client_id, p_quote_id, p_invoice_id, p_job_id, p_printer_id, p_action, p_message, p_metadata);
$$;

create or replace function public.next_document_number(p_kind text, p_default_prefix text)
returns text
language plpgsql
as $$
declare
  new_number integer;
  stored_prefix text;
  effective_prefix text;
begin
  insert into number_sequences(kind, prefix, current)
  values (p_kind, coalesce(p_default_prefix, ''), 1)
  on conflict (kind) do update
    set current = number_sequences.current + 1,
        prefix = coalesce(excluded.prefix, number_sequences.prefix),
        updated_at = now()
    returning number_sequences.prefix, number_sequences.current
    into stored_prefix, new_number;

  effective_prefix := coalesce(nullif(stored_prefix, ''), p_default_prefix);

  if effective_prefix is null then
    raise exception 'Prefix required for %', p_kind;
  end if;

  return effective_prefix || lpad(new_number::text, 4, '0');
end;
$$;

create or replace function public.create_invoice_with_items(payload jsonb)
returns jsonb
language plpgsql
as $$
declare
  invoice_data jsonb := payload -> 'invoice';
  line_data jsonb := coalesce(payload -> 'lines', '[]'::jsonb);
  invoice_row invoices%rowtype;
begin
  if invoice_data is null then
    raise exception 'invoice data required';
  end if;

  insert into invoices (
    number,
    client_id,
    status,
    issue_date,
    due_date,
    tax_rate,
    discount_type,
    discount_value,
    shipping_cost,
    shipping_label,
    notes,
    terms,
    po_number,
    subtotal,
    total,
    tax_total,
    balance_due,
    credit_applied,
    original_total
  ) values (
    invoice_data->>'number',
    (invoice_data->>'client_id')::bigint,
    coalesce(invoice_data->>'status', 'PENDING')::invoice_status,
    (invoice_data->>'issue_date')::timestamptz,
    nullif(invoice_data->>'due_date', '')::timestamptz,
    nullif(invoice_data->>'tax_rate', '')::numeric,
    coalesce(invoice_data->>'discount_type', 'NONE')::discount_type,
    nullif(invoice_data->>'discount_value', '')::numeric,
    nullif(invoice_data->>'shipping_cost', '')::numeric,
    nullif(invoice_data->>'shipping_label', ''),
    nullif(invoice_data->>'notes', ''),
    nullif(invoice_data->>'terms', ''),
    nullif(invoice_data->>'po_number', ''),
    (invoice_data->>'subtotal')::numeric,
    (invoice_data->>'total')::numeric,
    (invoice_data->>'tax_total')::numeric,
    (invoice_data->>'balance_due')::numeric,
    nullif(invoice_data->>'credit_applied', '')::numeric,
    nullif(invoice_data->>'original_total', '')::numeric
  )
  returning * into invoice_row;

  if jsonb_typeof(line_data) = 'array' and jsonb_array_length(line_data) > 0 then
    insert into invoice_items (
      invoice_id,
      product_template_id,
      name,
      description,
      quantity,
      unit,
      unit_price,
      discount_type,
      discount_value,
      total,
      order_index,
      calculator_breakdown
    )
    select
      invoice_row.id,
      nullif(elem.value->>'product_template_id', '')::bigint,
      elem.value->>'name',
      nullif(elem.value->>'description', ''),
      (elem.value->>'quantity')::numeric,
      nullif(elem.value->>'unit', ''),
      (elem.value->>'unit_price')::numeric,
      coalesce(elem.value->>'discount_type', 'NONE')::discount_type,
      nullif(elem.value->>'discount_value', '')::numeric,
      (elem.value->>'total')::numeric,
      coalesce((elem.value->>'order_index')::integer, (elem.ord - 1)),
      elem.value->'calculator_breakdown'
    from jsonb_array_elements(line_data) with ordinality as elem(value, ord);
  end if;

  return jsonb_build_object('invoice', to_jsonb(invoice_row));
end;
$$;

create or replace function public.update_invoice_with_items(p_invoice_id bigint, payload jsonb)
returns jsonb
language plpgsql
as $$
declare
  invoice_data jsonb := payload -> 'invoice';
  line_data jsonb := coalesce(payload -> 'lines', '[]'::jsonb);
  invoice_row invoices%rowtype;
begin
  if p_invoice_id is null then
    raise exception 'invoice id required';
  end if;
  if invoice_data is null then
    raise exception 'invoice data required';
  end if;

  update invoices
  set
    client_id = (invoice_data->>'client_id')::bigint,
    issue_date = (invoice_data->>'issue_date')::timestamptz,
    due_date = nullif(invoice_data->>'due_date', '')::timestamptz,
    tax_rate = nullif(invoice_data->>'tax_rate', '')::numeric,
    discount_type = coalesce(invoice_data->>'discount_type', discount_type)::discount_type,
    discount_value = nullif(invoice_data->>'discount_value', '')::numeric,
    shipping_cost = nullif(invoice_data->>'shipping_cost', '')::numeric,
    shipping_label = nullif(invoice_data->>'shipping_label', ''),
    notes = nullif(invoice_data->>'notes', ''),
    terms = nullif(invoice_data->>'terms', ''),
    po_number = nullif(invoice_data->>'po_number', ''),
    subtotal = (invoice_data->>'subtotal')::numeric,
    total = (invoice_data->>'total')::numeric,
    tax_total = (invoice_data->>'tax_total')::numeric,
    balance_due = (invoice_data->>'balance_due')::numeric,
    credit_applied = nullif(invoice_data->>'credit_applied', '')::numeric,
    original_total = nullif(invoice_data->>'original_total', '')::numeric,
    updated_at = now()
  where id = p_invoice_id
  returning * into invoice_row;

  if not found then
    raise exception 'Invoice % not found', p_invoice_id;
  end if;

  delete from invoice_items where invoice_id = p_invoice_id;

  if jsonb_typeof(line_data) = 'array' and jsonb_array_length(line_data) > 0 then
    insert into invoice_items (
      invoice_id,
      product_template_id,
      name,
      description,
      quantity,
      unit,
      unit_price,
      discount_type,
      discount_value,
      total,
      order_index,
      calculator_breakdown
    )
    select
      invoice_row.id,
      nullif(elem.value->>'product_template_id', '')::bigint,
      elem.value->>'name',
      nullif(elem.value->>'description', ''),
      (elem.value->>'quantity')::numeric,
      nullif(elem.value->>'unit', ''),
      (elem.value->>'unit_price')::numeric,
      coalesce(elem.value->>'discount_type', 'NONE')::discount_type,
      nullif(elem.value->>'discount_value', '')::numeric,
      (elem.value->>'total')::numeric,
      coalesce((elem.value->>'order_index')::integer, (elem.ord - 1)),
      elem.value->'calculator_breakdown'
    from jsonb_array_elements(line_data) with ordinality as elem(value, ord);
  end if;

  return jsonb_build_object('invoice', to_jsonb(invoice_row));
end;
$$;

create or replace function public.add_invoice_payment(payload jsonb)
returns jsonb
language plpgsql
as $$
declare
  invoice_id bigint := (payload->>'invoice_id')::bigint;
  payment_data jsonb := payload->'payment';
  invoice_row invoices%rowtype;
  payment_row payments%rowtype;
  paid_amount numeric;
  balance numeric;
  is_paid boolean;
begin
  if invoice_id is null then
    raise exception 'invoice id required';
  end if;
  if payment_data is null then
    raise exception 'payment data required';
  end if;

  select * into invoice_row from invoices where id = invoice_id for update;
  if not found then
    raise exception 'Invoice % not found', invoice_id;
  end if;

  insert into payments (
    invoice_id,
    amount,
    method,
    currency,
    reference,
    processor,
    processor_id,
    notes,
    paid_at,
    metadata
  ) values (
    invoice_id,
    (payment_data->>'amount')::numeric,
    coalesce(payment_data->>'method', 'OTHER'),
    coalesce(payment_data->>'currency', 'AUD'),
    nullif(payment_data->>'reference', ''),
    nullif(payment_data->>'processor', ''),
    nullif(payment_data->>'processor_id', ''),
    nullif(payment_data->>'notes', ''),
    coalesce((payment_data->>'paid_at')::timestamptz, now()),
    payment_data->'metadata'
  ) returning * into payment_row;

  select coalesce(sum(amount), 0) into paid_amount from payments where invoice_id = invoice_row.id;
  balance := greatest(invoice_row.total - paid_amount, 0);
  is_paid := balance <= 0.000001;

  update invoices
  set
    balance_due = balance,
    status = case when is_paid then 'PAID' else 'PENDING' end,
    paid_at = case when is_paid then coalesce(payment_row.paid_at, now()) else null end,
    updated_at = now()
  where id = invoice_row.id
  returning * into invoice_row;

  return jsonb_build_object(
    'payment', to_jsonb(payment_row),
    'invoice', to_jsonb(invoice_row),
    'balance', balance,
    'paid_amount', paid_amount
  );
end;
$$;

create or replace function public.delete_invoice_payment(p_payment_id bigint)
returns jsonb
language plpgsql
as $$
declare
  payment_row payments%rowtype;
  invoice_row invoices%rowtype;
  paid_amount numeric;
  balance numeric;
  is_paid boolean;
begin
  delete from payments where id = p_payment_id returning * into payment_row;
  if not found then
    raise exception 'Payment % not found', p_payment_id;
  end if;

  select * into invoice_row from invoices where id = payment_row.invoice_id for update;

  select coalesce(sum(amount), 0) into paid_amount from payments where invoice_id = invoice_row.id;
  balance := greatest(invoice_row.total - paid_amount, 0);
  is_paid := balance <= 0.000001;

  update invoices
  set
    balance_due = balance,
    status = case when is_paid then 'PAID' else 'PENDING' end,
    paid_at = case when is_paid then coalesce(invoice_row.paid_at, now()) else null end,
    updated_at = now()
  where id = invoice_row.id
  returning * into invoice_row;

  return jsonb_build_object(
    'payment', to_jsonb(payment_row),
    'invoice', to_jsonb(invoice_row),
    'balance', balance,
    'paid_amount', paid_amount
  );
end;
$$;

create or replace function public.add_client_credit(
  p_client_id bigint,
  p_amount numeric,
  p_reason text,
  p_notes text,
  p_admin_user_id bigint
)
returns json
language plpgsql
as $$
declare
  v_balance_before numeric;
  v_balance_after numeric;
  v_transaction_id bigint;
begin
  select wallet_balance into v_balance_before
  from clients
  where id = p_client_id
  for update;

  if v_balance_before is null then
    raise exception 'Client not found';
  end if;

  v_balance_after := v_balance_before + p_amount;

  update clients
  set wallet_balance = v_balance_after,
      updated_at = now()
  where id = p_client_id;

  insert into credit_transactions (
    client_id, amount, transaction_type, reason, notes,
    admin_user_id, balance_before, balance_after
  ) values (
    p_client_id, p_amount, 'CREDIT_ADDED', p_reason, p_notes,
    p_admin_user_id, v_balance_before, v_balance_after
  )
  returning id into v_transaction_id;

  return json_build_object(
    'new_balance', v_balance_after,
    'transaction_id', v_transaction_id
  );
end;
$$;

create or replace function public.deduct_client_credit(
  p_client_id bigint,
  p_amount numeric,
  p_reason text,
  p_invoice_id bigint default null
)
returns json
language plpgsql
as $$
declare
  v_balance_before numeric;
  v_balance_after numeric;
  v_deducted numeric;
begin
  select wallet_balance into v_balance_before
  from clients
  where id = p_client_id
  for update;

  if v_balance_before is null then
    raise exception 'Client not found';
  end if;

  if v_balance_before < p_amount then
    raise exception 'Insufficient credit balance';
  end if;

  v_deducted := least(v_balance_before, p_amount);
  v_balance_after := v_balance_before - v_deducted;

  update clients
  set wallet_balance = v_balance_after,
      updated_at = now()
  where id = p_client_id;

  insert into credit_transactions (
    client_id, invoice_id, amount, transaction_type, reason,
    balance_before, balance_after
  ) values (
    p_client_id, p_invoice_id, v_deducted, 'CREDIT_DEDUCTED', p_reason,
    v_balance_before, v_balance_after
  );

  return json_build_object(
    'deducted', v_deducted,
    'new_balance', v_balance_after
  );
end;
$$;

create or replace function public.update_conversation_last_seen_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trigger_update_conversation_last_seen_timestamp
  before update on conversation_last_seen
  for each row
  execute function public.update_conversation_last_seen_timestamp();

-- RLS setup
alter table clients enable row level security;
alter table quotes enable row level security;
alter table invoices enable row level security;
alter table quote_items enable row level security;
alter table invoice_items enable row level security;
alter table payments enable row level security;
alter table printers enable row level security;
alter table jobs enable row level security;
alter table attachments enable row level security;
alter table activity_logs enable row level security;
alter table user_messages enable row level security;
alter table tmp_files enable row level security;
alter table users enable row level security;
alter table settings enable row level security;
alter table number_sequences enable row level security;
alter table materials enable row level security;
alter table product_templates enable row level security;
alter table order_files enable row level security;

create policy clients_service_role_access on clients for all using (true) with check (true);
create policy quotes_service_role_access on quotes for all using (true) with check (true);
create policy invoices_service_role_access on invoices for all using (true) with check (true);
create policy quote_items_service_role_access on quote_items for all using (true) with check (true);
create policy invoice_items_service_role_access on invoice_items for all using (true) with check (true);
create policy payments_service_role_access on payments for all using (true) with check (true);
create policy printers_service_role_access on printers for all using (true) with check (true);
create policy jobs_service_role_access on jobs for all using (true) with check (true);
create policy attachments_service_role_access on attachments for all using (true) with check (true);
create policy activity_logs_service_role_access on activity_logs for all using (true) with check (true);
create policy user_messages_service_role_access on user_messages for all using (true) with check (true);
create policy tmp_files_service_role_access on tmp_files for all using (true) with check (true);
create policy users_service_role_access on users for all using (true) with check (true);
create policy settings_service_role_access on settings for all using (true) with check (true);
create policy number_sequences_service_role_access on number_sequences for all using (true) with check (true);
create policy materials_service_role_access on materials for all using (true) with check (true);
create policy product_templates_service_role_access on product_templates for all using (true) with check (true);

create policy "Admins can view all order files"
  on order_files for select
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()::text::bigint
      and users.role = 'ADMIN'
    )
  );

create policy "Clients can view own order files"
  on order_files for select
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()::text::bigint
      and users.client_id = order_files.client_id
    )
  );

-- Grants and default privileges
grant usage on schema public to postgres, anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to postgres, anon, authenticated, service_role;

grant usage, select on all sequences in schema public to postgres, anon, authenticated, service_role;

grant execute on all functions in schema public to postgres, anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to postgres, anon, authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences to postgres, anon, authenticated, service_role;

alter default privileges in schema public
  grant execute on functions to postgres, anon, authenticated, service_role;

-- Seed required singleton rows
insert into settings(id) values (1)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values
  ('attachments', 'attachments', false),
  ('pdfs', 'pdfs', false),
  ('tmp', 'tmp', false),
  ('order-files', 'order-files', false)
on conflict (id) do nothing;

-- Storage bucket policies (order-files)
drop policy if exists "Service role has full access to order-files" on storage.objects;
create policy "Service role has full access to order-files"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'order-files');

drop policy if exists "Clients can read their own order files" on storage.objects;
create policy "Clients can read their own order files"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'order-files');

commit;
