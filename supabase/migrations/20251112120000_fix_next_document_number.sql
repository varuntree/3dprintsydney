-- Fix: next_document_number function was missing the 'current' value in INSERT
-- This caused "INSERT has more target columns than expressions" error when creating quotes/invoices

create or replace function public.next_document_number(p_kind text, p_default_prefix text)
returns text
language plpgsql
as $$
declare
  new_number integer;
  stored_prefix text;
  effective_prefix text;
begin
  insert into number_sequences(kind, prefix, current)
  values (p_kind, coalesce(p_default_prefix, ''), 1)
  on conflict (kind) do update
    set current = number_sequences.current + 1,
        prefix = coalesce(excluded.prefix, number_sequences.prefix),
        updated_at = now()
    returning number_sequences.prefix, number_sequences.current
    into stored_prefix, new_number;

  effective_prefix := coalesce(nullif(stored_prefix, ''), p_default_prefix);

  if effective_prefix is null then
    raise exception 'Prefix required for %', p_kind;
  end if;

  return effective_prefix || lpad(new_number::text, 4, '0');
end;
$$;
