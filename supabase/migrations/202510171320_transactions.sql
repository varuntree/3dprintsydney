begin;

insert into storage.buckets (id, name, public)
values
  ('attachments', 'attachments', false),
  ('pdfs', 'pdfs', false),
  ('tmp', 'tmp', false)
on conflict (id) do nothing;

create or replace function public.create_invoice_with_items(payload jsonb)
returns jsonb
language plpgsql
as $$
declare
  invoice_data jsonb := payload -> 'invoice';
  line_data jsonb := coalesce(payload -> 'lines', '[]'::jsonb);
  invoice_row invoices%rowtype;
begin
  if invoice_data is null then
    raise exception 'invoice data required';
  end if;

  insert into invoices (
    number,
    client_id,
    status,
    issue_date,
    due_date,
    tax_rate,
    discount_type,
    discount_value,
    shipping_cost,
    shipping_label,
    notes,
    terms,
    po_number,
    subtotal,
    total,
    tax_total,
    balance_due
  ) values (
    invoice_data->>'number',
    (invoice_data->>'client_id')::bigint,
    coalesce(invoice_data->>'status', 'PENDING')::invoice_status,
    (invoice_data->>'issue_date')::timestamptz,
    nullif(invoice_data->>'due_date', '')::timestamptz,
    nullif(invoice_data->>'tax_rate', '')::numeric,
    coalesce(invoice_data->>'discount_type', 'NONE')::discount_type,
    nullif(invoice_data->>'discount_value', '')::numeric,
    nullif(invoice_data->>'shipping_cost', '')::numeric,
    nullif(invoice_data->>'shipping_label', ''),
    nullif(invoice_data->>'notes', ''),
    nullif(invoice_data->>'terms', ''),
    nullif(invoice_data->>'po_number', ''),
    (invoice_data->>'subtotal')::numeric,
    (invoice_data->>'total')::numeric,
    (invoice_data->>'tax_total')::numeric,
    (invoice_data->>'balance_due')::numeric
  )
  returning * into invoice_row;

  if jsonb_typeof(line_data) = 'array' and jsonb_array_length(line_data) > 0 then
    insert into invoice_items (
      invoice_id,
      product_template_id,
      name,
      description,
      quantity,
      unit,
      unit_price,
      discount_type,
      discount_value,
      total,
      order_index,
      calculator_breakdown
    )
    select
      invoice_row.id,
      nullif(elem.value->>'product_template_id', '')::bigint,
      elem.value->>'name',
      nullif(elem.value->>'description', ''),
      (elem.value->>'quantity')::numeric,
      nullif(elem.value->>'unit', ''),
      (elem.value->>'unit_price')::numeric,
      coalesce(elem.value->>'discount_type', 'NONE')::discount_type,
      nullif(elem.value->>'discount_value', '')::numeric,
      (elem.value->>'total')::numeric,
      coalesce((elem.value->>'order_index')::integer, (elem.ord - 1)),
      elem.value->'calculator_breakdown'
    from jsonb_array_elements(line_data) with ordinality as elem(value, ord);
  end if;

  return jsonb_build_object('invoice', to_jsonb(invoice_row));
end;
$$;


create or replace function public.update_invoice_with_items(p_invoice_id bigint, payload jsonb)
returns jsonb
language plpgsql
as $$
declare
  invoice_data jsonb := payload -> 'invoice';
  line_data jsonb := coalesce(payload -> 'lines', '[]'::jsonb);
  invoice_row invoices%rowtype;
