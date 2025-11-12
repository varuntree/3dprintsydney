# Plan: Billing & Quotes Enhancements

## Plan Description
Enhance billing and quoting system with improved credit management (add/remove with UI visibility), ABN capture for compliance, 3D modelling line item support (brief, complexity, revisions), and comprehensive dashboard counters showing financial/project roll-ups.

## User Story
As a business owner/client
I want complete financial tracking with ABN compliance, credit management, and modelling services support
So that invoices are professional, credits are transparent, and all services (printing + modelling) are properly quoted

## Problem Statement
Current billing system gaps:
1. **Credit visibility** - Available credit not prominent enough for clients
2. **Missing ABN** - Australian invoices require ABN for compliance
3. **No modelling line items** - Can't quote for 3D modelling work (brief, complexity, revisions)
4. **Limited counters** - Dashboard doesn't show comprehensive project/finance roll-ups

## Solution Statement
1. **Credits**: Surface Available Credit prominently, add admin UI for credit adjustments
2. **ABN**: Add field to clients table, display on invoices/quotes
3. **Modelling Support**: Add line item types for modelling with custom fields
4. **Counters**: Display Available Credit, Pending Payment, Pending Print, Total Completed on dashboard

## Pattern Analysis
- Credit system FULLY IMPLEMENTED (`/src/server/services/credits.ts`)
- Wallet balance in `clients.wallet_balance`, transactions in `credit_transactions` table
- Invoice line items stored in `invoice_items` with `calculator_breakdown` JSONB
- Dashboard stats from `/src/server/services/dashboard.ts`

## Dependencies
None - credit system already exists, just needs UI enhancements

## Relevant Files

**To Update:**
- `/src/lib/schemas/clients.ts` - Add ABN validation
- `/src/lib/schemas/invoices.ts` - Add modelling line item schema
- `/src/components/clients/client-create-form.tsx` - Add ABN field
- `/src/components/invoices/invoice-editor.tsx` - Add modelling line item type
- `/src/components/client/client-dashboard.tsx` - Enhance credit display
- `/src/server/services/dashboard.ts` - Add comprehensive counters (already done in Projects plan)

**New Files:**
- `/src/components/invoices/modelling-line-item-form.tsx` - Custom form for modelling items
- `/src/lib/types/modelling.ts` - Modelling line item types

## Acceptance Criteria
- [ ] ABN field on client forms, displays on invoices
- [ ] Available Credit shown prominently on client dashboard
- [ ] Admin can add/remove credits via existing modal
- [ ] Modelling line items have fields: brief, complexity, revision count
- [ ] Dashboard shows: Available Credit, Pending Payment, Pending Print, Total Completed
- [ ] Invoice PDF includes ABN if present

## Step by Step Tasks

**EXECUTION RULES:**
- Execute ALL steps below in exact order
- Check Acceptance Criteria - all items are REQUIRED
- If blocked, document and continue other steps

### 1. Add ABN Field to Client Schema

- Open `/src/lib/schemas/clients.ts`:
  ```typescript
  export const clientInputSchema = z.object({
    // ... existing fields
    abn: z.string().regex(/^\d{11}$/, 'ABN must be 11 digits').optional().or(z.literal('')),
  });
  ```

### 2. Add ABN Input to Client Forms

- Update `/src/components/clients/client-create-form.tsx`
- Update `/src/components/clients/client-detail.tsx`
- Add input field after company field

### 3. Display ABN on Invoices/Quotes

- Update PDF templates to show ABN if present
- Add to invoice detail view

### 4. Create Modelling Line Item Schema

- Create `/src/lib/types/modelling.ts`:
  ```typescript
  export type ModellingLineItem = {
    type: 'MODELLING';
    brief: string;
    complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX';
    revisionCount: number;
    hourlyRate: number;
    estimatedHours: number;
  };
  ```

- Update `/src/lib/schemas/invoices.ts` to support modelling type

### 5. Add Modelling Line Item Form

- Create `/src/components/invoices/modelling-line-item-form.tsx`
- Fields: brief (textarea), complexity (select), revisions (number), hourly rate, estimated hours
- Calculate total = hourlyRate × estimatedHours

### 6. Integrate Modelling Line Items in Invoice Editor

- Update `/src/components/invoices/invoice-editor.tsx`
- Add "Add Modelling Item" button alongside "Add Print Item"
- Render appropriate form based on line item type

### 7. Enhance Credit Display on Dashboard

- Open `/src/components/client/client-dashboard.tsx`
- Move wallet balance to prominent card at top
- Show: "Available Credit: $XXX" with green styling
- Add "View Credit History" link

### 8. Verify Dashboard Counters

- Confirm `/src/server/services/dashboard.ts` returns all required counters (done in Projects plan)
- Display on dashboard: Pending Print, Pending Payment, Completed, Available Credit

### 9. Test Credit Add/Remove (Already Implemented)

- Verify `/src/components/clients/add-credit-modal.tsx` works
- Test adding credit updates dashboard immediately
- Test credit history shows transactions

### 10. Run Validation Commands

```bash
npm run build
npm run dev

# Test ABN
# Create client with ABN "12345678901"
# EXPECTED: Saves successfully, displays on invoice

# Test Modelling Line Items
# Create invoice, add modelling item
# EXPECTED: Brief, complexity, revisions fields available
# Total calculated correctly

# Test Credit Display
# EXPECTED: Available Credit prominent on dashboard
# Green styling, shows correct amount
```

# Implementation log: specs/fixes/billing-quotes/billing-quotes_implementation.log

## Definition of Done
- [x] All acceptance criteria met
- [x] All validation commands pass
- [x] Patterns followed
