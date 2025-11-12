# Phase 2: Side Effects & State Mutations Inventory

## 1. FILE OPERATIONS

### Storage Operations (Supabase)

**Bucket Operations:**
- `src/server/storage/supabase.ts` - Central file operations handler

**Write Operations:**
- `uploadInvoiceAttachment()` - Upload files to attachments bucket (upsert)
- `createTmpFile()` - Create temp files in tmp bucket with UUID paths
- `uploadOrderFile()` - Upload 3D models to order-files bucket

**Delete Operations:**
- `deleteInvoiceAttachment()` / `deleteInvoiceAttachments()` - Remove invoice attachments
- `deleteTmpFile()` / `deleteTmpFiles()` - Clean up temporary files
- `deleteOrderFile()` - Remove uploaded model files
- `deleteFromStorage()` / `deleteManyFromStorage()` - Generic deletion helpers

**Read Operations (No mutation but external I/O):**
- `listBucketObjects()` - Recursive bucket listing
- `downloadTmpFile()` / `downloadOrderFile()` - Stream file downloads
- `getAttachmentSignedUrl()` / `getTmpFileSignedUrl()` / `getOrderFileSignedUrl()` - Generate signed URLs

**Temp File Service:**
- `src/server/services/tmp-files.ts`
  - `saveTmpFile()` - File upload + DB insert (dual mutation)
  - `updateTmpFileMetadata()` - Update status/metadata (orientation, slicing results)
  - `deleteTmpFile()` - Remove from storage + DB
  - `requireTmpFile()` - Fetch with validation

### Upload Handler Side Effects:
- `src/app/api/quick-order/upload/route.ts`
  - Validates file size/type
  - Saves multiple files in loop
  - Returns file metadata

## 2. DATABASE MUTATIONS

### Core Mutation Patterns

**INSERT Operations:**
```
invoices.insert() - New invoices
quotes.insert() - New quotes
jobs.insert() - New job records
activity_logs.insert() - Activity tracking
credit_transactions.insert() - Credit ledger
webhook_events.insert() - Event idempotency
messages.insert() - User messages
tmp_files.insert() - Temp file metadata
order_files.insert() - Model file references
```

**UPDATE Operations:**
```
invoices.update() - Status, payment info, credits, attachments
quotes.update() - Status (draft/sent/accepted/declined), conversion
jobs.update() - Status (queued/printing/paused/completed), queue position
clients.update() - Payment terms, contact info, wallet balance
users.update() - Profile data, preferences
tmp_files.update() - Status, metadata (orientation, slicing)
activity_logs.update() - For corrections (rare)
```

**DELETE Operations:**
```
quotes.delete() - Quote removal (with cascade)
jobs.delete() - Job deletion (admin only)
tmp_files.delete() - Cleanup of temp metadata
```

### Critical Multi-step Mutations:

**Invoice Creation (src/server/services/invoices.ts):**
```
1. Check invoice doesn't exist
2. Insert invoice record
3. Insert line items
4. Insert activity log
5. Send email notification (async)
6. Save attachments (if provided)
7. Auto-create job (if policy enabled)
```
Risk: Partial success - line items inserted but email fails

**Quote Conversion to Invoice:**
```
1. Fetch quote with lines
2. Create invoice from quote
3. Update quote status
4. Create new invoice lines
5. Mark quote as converted
6. Create activity log
7. Send notification email
```
Risk: Quote marked converted but invoice creation fails

**Payment Processing (src/server/services/stripe.ts):**
```
1. Create Stripe checkout session
2. Update invoice with session ID/URL
3. Log activity (best-effort, may fail)
4. On webhook: Check idempotency
5. Mark invoice paid
6. Update stripe session fields to null
7. Log activity (best-effort)
8. Record webhook event (idempotency marker)
```
Risk: Invoice marked paid without webhook event recorded; duplicate processing possible

**Credit Application (src/server/services/credits.ts):**
```
1. Fetch invoice + client wallet
2. Call RPC add_client_credit() with row locking
3. Deduct credit via RPC deduct_client_credit()
4. Update invoice balance_due & status
5. May auto-mark as PAID if balance <= 0
```
Uses RPC with atomic locking to prevent race conditions

**Job Status Updates:**
```
1. Update job status
2. Check auto-detach policy
3. Update invoice if job complete
4. Send client notification email
5. Log activity
```

### RPC Functions (Database-side mutations):
- `add_client_credit()` - Add credit with atomic balance update
- `deduct_client_credit()` - Deduct with insufficient balance check
- Row-level locking for credit operations

## 3. EXTERNAL API SIDE EFFECTS

### Stripe Integration (src/server/services/stripe.ts)

**Create Operations:**
- `stripe.checkout.sessions.create()` - Creates payment session
- Returns session URL & session ID
- Stores in invoice.stripe_session_id & stripe_checkout_url

**Event Processing:**
- `handleStripeEvent()` webhook handler
- `checkout.session.completed` event triggers:
  - `markInvoicePaid()` - Updates DB
  - Idempotency check (webhook_events table)
  - May process same event multiple times without side effects

