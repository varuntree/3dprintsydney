# Issue 2: Storage, Database, and Payments Verification - Exploration Summary

## Problem Statement
Verify that storage (file uploads), database access, and payment processing work correctly for both admin and client portals. Identify any gaps or missing implementations, particularly around file cleanup and payment flow integrity.

## Storage Implementation

### Supabase Storage Buckets
1. **order-files**: Client-uploaded STL/3MF files
2. **attachments**: Invoice attachments (receipts, photos)
3. **pdfs**: Generated PDFs (quotes, invoices)
4. **tmp**: Temporary files (STL processing, slicing output)

### File Upload Flow

**Client Order Files**:
```
Client uploads via /api/quick-order/upload
  ↓
saveOrderFile() in /src/server/services/order-files.ts
  ↓
Stores in 'order-files' bucket
  ↓
DB record: { invoice_id, client_id, filename, storage_key }
```

**Access Control**:
- Client: Can upload and access own files via `client_id` check
- Admin: Can access all files through invoice/quote relations
- Service client uses service role key (bypasses RLS)

### Critical Issues Found

1. **Missing File Cleanup on Delete**
   - Files stay in storage when invoices/orders deleted
   - Affects: `order-files`, `attachments` buckets
   - Location: `/src/server/services/invoices.ts` (delete functions)
   - **Must Fix**: Add storage cleanup before DB deletion

2. **Orphaned Temporary Files**
   - No automatic cleanup for `tmp` bucket
   - Files accumulate indefinitely
   - **Document**: Need scheduled cleanup job

3. **File Deletion API Missing**
   - No endpoint for manual file deletion
   - Admin can't remove accidentally uploaded files
   - **Should Add**: DELETE `/api/order-files/[id]`

## Database Access Patterns

### Service Layer Architecture
```
API Routes (thin handlers)
  ↓
Service Layer (/src/server/services)
  ↓
getServiceSupabase() (service role)
  ↓
PostgreSQL Database
```

### Row-Level Security (RLS)
- Policies defined in `/supabase/migrations/202510161805_policies.sql`
- Client queries filtered by `client_id`
- Admin uses service role (bypasses RLS)
- Service layer enforces additional authorization

### Access Verification

**Client Data Access**:
- Queries filtered by `user.clientId` in service layer
- RLS policies provide database-level enforcement
- Example: `/src/server/services/invoices.ts` checks ownership

**Admin Access**:
- Full access via service role
- No RLS restrictions
- Authorization in route handlers via `requireAdmin()`

### Database Issues
- **No issues found** - Schema well-designed with cascade deletes
- Foreign keys properly configured
- Indexes appropriate for query patterns

## Payment Processing (Stripe)

### Payment Flow

**Invoice Payment**:
```
Client clicks "Pay Online"
  ↓
POST /api/invoices/[id]/stripe-session
  ↓
createStripeCheckoutSession()
  ↓
Stripe Checkout Session created
  ↓
Client completes payment
  ↓
Webhook: POST /api/stripe/webhook
  ↓
handleStripeEvent() processes payment
  ↓
Invoice status updated, payment recorded
```

### Stripe Implementation Files
- **Session Creation**: `/src/app/api/invoices/[id]/stripe-session/route.ts`
- **Webhook Handler**: `/src/app/api/stripe/webhook/route.ts`
- **Service**: `/src/server/services/stripe.ts`
- **Payment Recording**: `/src/server/services/invoices.ts`

### Payment Security Features
1. **Idempotency Protection**: `webhook_idempotency` table prevents duplicate processing
2. **Signature Validation**: Webhook signature verified
3. **Amount Validation**: Invoice amount matches Stripe session
4. **Status Checks**: Prevents re-processing of paid invoices

### Payment Issues Found

1. **Stripe Session Staleness**
   - Sessions created but might expire before payment
   - No validation of session age before redirect
   - **Should Add**: Check session validity, regenerate if stale

2. **Payment processor_id Constraint**
   - Currently unique, but should allow NULL + composite unique
   - Blocks multiple manual payments
   - **Low Priority**: Current design works with single Stripe payment per invoice

### Payment Flow Verification
- ✅ **Session Creation**: Works correctly
- ✅ **Webhook Processing**: Idempotent, secure
- ✅ **Payment Recording**: Atomic, logged
- ✅ **Status Updates**: Correct state transitions
- ✅ **Activity Logging**: Comprehensive audit trail

## Quick Order Flow

**File Upload → Payment**:
```
1. Upload STL files → tmp bucket
2. Process/slice files → metrics calculated
3. Configure (material, settings)
4. Get price quote
5. Checkout → creates invoice + jobs
6. Stripe payment (if balance > 0)
```

**Files**:
- Upload: `/src/app/api/quick-order/upload/route.ts`
- Checkout: `/src/app/api/quick-order/checkout/route.ts`
- Service: `/src/server/services/quick-order.ts`

## Production Readiness Assessment

### What's Working ✅
- Multi-bucket file organization
- Strong database design with cascade deletes
- Stripe integration with idempotency
- Multi-layer authorization (app + RLS)
- Comprehensive error handling
- Activity logging

### Critical Issues (Must Fix) ⚠️
1. Storage file cleanup on invoice delete
2. Orphaned temporary files
3. Stripe session staleness validation

### Medium Priority Issues
4. Missing file deletion API
5. Payment processor_id constraint

### Documentation Needed
- File retention/cleanup policy
- Temporary file cleanup schedule
- Stripe session timeout handling

## File Locations Referenced
- `/src/server/storage/supabase.ts`
- `/src/server/services/order-files.ts`
- `/src/server/services/invoices.ts`
- `/src/server/services/stripe.ts`
- `/src/app/api/stripe/webhook/route.ts`
- `/src/app/api/invoices/[id]/stripe-session/route.ts`
- `/supabase/migrations/202510161805_policies.sql`
- `/supabase/migrations/202510191545_webhook_idempotency.sql`

## Estimated Implementation Effort
- Storage cleanup on delete: 2-3 hours
- Temporary file cleanup job: 2-3 hours
- Stripe session validation: 1-2 hours
- File deletion API: 1-2 hours
- **Total**: 6-10 hours for all fixes
