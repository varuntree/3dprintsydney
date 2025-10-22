# Issue 5: Credit System Implementation - Implementation Plan

## Objective
Implement a client wallet/credit system where:
1. Admins can add credits to client accounts via admin UI
2. Clients have a wallet balance (starts at $0)
3. Clients can use credits for orders before Stripe checkout
4. Credits deducted BEFORE redirecting to Stripe (no Stripe integration for credits)
5. Secure implementation with proper validation and locking

## Solution Approach
**Phased Implementation**:
- Phase 1: Database schema + core service layer
- Phase 2: Admin credit management UI
- Phase 3: Client wallet display
- Phase 4: Payment flow integration with credit deduction
- Phase 5: Security hardening and testing

---

## Phase 1: Database Schema & Core Services (3-4 hours)

### Step 1.1: Create Database Migration

**File**: `/supabase/migrations/202510XX_add_client_wallet.sql` (create new)

```sql
-- Add wallet_balance to clients table
ALTER TABLE clients
ADD COLUMN wallet_balance numeric NOT NULL DEFAULT 0.00;

-- Add index for quick filtering
CREATE INDEX idx_clients_wallet_balance ON clients(wallet_balance);

-- Add credit fields to invoices table (track credit applied)
ALTER TABLE invoices
ADD COLUMN credit_applied numeric DEFAULT 0.00,
ADD COLUMN original_total numeric;

-- Optional: Create credit_transactions table for audit trail
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

CREATE INDEX idx_credit_transactions_client ON credit_transactions(client_id);
CREATE INDEX idx_credit_transactions_invoice ON credit_transactions(invoice_id);
CREATE INDEX idx_credit_transactions_created ON credit_transactions(created_at);

COMMENT ON TABLE credit_transactions IS 'Audit trail for all client credit transactions';
```

**Apply migration**:
```bash
npx supabase db push
```

### Step 1.2: Update Type Definitions

**File**: `/src/lib/types/clients.ts`

```typescript
// Add to ClientSummaryDTO
export type ClientSummaryDTO = {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  paymentTerms: string | null;
  notifyOnJobStatus: boolean;
  outstandingBalance: number;
  totalInvoices: number;
  totalQuotes: number;
  walletBalance: number;  // ADD THIS
  createdAt: Date;
};

// Add to ClientDetailDTO
export type ClientDetailDTO = {
  client: {
    id: number;
    name: string;
    company: string;
    email: string;
    phone: string;
    address: string;
    paymentTerms: string;
    notifyOnJobStatus: boolean;
    abn: string | null;
    notes: string;
    tags: string[];
    walletBalance: number;  // ADD THIS
    createdAt: Date;
    updatedAt: Date;
  };
  invoices: InvoiceReference[];
  quotes: QuoteReference[];
  jobs: JobReference[];
  activity: ActivityEntry[];
  totals: ClientTotals;
  clientUser: ClientUserInfo | null;
};
```

**File**: `/src/lib/types/invoices.ts`

```typescript
export type InvoiceDetailDTO = {
  // ... existing fields
  creditApplied: number;  // ADD THIS
  originalTotal?: number; // ADD THIS (total before credit)
};
```

### Step 1.3: Create Credit Service

**File**: `/src/server/services/credits.ts` (CREATE NEW)