**Configuration:**
- Caches Stripe client instance (`cachedStripe`)
- Caches config (`cachedConfig`)

**Failures Not Handled Atomically:**
- Session created but DB update fails = orphaned session
- Webhook processed but event not recorded = duplicate processing possible
- Activity logs are best-effort (non-blocking)

### Email Service (src/server/services/email.ts)

**Send Methods:**
- `sendQuoteSent()` - Quote notification
- `sendInvoiceCreated()` - Invoice notification
- `sendPaymentConfirmation()` - Payment received
- `sendJobStatusUpdate()` - Job status notification
- `sendWelcome()` - Signup welcome
- `sendQuoteAccepted()` / `sendQuoteDeclined()` - Quote response

**Retry Logic:**
- Exponential backoff (2^attempt * 1000ms)
- 3 retry attempts
- Skips retries on 4xx errors

**Conditional Behaviors:**
- Development: Redirects to `delivered@resend.dev`
- Disabled: Returns success=false if `settings.enableEmailSend=false`
- Templates: Loaded from settings with defaults

**Non-blocking:**
- Email failures don't rollback DB operations
- Logged but don't throw (returns {success: false})

## 4. CLIENT-SIDE STATE MANAGEMENT

### Zustand Store (src/stores/orientation-store.ts)

**State Mutations:**
- `setOrientation()` - Quaternion + position update
- `setOverhangData()` - Support analysis results
- `toggleSupports()` - Support enable/disable
- `setSupportsEnabled()` - Set support state explicitly
- `setAnalysisStatus()` - Overhang analysis status
- `setAutoOrientStatus()` - Auto-orient operation status
- `setInteractionLock()` - Disable user interaction
- `addWarning()` - Append warning message
- `clearWarnings()` - Reset warnings
- `reset()` - Restore initial state

**Persistence:**
- Uses `sessionStorage` (not localStorage)
- Key: `quickprint-orientation`
- Adapter has error handling (logs to browser logger)
- Manual clearing via `clearOrientationPersistence()`

**Browser API Access:**
- `window.sessionStorage.getItem()`
- `window.sessionStorage.setItem()`
- `window.sessionStorage.removeItem()`

**Selectors (derived state):**
- `useOrientation()` - quaternion, position, isAutoOriented
- `useSupports()` - Support configuration & analysis state

### React Hooks Patterns:

**Invoice Editor (src/components/invoices/invoice-editor.tsx):**
- `useForm()` + `useFieldArray()` - Form state management
- `useMutation()` - API call state
- `useQueryClient()` - Query cache invalidation
- `useRouter()` - Navigation (side effect)
- `useMemo()` - Calculated totals

**Query Client Effects:**
- Mutations invalidate queryClient cache on success
- No explicit cache clearing (relies on invalidation)

## 5. BROWSER API USAGE

### Session Storage:
- Orientation store persistence (quickprint-orientation)
- Try/catch blocks around storage operations

### WebGL/3D Context:
- `src/hooks/use-webgl-context.ts` - WebGL context management
- Model viewer creates/manages GL state

### File Operations (Client-side):
- File upload via FormData
- ArrayBuffer conversion for storage

### No Found:
- No localStorage usage (only sessionStorage)
- No localStorage persistence for critical data
- No cookie manipulation (handled in API routes)

## 6. ASYNC OPERATIONS & TIMING

### Exponential Backoff:
- Email service: `Math.pow(2, attempt) * 1000` ms delays
- Waits between retry attempts

### Promise Handling:

**Sequential Async (await chains):**
```typescript
// Invoice creation awaits all steps
await uploadToStorage()
await insertInvoiceRecord()
await insertLineItems()
await sendEmail() // May fail silently
await saveAttachments()
```

**Parallel Async:**
```typescript
// Cache revalidation (best-effort)
await Promise.all([
  revalidatePath("/invoices"),
  revalidatePath("/jobs"),
  revalidatePath("/clients"),
  revalidatePath("/client/orders"),
]).catch(() => {})
```

