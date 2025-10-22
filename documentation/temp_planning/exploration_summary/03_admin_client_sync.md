# Issue 3: Admin-Client Data Synchronization - Exploration Summary

## Problem Statement
Ensure proper data synchronization between admin and client portals, particularly for:
1. Client account visibility in admin after signup
2. Order files visibility to admin
3. Real-time job/order status updates from admin to client view

## Finding #1: Client Signup → Admin Visibility

### Current Flow ✅ WORKS CORRECTLY

**Signup Process**:
```
User registers at /signup
  ↓
POST /api/auth/signup
  ↓
signupClient() in /src/server/services/auth.ts
  ↓
Creates in transaction:
  1. Auth user (Supabase Auth)
  2. Client record (clients table)
  3. User profile (users table, role='CLIENT', client_id=X)
  ↓
Client immediately visible in database
```

**Admin Visibility**:
```
Admin accesses /admin/clients
  ↓
listClients() service queries: SELECT * FROM clients
  ↓
NEW CLIENT APPEARS IMMEDIATELY
```

**Status**: ✅ **No issues** - Shared database table ensures instant visibility

**Files**:
- `/src/app/api/auth/signup/route.ts`
- `/src/server/services/auth.ts`
- `/src/app/(admin)/clients/page.tsx`
- `/src/server/services/clients.ts`

## Finding #2: Order Files Visibility

### Current Implementation

**File Upload**:
```
Client uploads via quick order or invoice
  ↓
saveOrderFile() creates record:
  { invoice_id, quote_id, client_id, filename, storage_key }
  ↓
Stored in 'order-files' bucket (Supabase Storage)
```

**Admin Access**:
```
Admin views invoice detail
  ↓
getInvoiceDetail(id) returns attachments array
  ↓
Files accessible via /api/attachments/[id]
```

### Access Control Gap ⚠️

**Current State**:
- Files queryable by `invoice_id` or `quote_id`
- Service layer doesn't explicitly check `client_id` ownership
- RLS policies may not be sufficient

**Issue**: `/api/order-files/[id]/route.ts` may lack proper authorization
- Should verify: `(user.role === 'ADMIN') OR (file.client_id === user.clientId)`

**Files**:
- `/src/server/services/order-files.ts`
- `/src/app/api/order-files/[id]/route.ts`
- `/src/app/(admin)/invoices/[id]/page.tsx`

## Finding #3: Order Status Synchronization (CRITICAL)

### Status Update Flow

**Admin Updates Status**:
```
Admin: POST /api/jobs/{id}/status
  { status: "PRINTING", note?: "..." }
  ↓
requireAdmin() validates
  ↓
updateJobStatus(id, status, note)
  ↓
Updates jobs table:
  - Sets status field
  - Updates timing fields (started_at, completed_at, etc.)
  - Records activity log
  - Calls maybeNotifyJobStatusChange() [email - not implemented]
  ↓
Database updated with new status
```

**Client Views Status**:
```
Client visits /client/orders/{invoiceId}
  ↓
getInvoiceDetail(invoiceId)
  ↓
Query: SELECT * FROM invoices
  INCLUDES: jobs(*, printers(name))
  ↓
Returns jobs with CURRENT STATUS from DB
  ↓
Client renders status flow timeline
```

### Status Synchronization Analysis

**Mechanism**: ✅ **Dynamic Database-Driven**
- Admin updates persist to `jobs` table immediately
- Client queries same table on page load
- No hard-coded statuses in data layer
- Status values sourced from database enum types

**UI Implementation**:
```typescript
// /src/app/(client)/client/orders/[id]/page.tsx

const JOB_STATUS_FLOW: JobStatus[] = [
  "PRE_PROCESSING", "IN_QUEUE", "PRINTING",
  "PRINTING_COMPLETE", "POST_PROCESSING",
  "PACKAGING", "OUT_FOR_DELIVERY", "COMPLETED"
];

function canonicalizeStatus(status: JobStatus): JobStatus {
  switch (status) {
    case "QUEUED": return "IN_QUEUE";  // UI mapping
    case "PAUSED": return "PRINTING";   // UI mapping
    default: return status;
  }
}
```

**Analysis**: This is NOT a hard-coding issue because:
- Flow array is for UI display order only
- Actual `job.status` comes from database dynamically
- Canonicalization is for UI consistency (collapsing similar states)
- TypeScript types imported from `/src/lib/constants/enums.ts`

### Real-Time Status Update Status

**Current**: ⚠️ **Dynamic but NOT Real-Time**
- ✅ Status updates persist to database immediately
- ✅ Activity logs track all changes
- ✅ Client sees updated status ON PAGE REFRESH
- ❌ No WebSocket or polling for instant updates
- ❌ No push notifications to client

