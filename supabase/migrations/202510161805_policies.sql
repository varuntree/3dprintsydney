begin;

-- Helper function to fetch next document number
create or replace function public.next_document_number(kind text, default_prefix text)
returns text
language plpgsql
as $$
declare
  new_number integer;
  prefix text;
  output text;
begin
  insert into number_sequences(kind, prefix, current)
  values (kind, default_prefix, 1)
  on conflict (kind) do update
    set current = number_sequences.current + 1,
        prefix = excluded.prefix
    returning number_sequences.prefix, number_sequences.current
    into prefix, new_number;

  if prefix is null then
    prefix := default_prefix;
  end if;
  output := prefix || lpad(new_number::text, 4, '0');
  return output;
end;
$$;

create or replace function public.log_activity(
  p_client_id bigint,
  p_quote_id bigint,
  p_invoice_id bigint,
  p_job_id bigint,
  p_printer_id bigint,
  p_action text,
  p_message text,
  p_metadata jsonb default null
)
returns void
language sql
as $$
  insert into activity_logs(client_id, quote_id, invoice_id, job_id, printer_id, action, message, metadata)
  values (p_client_id, p_quote_id, p_invoice_id, p_job_id, p_printer_id, p_action, p_message, p_metadata);
$$;

-- Enable RLS on key tables
alter table clients enable row level security;
alter table quotes enable row level security;
alter table invoices enable row level security;
alter table quote_items enable row level security;
alter table invoice_items enable row level security;
alter table payments enable row level security;
alter table printers enable row level security;
alter table jobs enable row level security;
alter table attachments enable row level security;
alter table activity_logs enable row level security;
alter table user_messages enable row level security;
alter table tmp_files enable row level security;

-- Permissive service-role policies (application uses service role exclusively)
create policy clients_service_role_access on clients for all using (true) with check (true);
create policy quotes_service_role_access on quotes for all using (true) with check (true);
create policy invoices_service_role_access on invoices for all using (true) with check (true);
create policy quote_items_service_role_access on quote_items for all using (true) with check (true);
create policy invoice_items_service_role_access on invoice_items for all using (true) with check (true);
create policy payments_service_role_access on payments for all using (true) with check (true);
create policy printers_service_role_access on printers for all using (true) with check (true);
create policy jobs_service_role_access on jobs for all using (true) with check (true);
create policy attachments_service_role_access on attachments for all using (true) with check (true);
create policy activity_logs_service_role_access on activity_logs for all using (true) with check (true);
create policy user_messages_service_role_access on user_messages for all using (true) with check (true);
create policy tmp_files_service_role_access on tmp_files for all using (true) with check (true);

commit;