```typescript
import { logger } from "@/lib/logger";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { AppError, BadRequestError } from "@/lib/errors";

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
 */
export async function addClientCredit(
  clientId: number,
  amount: number,
  adminUserId: number,
  reason?: string,
  notes?: string
): Promise<{ newBalance: number; transaction: CreditTransactionDTO }> {
  if (amount <= 0) {
    throw new BadRequestError('Credit amount must be positive');
  }

  const supabase = getServiceSupabase();

  // Use transaction for atomic operation
  const { data, error } = await supabase.rpc('add_client_credit', {
    p_client_id: clientId,
    p_amount: amount,
    p_reason: reason || 'CREDIT_ADDED',
    p_notes: notes,
    p_admin_user_id: adminUserId
  });

  if (error) {
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
    newBalance: data.new_balance,
    transaction: mapCreditTransaction(data.transaction)
  };
}

/**
 * Deduct credit from client wallet
 * @throws BadRequestError if insufficient balance
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

  // Use transaction with row locking to prevent race conditions
  const { data, error } = await supabase.rpc('deduct_client_credit', {
    p_client_id: clientId,
    p_amount: amount,
    p_reason: reason,
    p_invoice_id: invoiceId
  });

  if (error) {
    if (error.message.includes('Insufficient credit')) {
      throw new BadRequestError('Insufficient credit balance');
    }
    throw new AppError(
      `Failed to deduct credit: ${error.message}`,
      'DATABASE_ERROR',
      500
    );
  }

  logger.info({
    scope: 'credits.deduct',
    data: { clientId, deducted: data.deducted, newBalance: data.new_balance }
  });

  return {
    deducted: data.deducted,
    newBalance: data.new_balance
  };
}

/**
 * Refund credit to client wallet
 */
export async function refundClientCredit(
  clientId: number,
  amount: number,
  reason: string,
  invoiceId?: number
): Promise<{ newBalance: number }> {
  // Similar to addClientCredit but with REFUNDED transaction type
  // Implementation omitted for brevity
}

// Helper function
function mapCreditTransaction(row: any): CreditTransactionDTO {
  return {
    id: row.id,
    clientId: row.client_id,
    invoiceId: row.invoice_id,
    amount: Number(row.amount),
    transactionType: row.transaction_type,
    reason: row.reason,
    notes: row.notes,
    balanceBefore: Number(row.balance_before),
    balanceAfter: Number(row.balance_after),
    createdAt: new Date(row.created_at)
  };
}
```

### Step 1.4: Create Database Functions (for atomicity)

**File**: Add to migration `/supabase/migrations/202510XX_add_client_wallet.sql`

```sql
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
```

### Step 1.5: Add Validation Schemas

**File**: `/src/lib/schemas/clients.ts`

```typescript
export const creditAdjustmentSchema = z.object({
  amount: z.number().positive().min(0.01, 'Amount must be at least $0.01'),
  reason: z.enum(['initial_credit', 'adjustment', 'promotion', 'refund']).optional(),
  notes: z.string().max(500).optional(),
});

export type CreditAdjustmentInput = z.infer<typeof creditAdjustmentSchema>;
```

---

## Phase 2: Admin Credit Management UI (2-3 hours)

### Step 2.1: Create Add Credit API Route

**File**: `/src/app/api/clients/[id]/credit/route.ts` (CREATE NEW)

```typescript
import { ZodError } from "zod";
import { ok, fail, handleError } from "@/server/api/respond";
import { requireAdmin } from "@/server/auth/api-helpers";
import { addClientCredit } from "@/server/services/credits";
import { creditAdjustmentSchema } from "@/lib/schemas/clients";
import type { NextRequest } from "next/server";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid client id");
  }
  return id;
}

/**
 * POST /api/clients/[id]/credit
 * Add credit to client wallet
 * ADMIN ONLY
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const clientId = await parseId(context.params);
    const admin = await requireAdmin(request);

    const body = await request.json();
    const validated = creditAdjustmentSchema.parse(body);

    const result = await addClientCredit(
      clientId,
      validated.amount,
      admin.id,
      validated.reason,
      validated.notes
    );

    return ok(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid credit payload", 422, {
        issues: error.issues,
      });
    }
    if (error instanceof Error && error.message === "Invalid client id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "clients.credit.add");
  }
}
```

### Step 2.2: Update Client Service to Include Wallet

**File**: `/src/server/services/clients.ts`

```typescript
// In getClientDetail function, include wallet_balance in query:
const { data, error } = await supabase
  .from('clients')
  .select(`
    *,
    invoices(*),
    quotes(*),
    jobs(*)
  `)
  .eq('id', id)
  .single();

// In mapping function, include walletBalance:
return {
  client: {
    // ... existing fields
    walletBalance: Number(data.wallet_balance ?? 0),
  },
  // ... rest of DTO
};

// Apply same to listClients function
```

