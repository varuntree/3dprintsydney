begin;

drop table if exists tmp_files cascade;

drop table if exists user_messages cascade;

drop table if exists sessions cascade;

drop table if exists users cascade;

drop table if exists user_profiles cascade;

create table users (
  id bigserial primary key,
  auth_user_id uuid not null unique,
  email text not null unique,
  role role not null default 'CLIENT',
  client_id bigint references clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_messages (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  invoice_id bigint references invoices(id) on delete set null,
  sender role not null,
  content text not null,
  created_at timestamptz not null default now()
);
create index idx_user_messages_user_invoice_created on user_messages(user_id, invoice_id, created_at);
create index idx_user_messages_invoice_created on user_messages(invoice_id, created_at);

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
create unique index idx_tmp_files_storage_key on tmp_files(storage_key);
create index idx_tmp_files_user_created on tmp_files(user_id, created_at desc);

commit;
