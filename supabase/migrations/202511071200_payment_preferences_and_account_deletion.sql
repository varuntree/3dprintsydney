-- Add payment preference tracking and account deletion support
alter table invoices
  add column payment_preference text,
  add column credit_requested_amount numeric not null default 0,
  add column delivery_quote_snapshot jsonb;

create table if not exists account_deletion_requests (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  client_id bigint references clients(id) on delete set null,
  email text not null,
  status text not null check (status in ('REQUESTED', 'SCHEDULED', 'ANONYMIZED', 'CANCELLED')) default 'REQUESTED',
  requested_at timestamptz not null default now(),
  effective_at timestamptz not null,
  processed_at timestamptz,
  retention_until timestamptz not null,
  anonymized_data jsonb,
  notes text,
  unique(email)
);
create index if not exists idx_account_deletion_user on account_deletion_requests(user_id);
create index if not exists idx_account_deletion_status on account_deletion_requests(status);
