# Issue 3: Admin-Client Data Synchronization - Implementation Plan

## Objective
Fix gaps in data synchronization between admin and client portals:
1. Add file access control authorization
2. Implement real-time status updates (optional - socket.io or polling)
3. Add email notifications for status changes (optional)

## Solution Approach
**Priority**: Fix access control first (critical security issue). Real-time updates and email are nice-to-have enhancements.

---

## Critical Fix: File Access Control (1-2 hours)

### Problem
Order files lack proper authorization checks at API route level. Files are queryable by invoice_id but don't verify client ownership.

### Solution
Add authorization middleware to order file routes.

#### Step 1: Update Order Files API Route

**File**: `/src/app/api/order-files/[id]/route.ts`

```typescript
import { ok, handleError } from "@/server/api/respond";
import { requireAuth } from "@/server/auth/api-helpers";
import { getOrderFile } from "@/server/services/order-files";
import { ForbiddenError } from "@/lib/errors";
import type { NextRequest } from "next/server";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid file id");
  }
  return id;
}

/**
 * GET /api/order-files/[id]
 * Download/access order file
 * ACCESS: Admin (all files) OR Client (own files only)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const id = await parseId(context.params);
    const user = await requireAuth(request);

    // Get file metadata
    const file = await getOrderFile(id);

    // Authorization check
    if (user.role !== 'ADMIN' && file.clientId !== user.clientId) {
      throw new ForbiddenError('You do not have access to this file');
    }

    // Return file data or redirect to storage URL
    return ok(file);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid file id") {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "order-files.get");
  }
}
```

#### Step 2: Update Service to Include Client ID

**File**: `/src/server/services/order-files.ts`

```typescript
export type OrderFileDTO = {
  id: number;
  clientId: number;      // ADD THIS
  invoiceId: number | null;
  quoteId: number | null;
  filename: string;
  storageKey: string;
  filesize: number;
  contentType: string;
  createdAt: Date;
};

export async function getOrderFile(id: number): Promise<OrderFileDTO> {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('order_files')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new NotFoundError('Order file', id);
  }

  return {
    id: data.id,
    clientId: data.client_id,  // INCLUDE THIS
    invoiceId: data.invoice_id,
    quoteId: data.quote_id,
    filename: data.filename,
    storageKey: data.storage_key,
    filesize: data.filesize_bytes,
    contentType: data.content_type,
    createdAt: new Date(data.created_at)
  };
}
```

#### Step 3: Apply Same Pattern to Attachments

**File**: `/src/app/api/attachments/[id]/route.ts`

```typescript
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const id = await parseId(context.params);
    const user = await requireAuth(request);

    // Get attachment (includes invoice relation)
    const attachment = await getAttachment(id);

    // Get invoice to check ownership
    const invoice = await getInvoice(attachment.invoiceId);

    // Authorization check
    if (user.role !== 'ADMIN' && invoice.clientId !== user.clientId) {
      throw new ForbiddenError('You do not have access to this attachment');
    }

    // Return attachment or storage URL
    return ok(attachment);
  } catch (error) {
    return handleError(error, "attachments.get");
  }
}
```

---

## Optional Enhancement 1: Real-Time Status Updates (6-8 hours)

**Decision**: Skip for now unless user explicitly requests it.

### Why Skip?
- Current implementation works (client sees updates on refresh)
- Adds significant complexity (WebSocket server, connection management)
- Most clients don't need instant updates

### Future Implementation Options

**Option A: Socket.io** (Full real-time, complex)
- Install socket.io
- Add WebSocket server
- Broadcast status changes
- Client subscribes to job updates

**Option B: Polling** (Simpler, good enough)
- Client polls `/api/client/jobs` every 10 seconds
- Show "Last updated" timestamp
- Manual "Refresh" button

**Option C: Server-Sent Events** (One-way push, simpler than WebSocket)
- Stream updates to client
- Lighter than socket.io

**Recommendation**: If needed, implement Option B (polling) first.

---

## Optional Enhancement 2: Email Notifications (4-6 hours)

**Decision**: Skip for now unless user explicitly requests it.

### Current State
- `maybeNotifyJobStatusChange()` is placeholder only
- No email service integrated

### Future Implementation

**File**: `/src/server/services/jobs.ts`

```typescript
async function maybeNotifyJobStatusChange(
  job: Job,
  oldStatus: JobStatus,
  newStatus: JobStatus
): Promise<void> {
  // Check if client wants notifications
  const client = await getClient(job.clientId);

  if (!client.notifyOnJobStatus) {
    return; // Client opted out
  }

  // Determine if this status change is significant
  const significantStatuses: JobStatus[] = [
    'PRINTING',
    'COMPLETED',
    'CANCELLED'
  ];

  if (!significantStatuses.includes(newStatus)) {
    return; // Not worth notifying
  }

  // Send email (integrate with email service)
  try {
    await sendEmail({
      to: client.email,
      subject: `Order Update: ${job.title}`,
      template: 'job-status-change',
      data: {
        clientName: client.name,
        jobTitle: job.title,
        oldStatus,
        newStatus,
        invoiceNumber: job.invoiceNumber,
        viewUrl: `${process.env.APP_URL}/client/orders/${job.invoiceId}`
      }
    });

    logger.info({
      scope: 'jobs.notify.email',
      data: { jobId: job.id, clientId: job.clientId, status: newStatus }
    });
  } catch (error) {
    logger.error({
      scope: 'jobs.notify.email',
      message: 'Failed to send status notification',
      error,
      data: { jobId: job.id }
    });
  }
}
```

