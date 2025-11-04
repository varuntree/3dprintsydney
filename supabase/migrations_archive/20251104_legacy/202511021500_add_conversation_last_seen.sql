-- Add per-conversation last seen tracking for better notification management
begin;

-- Create conversation_last_seen table
-- This tracks when each user last viewed messages from another user
-- Allows us to show notifications only for conversations that haven't been viewed
create table if not exists conversation_last_seen (
  user_id bigint not null references users(id) on delete cascade,
  conversation_user_id bigint not null references users(id) on delete cascade,
  last_seen_message_id bigint references user_messages(id) on delete set null,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, conversation_user_id)
);

-- Indices for efficient queries
create index idx_conversation_last_seen_user on conversation_last_seen(user_id);
create index idx_conversation_last_seen_conversation_user on conversation_last_seen(conversation_user_id);
create index idx_conversation_last_seen_timestamp on conversation_last_seen(last_seen_at desc);

-- Function to update timestamp automatically
create or replace function update_conversation_last_seen_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_update_conversation_last_seen_timestamp
  before update on conversation_last_seen
  for each row
  execute function update_conversation_last_seen_timestamp();

commit;
