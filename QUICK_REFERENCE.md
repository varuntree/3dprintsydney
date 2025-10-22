# Quick Reference Guide - Storage, Database & Payments

## Key File Locations

### Storage Layer
- **Bucket Configuration**: `/src/server/storage/supabase.ts`
  - `attachments` - Invoice attachments
  - `pdfs` - Generated PDFs
  - `tmp` - Temporary processing files
  - `order-files` - Permanent 3D model files

### Services Layer
- **Order Files Service**: `/src/server/services/order-files.ts`
- **Temporary Files Service**: `/src/server/services/tmp-files.ts`
- **Stripe Payments**: `/src/server/services/stripe.ts`
- **Invoice Management**: `/src/server/services/invoices.ts`

### API Routes
- **Quick Order Upload**: `/src/app/api/quick-order/upload/route.ts`
- **Order File Download**: `/src/app/api/order-files/[id]/route.ts`
- **Stripe Checkout**: `/src/app/api/invoices/[id]/stripe-session/route.ts`
- **Stripe Webhook**: `/src/app/api/stripe/webhook/route.ts`
- **Invoice Management**: `/src/app/api/invoices/[id]/route.ts`

### Database
- **Migrations**: `/supabase/migrations/`
  - `202510161800_init.sql` - Core schema
  - `202510161805_policies.sql` - RLS policies
  - `202510191600_order_files.sql` - Order files table & RLS
  - `202510191545_webhook_idempotency.sql` - Webhook event tracking

### Authorization
- **Permission Checks**: `/src/server/auth/permissions.ts`
  - `requireInvoiceAccess(req, invoiceId)` - Admin or invoice owner
  - `requireAttachmentAccess()` - Via parent invoice
  - `requirePaymentAccess()` - Via parent invoice

---

## Upload Workflow

```
1. POST /api/quick-order/upload
   └─ saveTmpFile() → tmp bucket, tmp_files table
      └─ Key: {userId}/{uuid}/{filename}
      └─ Status: 'idle'

2. POST /api/quick-order/slice (client-side processing)
   └─ sliceQuickOrderFile() → CuraEngine slicer
      └─ Updates tmp_files metadata with metrics
      └─ Generates gcode (saved as tmp file)

3. POST /api/quick-order/checkout
   └─ createQuickOrderInvoice()
      └─ Creates invoice with line items
      └─ processQuickOrderFiles()
         └─ saveOrderFile() → order-files bucket, order_files table
            └─ Key: {clientId}/{uuid}/{filename}
            └─ Links to invoice_id
      └─ createStripeCheckoutSession()
         └─ Stores session in invoices table
```

---

## Payment Workflow

```
1. POST /api/invoices/{id}/stripe-session
   └─ createStripeCheckoutSession(invoiceId)
      └─ Validates invoice not paid
      └─ Creates Stripe session with invoiceId metadata
      └─ Stores session_id & checkout_url in invoices
      └─ Returns checkout URL to frontend

2. Client → Stripe Checkout → Card Payment

3. Stripe → POST /api/stripe/webhook (checkout.session.completed)
   └─ handleStripeEvent(event)
      └─ Idempotency check: webhook_events table
      └─ Extract invoiceId from session.metadata
      └─ Call addManualPayment()
         └─ RPC: add_invoice_payment
            └─ INSERT payment record
            └─ UPDATE invoice: status=PAID, balance_due=0
      └─ Clear Stripe session from invoice
      └─ Record in webhook_events table
      └─ Return { received: true } (200 OK)
```

---

## Database Key Tables

### invoices
- id (PK)
- number (unique)
- client_id (FK, CASCADE)
- status (PENDING|PAID|OVERDUE)
- total, balance_due
- stripe_session_id, stripe_checkout_url
- Indexes: (status, due_date), (paid_at)

### payments
- id (PK)
- invoice_id (FK, CASCADE)
- amount, method (STRIPE|BANK_TRANSFER|CASH|OTHER)
- processor, processor_id (unique - GAP: should be composite)
- paid_at
- Indexes: (paid_at)