**Email Service Integration Options**:
- SendGrid
- AWS SES
- Postmark
- Resend

---

## Quick Win: Client-Side Refresh UI (1-2 hours)

**Optional but recommended** - Add "Last updated" and "Refresh" button to client orders page.

**File**: `/src/app/(client)/client/orders/[id]/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OrderDetailPage() {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Trigger refetch via React Query
    await queryClient.invalidateQueries(['invoice', invoiceId]);
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  return (
    <div>
      {/* Header with refresh */}
      <div className="flex items-center justify-between mb-6">
        <h1>Order #{invoice.documentNumber}</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Rest of page... */}
    </div>
  );
}
```

---

## Verification Checklist (Already Working)

The following are already correctly implemented:

### ✅ Client Signup → Admin Visibility
- [x] Client created in database during signup
- [x] Admin immediately sees new client in list
- [x] No hard-coded data

### ✅ Job Status Updates
- [x] Admin updates persist to database
- [x] Client queries fetch current status
- [x] No hard-coded status values in data layer
- [x] Activity logs track changes

### ✅ Service Layer Architecture
- [x] Both portals use same service functions
- [x] Single source of truth (database)
- [x] Proper authorization checks

**No changes needed** - Just verify with testing.

---

## Testing Plan

### File Access Control Testing
- [ ] **Admin Access**:
  - [ ] Admin can access all order files
  - [ ] Admin can access all attachments
  - [ ] No 403 errors for admin

- [ ] **Client Access**:
  - [ ] Client can access own order files
  - [ ] Client CANNOT access other clients' files (403 Forbidden)
  - [ ] Client can access own invoice attachments
  - [ ] Client CANNOT access other invoices' attachments (403)

- [ ] **Edge Cases**:
  - [ ] Unauthenticated request → 401
  - [ ] Invalid file ID → 400
  - [ ] Nonexistent file → 404

### Data Sync Verification
- [ ] **Admin → Client Flow**:
  - [ ] Admin updates job status to "PRINTING"
  - [ ] Client refreshes order page
  - [ ] Verify new status visible
  - [ ] Verify activity log shows change

- [ ] **Client Signup**:
  - [ ] Create new client account
  - [ ] Verify appears in admin client list immediately
  - [ ] Verify all client data visible to admin

### Optional Refresh UI
- [ ] "Last updated" timestamp shows
- [ ] Refresh button triggers refetch
- [ ] Spinner animates during refresh
- [ ] Timestamp updates after refresh

---

## Files Modified Summary

### Critical Changes (Must Implement)
- `/src/app/api/order-files/[id]/route.ts` - Add authorization
- `/src/server/services/order-files.ts` - Include clientId in DTO
- `/src/app/api/attachments/[id]/route.ts` - Add authorization

### Optional Changes (Nice to Have)
- `/src/app/(client)/client/orders/[id]/page.tsx` - Add refresh UI
- `/src/server/services/jobs.ts` - Implement email notifications (future)

### No Changes Needed (Already Works)
- `/src/server/services/auth.ts` - Signup flow
- `/src/server/services/jobs.ts` - Status update logic
- `/src/server/services/clients.ts` - Client queries
- All service layer architecture

---

## Estimated Effort

### Critical Path (Must Do)
- File access control: 1-2 hours
- Testing: 1 hour
- **Total**: 2-3 hours

### Optional Enhancements (Skip for Now)
- Real-time updates (socket.io): 6-8 hours
- Email notifications: 4-6 hours
- Refresh UI: 1-2 hours
- **Total Optional**: 11-16 hours

**Recommendation**: Implement critical path only. Add enhancements in future sprint if requested.

---

## Success Criteria

### Critical (Must Pass)
✅ Admin can access all files
✅ Client can only access own files
✅ 403 errors for unauthorized access
✅ No broken file downloads
✅ Activity logs working

### Verification (Already Working)
✅ Client signup visible to admin
✅ Job status updates persist
✅ Client sees updated status on refresh
✅ Service layer enforces authorization

### Optional (Future)
⏱️ Real-time status updates (socket.io or polling)
📧 Email notifications on status change
🔄 Client-side refresh UI

---

## Future Enhancements

### Phase 2 (Future Sprint)
- [ ] Implement polling for status updates (every 10 seconds)
- [ ] Add "Last updated" timestamp
- [ ] Add manual "Refresh" button
- [ ] Show loading indicator during refresh

### Phase 3 (Future Sprint)
- [ ] Integrate email service (SendGrid/Resend)
- [ ] Implement email templates
- [ ] Send notifications for significant status changes
- [ ] Respect client.notify_on_job_status preference
- [ ] Add email preview in admin

### Phase 4 (Future Sprint)
- [ ] Implement WebSocket/Socket.io for true real-time updates
- [ ] Add presence indicators ("Admin is viewing this job")
- [ ] Real-time notification badges
- [ ] Push notifications (browser API)
