# Issue 5: Credit System Implementation - Exploration Summary

## Problem Statement
Implement a client credit/wallet system where:
1. Admins can add monetary credits to client accounts
2. Clients have a wallet balance (starts at $0)
3. Clients can use credits for orders
4. Credit deducted BEFORE Stripe checkout (no Stripe integration for credits)
5. Secure implementation with proper validation

## Current Client Data Model

### Database Schema
**Current Clients Table** (`/supabase/migrations/202510161800_init.sql`):
```sql
create table clients (
  id bigserial primary key,
  name text not null,
  company text,
  abn text,
  email text,
  phone text,
  address jsonb,
  tags jsonb,
  payment_terms text,
  notes text,
  notify_on_job_status boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Status**: ❌ NO `wallet_balance` field exists

### Required Database Changes
1. Add column: `wallet_balance numeric NOT NULL DEFAULT 0.00`
2. Optional: `credit_history jsonb` for audit trail (or separate table)
3. Migration: ALTER TABLE with default value for backward compatibility
4. Index: `idx_clients_wallet_balance` for quick filtering

### Type Definitions
**Files to Modify**:
- `/src/lib/types/clients.ts`
  - Add to `ClientSummaryDTO`: `walletBalance: number`
  - Add to `ClientDetailDTO.client`: `walletBalance: number`

## Admin Credit Management

### Current Admin Client Detail Page
- **Page**: `/src/app/(admin)/clients/[id]/page.tsx`
- **Component**: `/src/components/clients/client-detail.tsx`
- **Service**: `getClientDetail(id)` in `/src/server/services/clients.ts`
- **API**: `GET/PUT /api/clients/[id]/route.ts`

### Component Structure
- Uses React Query for mutations
- Tab structure: Overview, Invoices, Quotes, Jobs, Activity
- Has edit capability with Zod validation
- Form patterns with LoadingButton, toast notifications

### Recommended UI Implementation

**Option 1: Inline in Client Detail Header (PREFERRED)**
```
Client Detail Header
├─ Name, Company, Contact Info
├─ Key Metrics (Outstanding Balance, Total Invoices)
├─ [NEW] Wallet Balance Card
│  ├─ Current Balance: $X.XX
│  └─ "Add Credit" button → Opens modal
└─ Edit Client button
```

**Option 2: Separate Wallet Tab**
- Add "Wallet" tab to existing tabs
- Show balance, credit history table
- Form to add credit with reason/notes

**Recommendation**: Option 1 - More visible, quicker access

### API Endpoint Needed

**Create**: `/src/app/api/clients/[id]/credit/route.ts`

```typescript
// POST /api/clients/[id]/credit
Request body: {
  amount: number;          // Positive number
  reason?: string;         // 'initial_credit', 'adjustment', 'promotion', 'refund'
  notes?: string;          // Optional admin notes
}

Response: {
  clientId: number;
  previousBalance: number;
  newBalance: number;
  transactionId?: string;
  createdAt: string;
}
```

### Service Function

**Create**: `/src/server/services/credits.ts` (new file)

```typescript
export async function addClientCredit(
  clientId: number,
  amount: number,
  reason?: string,
  notes?: string
): Promise<{ newBalance: number }>;

export async function deductClientCredit(
  clientId: number,
  amount: number,
  reason: 'invoice_payment' | 'order_creation',
  invoiceId?: number
): Promise<{ deducted: number; newBalance: number }>;

export async function refundClientCredit(
  clientId: number,
  amount: number,
  reason: string,
  invoiceId?: number
): Promise<{ newBalance: number }>;
```

### Validation Schema

**File**: `/src/lib/schemas/clients.ts`

```typescript
export const creditAdjustmentSchema = z.object({
  amount: z.number().positive().min(0.01),
  reason: z.enum(['initial_credit', 'adjustment', 'promotion', 'refund']).optional(),
  notes: z.string().max(500).optional(),
});

export type CreditAdjustmentInput = z.infer<typeof creditAdjustmentSchema>;
```

## Client Wallet Display

### Client Dashboard
- **Component**: `/src/components/client/client-dashboard.tsx`
- **Current Stats**: Total Orders, Pending, Paid, Total Spent
- **API**: `/src/app/api/client/dashboard/route.ts`
- **Service**: `getClientDashboardStats()` in `/src/server/services/dashboard.ts`

### Recommended UI Addition

**Add Wallet Balance Card**:
```tsx
<Card className="border border-border bg-surface-overlay">
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">
      Available Credit
    </CardTitle>
    <Wallet className="h-4 w-4 text-amber-600" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">
      {formatCurrency(stats?.walletBalance ?? 0)}
    </div>
    {stats?.walletBalance > 0 && (
      <p className="text-xs text-muted-foreground mt-1">
        Can be used for orders
      </p>
    )}
  </CardContent>
