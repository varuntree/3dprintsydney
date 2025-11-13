-- Fix: Make next_document_number collision-resistant
-- Previous version could generate duplicate numbers when sequence was out of sync with actual data
-- This version checks for existing numbers and retries until an unused number is found

create or replace function public.next_document_number(p_kind text, p_default_prefix text)
returns text
language plpgsql
as $$
declare
  new_number integer;
  stored_prefix text;
  effective_prefix text;
  candidate_number text;
  target_table text;
  exists_count integer;
  max_retries constant integer := 100;
  retry_count integer := 0;
begin
  -- Determine target table based on kind
  if p_kind = 'quote' then
    target_table := 'quotes';
  elsif p_kind = 'invoice' then
    target_table := 'invoices';
  else
    raise exception 'Invalid kind: %. Must be ''quote'' or ''invoice''', p_kind;
  end if;

  -- Get current sequence value and increment
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

  -- Loop until we find an unused number
  loop
    -- Generate candidate number
    candidate_number := effective_prefix || lpad(new_number::text, 4, '0');

    -- Check if this number already exists in the target table
    execute format('SELECT COUNT(*) FROM %I WHERE number = $1', target_table)
    using candidate_number
    into exists_count;

    -- If number is available, update sequence and return it
    if exists_count = 0 then
      -- Update sequence to match the number we're using
      update number_sequences
      set current = new_number,
          updated_at = now()
      where kind = p_kind;

      return candidate_number;
    end if;

    -- Number exists, increment and retry
    new_number := new_number + 1;
    retry_count := retry_count + 1;

    -- Safety check: prevent infinite loop
    if retry_count >= max_retries then
      raise exception 'Failed to generate unique % number after % attempts. Last tried: %',
        p_kind, max_retries, candidate_number;
    end if;
  end loop;
end;
$$;

-- Add comment explaining the function
comment on function public.next_document_number(text, text) is
'Generates unique sequential document numbers for quotes and invoices.
Collision-resistant: automatically finds next available number if sequence is out of sync with data.';