**Implementation Details**:
- Page rendered server-side (`dynamic = "force-dynamic"`)
- Each page visit fetches fresh data from DB
- Client must manually refresh to see changes

### Missing Real-Time Features

1. **No Live Updates**
   - Client doesn't see status changes until refresh
   - No socket.io or Server-Sent Events
   - No polling mechanism

2. **No Email Notifications**
   - `maybeNotifyJobStatusChange()` is placeholder only
   - Line 866 in `jobs.ts`: `// Future: integrate email delivery`
   - Client not alerted when status changes

3. **No Client-Side Refresh Indicator**
   - No "Last updated: X minutes ago" display
   - No auto-refresh at intervals
   - No manual "Refresh" button

## Service Layer Architecture (Shared Data Model)

### Pattern ✅ Correct Implementation

```
Admin Portal              Client Portal
      ↓                         ↓
  requireAdmin()           requireAuth() + clientId check
      ↓                         ↓
      API Routes (/src/app/api)
            ↓
    SHARED Service Layer (/src/server/services)
            ↓
    getServiceSupabase() (service role)
            ↓
        DATABASE (Single Source of Truth)
```

**Key Services**:
- `getClientDetail()` - Used by both admin and client (filtered)
- `getInvoiceDetail()` - Shared with ownership checks
- `listJobs()` - Admin sees all, client sees own
- `updateJobStatus()` - Admin only, updates shared tables

### Database Tables (Shared)
- `clients` - Visible to both (client sees own, admin sees all)
- `invoices` - Linked via `client_id`
- `jobs` - Linked via `invoice_id` → `client_id`
- `activity_logs` - Tracks all changes
- `order_files` - Linked via `invoice_id`, `quote_id`, `client_id`

## Current Implementation Status Summary

### ✅ Works Correctly
1. Client signup → admin visibility (instant)
2. Admin can view client details with full history
3. Job status updates persist to database
4. Activity logs track all changes with metadata
5. Client can view updated job status (on refresh)
6. Database constraints prevent invalid data
7. Service layer ensures consistent logic for both portals

### ⚠️ Gaps & Missing Features
1. **Real-Time Sync**: No WebSocket/polling for instant client updates
2. **Email Notifications**: Placeholder only, not implemented
3. **Order File Access Control**: Weak authorization at API route level
4. **Client Job Listing**: Uses invoices, not direct job queries
5. **No Status Change Alerts**: Clients not notified of updates

## Data Flow Diagrams

### Job Status Update Flow
```
Admin Updates
  ├─ POST /jobs/{id}/status
  ├─ UPDATE jobs SET status=?, started_at=?, ...
  ├─ INSERT activity_logs
  └─ Database updated ✓

Client Page Refresh (manual)
  ├─ GET /client/orders/{invoiceId}
  ├─ SELECT invoices WITH jobs
  └─ Render with current status ✓

Missing: Real-time notification to client
```

## Priority Gaps to Address

### Priority 1: File Access Control
Add authorization check in `/api/order-files/[id]/route.ts`:
```typescript
const file = await getOrderFile(id);
if (user.role !== 'ADMIN' && file.client_id !== user.clientId) {
  throw new ForbiddenError('Access denied');
}
```

### Priority 2: Real-Time Status Updates
Options:
1. **Socket.io**: Broadcast when admin updates status
2. **Polling**: Client polls every 5-10 seconds
3. **Server-Sent Events**: One-way push from server

### Priority 3: Email Notifications
- Implement email send in `maybeNotifyJobStatusChange()`
- Respect `client.notify_on_job_status` preference

### Priority 4: Client-Side Refresh
- Add "Last updated" timestamp
- Add manual "Refresh" button
- Optional: Auto-refresh at intervals

## Files Referenced
- `/src/app/api/auth/signup/route.ts`
- `/src/server/services/auth.ts`
- `/src/server/services/jobs.ts` (updateJobStatus, lines 561-672)
- `/src/app/(client)/client/orders/[id]/page.tsx`
- `/src/app/(admin)/clients/page.tsx`
- `/src/server/services/clients.ts`
- `/src/server/services/order-files.ts`
- `/src/app/api/jobs/[id]/status/route.ts`
- `/src/lib/constants/enums.ts`

## Estimated Implementation Effort
- File access control fix: 1-2 hours
- Real-time updates (socket.io): 6-8 hours
- Email notifications: 4-6 hours
- Client refresh UI: 1-2 hours
- **Total**: 12-18 hours for complete sync features
