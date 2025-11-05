-- Add payment preference metadata to invoices
alter table public.invoices
  add column if not exists payment_preference text not null default 'CARD',
  add column if not exists wallet_credit_requested numeric default 0,
  add column if not exists wallet_credit_applied_at timestamptz;

-- Ensure existing rows have sensible defaults
update public.invoices
set payment_preference = coalesce(payment_preference, 'CARD'),
    wallet_credit_requested = coalesce(wallet_credit_requested, 0)
where true;

-- Extend invoice creation helper to capture payment metadata
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
    balance_due,
    credit_applied,
    original_total,
    payment_preference,
    wallet_credit_requested,
    wallet_credit_applied_at
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
    (invoice_data->>'balance_due')::numeric,
    nullif(invoice_data->>'credit_applied', '')::numeric,
    nullif(invoice_data->>'original_total', '')::numeric,
    coalesce(nullif(invoice_data->>'payment_preference', ''), 'CARD'),
    nullif(invoice_data->>'wallet_credit_requested', '')::numeric,
    nullif(invoice_data->>'wallet_credit_applied_at', '')::timestamptz
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

-- Update invoice update helper to preserve payment metadata
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
    credit_applied = nullif(invoice_data->>'credit_applied', '')::numeric,
    original_total = nullif(invoice_data->>'original_total', '')::numeric,
    payment_preference = coalesce(nullif(invoice_data->>'payment_preference', ''), payment_preference),
    wallet_credit_requested = coalesce(
      nullif(invoice_data->>'wallet_credit_requested', '')::numeric,
      wallet_credit_requested
    ),
    wallet_credit_applied_at = coalesce(
      nullif(invoice_data->>'wallet_credit_applied_at', '')::timestamptz,
      wallet_credit_applied_at
    ),
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

-- Extend wallet deduction function to support admin adjustments
create or replace function public.deduct_client_credit(
  p_client_id bigint,
  p_amount numeric,
  p_reason text,
  p_invoice_id bigint default null,
  p_notes text default null,
  p_admin_user_id bigint default null
)
returns json
language plpgsql
as $$
declare
  v_balance_before numeric;
  v_balance_after numeric;
  v_deducted numeric;
  v_transaction_id bigint;
begin
  select wallet_balance into v_balance_before
  from clients
  where id = p_client_id
  for update;

  if v_balance_before is null then
    raise exception 'Client not found';
  end if;

  if v_balance_before < p_amount then
    raise exception 'Insufficient credit balance';
  end if;

  v_deducted := least(v_balance_before, p_amount);
  v_balance_after := v_balance_before - v_deducted;

  update clients
  set wallet_balance = v_balance_after,
      updated_at = now()
  where id = p_client_id;

  insert into credit_transactions (
    client_id, invoice_id, amount, transaction_type, reason,
    notes, admin_user_id,
    balance_before, balance_after
  ) values (
    p_client_id, p_invoice_id, v_deducted, 'CREDIT_DEDUCTED', p_reason,
    nullif(p_notes, ''), p_admin_user_id,
    v_balance_before, v_balance_after
  )
  returning id into v_transaction_id;

  return json_build_object(
    'deducted', v_deducted,
    'new_balance', v_balance_after,
    'transaction_id', v_transaction_id
  );
end;
$$;
