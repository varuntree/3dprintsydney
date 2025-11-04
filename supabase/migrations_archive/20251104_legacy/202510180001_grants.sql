-- Ensure Supabase roles have privileges on public schema objects
begin;

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

commit;
