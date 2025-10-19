begin;

-- Fix missing RLS policies for tables that were accidentally omitted
-- These tables need RLS enabled + service-role access policies

-- Enable RLS on tables that are missing it
alter table users enable row level security;
alter table settings enable row level security;
alter table number_sequences enable row level security;
alter table materials enable row level security;
alter table product_templates enable row level security;

-- Create permissive service-role policies (same pattern as other tables)
create policy users_service_role_access on users for all using (true) with check (true);
create policy settings_service_role_access on settings for all using (true) with check (true);
create policy number_sequences_service_role_access on number_sequences for all using (true) with check (true);
create policy materials_service_role_access on materials for all using (true) with check (true);
create policy product_templates_service_role_access on product_templates for all using (true) with check (true);

commit;
