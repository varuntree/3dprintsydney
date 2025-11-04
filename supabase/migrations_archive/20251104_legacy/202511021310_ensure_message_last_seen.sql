-- Ensure message_last_seen_at column exists for notifications
begin;

alter table users
  add column if not exists message_last_seen_at timestamptz;

create index if not exists idx_users_message_last_seen_at
  on users(message_last_seen_at);

commit;
