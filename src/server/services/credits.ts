import { logger } from "@/lib/logger";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { AppError, BadRequestError, NotFoundError } from "@/lib/errors";

export type CreditTransactionDTO = {
  id: number;
  clientId: number;
  invoiceId: number | null;
  amount: number;
  transactionType: 'CREDIT_ADDED' | 'CREDIT_DEDUCTED' | 'CREDIT_REFUNDED';
  reason: string | null;
  notes: string | null;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: Date;
};

/**
 * Add credit to client wallet
 * @throws AppError if database operation fails
 * @throws BadRequestError if amount is invalid
 * @throws NotFoundError if client doesn't exist
 */
export async function addClientCredit(
  clientId: number,
  amount: number,
  adminUserId: number,
  reason?: string,
  notes?: string
): Promise<{ newBalance: number; transactionId: number }> {
  if (amount <= 0) {
    throw new BadRequestError('Credit amount must be positive');
  }

  const supabase = getServiceSupabase();

  // Use database function for atomic operation with row locking
  const { data, error } = await supabase.rpc('add_client_credit', {
    p_client_id: clientId,
    p_amount: String(amount),
    p_reason: reason || 'CREDIT_ADDED',
    p_notes: notes || null,
    p_admin_user_id: adminUserId
  });

  if (error) {
    if (error.message.includes('Client not found')) {
      throw new NotFoundError('Client', clientId);
    }
    throw new AppError(
      `Failed to add credit: ${error.message}`,
      'DATABASE_ERROR',
      500
    );
  }

  logger.info({
    scope: 'credits.add',
    data: { clientId, amount, adminUserId, newBalance: data.new_balance }
  });

  return {
    newBalance: Number(data.new_balance),
    transactionId: Number(data.transaction_id)
  };
}

/**
 * Remove credit from client wallet (admin operation)
 * @throws AppError if database operation fails
 * @throws BadRequestError if amount is invalid or insufficient balance
 * @throws NotFoundError if client doesn't exist
 */
export async function removeClientCredit(
  clientId: number,
  amount: number,
  adminUserId: number,
  reason?: string,
  notes?: string
): Promise<{ newBalance: number; transactionId: number }> {
  if (amount <= 0) {
    throw new BadRequestError('Removal amount must be positive');
  }

  const supabase = getServiceSupabase();

  // Get current balance to validate sufficient funds
  const currentBalance = await getClientWalletBalance(clientId);
  if (currentBalance < amount) {
    throw new BadRequestError(
      `Insufficient balance. Current: $${currentBalance.toFixed(2)}, Requested: $${amount.toFixed(2)}`
    );
  }

  // Use database function with negative amount for removal
  const { data, error } = await supabase.rpc('add_client_credit', {
    p_client_id: clientId,
    p_amount: String(-amount), // Negative amount for removal
    p_reason: reason || 'CREDIT_REFUNDED',
    p_notes: notes || null,
    p_admin_user_id: adminUserId
  });

  if (error) {
    if (error.message.includes('Client not found')) {
      throw new NotFoundError('Client', clientId);
    }
    throw new AppError(
      `Failed to remove credit: ${error.message}`,
      'DATABASE_ERROR',
      500
    );
  }

  logger.info({
    scope: 'credits.remove',
    data: { clientId, amount, adminUserId, reason, newBalance: data.new_balance }
  });

  return {
    newBalance: Number(data.new_balance),
    transactionId: Number(data.transaction_id)
  };
}

/**
 * Deduct credit from client wallet
 * @throws BadRequestError if insufficient balance or invalid amount
 * @throws NotFoundError if client doesn't exist
 */
export async function deductClientCredit(
  clientId: number,
  amount: number,
  reason: 'invoice_payment' | 'order_creation',
  invoiceId?: number
): Promise<{ deducted: number; newBalance: number }> {
  if (amount <= 0) {
    throw new BadRequestError('Deduction amount must be positive');
  }

  const supabase = getServiceSupabase();

  // Use database function with row locking to prevent race conditions
  const { data, error } = await supabase.rpc('deduct_client_credit', {
    p_client_id: clientId,
    p_amount: String(amount),
    p_reason: reason,
    p_invoice_id: invoiceId || null
  });

  if (error) {
    if (error.message.includes('Insufficient credit')) {
      throw new BadRequestError('Insufficient credit balance');
    }
    if (error.message.includes('Client not found')) {
      throw new NotFoundError('Client', clientId);
    }
    throw new AppError(
      `Failed to deduct credit: ${error.message}`,
      'DATABASE_ERROR',
      500
    );
  }

  logger.info({
    scope: 'credits.deduct',
    data: { clientId, deducted: data.deducted, newBalance: data.new_balance, invoiceId }
  });

  return {
    deducted: Number(data.deducted),
    newBalance: Number(data.new_balance)
  };
}

/**
 * Get client's current wallet balance
 */
