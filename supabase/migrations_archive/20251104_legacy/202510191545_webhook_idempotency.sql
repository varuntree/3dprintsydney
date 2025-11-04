-- Add webhook event tracking table for idempotency
-- Prevents duplicate Stripe webhook processing

begin;

create table if not exists webhook_events (
  id bigserial primary key,
  stripe_event_id text not null unique,
  event_type text not null,
  processed_at timestamptz not null default now(),
  metadata jsonb
);

create index idx_webhook_events_stripe_event_id on webhook_events(stripe_event_id);
create index idx_webhook_events_processed_at on webhook_events(processed_at);

commit;
