-- Create permanent storage for client-uploaded 3D model files
-- These files are linked to invoices/quotes and accessible by admins

begin;

-- Table to track 3D model files permanently
create table if not exists order_files (
  id bigserial primary key,
  invoice_id bigint references invoices(id) on delete cascade,
  quote_id bigint references quotes(id) on delete cascade,
  client_id bigint not null references clients(id) on delete cascade,

  -- File info
  filename text not null,
  storage_key text not null unique,
  file_type text not null, -- 'model' or 'settings'
  mime_type text,
  size_bytes bigint not null,

  -- 3D model metadata
  metadata jsonb, -- stores print settings, slicing metrics, orientation data

  -- Tracking
  uploaded_by bigint references users(id) on delete set null,
  uploaded_at timestamptz not null default now(),

  -- Constraints
  check (invoice_id is not null or quote_id is not null)
);

-- Indexes for fast lookup
create index idx_order_files_invoice on order_files(invoice_id);
create index idx_order_files_quote on order_files(quote_id);
create index idx_order_files_client on order_files(client_id);
create index idx_order_files_storage_key on order_files(storage_key);

-- RLS policies for secure access
alter table order_files enable row level security;

-- Admins can see all files
create policy "Admins can view all order files"
  on order_files for select
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()::text::bigint
      and users.role = 'ADMIN'
    )
  );

-- Clients can see their own files
create policy "Clients can view own order files"
  on order_files for select
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()::text::bigint
      and users.client_id = order_files.client_id
    )
  );

commit;