### Step 2.3: Create Add Credit Modal Component

**File**: `/src/components/clients/add-credit-modal.tsx` (CREATE NEW)

```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DollarSign, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { creditAdjustmentSchema, type CreditAdjustmentInput } from '@/lib/schemas/clients';
import { formatCurrency } from '@/lib/currency';

interface AddCreditModalProps {
  clientId: number;
  clientName: string;
  currentBalance: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCreditModal({
  clientId,
  clientName,
  currentBalance,
  open,
  onOpenChange,
}: AddCreditModalProps) {
  const queryClient = useQueryClient();

  const form = useForm<CreditAdjustmentInput>({
    resolver: zodResolver(creditAdjustmentSchema),
    defaultValues: {
      amount: 0,
      reason: 'initial_credit',
      notes: '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (input: CreditAdjustmentInput) => {
      const res = await fetch(`/api/clients/${clientId}/credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to add credit');
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Credit added successfully! New balance: ${formatCurrency(data.data.newBalance)}`);
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast.error('Failed to add credit');
    },
  });

  const watchAmount = form.watch('amount');
  const projectedBalance = currentBalance + (watchAmount || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Credit to {clientName}</DialogTitle>
          <DialogDescription>
            Add monetary credit to client's wallet for future orders
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            {/* Current Balance Display */}
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Balance</span>
                <span className="text-lg font-semibold">{formatCurrency(currentBalance)}</span>
              </div>
              {watchAmount > 0 && (
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                  <span className="text-sm text-muted-foreground">After Credit</span>
                  <span className="text-lg font-semibold text-green-600">
                    {formatCurrency(projectedBalance)}
                  </span>
                </div>
              )}
            </div>

            {/* Amount Field */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Credit Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        className="pl-9"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>Amount to add to wallet</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reason Field */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="initial_credit">Initial Credit</SelectItem>
                      <SelectItem value="adjustment">Account Adjustment</SelectItem>
                      <SelectItem value="promotion">Promotional Credit</SelectItem>
                      <SelectItem value="refund">Refund</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes Field */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this credit..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Credit
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### Step 2.4: Add Credit Button to Client Detail

**File**: `/src/components/clients/client-detail.tsx`

```typescript
// Add state for modal
const [showAddCreditModal, setShowAddCreditModal] = useState(false);

// Add button in client header section (near Edit button):
<div className="flex items-center gap-2">
  <Button
    variant="outline"
    size="sm"
    onClick={() => setShowAddCreditModal(true)}
  >
    <DollarSign className="h-4 w-4 mr-2" />
    Add Credit
  </Button>
  <Button onClick={() => setIsEditing(true)}>
    Edit Client
  </Button>
</div>

// Add modal at bottom of component:
<AddCreditModal
  clientId={detail.client.id}
  clientName={detail.client.name}
  currentBalance={detail.client.walletBalance}
  open={showAddCreditModal}
  onOpenChange={setShowAddCreditModal}
/>
```

### Step 2.5: Display Wallet Balance in Client Detail

Add wallet balance card in overview section:

```typescript
{/* Wallet Balance Card */}
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">
      Available Credit
    </CardTitle>
    <Wallet className="h-4 w-4 text-amber-600" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">
      {formatCurrency(detail.client.walletBalance)}
    </div>
    <p className="text-xs text-muted-foreground mt-1">
      Can be used for orders
    </p>
  </CardContent>