begin
  if p_invoice_id is null then
    raise exception 'invoice id required';
  end if;
  if invoice_data is null then
    raise exception 'invoice data required';
  end if;

  update invoices
  set
    client_id = (invoice_data->>'client_id')::bigint,
    issue_date = (invoice_data->>'issue_date')::timestamptz,
    due_date = nullif(invoice_data->>'due_date', '')::timestamptz,
    tax_rate = nullif(invoice_data->>'tax_rate', '')::numeric,
    discount_type = coalesce(invoice_data->>'discount_type', discount_type)::discount_type,
    discount_value = nullif(invoice_data->>'discount_value', '')::numeric,
    shipping_cost = nullif(invoice_data->>'shipping_cost', '')::numeric,
    shipping_label = nullif(invoice_data->>'shipping_label', ''),
    notes = nullif(invoice_data->>'notes', ''),
    terms = nullif(invoice_data->>'terms', ''),
    po_number = nullif(invoice_data->>'po_number', ''),
    subtotal = (invoice_data->>'subtotal')::numeric,
    total = (invoice_data->>'total')::numeric,
    tax_total = (invoice_data->>'tax_total')::numeric,
    balance_due = (invoice_data->>'balance_due')::numeric,
    updated_at = now()
  where id = p_invoice_id
  returning * into invoice_row;

  if not found then
    raise exception 'Invoice % not found', p_invoice_id;
  end if;

  delete from invoice_items where invoice_id = p_invoice_id;

  if jsonb_typeof(line_data) = 'array' and jsonb_array_length(line_data) > 0 then
    insert into invoice_items (
      invoice_id,
      product_template_id,
      name,
      description,
      quantity,
      unit,
      unit_price,
      discount_type,
      discount_value,
      total,
      order_index,
      calculator_breakdown
    )
    select
      invoice_row.id,
      nullif(elem.value->>'product_template_id', '')::bigint,
      elem.value->>'name',
      nullif(elem.value->>'description', ''),
      (elem.value->>'quantity')::numeric,
      nullif(elem.value->>'unit', ''),
      (elem.value->>'unit_price')::numeric,
      coalesce(elem.value->>'discount_type', 'NONE')::discount_type,
      nullif(elem.value->>'discount_value', '')::numeric,
      (elem.value->>'total')::numeric,
      coalesce((elem.value->>'order_index')::integer, (elem.ord - 1)),
      elem.value->'calculator_breakdown'
    from jsonb_array_elements(line_data) with ordinality as elem(value, ord);
  end if;

  return jsonb_build_object('invoice', to_jsonb(invoice_row));
end;
$$;


create or replace function public.add_invoice_payment(payload jsonb)
returns jsonb
language plpgsql
as $$
declare
  invoice_id bigint := (payload->>'invoice_id')::bigint;
  payment_data jsonb := payload->'payment';
  invoice_row invoices%rowtype;
  payment_row payments%rowtype;
  paid_amount numeric;
  balance numeric;
  is_paid boolean;
begin
  if invoice_id is null then
    raise exception 'invoice id required';
  end if;
  if payment_data is null then
    raise exception 'payment data required';
  end if;

  select * into invoice_row from invoices where id = invoice_id for update;
  if not found then
    raise exception 'Invoice % not found', invoice_id;
  end if;

  insert into payments (
    invoice_id,
    amount,
    method,
    currency,
    reference,
    processor,
    processor_id,
    notes,
    paid_at,
    metadata
  ) values (
    invoice_id,
    (payment_data->>'amount')::numeric,
    coalesce(payment_data->>'method', 'OTHER'),
    coalesce(payment_data->>'currency', 'AUD'),
    nullif(payment_data->>'reference', ''),
    nullif(payment_data->>'processor', ''),
    nullif(payment_data->>'processor_id', ''),
    nullif(payment_data->>'notes', ''),
    coalesce((payment_data->>'paid_at')::timestamptz, now()),
    payment_data->'metadata'
  ) returning * into payment_row;

  select coalesce(sum(amount), 0) into paid_amount from payments where invoice_id = invoice_row.id;
  balance := greatest(invoice_row.total - paid_amount, 0);
  is_paid := balance <= 0.000001;

  update invoices
  set
    balance_due = balance,
    status = case when is_paid then 'PAID' else 'PENDING' end,
    paid_at = case when is_paid then coalesce(payment_row.paid_at, now()) else null end,
    updated_at = now()
  where id = invoice_row.id
  returning * into invoice_row;

  return jsonb_build_object(
    'payment', to_jsonb(payment_row),
    'invoice', to_jsonb(invoice_row),
    'balance', balance,
    'paid_amount', paid_amount
  );
end;
$$;


create or replace function public.delete_invoice_payment(p_payment_id bigint)
returns jsonb
language plpgsql
as $$
declare
  payment_row payments%rowtype;
  invoice_row invoices%rowtype;
  paid_amount numeric;
  balance numeric;
  is_paid boolean;
begin
  delete from payments where id = p_payment_id returning * into payment_row;
  if not found then
    raise exception 'Payment % not found', p_payment_id;
  end if;

  select * into invoice_row from invoices where id = payment_row.invoice_id for update;

  select coalesce(sum(amount), 0) into paid_amount from payments where invoice_id = invoice_row.id;
  balance := greatest(invoice_row.total - paid_amount, 0);
  is_paid := balance <= 0.000001;

  update invoices
  set
    balance_due = balance,
    status = case when is_paid then 'PAID' else 'PENDING' end,
    paid_at = case when is_paid then coalesce(invoice_row.paid_at, now()) else null end,
    updated_at = now()
  where id = invoice_row.id
  returning * into invoice_row;

  return jsonb_build_object(
    'payment', to_jsonb(payment_row),
    'invoice', to_jsonb(invoice_row),
    'balance', balance,
    'paid_amount', paid_amount
  );
end;
$$;

commit;