export async function getClientWalletBalance(clientId: number): Promise<number> {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('clients')
    .select('wallet_balance')
    .eq('id', clientId)
    .single();

  if (error || !data) {
    throw new NotFoundError('Client', clientId);
  }

  return Number(data.wallet_balance ?? 0);
}

/**
 * Get credit transaction history for a client
 */
export async function getClientCreditHistory(
  clientId: number,
  limit = 50
): Promise<CreditTransactionDTO[]> {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new AppError(
      `Failed to fetch credit history: ${error.message}`,
      'DATABASE_ERROR',
      500
    );
  }

  return (data || []).map(mapCreditTransaction);
}

/**
 * Apply wallet credit to an invoice
 * Automatically applies available credit to reduce the invoice balance
 * @param invoiceId - The invoice to apply credit to
 * @param amountToApply - Optional specific amount to apply (defaults to all available)
 * @returns Amount of credit applied and new balance
 * @throws NotFoundError if invoice doesn't exist
 * @throws BadRequestError if invoice is already paid or voided
 */
export async function applyWalletCreditToInvoice(
  invoiceId: number,
  amountToApply?: number
): Promise<{ creditApplied: number; newBalanceDue: number }> {
  const supabase = getServiceSupabase();

  // Get invoice details
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('id, client_id, status, balance_due, credit_applied, total')
    .eq('id', invoiceId)
    .single();

  if (invoiceError || !invoice) {
    throw new NotFoundError('Invoice', invoiceId);
  }

  // Don't apply credit if invoice is already paid
  if (invoice.status === 'PAID') {
    throw new BadRequestError('Cannot apply credit to paid invoices');
  }

  const balanceDue = Number(invoice.balance_due);
  const alreadyApplied = Number(invoice.credit_applied ?? 0);

  // If no balance due, nothing to do
  if (balanceDue <= 0) {
    return { creditApplied: 0, newBalanceDue: 0 };
  }

  // Get client's wallet balance
  const walletBalance = await getClientWalletBalance(invoice.client_id);

  // If no wallet balance, nothing to apply
  if (walletBalance <= 0) {
    return { creditApplied: 0, newBalanceDue: balanceDue };
  }

  // Determine how much credit to apply
  let creditToApply: number;
  if (amountToApply !== undefined && amountToApply > 0) {
    // Validate custom amount
    if (amountToApply > walletBalance) {
      throw new BadRequestError(
        `Insufficient wallet balance. Available: $${walletBalance.toFixed(2)}, Requested: $${amountToApply.toFixed(2)}`
      );
    }
    if (amountToApply > balanceDue) {
      throw new BadRequestError(
        `Amount exceeds balance due. Balance due: $${balanceDue.toFixed(2)}, Requested: $${amountToApply.toFixed(2)}`
      );
    }
    creditToApply = amountToApply;
  } else {
    // Default: apply all available credit up to balance due
    creditToApply = Math.min(balanceDue, walletBalance);
  }

  // Deduct credit from wallet
  const { deducted, newBalance: newWalletBalance } = await deductClientCredit(
    invoice.client_id,
    creditToApply,
    'invoice_payment',
    invoiceId
  );

  // Update invoice with credit applied
  const newCreditApplied = alreadyApplied + deducted;
  const newBalanceDue = Number(invoice.total) - newCreditApplied;
  const newStatus = newBalanceDue <= 0 ? 'PAID' : invoice.status;

  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      credit_applied: String(newCreditApplied),
      balance_due: String(newBalanceDue),
      status: newStatus,
      paid_at: newBalanceDue <= 0 ? new Date().toISOString() : null
    })
    .eq('id', invoiceId);

  if (updateError) {
    throw new AppError(
      `Failed to update invoice with credit: ${updateError.message}`,
      'DATABASE_ERROR',
      500
    );
  }

  logger.info({
    scope: 'credits.applyToInvoice',
    data: {
      invoiceId,
      clientId: invoice.client_id,
      creditApplied: deducted,
      newBalanceDue,
      newWalletBalance,
      newStatus
    }
  });

  return { creditApplied: deducted, newBalanceDue };
}

// Helper function to map database row to DTO
function mapCreditTransaction(row: {
  id: number;
  client_id: number;
  invoice_id: number | null;
  amount: string | number;
  transaction_type: string;
  reason: string | null;
  notes: string | null;
  balance_before: string | number;
  balance_after: string | number;
  created_at: string;
}): CreditTransactionDTO {
  return {
    id: row.id,
    clientId: row.client_id,
    invoiceId: row.invoice_id,
    amount: Number(row.amount),
    transactionType: row.transaction_type as 'CREDIT_ADDED' | 'CREDIT_DEDUCTED' | 'CREDIT_REFUNDED',
    reason: row.reason,
    notes: row.notes,
    balanceBefore: Number(row.balance_before),
    balanceAfter: Number(row.balance_after),
    createdAt: new Date(row.created_at)
  };
}
