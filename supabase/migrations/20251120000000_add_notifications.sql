create table if not exists notifications (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  type text not null,
  title text not null,
  content text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  metadata jsonb
);

create index if not exists idx_notifications_user_read on notifications(user_id, read_at);
create index if not exists idx_notifications_created_at on notifications(created_at desc);