</Card>
```

---

## Phase 3: Client Wallet Display (1-2 hours)

### Step 3.1: Update Dashboard API to Include Wallet

**File**: `/src/server/services/dashboard.ts`

```typescript
export async function getClientDashboardStats(clientId: number) {
  const supabase = getServiceSupabase();

  // Add wallet_balance to query
  const { data: client } = await supabase
    .from('clients')
    .select('wallet_balance')
    .eq('id', clientId)
    .single();

  // ... existing stats queries ...

  return {
    totalOrders,
    pendingCount,
    paidCount,
    totalSpent,
    walletBalance: Number(client?.wallet_balance ?? 0),  // ADD THIS
  };
}
```

### Step 3.2: Add Wallet Card to Client Dashboard

**File**: `/src/components/client/client-dashboard.tsx`

```typescript
{/* Wallet Balance Card - Add to stats grid */}
<Card className="border border-border bg-surface-overlay">
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">
      Available Credit
    </CardTitle>
    <Wallet className="h-4 w-4 text-amber-600" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">
      {loading ? "..." : formatCurrency(stats?.walletBalance ?? 0)}
    </div>
    {(stats?.walletBalance ?? 0) > 0 && (
      <p className="text-xs text-muted-foreground mt-1">
        Can be used for your next order
      </p>
    )}
  </CardContent>
