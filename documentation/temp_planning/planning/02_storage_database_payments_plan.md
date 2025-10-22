# Issue 2: Storage, Database, and Payments Verification - Implementation Plan

## Objective
Verify and fix critical gaps in storage file management, database access patterns, and payment processing. Ensure files are properly cleaned up when entities are deleted, and document areas requiring future work.

## Solution Approach
Focus on **critical fixes only** - add storage cleanup logic to prevent orphaned files. Document (but don't implement) temporary file cleanup strategy. Verify payments are working correctly.

---

## Critical Fixes (Must Implement)

### Fix 1: Storage Cleanup on Invoice Delete (2-3 hours)

**Problem**: When invoices are deleted, attached files remain in storage buckets indefinitely.

**Files Affected**:
- `/src/server/services/invoices.ts` - `deleteInvoice()` function
- `/src/server/storage/supabase.ts` - Storage operations

#### Implementation

**Step 1: Update deleteInvoice() Service**

**File**: `/src/server/services/invoices.ts`

```typescript
export async function deleteInvoice(id: number) {
  const supabase = getServiceSupabase();

  // 1. Fetch invoice with relations to get file references
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select(`
      id,
      client_id,
      attachments(id, storage_key, bucket),
      order_files(id, storage_key)
    `)
    .eq('id', id)
    .single();

  if (fetchError || !invoice) {
    throw new NotFoundError('Invoice', id);
  }

  // 2. Delete files from storage BEFORE deleting DB records
  const filesToDelete: Array<{ bucket: string; path: string }> = [];

  // Collect attachment files
  if (invoice.attachments?.length > 0) {
    for (const att of invoice.attachments) {
      filesToDelete.push({
        bucket: att.bucket || 'attachments',
        path: att.storage_key
      });
    }
  }

  // Collect order files
  if (invoice.order_files?.length > 0) {
    for (const file of invoice.order_files) {
      filesToDelete.push({
        bucket: 'order-files',
        path: file.storage_key
      });
    }
  }

  // Delete from storage
  for (const file of filesToDelete) {
    try {
      await deleteFromStorage(file.bucket, file.path);
      logger.info({
        scope: 'invoices.delete.storage',
        data: { invoiceId: id, bucket: file.bucket, path: file.path }
      });
    } catch (error) {
      logger.warn({
        scope: 'invoices.delete.storage',
        message: 'Failed to delete file from storage',
        error,
        data: { invoiceId: id, file }
      });
      // Continue - don't block invoice deletion
    }
  }

  // 3. Delete invoice (cascade will handle related records)
  const { data, error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw new AppError(
      `Failed to delete invoice: ${error?.message ?? 'Unknown error'}`,
      'DATABASE_ERROR',
      500
    );
  }

  // 4. Log activity
  await insertActivity({
    clientId: invoice.client_id,
    action: 'INVOICE_DELETED',
    message: `Invoice deleted with ${filesToDelete.length} files cleaned up`,
    metadata: { invoiceId: id, filesDeleted: filesToDelete.length }
  });

  logger.info({
    scope: 'invoices.delete',
    data: { id, filesDeleted: filesToDelete.length }
  });

  return data;
}
```

**Step 2: Add Storage Delete Helper**

**File**: `/src/server/storage/supabase.ts`

```typescript
/**
 * Delete a file from Supabase storage
 */
export async function deleteFromStorage(
  bucket: string,
  path: string
): Promise<void> {
  const supabase = getServiceSupabase();

  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    throw new AppError(
      `Failed to delete file from storage: ${error.message}`,
      'STORAGE_ERROR',
      500
    );
  }
}

/**
 * Delete multiple files from storage
 */
export async function deleteManyFromStorage(
  bucket: string,
  paths: string[]
): Promise<void> {
  if (paths.length === 0) return;

  const supabase = getServiceSupabase();

  const { error } = await supabase.storage
    .from(bucket)
    .remove(paths);

  if (error) {
    throw new AppError(
      `Failed to delete files from storage: ${error.message}`,
      'STORAGE_ERROR',
      500
    );
  }
}
```

**Step 3: Apply Same Pattern to Quote Delete**

**File**: `/src/server/services/quotes.ts`

```typescript
export async function deleteQuote(id: number) {
  // Same pattern as invoice delete:
  // 1. Fetch quote with order_files relations
  // 2. Delete files from storage
  // 3. Delete quote from database
  // 4. Log activity
}
```

---

### Fix 2: Document Temporary File Cleanup (30 min)

**Problem**: Files in `tmp` bucket accumulate indefinitely with no cleanup.

**Solution**: Document the cleanup strategy (don't implement for now).

**File**: `/src/server/storage/README.md` (CREATE NEW)

```markdown
# Storage Management

## Buckets

### tmp (Temporary Files)
Files in this bucket are created during:
- STL file processing
- 3D model slicing
- PDF generation (intermediate files)

**Current State**: No automatic cleanup

**Cleanup Strategy (To Implement)**:
1. Add `created_at` metadata to all tmp files
2. Create scheduled job (daily cron):
   - Query files older than 24 hours
   - Delete from storage
   - Log cleanup statistics

**Implementation Priority**: Medium
**Estimated Effort**: 2-3 hours

### order-files (Client Uploads)
Permanent storage for client-uploaded STL/3MF files.

**Cleanup**: Only when parent invoice/quote deleted (implemented)

### attachments (Invoice Attachments)
Receipts, photos, documents attached to invoices.

**Cleanup**: Only when parent invoice deleted (implemented)

### pdfs (Generated PDFs)
Quote and invoice PDFs generated on-demand.

**Current State**: No cleanup
**Future**: Could add cache expiration (regenerate on demand)
**Priority**: Low - PDFs are small
```

---

### Fix 3: Stripe Session Staleness Check (1-2 hours)

**Problem**: Stripe checkout sessions expire after 24 hours. If a client waits too long, they'll hit an error.

**Solution**: Check session age before redirect, regenerate if stale.

**File**: `/src/server/services/stripe.ts`

```typescript
export async function createStripeCheckoutSession(
  invoiceId: number
): Promise<{ url: string; sessionId: string }> {
  const detail = await getInvoiceDetail(invoiceId);

  // Validation checks (existing)
  if (detail.status === InvoiceStatus.PAID) {
    throw new BadRequestError('Invoice is already paid');
  }

  if (detail.balanceDue <= 0) {
    throw new BadRequestError('Invoice has no balance due');
  }

  // Check for existing active session
  const existingSession = await getExistingStripeSession(invoiceId);

  if (existingSession) {
    // Check if session is still valid (< 23 hours old)
    const sessionAge = Date.now() - existingSession.created * 1000;
    const MAX_SESSION_AGE = 23 * 60 * 60 * 1000; // 23 hours

    if (sessionAge < MAX_SESSION_AGE) {
      logger.info({
        scope: 'stripe.session.reuse',
        data: { invoiceId, sessionId: existingSession.id }
      });
      return {
        url: existingSession.url!,
        sessionId: existingSession.id
      };
    }

    logger.warn({
      scope: 'stripe.session.stale',
      message: 'Existing session expired, creating new one',
      data: { invoiceId, oldSessionId: existingSession.id }
    });
  }

  // Create new session (existing logic)
  const env = await getStripeEnvironment();

  const session = await env.stripe.checkout.sessions.create({
    // ... existing implementation
  });

  // Store session reference
  await storeStripeSession(invoiceId, session.id);

  logger.info({
    scope: 'stripe.session.create',
    data: { invoiceId, sessionId: session.id }
  });

  return {
    url: session.url!,
    sessionId: session.id
  };
}

// Helper functions (add to same file)

async function getExistingStripeSession(
  invoiceId: number
): Promise<Stripe.Checkout.Session | null> {
  const supabase = getServiceSupabase();

  const { data } = await supabase
    .from('stripe_sessions')
    .select('session_id')
    .eq('invoice_id', invoiceId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.session_id) return null;

  const env = await getStripeEnvironment();
  try {
    return await env.stripe.checkout.sessions.retrieve(data.session_id);
  } catch {
    return null;
  }
}

async function storeStripeSession(
  invoiceId: number,
  sessionId: string
): Promise<void> {
  const supabase = getServiceSupabase();

  await supabase.from('stripe_sessions').insert({
    invoice_id: invoiceId,
    session_id: sessionId,
    status: 'open'
  });
}
```

**Note**: Requires `stripe_sessions` table (check if exists, or track in invoice metadata)

---

## Optional: File Deletion API (1-2 hours)

**Only if time permits** - Allow admins to manually delete accidentally uploaded files.

**File**: `/src/app/api/order-files/[id]/route.ts`

```typescript
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const id = await parseId(context.params);
    await requireAdmin(request);

    // Service function to delete file
    await deleteOrderFile(id);

    return ok({ success: true });
  } catch (error) {
    return handleError(error, 'order-files.delete');
  }
}
```

**Service**: `/src/server/services/order-files.ts`

```typescript
export async function deleteOrderFile(id: number): Promise<void> {
  const supabase = getServiceSupabase();

  // Get file info
  const { data: file } = await supabase
    .from('order_files')
    .select('*')
    .eq('id', id)
    .single();

  if (!file) {
    throw new NotFoundError('Order file', id);
  }

  // Delete from storage
  await deleteFromStorage('order-files', file.storage_key);

  // Delete from database
  const { error } = await supabase
    .from('order_files')
    .delete()
    .eq('id', id);

  if (error) {
    throw new AppError(
      `Failed to delete order file: ${error.message}`,
      'DATABASE_ERROR',
      500
    );
  }

  logger.info({ scope: 'order-files.delete', data: { id } });
}
```

---

## Verification Tasks (No Code Changes)

### ✅ Database Access Patterns
- Review: RLS policies working correctly
- Review: Service layer enforces authorization
- Review: Cascade deletes configured

**Action**: Manual review only, no changes needed

### ✅ Payment Processing
- Verify: Idempotency table prevents duplicate processing
- Verify: Webhook signature validation
- Verify: Amount validation
- Verify: Status transitions correct

**Action**: Manual testing, no changes needed

---

## Testing Plan

### Storage Cleanup Testing
- [ ] Create invoice with attachments
- [ ] Delete invoice
- [ ] Verify files removed from storage bucket
- [ ] Check activity log shows file cleanup
- [ ] Verify no orphaned files remain

- [ ] Create quote with order files
- [ ] Delete quote
- [ ] Verify files removed from order-files bucket

### Stripe Session Testing
- [ ] Create checkout session
- [ ] Verify session stored/tracked
- [ ] Click payment link immediately → works
- [ ] Wait 24+ hours, click link → new session created
- [ ] Verify old session not reused

### Payment Flow Testing
- [ ] Complete Stripe payment
- [ ] Verify webhook processes correctly
- [ ] Verify idempotency prevents duplicates
- [ ] Verify invoice status updated
- [ ] Verify payment recorded with correct amount

---

## Files Modified Summary

### Critical Changes
- `/src/server/services/invoices.ts` - Add storage cleanup to deleteInvoice()
- `/src/server/services/quotes.ts` - Add storage cleanup to deleteQuote()
- `/src/server/storage/supabase.ts` - Add deleteFromStorage() helper
- `/src/server/services/stripe.ts` - Add session staleness check

### Documentation
- `/src/server/storage/README.md` (CREATE) - Document cleanup strategy

### Optional
- `/src/app/api/order-files/[id]/route.ts` - Add DELETE method
- `/src/server/services/order-files.ts` - Add deleteOrderFile()

---

## Estimated Effort
- Storage cleanup: 2-3 hours
- Stripe session staleness: 1-2 hours
- Documentation: 30 minutes
- Testing: 1 hour
- Optional file deletion API: 1-2 hours (skip if time constrained)

**Total Critical Path**: 4-6 hours
**Total with Optional**: 6-10 hours

---

## Success Criteria
✅ Invoice deletion removes attached files from storage
✅ Quote deletion removes order files from storage
✅ Temporary file cleanup strategy documented
✅ Stripe sessions validated before redirect
✅ No orphaned files in storage after deletes
✅ Activity logs show file cleanup operations
✅ Payment processing verified working
✅ No regressions in existing flows

---

## Future Work (Document Only)
- [ ] Implement scheduled job for tmp bucket cleanup
- [ ] Add file deletion UI for admins
- [ ] Add storage usage metrics/dashboard
- [ ] Implement PDF cache expiration
- [ ] Add batch file deletion capability
- [ ] Monitor storage bucket sizes
