-- Add optimized indices for message queries
begin;

-- Index for filtering messages by sender and ordering by creation time
create index if not exists idx_user_messages_sender_created 
  on user_messages(sender, created_at desc);

-- Composite index for user-specific queries with sender filter
create index if not exists idx_user_messages_user_sender_created 
  on user_messages(user_id, sender, created_at desc);

-- Index for efficient unseen message queries
create index if not exists idx_user_messages_created_sender
  on user_messages(created_at desc, sender);

commit;