</Card>
```

---

## Phase 4: Payment Flow Integration (3-4 hours)

### Step 4.1: Update Invoice Create with Credit Logic

**File**: `/src/server/services/invoices.ts`

```typescript
export async function createInvoice(
  input: InvoiceInput,
  options?: { applyCredit?: boolean }
): Promise<InvoiceDetailDTO> {
  const supabase = getServiceSupabase();

  // Calculate totals (existing logic)
  const totals = calculateDocumentTotals(input.lines, ...);

  // Create invoice with original_total
  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      client_id: input.clientId,
      // ... other fields
      total: totals.total,
      balance_due: totals.total,
      original_total: totals.total,  // ADD THIS
      credit_applied: 0,
    })
    .select()
    .single();

  if (error || !invoice) {
    throw new AppError(`Failed to create invoice: ${error?.message}`, 'DATABASE_ERROR', 500);
  }

  // Apply credit if requested and available
  if (options?.applyCredit) {
    const { data: client } = await supabase
      .from('clients')
      .select('wallet_balance')
      .eq('id', input.clientId)
      .single();

    const walletBalance = Number(client?.wallet_balance ?? 0);

    if (walletBalance > 0) {
      const creditToApply = Math.min(walletBalance, invoice.total);

      // Deduct from wallet
      const { deducted } = await deductClientCredit(
        input.clientId,
        creditToApply,
        'invoice_payment',
        invoice.id
      );

      // Update invoice
      await supabase
        .from('invoices')
        .update({
          credit_applied: deducted,
          balance_due: invoice.total - deducted,
        })
        .eq('id', invoice.id);

      // Log activity
      await insertActivity({
        clientId: input.clientId,
        invoiceId: invoice.id,
        action: 'INVOICE_CREDIT_APPLIED',
        message: `Client credit of ${formatCurrency(deducted)} applied to invoice`,
        metadata: { creditApplied: deducted, originalTotal: invoice.total }
      });

      invoice.credit_applied = deducted;
      invoice.balance_due = invoice.total - deducted;
    }
  }

  return mapInvoiceDetail(invoice);
}
```

### Step 4.2: Update Quick Order to Apply Credit

**File**: `/src/server/services/quick-order.ts`

```typescript
export async function createQuickOrderInvoice(params) {
  // ... existing logic to build invoice input ...

  // Create invoice with credit auto-applied
  const invoice = await createInvoice(invoiceInput, {
    applyCredit: true,  // ADD THIS
  });

  // ... rest of logic ...

  return invoice;
}
```

### Step 4.3: Validate Credit State Before Stripe

**File**: `/src/server/services/stripe.ts`

```typescript
export async function createStripeCheckoutSession(invoiceId: number) {
  const detail = await getInvoiceDetail(invoiceId);

  // Existing validations
  if (detail.status === InvoiceStatus.PAID) {
    throw new BadRequestError('Invoice is already paid');
  }

  // NEW: Validate credit state
  if (detail.creditApplied < 0 || detail.creditApplied > detail.total) {
    throw new AppError(
      'Invalid credit state on invoice',
      'CREDIT_STATE_ERROR',
      500
    );
  }

  // Create session with balance_due (already accounts for credit)
  const session = await env.stripe.checkout.sessions.create({
    // ... existing params
    line_items: [{
      price_data: {
        currency: 'aud',
        unit_amount: Math.round(detail.balanceDue * 100),  // Already reduced by credit
        product_data: { name: `Invoice ${detail.documentNumber}` }
      },
      quantity: 1
    }],
    // ...
  });

  // Log if credit was applied
  if (detail.creditApplied > 0) {
    logger.info({
      scope: 'stripe.session.create',
      message: 'Credit applied before Stripe checkout',
      data: {
        invoiceId,
        originalTotal: detail.originalTotal || detail.total,
        creditApplied: detail.creditApplied,
        balanceDue: detail.balanceDue
      }
    });
  }

  return { url: session.url!, sessionId: session.id };
}
```

---

## Phase 5: Security & Testing (2-3 hours)

### Security Checklist

- [ ] Database functions use row-level locking (FOR UPDATE)
- [ ] Credit deduction prevents negative balances
- [ ] Credit amount validated server-side (not trusted from client)
- [ ] Admin-only routes use requireAdmin()
- [ ] Audit trail records all transactions
- [ ] Race conditions prevented with atomic DB functions
- [ ] Invoice credit_applied validated before Stripe

### Testing Plan

#### Credit Addition
- [ ] Admin can add credit to client
- [ ] Wallet balance updates correctly
- [ ] Transaction logged in credit_transactions table
- [ ] Activity log shows credit added
- [ ] Client sees updated balance in dashboard

#### Credit Deduction
- [ ] Create order with credit available
- [ ] Credit deducted from wallet
- [ ] Invoice shows credit_applied and reduced balance_due
- [ ] Stripe session created for remaining balance only
- [ ] Transaction logged
- [ ] Cannot deduct more than available balance

#### Edge Cases
- [ ] Insufficient credit → Error message
- [ ] Negative amount → Validation error
- [ ] Concurrent credit operations → One succeeds, others wait
- [ ] Invoice with full credit (balance_due = 0) → No Stripe session
- [ ] Partial credit → Stripe session for remaining amount

---

## Files Created/Modified Summary

### Created
- `/supabase/migrations/202510XX_add_client_wallet.sql`
- `/src/server/services/credits.ts`
- `/src/app/api/clients/[id]/credit/route.ts`
- `/src/components/clients/add-credit-modal.tsx`

### Modified
- `/src/lib/types/clients.ts` - Add walletBalance
- `/src/lib/types/invoices.ts` - Add creditApplied, originalTotal
- `/src/lib/schemas/clients.ts` - Add creditAdjustmentSchema
- `/src/server/services/clients.ts` - Include wallet in queries
- `/src/server/services/invoices.ts` - Add credit application logic
- `/src/server/services/quick-order.ts` - Auto-apply credit
- `/src/server/services/stripe.ts` - Validate credit state
- `/src/server/services/dashboard.ts` - Include wallet in stats
- `/src/components/clients/client-detail.tsx` - Add credit button & modal
- `/src/components/client/client-dashboard.tsx` - Add wallet card

---

## Estimated Effort
- Phase 1 (Database & Services): 3-4 hours
- Phase 2 (Admin UI): 2-3 hours
- Phase 3 (Client Display): 1-2 hours
- Phase 4 (Payment Integration): 3-4 hours
- Phase 5 (Security & Testing): 2-3 hours

**Total**: 11-16 hours

---

## Success Criteria
✅ Database migration applied successfully
✅ Admin can add credit via UI modal
✅ Client sees wallet balance in dashboard
✅ Credit auto-applied to new orders
✅ Stripe checkout shows reduced amount
✅ Audit trail tracks all credit transactions
✅ No negative balances possible
✅ Race conditions prevented
✅ Activity logs show credit operations
✅ All security checks passing

---

## Future Enhancements
- [ ] Credit expiration dates
- [ ] Credit transfer between clients
- [ ] Promotional credit campaigns
- [ ] Credit usage reports
- [ ] Bulk credit additions
- [ ] Credit top-up requests from clients
- [ ] Credit history view for clients
- [ ] Credit usage analytics
