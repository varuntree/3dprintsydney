-- Add wallet_balance to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS wallet_balance numeric NOT NULL DEFAULT 0.00;

-- Add index for quick filtering
CREATE INDEX IF NOT EXISTS idx_clients_wallet_balance ON clients(wallet_balance);

-- Add credit fields to invoices table (track credit applied)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS credit_applied numeric DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS original_total numeric;

-- Create credit_transactions table for audit trail
CREATE TABLE IF NOT EXISTS credit_transactions (
  id bigserial PRIMARY KEY,
  client_id bigint NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_id bigint REFERENCES invoices(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('CREDIT_ADDED', 'CREDIT_DEDUCTED', 'CREDIT_REFUNDED')),
  reason text,
  notes text,
  admin_user_id bigint REFERENCES users(id) ON DELETE SET NULL,
  balance_before numeric NOT NULL,
  balance_after numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_client ON credit_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_invoice ON credit_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions(created_at);

COMMENT ON TABLE credit_transactions IS 'Audit trail for all client credit transactions';

-- Function to add credit (atomic with locking)
CREATE OR REPLACE FUNCTION add_client_credit(
  p_client_id bigint,
  p_amount numeric,
  p_reason text,
  p_notes text,
  p_admin_user_id bigint
)
RETURNS json AS $$
DECLARE
  v_balance_before numeric;
  v_balance_after numeric;
  v_transaction_id bigint;
BEGIN
  -- Lock row for update
  SELECT wallet_balance INTO v_balance_before
  FROM clients
  WHERE id = p_client_id
  FOR UPDATE;

  IF v_balance_before IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  -- Calculate new balance
  v_balance_after := v_balance_before + p_amount;

  -- Update client balance
  UPDATE clients
  SET wallet_balance = v_balance_after,
      updated_at = now()
  WHERE id = p_client_id;

  -- Record transaction
  INSERT INTO credit_transactions (
    client_id, amount, transaction_type, reason, notes,
    admin_user_id, balance_before, balance_after
  ) VALUES (
    p_client_id, p_amount, 'CREDIT_ADDED', p_reason, p_notes,
    p_admin_user_id, v_balance_before, v_balance_after
  )
  RETURNING id INTO v_transaction_id;

  -- Return result
  RETURN json_build_object(
    'new_balance', v_balance_after,
    'transaction_id', v_transaction_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to deduct credit (atomic with locking)
CREATE OR REPLACE FUNCTION deduct_client_credit(
  p_client_id bigint,
  p_amount numeric,
  p_reason text,
  p_invoice_id bigint DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_balance_before numeric;
  v_balance_after numeric;
  v_deducted numeric;
BEGIN
  -- Lock row for update
  SELECT wallet_balance INTO v_balance_before
  FROM clients
  WHERE id = p_client_id
  FOR UPDATE;

  IF v_balance_before IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  -- Check sufficient balance
  IF v_balance_before < p_amount THEN
    RAISE EXCEPTION 'Insufficient credit balance';
  END IF;

  -- Calculate deduction
  v_deducted := LEAST(v_balance_before, p_amount);
  v_balance_after := v_balance_before - v_deducted;

  -- Update client balance
  UPDATE clients
  SET wallet_balance = v_balance_after,
      updated_at = now()
  WHERE id = p_client_id;

  -- Record transaction
  INSERT INTO credit_transactions (
    client_id, invoice_id, amount, transaction_type, reason,
    balance_before, balance_after
  ) VALUES (
    p_client_id, p_invoice_id, v_deducted, 'CREDIT_DEDUCTED', p_reason,
    v_balance_before, v_balance_after
  );

  RETURN json_build_object(
    'deducted', v_deducted,
    'new_balance', v_balance_after
  );
END;
$$ LANGUAGE plpgsql;