</Card>
```

### Service Updates
- **File**: `/src/server/services/dashboard.ts`
- Function `getClientDashboardStats(clientId)` must include `wallet_balance` in query

## Payment Flow Integration

### Current Payment Flows

**Quick Order Flow**:
```
POST /api/quick-order/checkout
  ↓
createQuickOrderInvoice()
  ↓
createInvoice() [Creates invoice with full amount]
  ↓
createStripeCheckoutSession() [Full balance_due]
  ↓
Returns { invoiceId, checkoutUrl }
```

**Invoice Payment Flow**:
```
POST /api/invoices/[id]/stripe-session
  ↓
createStripeCheckoutSession()
  ↓
Gets invoice.balance_due
  ↓
Creates Stripe session for balance_due
  ↓
Returns { url, sessionId }
```

### Credit Deduction Strategy

**RECOMMENDED: Deduct BEFORE Stripe (Option A)**

**Flow with Credit**:
```
1. Client initiates payment/order
   ↓
2. Server: Check client.wallet_balance
   ↓
3. IF wallet_balance > 0 AND client wants to apply:
   a. Deduct min(wallet_balance, invoice.total)
   b. Update invoice.credit_applied and balance_due
   c. Log activity: "INVOICE_CREDIT_APPLIED"
   ↓
4. Create Stripe session (amount = balance_due AFTER credit)
   ↓
5. Client pays remaining balance via Stripe
   ↓
6. Webhook: Record payment for Stripe amount
   ↓
7. Mark invoice PAID if balance_due == 0
```

**Why Option A?**
- ✅ Cleaner UX - client sees exact Stripe payment amount
- ✅ Simpler flow - credit applied once
- ✅ No retroactive adjustments needed
- ⚠️ Requires credit refund handling if order cancelled

### Invoice Schema Changes

**Add Fields**:
```sql
ALTER TABLE invoices ADD COLUMN:
  credit_applied numeric DEFAULT 0,
  original_total numeric
```

### Implementation Points

**1. Update createInvoice()** (`/src/server/services/invoices.ts`):
```typescript
// Add optional parameter:
options?: {
  useCredit?: boolean;
  maxCreditToApply?: number;
}

// After creating invoice:
if (options?.useCredit && clientWalletBalance > 0) {
  const creditToApply = Math.min(clientWalletBalance, invoice.total);
  await deductClientCredit(clientId, creditToApply, 'invoice_payment', invoiceId);
  await updateInvoice(invoiceId, {
    credit_applied: creditToApply,
    balance_due: invoice.total - creditToApply
  });
}
```

**2. Update Quick Order Checkout** (`/src/server/services/quick-order.ts`):
```typescript
// After createInvoice(), before Stripe session:
const client = await getClient(clientId);
if (client.wallet_balance > 0) {
  await applyAvailableCredit(clientId, invoiceId);
}
```

**3. Update Stripe Session Creation** (`/src/server/services/stripe.ts`):
```typescript
// Already uses detail.balanceDue - perfect!
// Just add activity logging if credit was applied:

if (detail.credit_applied > 0) {
  await logActivity({
    invoice_id: invoiceId,
    action: 'INVOICE_CREDIT_APPLIED',
    message: `Client credit of ${formatCurrency(detail.credit_applied)} applied`,
    metadata: { creditApplied, originalTotal, balanceDue }
  });
}
```

## Security & Validation

### Database-Level Security

**Transaction Locking** (prevent race conditions):
```typescript
// When deducting credit:
BEGIN TRANSACTION;
  SELECT wallet_balance FROM clients
  WHERE id = clientId
  FOR UPDATE;  // Row-level lock

  IF balance >= amount THEN
    UPDATE clients
    SET wallet_balance = wallet_balance - amount
    WHERE id = clientId;
  ELSE
    ROLLBACK;
    THROW 'Insufficient credit';
  END IF;
COMMIT;
```

### Validation Rules

**Client-Side**:
- Display available balance before checkout
- Checkbox: "Use available credit"
- Show breakdown: Original - Credit = Amount due
- Only show option if `wallet_balance > 0`

**Server-Side (CRITICAL)**:
```typescript
// 1. Verify authorization
await requireAdmin(request);  // For adding credit
await requireClient(request); // For using credit

