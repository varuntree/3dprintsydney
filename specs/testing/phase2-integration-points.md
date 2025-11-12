# Phase 2: Integration Points Catalog

**Date:** 2025-11-12  
**Thoroughness:** Very thorough  
**Purpose:** Identify all external integration points requiring mocking/stubbing for testing

---

## 1. Supabase Integration

### Location
- **Client (Browser):** `src/lib/supabase/browser.ts`
- **Server (SSR):** `src/lib/supabase/server.ts`
- **Service Client:** `src/server/supabase/service-client.ts`
- **Storage:** `src/server/storage/supabase.ts`

### Usage Patterns

#### Authentication (Supabase Auth)
- User sign-up, login, logout via `@supabase/supabase-js`
- Session management with cookie-based persistence
- Token refresh flow (access + refresh token cookies)
- User profile loading from `users` table
- Files: `src/server/auth/session.ts`, `src/app/api/auth/*`

#### Database Operations (PostgreSQL via Supabase PostgREST)
- **Core Tables:**
  - `invoices` - invoice records with Stripe session tracking
  - `quotes` - quote documents
  - `jobs` - 3D printing jobs
  - `clients` - client profiles
  - `users` - user accounts & permissions
  - `tmp_files` - temporary file metadata
  - `order_files` - permanent 3D model storage metadata
  - `activity_logs` - action audit trails
  - `webhook_events` - Stripe webhook idempotency
  - `payments` - payment records
  - `messages`, `conversations` - messaging system
  - `materials`, `printers`, `product_templates` - inventory

- **Operations:** select, insert, update, delete with RLS policies
- **Schema:** Dynamic column detection (`orientation_data` column)
- **Files:** 
  - `src/server/services/*.ts` (20+ service files)
  - `src/app/api/**/*.ts` (80+ route handlers)

#### Storage (Supabase Storage - S3-like)
- **Buckets:**
  - `tmp` - temporary uploaded files (STL, gcode)
  - `attachments` - invoice/quote attachments
  - `order-files` - permanent client 3D models

- **Operations:**
  - Upload with `upload()` and `upsert: true/false`
  - Download with `download()` returning Blob
  - Delete with `remove([paths])`
  - Signed URLs with `createSignedUrl(path, expiresIn)`
  - List with pagination

- **Files:** `src/server/storage/supabase.ts`

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

### Mock/Stub Requirements
- [ ] Mock `createClient()` from `@supabase/supabase-js`
- [ ] Mock `createServerClient()` from `@supabase/ssr`
- [ ] Mock `createBrowserClient()` from `@supabase/ssr`
- [ ] Stub database queries (select, insert, update, delete)
- [ ] Stub storage operations (upload, download, delete, signed URLs)
- [ ] Stub auth operations (getUser, refreshSession)
- [ ] Mock RLS policies enforcement

---

## 2. Stripe Payment Processing

### Location
- **Service:** `src/server/services/stripe.ts`
- **Webhook:** `src/app/api/stripe/webhook/route.ts`
- **Routes:** `src/app/api/invoices/[id]/stripe-session/*`
- **Components:** `src/components/invoices/invoice-view.tsx`

### Usage Patterns

#### Stripe Client Initialization
```typescript
import Stripe from "stripe";
const stripe = new Stripe(secretKey);
```

#### Payment Session Creation
- `stripe.checkout.sessions.create()`
- Parameters: line items, metadata (invoiceId), success/cancel URLs
- Returns: session object with checkout URL
- Cached in invoice record: `stripe_session_id`, `stripe_checkout_url`

#### Webhook Event Processing
- Event type: `checkout.session.completed`
- Signature verification: `stripe.webhooks.constructEvent()`
- Idempotency check via `webhook_events` table
- Payment recording: calls `markInvoicePaid()` service
- Activity logging to audit trail

#### Invoice Payment Flow
1. Create Stripe session → store URL in database
2. Client redirected to Stripe checkout
3. Webhook notifies on completion
4. Mark invoice as PAID with payment metadata
5. Clear Stripe session fields

