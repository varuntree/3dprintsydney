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

**Cleanup**: Only when parent invoice/quote deleted (✅ implemented)

### attachments (Invoice Attachments)
Receipts, photos, documents attached to invoices.

**Cleanup**: Only when parent invoice deleted (✅ implemented)

### pdfs (Generated PDFs)
Quote and invoice PDFs generated on-demand.

**Current State**: No cleanup
**Future**: Could add cache expiration (regenerate on demand)
**Priority**: Low - PDFs are small

## File Deletion Patterns

### Invoice Deletion
When an invoice is deleted:
1. Fetch invoice with `attachments` and `order_files` relations
2. Delete files from storage buckets
3. Delete invoice from database (cascade handles related records)
4. Log activity with file cleanup count

**Implementation**: `/src/server/services/invoices.ts:533`

### Quote Deletion
When a quote is deleted:
1. Fetch quote with `order_files` relations
2. Delete files from storage buckets
3. Delete quote from database (cascade handles related records)
4. Log activity with file cleanup count

**Implementation**: `/src/server/services/quotes.ts:534`

## Storage Helpers

### `deleteFromStorage(bucket, path)`
Delete a single file from any storage bucket.

**Throws**: Error if deletion fails
**Location**: `/src/server/storage/supabase.ts:264`

### `deleteManyFromStorage(bucket, paths[])`
Delete multiple files from a storage bucket in bulk.

**Throws**: Error if deletion fails
**Location**: `/src/server/storage/supabase.ts:285`

## Future Work

- [ ] Implement scheduled job for tmp bucket cleanup
- [ ] Add file deletion UI for admins
- [ ] Add storage usage metrics/dashboard
- [ ] Implement PDF cache expiration
- [ ] Add batch file deletion capability
- [ ] Monitor storage bucket sizes