### order_files
- id (PK)
- invoice_id (FK, CASCADE) or quote_id (FK, CASCADE) [CHECK constraint]
- client_id (FK, CASCADE)
- storage_key (unique)
- file_type (model|settings)
- metadata (JSONB - print settings, metrics)
- Indexes: (invoice_id), (quote_id), (client_id), (storage_key)

### tmp_files
- id (PK)
- user_id (not FK - ephemeral)
- storage_key (unique)
- status (idle|running|completed|failed)
- metadata (JSONB - attempts, settings, error)
- No indexes (temporary data)

---

## Access Control Patterns

### Client Access (Admin verification required)
```
GET /api/client/invoices
  → SELECT * FROM invoices WHERE client_id = @user.clientId

GET /api/order-files/{id}
  → getOrderFile(id)
  → Check: user.role === 'ADMIN' OR file.client_id === user.clientId
  → Return signed URL (5 min expiration)

POST /api/quick-order/upload
  → saveTmpFile(userId, filename, buffer, contentType)
  → Storage path: {userId}/{uuid}/{filename}
  → DB owner check via user_id
```

### Admin Access (No filters applied)
```
GET /api/invoices
  → SELECT * FROM invoices (no WHERE clause)

GET /api/clients
  → SELECT * FROM clients (no WHERE clause)

DELETE /api/invoices/{id}
  → deleteInvoice(id) - ISSUE: no storage file cleanup
```

---

## Stripe Configuration

**Environment Variables**:
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_SUCCESS_URL
STRIPE_CANCEL_URL
STRIPE_CURRENCY (default: AUD)
```

**Webhook Events Handled**:
- `checkout.session.completed` → Payment received

**Idempotency**:
- webhook_events table tracks processed Stripe event IDs
- Prevents duplicate payment processing

---

## Critical Issues to Address

1. **Storage Cleanup on Invoice Delete** (HIGH PRIORITY)
   - Currently: deleteInvoice() only deletes DB records (cascade)
   - Missing: Delete files from order-files & attachments buckets
   - Fix: Add cleanup logic before DB delete

2. **Orphaned Temporary Files** (HIGH PRIORITY)
   - Currently: No cleanup of tmp files
   - Issue: Accumulates test data, failed uploads
   - Fix: Add scheduled cleanup job (TTL based)

3. **File Deletion API** (MEDIUM PRIORITY)
   - Currently: No DELETE endpoint for files
   - Issue: Can't remove unwanted files from invoice
   - Fix: Implement DELETE handler with storage cleanup

4. **Payment Processor ID** (MEDIUM PRIORITY)
   - Currently: `processor_id` UNIQUE constraint alone
   - Issue: Fails if multiple processors share same ID format
   - Fix: Make constraint UNIQUE(processor, processor_id)

---

## Testing Checklist

- [ ] Upload file → verify in tmp bucket with correct path
- [ ] Slice file → verify metrics in tmp_files metadata
- [ ] Create invoice → verify files moved to order-files bucket
- [ ] Delete invoice → verify storage files deleted (once fixed)
- [ ] Stripe payment → verify webhook idempotency
- [ ] Second webhook → verify payment not duplicated
- [ ] Cross-client access → verify forbidden (403)
- [ ] Signed URL expiry → verify regeneration needed after 5 min

---

## Performance Notes

- Order files indexed on: invoice_id, quote_id, client_id, storage_key
- Payments indexed on: paid_at (for aging reports)
- Invoices indexed on: (status, due_date), (paid_at)
- Service role used for all queries (RLS not enforced in read path)
- App-layer permission checks prevent unauthorized access

---

## Deployment Notes

Before going to production:
1. Create Supabase storage buckets (attachments, pdfs, tmp, order-files)
2. Apply all migrations in order
3. Configure Stripe API keys
4. Set success/cancel URLs for checkout
5. Implement storage cleanup strategy
6. Document file retention policy
7. Set up webhook monitoring/alerting