// 2. Never trust client-submitted amount
const creditToApply = Math.min(
  client.wallet_balance,
  invoice.total
);

// 3. Prevent negative balance
if (client.wallet_balance < amount) {
  throw new BadRequestError('Insufficient credit');
}

// 4. Validate state before Stripe
if (invoice.credit_applied < 0 ||
    invoice.credit_applied > invoice.total) {
  throw new AppError('Invalid credit state', 'CREDIT_STATE_ERROR', 500);
}

// 5. Atomic operations
// Use database transactions for deduct + invoice update
```

### Audit Trail

**Activity Logging**:
- Admin adds credit: `CREDIT_ADDED`
- Client uses credit: `INVOICE_CREDIT_APPLIED`
- Credit refunded: `CREDIT_REFUNDED`
- All entries include: clientId, amount, reason, notes

## UI Consistency Patterns

### Follow Existing Patterns

1. **Forms**: React Hook Form + Zod + `LoadingButton`
2. **Modals**: `Dialog`, `DialogContent`, `DialogHeader`
3. **Currency**: `formatCurrency()` utility from `/src/lib/currency`
4. **Mutations**: React Query `useMutation`
5. **Toasts**: Sonner library (`toast.success()`, `toast.error()`)
6. **Cards**: `Card`, `CardHeader`, `CardContent` components

### Component Locations

**Admin Credit Modal**:
- `/src/components/clients/add-credit-modal.tsx` (new)
- Called from client-detail.tsx

**Client Wallet Card**:
- Add to `/src/components/client/client-dashboard.tsx`
- Similar to existing stat cards

**Checkout Credit UI**:
- Add to quick order checkout section
- Add to invoice payment page

## Implementation Roadmap

### Phase 1: Database & Types (Week 1)
1. Migration: Add `wallet_balance` to clients
2. Create `/src/server/services/credits.ts`
3. Update `/src/lib/types/clients.ts`
4. Add credit schemas to `/src/lib/schemas/clients.ts`

### Phase 2: Admin Features (Week 2)
1. Create `/api/clients/[id]/credit/route.ts`
2. Add credit modal to client-detail component
3. Update client detail service
4. Test admin credit additions

### Phase 3: Client Display (Week 2)
1. Update dashboard service to include wallet
2. Add wallet card to client dashboard
3. Update `/api/client/dashboard/route.ts`

### Phase 4: Payment Integration (Week 3)
1. Update `createInvoice()` with credit logic
2. Update `createQuickOrderInvoice()`
3. Update Stripe session validation
4. Add activity logging

### Phase 5: Security & Testing (Week 4)
1. Transaction locking implementation
2. Race condition testing
3. Negative balance prevention
4. Validation at all layers

### Total Estimated Effort: 15-20 hours

## Files to Create/Modify

### Create New Files
- `/src/server/services/credits.ts` - Credit operations
- `/src/app/api/clients/[id]/credit/route.ts` - Add credit endpoint
- `/src/components/clients/add-credit-modal.tsx` - Admin UI

### Modify Existing Files
- `/supabase/migrations/` - Add wallet_balance column
- `/src/lib/types/clients.ts` - Add wallet types
- `/src/lib/schemas/clients.ts` - Add credit schemas
- `/src/server/services/clients.ts` - Include wallet in queries
- `/src/server/services/invoices.ts` - Credit application logic
- `/src/server/services/quick-order.ts` - Credit in checkout
- `/src/server/services/stripe.ts` - Validation updates
- `/src/server/services/dashboard.ts` - Include wallet balance
- `/src/components/client/client-dashboard.tsx` - Wallet card
- `/src/components/clients/client-detail.tsx` - Add credit button

## Files Referenced
- `/supabase/migrations/202510161800_init.sql`
- `/src/lib/types/clients.ts`
- `/src/app/(admin)/clients/[id]/page.tsx`
- `/src/components/clients/client-detail.tsx`
- `/src/server/services/clients.ts`
- `/src/app/api/clients/[id]/route.ts`
- `/src/components/client/client-dashboard.tsx`
- `/src/app/api/client/dashboard/route.ts`
- `/src/server/services/dashboard.ts`
- `/src/server/services/invoices.ts`
- `/src/server/services/quick-order.ts`
- `/src/server/services/stripe.ts`
- `/src/app/api/quick-order/checkout/route.ts`
- `/src/app/api/invoices/[id]/stripe-session/route.ts`