### Environment Variables
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=https://domain.com/payment/success
STRIPE_CANCEL_URL=https://domain.com/payment/cancel
STRIPE_CURRENCY=AUD
```

### Mock/Stub Requirements
- [ ] Mock Stripe SDK initialization
- [ ] Stub `checkout.sessions.create()` → return mock session with URL
- [ ] Stub `webhooks.constructEvent()` → verify signature
- [ ] Mock webhook event responses
- [ ] Stub Stripe metadata handling
- [ ] Mock session completion flow
- [ ] Prevent real API calls in tests

---

## 3. Resend Email Service

### Location
- **Service:** `src/server/services/email.ts`
- **Templates:** `emails/templates/*.tsx` (7 templates)
- **Webhook:** `src/app/api/webhooks/resend/route.ts`

### Usage Patterns

#### Email Client Initialization
```typescript
import { Resend } from 'resend';
const resend = new Resend(apiKey);
```

#### Email Sending
- Template types:
  - `quote_sent` - Quote notification to client
  - `invoice_created` - Invoice notification
  - `payment_confirmation` - Payment receipt
  - `job_status` - Job status updates
  - `welcome` - Welcome to new client
  - `quote_accepted` - Admin notification of acceptance
  - `quote_declined` - Admin notification of decline

- Rendering: `@react-email/components` render HTML
- Retry logic: 3 attempts with exponential backoff (2s, 4s)
- Development: Redirects to `delivered@resend.dev`
- Variable substitution: Template placeholders like `{{invoiceNumber}}`

#### Email Settings Handling
- Fetch from database: `getSettings()`
- Custom email templates per type
- Default templates fallback
- Email sending can be disabled: `settings.enableEmailSend`

### Environment Variables
```env
RESEND_API_KEY=[api-key]
EMAIL_FROM_ADDRESS=noreply@3dprintsydney.com
```

### Mock/Stub Requirements
- [ ] Mock `Resend` class initialization
- [ ] Stub `resend.emails.send()` → return success response
- [ ] Mock HTML rendering via `@react-email/render`
- [ ] Stub email template retrieval from settings
- [ ] Mock retry logic behavior
- [ ] Capture sent email metadata (to, subject, html)
- [ ] Mock template variables substitution

---

## 4. File System Operations

### Location
- **Slicer Runner:** `src/server/slicer/runner.ts`
- **Tmp Files:** `src/server/services/tmp-files.ts`
- **Quick Order:** `src/server/services/quick-order.ts`

### Usage Patterns

#### Direct File I/O (`fs` module)
- `promises.readFile()` - Read file contents
- `promises.writeFile()` - Write file (temp gcode output)
- Path manipulation: `path.join()`, `path.dirname()`, `path.basename()`
- Temp directory: `os.tmpdir()` for slicer work

#### File Operations
1. Upload STL → temp storage
2. Slicer CLI invocation → reads STL, writes gcode
3. Parse gcode for metrics (time, weight, support weight)
4. Move to permanent storage
5. Cleanup temp files

#### Slicer CLI Invocation
- Binary: `prusaslicer` or `slic3r` (configurable)
- Subprocess: `spawn()` with args for layer height, infill, supports
- Output: gcode file in same directory as input
- Timeout: Configurable (default 120s)
- Fallback: When disabled/fails, use estimate metrics

### Environment Variables
```env
SLICER_BIN=prusaslicer
SLICER_DISABLE=0
SLICER_CONCURRENCY=1
SLICER_TIMEOUT_MS=120000
```

### Mock/Stub Requirements
- [ ] Mock `fs.promises` module
- [ ] Stub file read/write operations
- [ ] Mock `spawn()` child process
- [ ] Stub slicer CLI output parsing
- [ ] Mock gcode file generation
- [ ] Stub temp directory creation/cleanup
- [ ] Prevent real file system access

---

## 5. 3D Processing & Geometry

### Location
- **Geometry:** `src/server/geometry/load-geometry.ts`
- **Orientation:** `src/server/geometry/orient.ts`
- **STL Loader:** `src/server/geometry/load-geometry.ts`
- **Overhang Detection:** `src/lib/3d/overhang-detector.ts`
- **Worker:** `src/workers/overhang-worker.ts`

### Usage Patterns

#### Three.js Server-Side
```typescript
import { BufferGeometry, Float32BufferAttribute, Mesh, Quaternion } from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
```

#### STL File Processing
1. **Parse STL (Binary & ASCII)**
   - Binary: Read face count, vertex positions as floats
   - ASCII: Regex parse vertex coordinates
   - Return `BufferGeometry` with positions + computed normals

2. **Apply Orientation**
   - Load geometry from STL buffer
   - Create mesh with loaded geometry
   - Apply quaternion rotation (from client)
   - Apply position transformation
   - Export back to STL binary format

3. **Overhang Detection (Web Worker)**
   - Receive: positions, index, quaternion, threshold
   - Detect faces exceeding angle threshold
   - Calculate support volume & weight
   - Return face indices + metrics

#### Three.js Rendering (Client)
- `ModelViewer.tsx` - Displays 3D models
- `RotationControls.tsx` - User orientation
- `BuildPlate.tsx` - Build platform visualization
- `@react-three/fiber` - React Three.js wrapper
- `@react-three/drei` - Prebuilt 3D controls

### Mock/Stub Requirements
- [ ] Mock Three.js geometry classes
- [ ] Stub BufferGeometry creation
- [ ] Mock STL parsing (binary & ASCII)
- [ ] Stub STLExporter parse() method
- [ ] Mock geometry transformations (rotation, position)
- [ ] Stub overhang worker communication
- [ ] Mock Web Worker postMessage/onmessage

---

## 6. Database Transaction Isolation

### Current Patterns
- No explicit transaction handling in codebase
- Multiple sequential database calls without atomicity
- Potential race conditions in:
  - Invoice payment + activity logging
  - Quote acceptance/decline state changes
  - Job status transitions with notifications

### Files Requiring Review
- `src/server/services/invoices.ts` - Payment marking
- `src/server/services/quotes.ts` - State transitions
- `src/server/services/quick-order.ts` - Order creation
- `src/server/services/jobs.ts` - Status updates

### Mock/Stub Requirements
- [ ] Isolate database mocks per test
- [ ] Mock transaction boundaries if implemented
- [ ] Stub rollback behavior
- [ ] Verify idempotency of operations

---

## 7. Authentication & Session Management

### Location
- **Session:** `src/server/auth/session.ts`
- **API Helpers:** `src/server/auth/api-helpers.ts`
- **Permissions:** `src/server/auth/permissions.ts`

### Usage Patterns

#### Session Flow
1. Extract cookies: `sb:token` (access), `sb:refresh-token` (refresh)
2. Verify access token with Supabase auth: `getUser(accessToken)`
3. If expired, refresh: `refreshSession(refreshToken)`
4. Load user profile from `users` table
5. Calculate student discount from email
6. Return user with metadata

#### Auth Guards
- `requireAuth(req)` - Any authenticated user
- `requireAdmin(req)` - Admin role only
- `requireClient(req)` - Client role only
- `requireClientWithId(req)` - Client with associated clientId

#### Cookie Management
- Set/get from Next.js cookie store
- Context-aware (route handlers vs server components)
- Graceful handling when cookies read-only

### Mock/Stub Requirements
- [ ] Mock Supabase auth methods
- [ ] Stub user profile loading
- [ ] Mock student discount calculation
- [ ] Stub cookie operations
- [ ] Mock session refresh
- [ ] Stub role/permission checks

---

## 8. Environment Variables & Configuration

### Configuration Files
- `.env.example` - Template with all variables
- `.env` - Local development
- `.env.production` - Production (Vercel)
- `vitest.config.ts` - Test configuration

### Categories

#### Supabase
- `NEXT_PUBLIC_SUPABASE_URL` - Project endpoint
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Browser client key
- `SUPABASE_SERVICE_ROLE_KEY` - Server-only admin key

#### Stripe
- `STRIPE_SECRET_KEY` - API key (test/live)
- `STRIPE_WEBHOOK_SECRET` - Webhook signature verification
- `STRIPE_SUCCESS_URL` - Post-payment redirect
- `STRIPE_CANCEL_URL` - Cancellation redirect
- `STRIPE_CURRENCY` - Currency code (default: AUD)

#### Email
- `RESEND_API_KEY` - API key for Resend
- `EMAIL_FROM_ADDRESS` - Sender email

#### 3D Slicing
- `SLICER_BIN` - Path to slicer binary (prusaslicer/slic3r)
- `SLICER_DISABLE` - Disable slicing (use estimates)
- `SLICER_CONCURRENCY` - Parallel jobs (1-4)
- `SLICER_TIMEOUT_MS` - Timeout duration

#### Application
- `NEXT_PUBLIC_APP_URL` - Application base URL
- `NODE_ENV` - Environment (development/production)
- `VERCEL_URL` - Vercel deployment URL

### Mock/Stub Requirements
- [ ] Mock `process.env` access
- [ ] Provide test environment variables
- [ ] Test with missing required variables
- [ ] Test with invalid/malformed values
- [ ] Isolate test env from system env

---

## 9. External API Dependencies Summary

### External Services
| Service | Purpose | Auth | Endpoint |
|---------|---------|------|----------|
| **Supabase** | Database, Auth, Storage | API Keys | HTTPS REST |
| **Stripe** | Payment Processing | Secret Key | HTTPS API |
| **Resend** | Email Delivery | API Key | HTTPS API |
| **PrusaSlicer/Slic3r** | 3D Model Slicing | None | CLI Subprocess |

### Third-Party Libraries
| Library | Purpose | Type |
|---------|---------|------|
| `@supabase/supabase-js` | Database client | NPM |
| `stripe` | Payment SDK | NPM |
| `resend` | Email SDK | NPM |
| `three` | 3D graphics | NPM |
| `@react-three/fiber` | React 3D | NPM |
| `@react-email/components` | Email rendering | NPM |

---

## 10. Request/Response Patterns

### API Routes Using External APIs
```
POST /api/invoices/[id]/stripe-session
  → Stripe: checkout.sessions.create()
  → Supabase: invoices.update(), activity_logs.insert()

POST /api/stripe/webhook
  → Stripe: webhooks.constructEvent()
  → Supabase: webhook_events.select/insert, invoices.update()

POST /api/quick-order/price
  → Supabase: materials, shipping configs
  → Local: Pricing calculations

POST /api/quick-order/upload
  → Supabase Storage: tmp bucket upload
  → Supabase DB: tmp_files.insert()

POST /api/quick-order/orient
  → Supabase Storage: tmp file download
  → Geometry: STL parsing, orientation
  → Supabase Storage: save oriented STL
  → Supabase DB: tmp_files.update()

POST /api/quick-order/analyze-supports
  → Web Worker: Overhang detection
  → Return: face indices, metrics

POST /api/quick-order/checkout
  → Supabase: Create invoice
  → Supabase Storage: Attach STL files
  → Stripe: Create checkout session
```

---

## 11. Testing Strategy by Integration

### Phase 2 Focus: Unit & Integration Tests

#### Supabase Mocking
```typescript
// Mock pattern
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}));
```

**Tests to create:**
- User authentication flow
- Payment marking (invoice + activity log)
- Email sending with disabled flag
- File upload/download cycle
- RLS policy verification (conceptual)

#### Stripe Mocking
```typescript
// Mock pattern
vi.mock('stripe', () => ({
  default: vi.fn(() => mockStripeClient)
}));
```

**Tests to create:**
- Checkout session creation
- Webhook event parsing
- Payment metadata handling
- Idempotency checking

#### Resend Mocking
```typescript
// Mock pattern
vi.mock('resend', () => ({
  Resend: vi.fn(() => mockResendClient)
}));
```

**Tests to create:**
- Email template rendering
- Retry logic (exponential backoff)
- Template variable substitution
- Disabled sending handling

#### File System Mocking
```typescript
// Mock pattern
vi.mock('fs', () => ({
  promises: mockFsPromises
}));
vi.mock('child_process', () => ({
  spawn: vi.fn()
}));
```

**Tests to create:**
- STL file parsing (binary & ASCII)
- Slicer CLI invocation
- Gcode metric parsing
- Error handling & fallback

#### 3D Geometry Mocking
```typescript
// Mock pattern
vi.mock('three', () => ({
  BufferGeometry: vi.fn(),
  Mesh: vi.fn(),
  // ... other Three.js classes
}));
```

**Tests to create:**
- STL parsing accuracy
- Geometry transformation
- Overhang detection algorithm
- Orientation quaternion application

---

## 12. Configuration for Testing

### Vitest Setup
```typescript
// vitest.config.ts includes:
- Alias resolution (vite-tsconfig-paths)
- Environment: node
- Coverage: v8 (if used)
```

### Test Environment Variables
```env
# Required for tests
NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-key
SUPABASE_SERVICE_ROLE_KEY=test-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
RESEND_API_KEY=test-key
NODE_ENV=test
```

### Mock Data Fixtures
- [ ] Create sample STL files (binary & ASCII)
- [ ] Create Stripe webhook event fixtures
- [ ] Create email template samples
- [ ] Create invoice/quote test data

---

## 13. Integration Points NOT Yet Identified

### Potential External Services (Code Review Needed)
- [ ] AWS S3 (if used beyond Supabase Storage)
- [ ] SendGrid/Mailgun (email alternative)
- [ ] Twilio/SMS (if used for notifications)
- [ ] Analytics (Google Analytics, Mixpanel)
- [ ] Error tracking (Sentry, LogRocket)
- [ ] PDF generation libraries (if used beyond data.ts)

### Check Files:
- `package.json` - Dependency audit
- `src/lib/logger.ts` - Logging infrastructure
- `src/lib/http.ts` - HTTP client setup
- Middleware configuration

---

## 14. Summary: Mocking Checklist

### High Priority (Core Business Logic)
- [ ] Supabase client initialization
- [ ] Stripe session creation & webhook handling
- [ ] Resend email service
- [ ] File system operations
- [ ] Session/Auth validation

### Medium Priority (Supporting Functions)
- [ ] 3D geometry parsing & transformation
- [ ] Database transaction patterns
- [ ] Error handling & logging
- [ ] Environment variable loading

### Lower Priority (Infrastructure)
- [ ] Next.js specific handlers
- [ ] Cookie management
- [ ] Web Worker communication
- [ ] Type generation

---

## Files Inventory for Testing

### Services (20+ async operations)
- `src/server/services/stripe.ts`
- `src/server/services/email.ts`
- `src/server/services/quick-order.ts`
- `src/server/services/invoices.ts`
- `src/server/services/quotes.ts`
- `src/server/services/tmp-files.ts`
- `src/server/services/order-files.ts`
- `src/server/services/jobs.ts`
- `src/server/services/clients.ts`
- `src/server/services/users.ts`
- `src/server/services/auth.ts`

### Route Handlers (80+ endpoints)
- `src/app/api/invoices/*`
- `src/app/api/quotes/*`
- `src/app/api/quick-order/*`
- `src/app/api/jobs/*`
- `src/app/api/stripe/*`
- `src/app/api/webhooks/resend/*`

### Geometry & 3D (7 files)
- `src/server/geometry/load-geometry.ts`
- `src/server/geometry/orient.ts`
- `src/lib/3d/overhang-detector.ts`
- `src/workers/overhang-worker.ts`
- `src/components/3d/*.tsx`

### Auth & Session (3 files)
- `src/server/auth/session.ts`
- `src/server/auth/api-helpers.ts`
- `src/server/auth/permissions.ts`

---

**Generated:** 2025-11-12  
**Next Step:** Create mock implementations and test fixtures for Phase 3