**Fire-and-forget (logged but not awaited):**
- Activity log insertions after invoice creation
- Email sends (may be awaited but errors don't block)

### Polling/Intervals:
- Not found in examined code
- Client-side appears to use React Query for data fetching

### Caching:
- Settings cache: `cachedSettings` with 60s TTL
- Stripe client instance cache: `cachedStripe` (reused per config)
- Next.js cache revalidation for paths

## 7. GLOBAL STATE & SINGLETONS

### Service Singletons:
- `emailService` - Singleton with class instance
  - Single Resend client per API key
  - Stateless except for configuration

- `stripe` client caching
  - Stored in module-level variables
  - Reinitialized if key changes

### Session/Auth Context:
- Auth stored in Supabase (not in-memory)
- User retrieved per request via headers
- Cookies managed by Next.js session

### Database Connections:
- Supabase client initialized per request
- No connection pooling concerns (managed by Supabase)

### No Found:
- Redux or Context API usage
- In-memory caches (except Stripe/settings)
- Worker threads or background jobs

## Test Isolation Strategies Needed

### 1. File Operations Isolation
**Concern:** Temp files persist across tests

**Strategy:**
```typescript
// Mock storage functions
jest.mock('@/server/storage/supabase')

// Or use isolated buckets per test
beforeEach(() => {
  testBucketSuffix = `test-${Date.now()}-${Math.random()}`
})

// Cleanup
afterEach(async () => {
  await cleanupTestBucket(testBucketSuffix)
})
```

### 2. Database Isolation
**Concern:** Test mutations persist; foreign key conflicts

**Strategy:**
```typescript
// Use transactions with rollback
const transaction = supabase.rpc('begin_transaction')
try {
  // Run test
} finally {
  await supabase.rpc('rollback_transaction')
}

// Or use test-specific user/invoice IDs
beforeEach(() => {
  testInvoiceId = generateTestId()
})

// Or mock supabase entirely for unit tests
jest.mock('@/server/supabase/service-client')
```

### 3. Email Service Isolation
**Concern:** Emails sent to real addresses; Resend API quota

**Strategy:**
```typescript
// Mock emailService
jest.mock('@/server/services/email', () => ({
  emailService: {
    send: jest.fn().mockResolvedValue({success: true})
  }
}))

// Or use development redirect (already implemented)
// process.env.NODE_ENV = 'test' => uses delivered@resend.dev
```

### 4. Stripe Webhook Idempotency
**Concern:** Webhook events may be replayed

**Strategy:**
```typescript
// Mock webhook_events table check
jest.mock('@/server/supabase/service-client', () => ({
  from: (table) => ({
    select: jest.fn().mockResolvedValue({
      data: null // Simulate first time processing
    })
  })
}))

// Or use test event IDs that don't collide
beforeEach(() => {
  testEventId = `evt_test_${Date.now()}`
})
```

### 5. State Management Isolation
**Concern:** Zustand store persists across test runs

**Strategy:**
```typescript
// Reset store before each test
beforeEach(() => {
  const store = useOrientationStore.getState()
  store.reset()
  clearOrientationPersistence()
})

// Or mock sessionStorage
jest.mock('sessionStorage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}))
```

### 6. Next.js Cache Isolation
**Concern:** revalidatePath() affects live app caches

**Strategy:**
```typescript
// Mock revalidatePath in tests
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn()
}))

// Verify calls without actual revalidation
expect(revalidatePath).toHaveBeenCalledWith('/invoices')
```

### 7. Async/Timing Issues
**Concern:** Retry loops, exponential backoff, timing dependencies

**Strategy:**
```typescript
// Use fake timers for email retries
jest.useFakeTimers()

// Control time advancement
jest.advanceTimersByTime(2000) // First retry delay
await expect(emailPromise).toResolve()

jest.useRealTimers()
```

### 8. Stripe Client Caching
**Concern:** Cached Stripe instance may differ between tests

**Strategy:**
```typescript
// Clear cache before tests
beforeEach(() => {
  jest.resetModules()
  delete require.cache[require.resolve('@/server/services/stripe')]
})

// Or mock getStripeEnvironment
jest.mock('@/server/services/stripe', () => ({
  getStripeEnvironment: jest.fn().mockResolvedValue({
    stripe: mockStripeClient,
    currency: 'AUD',
    successUrl: 'http://test/success',
    cancelUrl: 'http://test/cancel',
    webhookSecret: null
  })
}))
```

## High-Risk Mutation Patterns

### Race Conditions:
1. **Credit deduction** - Mitigated by RPC row locking
2. **Invoice status updates** - No locking; multiple concurrent updates possible
3. **Job queue position** - No locking; concurrent reorder may corrupt state

### Orphaned Resources:
1. **Stripe session created, DB update fails** - Session unreachable
2. **File uploaded, metadata insert fails** - Orphaned storage objects
3. **Invoice created, activity log fails** - Incomplete audit trail

### Inconsistent State:
1. **Quote converted but marked as sent** - May send twice
2. **Payment processed but email fails** - Client unaware
3. **Job completed but invoice not updated** - Discrepancy

### Notification Gaps:
1. **Email failures are non-blocking** - Client may not receive notification
2. **Activity logs are best-effort** - Audit trail incomplete
3. **Webhook events may not be recorded** - Duplicate processing

## Summary: Side Effects Requiring Test Isolation

| Category | Risk Level | Isolation Method |
|----------|------------|------------------|
| File operations | HIGH | Mock storage, cleanup per test |
| DB mutations | CRITICAL | Transactions/rollback, test IDs |
| Email sends | MEDIUM | Mock service, dev redirect |
| Stripe webhooks | MEDIUM | Mock idempotency check |
| State persistence | LOW | Reset store, mock storage |
| Cache invalidation | LOW | Mock revalidatePath |
| Async retries | LOW | Fake timers |
| Stripe client cache | LOW | Module reset/mock |

Total identified mutation points: **50+**
Core services requiring isolation: **8**
Test fixtures needed: Mock DB, mock storage, mock email, mock Stripe
