# 3D Print Sydney - Integrations Documentation

This document provides a comprehensive overview of all external service integrations and how they connect with the 3D Print Sydney application.

## Table of Contents

1. [Supabase Integration](#supabase-integration)
2. [Stripe Payment Integration](#stripe-payment-integration)
3. [PDF Generation](#pdf-generation)
4. [3D File Processing & Slicing](#3d-file-processing--slicing)
5. [File Management & Storage](#file-management--storage)
6. [Environment Configuration](#environment-configuration)
7. [Third-Party Dependencies](#third-party-dependencies)

---

## Supabase Integration

The application uses **Supabase** as the backend infrastructure provider, offering managed PostgreSQL database, authentication, and S3-compatible storage.

### Database (PostgreSQL)

**Provider:** Supabase (managed PostgreSQL)

**Connection Method:**
- **Service Role Key**: Used exclusively by the application backend for all database operations
- **Anon Key**: Public key for frontend authentication (not used for database queries)
- The application uses **service role authentication only** for server-side operations, bypassing RLS policies

**Connection Details:**
```typescript
// Service client initialization (src/server/supabase/service-client.ts)
const supabase = createClient(
  getSupabaseUrl(),
  getSupabaseServiceRoleKey(),
  {
    auth: {
      persistSession: false,        // Stateless (service role)
      autoRefreshToken: false,      // No token refresh needed
    },
    db: {
      schema: 'public',             // Use public schema
    }
  }
);
```

**Row Level Security (RLS) Strategy:**
- All key tables have RLS enabled: `clients`, `quotes`, `invoices`, `quote_items`, `invoice_items`, `payments`, `printers`, `jobs`, `attachments`, `activity_logs`, `user_messages`, `tmp_files`
- Permissive policies configured for service role: `using (true) with check (true)`
- Since only service role is used, RLS policies effectively allow all operations while maintaining schema organization
- Direct anon key access is not supported for sensitive operations

**Key Database Tables:**
- `clients` - Client information
- `quotes` - Quote documents
- `invoices` - Invoice documents
- `quote_items`, `invoice_items` - Line items for quotes/invoices
- `payments` - Payment records
- `jobs` - 3D printing jobs
- `printers` - Printer inventory and status
- `materials` - Material catalog with pricing
- `product_templates` - Product pricing templates
- `tmp_files` - Temporary file tracking for uploads
- `order_files` - Permanent 3D model storage
- `attachments` - Invoice attachments
- `activity_logs` - Audit trail for all operations
- `user_messages` - Internal messaging system
- `webhook_events` - Stripe webhook event idempotency tracking

**Database Functions:**
- `next_document_number(kind, default_prefix)` - Generates sequential invoice/quote numbers
- `log_activity(...)` - Records activity for audit trail

### Authentication

**Supabase Auth Service:**
- JWT tokens used for user authentication
- User credentials stored in Supabase `auth.users` table
- Session tokens passed via cookies (`sb:token`)

**Token Handling:**
```typescript
// From src/server/auth/session.ts
const authUser = await supabase.auth.getUser(token);
// Token extracted from request cookies
const token = req.cookies.get('sb:token')?.value;
```

**User Management:**
- User profiles tracked in `users` table linking `auth_user_id` to app-specific user data
- User roles: `ADMIN` or `CLIENT`
- Client associations stored for multi-tenant support

**Session Flow:**
1. User authenticates via Supabase Auth
2. JWT token stored in `sb:token` cookie
3. On request, token validated against Supabase Auth
4. User profile loaded from `users` table
5. Permissions checked for resource access

### Storage

**Supabase Storage** provides S3-compatible object storage for file management.

**Bucket Organization:**

| Bucket | Purpose | Key Convention | Lifecycle |
|--------|---------|-----------------|-----------|
| `attachments` | Invoice attachments | `{invoiceId}/{filename}` | Permanent with invoice |
| `pdfs` | Generated PDFs (quotes/invoices) | `{document-type}-{number}.pdf` | Cache + storage |
| `tmp` | Temporary user uploads | `{userId}/{uuid}/{filename}` | 24-48 hours (cleanup job) |
| `order-files` | 3D model files for orders | `{clientId}/{uuid}/{filename}` | Permanent with order |

**File Upload & Download Patterns:**

```typescript
// Upload with service role
await supabase.storage
  .from(bucket)
  .upload(path, buffer, { 
    contentType, 
    upsert: true 
  });

// Download file as buffer
const { data } = await supabase.storage
  .from(bucket)
  .download(path);
const buffer = Buffer.from(await data.arrayBuffer());

// Generate time-limited signed URLs
const { data: { signedUrl } } = await supabase.storage
  .from(bucket)
  .createSignedUrl(path, expiresIn);
```

**Storage Operations:**
- All file operations use service role authentication
- Files stored with metadata (size, content-type, timestamps)
- Signed URLs generated with configurable expiration (60-300 seconds)
- Recursive file listing for cleanup operations

**File Lifecycle Management:**

| File Type | Upload Event | Cleanup Trigger | Retention |
|-----------|--------------|-----------------|-----------|
| Tmp Files | Manual upload for processing | User deletion or cron job | 24-48 hours |
| PDF (Quote/Invoice) | Document generation | Manual deletion | Until document archived |
| Order Files | Order creation | Order deletion | Order lifespan |
| Attachments | Invoice attachment upload | Invoice deletion | Invoice lifespan |

**Storage Access Pattern:**
```typescript
// From src/server/storage/supabase.ts
// All storage operations go through centralized functions:
- uploadInvoiceAttachment(invoiceId, filename, contents, contentType)
- uploadPdf(filename, contents, contentType)
- createTmpFile(userKey, filename, contents, contentType)
- uploadOrderFile(clientId, filename, contents, contentType)
- deleteInvoiceAttachments(paths)
- deleteTmpFiles(paths)
```

---

## Stripe Payment Integration

Stripe handles payment processing for invoices via hosted checkout.

### Integration Overview

**Stripe Checkout** (hosted checkout) is used for payment collection:
- Clients receive checkout URLs in invoice PDFs/emails
- Secure, PCI-compliant payment handling
- Support for multiple payment methods (cards)
- Payment completion tracked via webhooks

**Configuration:**
```typescript
// From src/lib/env.ts
- STRIPE_SECRET_KEY         // API key for backend operations
- STRIPE_WEBHOOK_SECRET     // Webhook signature verification
- STRIPE_SUCCESS_URL        // Redirect after successful payment
- STRIPE_CANCEL_URL         // Redirect if payment cancelled
- STRIPE_CURRENCY           // Currency code (default: AUD)
```

### Payment Flow

**Checkout Session Creation:**

```typescript
// Flow: API call → Stripe Session → Save to DB → Include in PDF
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  payment_method_types: ["card"],
  line_items: [
    {
      price_data: {
        currency: "aud",
        product_data: {
          name: `Invoice ${invoiceNumber}`,
          description: clientName
        },
        unit_amount: amountInMinor  // Amount in cents
      },
      quantity: 1
    }
  ],
  metadata: {
    invoiceId: String(invoiceId),
    invoiceNumber: invoiceNumber
  },
  success_url: successUrl,
  cancel_url: cancelUrl
});
```

**Session Metadata:**
- `invoiceId` (number) - Links checkout to invoice
- `invoiceNumber` (string) - Human-readable reference

**Payment Recovery:**
- Checkout URLs stored in `invoices.stripe_checkout_url`
- Sessions cached to avoid duplicate creation
- URLs refreshable if needed

### Webhook Event Handling

**Webhook Verification:**
```typescript
// From src/app/api/stripe/webhook/route.ts
const bodyBuffer = Buffer.from(await request.arrayBuffer());
const signature = request.headers.get("stripe-signature");
const event = stripe.webhooks.constructEvent(
  bodyBuffer,
  signature,
  webhookSecret
);
```

**Webhook Secret:** Must be set in environment for signature verification

**Event Processing:**

**Event Type:** `checkout.session.completed`
- Triggered when customer completes payment
- Payment amount calculated: `session.amount_total / 100`
- Metadata extracted: `session.metadata.invoiceId`
- Invoice marked as paid with payment details

**Idempotency Implementation:**

```typescript
// Prevent duplicate payment processing
const { data: existingEvent } = await supabase
  .from("webhook_events")
  .select("id")
  .eq("stripe_event_id", event.id)
  .maybeSingle();

if (existingEvent) {
  return; // Already processed
}

// Process event...

// Record as processed
await supabase.from("webhook_events").insert({
  stripe_event_id: event.id,
  event_type: event.type,
  metadata: { invoiceId, amount, sessionId }
});
```

**webhook_events Table:**
- `stripe_event_id` - Unique Stripe event ID (indexed)
- `event_type` - Event type (e.g., "checkout.session.completed")
- `processed_at` - Processing timestamp
- `metadata` - Event details stored as JSONB

### Payment Recording

**When Payment Succeeds:**
1. Webhook received with `checkout.session.completed`
2. Invoice marked as paid via `markInvoicePaid()`
3. Payment record created with:
   - Method: `STRIPE`
   - Amount: calculated from session
   - Processor ID: payment intent ID
   - Reference: session ID
4. Stripe session fields cleared from invoice
5. Activity log entry recorded
6. Webhook event tracked for idempotency

**Payment Status Updates:**
- Invoice status changes from PENDING to PAID
- Balance due becomes zero
- Payment method and date recorded
- Payment reconciliation enabled

---

## PDF Generation

PDFs are generated for quotes and invoices using **Puppeteer** with **Chromium**, optimized for serverless environments.

### Technology Stack

**Puppeteer Core + Chromium:**
- `puppeteer-core`: Browser automation library
- `@sparticuz/chromium`: Pre-built Chromium binary optimized for AWS Lambda
- Fallback to bundled Puppeteer if Chromium unavailable

**Generation Path:**
1. HTML template rendered with data
2. Puppeteer launches Chromium
3. Content loaded and rendered
4. PDF generated from rendered page
5. PDF cached locally and uploaded to storage

### Template System

**Supported Documents:**
- Quotes (via `renderProductionQuoteHtml`)
- Invoices (via `renderProductionInvoiceHtml`)

**Template Data:**
```typescript
{
  logoDataUrl,              // Base64-encoded logo (PNG/JPG/SVG)
  businessName,             // From settings
  businessAddress,          // From settings
  businessPhone,            // From settings
  businessEmail,            // From settings
  abn,                      // From settings
  bankDetails,              // From settings
  stripeCheckoutUrl         // For invoice payments (optional)
}
```

**Logo Handling:**
- Attempts to load from `public/logo.png`
- Converts to base64 data URL for embedding
- Detects MIME type (SVG/PNG/JPG)
- Gracefully handles missing logo

### Browser Automation Process

**Page Configuration:**
```typescript
// Set print-optimized viewport
await page.setViewport({
  width: 1200,
  height: 1600,
  deviceScaleFactor: 2,    // Higher DPI for quality
  hasTouch: false,
  isMobile: false
});

// Enable print media emulation
await page.emulateMediaType('print');

// Set content with wait strategy
await page.setContent(html, {
  waitUntil: ["networkidle0", "domcontentloaded"],
  timeout: 30000
});

// Wait for fonts and custom scripts
await page.evaluateHandle('document.fonts.ready');
```

**Request Interception:**
- Allows embedded data URLs (base64 images)
- Blocks external images for faster rendering
- Allows stylesheets and fonts
- Allows scripts (for pagination/measurement)
- Blocks media, XHR, and fetch requests

**PDF Options:**
```typescript
{
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
  margin: {
    top: "20mm",
    bottom: "20mm",
    left: "16mm",
    right: "16mm"
  },
  tagged: true,            // Accessibility
  scale: 1.0
}
```

### PDF Caching Strategy

**Dual Storage:**
1. **Local Cache:** `data/pdfs/{filename}` for fast retrieval
2. **Supabase Storage:** `pdfs` bucket for durability

**Cache Directory Creation:**
```typescript
// Ensures cache directories exist
await ensurePdfCache(); // Creates data/ and data/pdfs/
```

**Upload Flow:**
```typescript
// 1. Generate PDF in memory
const pdfBuffer = await page.pdf(options);

// 2. Upload to Supabase Storage
const storageKey = await uploadPdf(filename, pdfBuffer);

// 3. Cache locally for fast retrieval
await cachePdf(filename, pdfBuffer);

// Return buffer, filename, cache path, and storage key
return { buffer: pdfBuffer, filename, path, storageKey };
```

### Invoice PDF Specifics

**Stripe Checkout Integration:**
- If invoice has balance due, attempts to create Stripe checkout session
- Checkout URL embedded in PDF for payment links
- Gracefully handles Stripe unavailability

**File Naming:**
- Quotes: `quote-{number}.pdf`
- Invoices: `invoice-{number}.pdf`

---

## 3D File Processing & Slicing

The application processes 3D model files (STL/3MF) to extract print metrics and generate G-code using **PrusaSlicer** or similar CLI tools.

### File Handling

**Supported Formats:**
- STL (Stereolithography)
- 3MF (3D Manufacturing Format)

**Processing Endpoint:** `POST /api/quick-order/slice`

**Input Data:**
```typescript
{
  file: {
    id: string,              // Storage key: {userId}/{uuid}/{filename}
    filename: string,        // Original filename
    layerHeight: number,     // mm (e.g., 0.2)
    infill: number,          // % (e.g., 15)
    supports: {
      enabled: boolean,
      pattern: "normal" | "tree",
      angle: number          // degrees (1-89)
    }
  }
}
```

### Slicer Integration

**Slicer Binary Configuration:**
```typescript
// From src/server/slicer/runner.ts
const bin = process.env.SLICER_BIN || "prusaslicer";
```

**Supported Slicers:**
- **PrusaSlicer** (default, recommended)
- **Slic3r** (alternative, partial compatibility)

**CLI Arguments:**
```
--export-gcode              # Output G-code
--layer-height {height}     # Layer height in mm
--fill-density {percent}%   # Infill percentage
--support-material          # Enable supports
--support-material-angle    # Support angle (1-89)
--support-material-style    # "organic" for tree supports (PrusaSlicer 2.5+)
--output {dir}              # Output directory
{input_file}                # Input STL/3MF file
```

### Metrics Extraction

**Slicer Output Processing:**
- G-code generated to temporary directory
- First 200 lines of G-code parsed for metadata
- Extracted metrics:
  - `grams` - Filament weight in grams
  - `timeSec` - Print time in seconds

**G-code Parsing:**
```typescript
// Regex patterns for metadata extraction
/filament\s+used\s*=\s*([\d.]+)\s*g/i     // Weight in grams
/filament\s+used\s*\[g\]\s*=\s*([\d.]+)/i // Weight format 2
/estimated\s+printing\s+time.*?=\s*([^;]+)/ // Time estimation
```

**Time Format Support:**
- `1h 23m 45s` - Hours, minutes, seconds
- `2h 5m` - Hours and minutes
- `15m 30s` - Minutes and seconds
- `02:10:00` - Colon-separated format

### Concurrency Management

**Semaphore-Based Limiting:**
```typescript
// Prevent simultaneous slicer processes
const SLICER_CONCURRENCY = process.env.SLICER_CONCURRENCY || "1";
// Limits concurrent slicing to 1-4 processes
```

**Configuration:**
- `SLICER_CONCURRENCY` - Number of concurrent jobs (1-4, default: 1)
- `SLICER_TIMEOUT_MS` - Per-job timeout (30s-5min, default: 120s)
- `SLICER_DISABLE` - Set to "1" to disable slicing entirely

### Fallback Strategy

**Disable Slicer:**
```typescript
// If SLICER_DISABLE=1, use fallback metrics
if (process.env.SLICER_DISABLE === "1") {
  return { timeSec: 3600, grams: 80, fallback: true };
}
```

**Automatic Fallback:**
- If slicer fails after max attempts (2 retries)
- Fallback metrics: 1 hour, 80 grams
- Error logged for monitoring
- User notified of fallback usage

### File Tracking

**Temporary File Metadata:**
```typescript
{
  status: "idle" | "running" | "completed" | "failed",
  metadata: {
    attempts: number,
    settings: { layerHeight, infill, supports },
    metrics: { timeSec, grams },
    fallback: boolean,
    error: string | null,
    output: string | null  // Generated G-code storage key
  }
}
```

**Status Flow:**
1. Upload file → `idle`
2. Start slicing → `running`
3. Complete successfully → `completed` (with metrics)
4. Fail after retries → `failed` (with error)

**G-code Output:**
- Generated G-code stored as separate tmp file
- Reference stored in metadata as `output`
- User can download G-code for preview/inspection

---

## File Management & Storage

The application manages files across multiple storage tiers with different lifecycle strategies.

### Temporary Files

**Purpose:** Handle user uploads for processing (3D models, configuration files)

**Storage:** `tmp` bucket in Supabase Storage

**Key Convention:** `{userId}/{uuid}/{filename}`

**Lifecycle:**
- Created when user uploads file
- Metadata tracked in `tmp_files` table
- Processed (sliced, analyzed, etc.)
- Automatic cleanup after 24-48 hours (or manual deletion)

**Metadata Tracking:**
```typescript
{
  id: number,
  user_id: number,
  storage_key: string,      // Full path in storage
  filename: string,
  size_bytes: number,
  mime_type: string,
  status: "idle" | "running" | "completed" | "failed",
  metadata: unknown,        // JSON for processing details
  created_at: timestamp,
  updated_at: timestamp
}
```

**Operations:**
- `saveTmpFile()` - Upload and register
- `requireTmpFile()` - Load and verify ownership
- `updateTmpFile()` - Update status/metadata
- `downloadTmpFileToBuffer()` - Retrieve contents
- `deleteTmpFile()` - Remove single file
- `deleteTmpFiles()` - Batch delete
- `listTmpFiles()` - List user's files (recursive)

### Order Files

**Purpose:** Permanent storage for 3D models attached to orders

**Storage:** `order-files` bucket in Supabase Storage

**Key Convention:** `{clientId}/{uuid}/{filename}`

**Metadata:**
```typescript
{
  id: number,
  invoice_id: number | null,
  quote_id: number | null,
  client_id: number,
  filename: string,
  storage_key: string,
  file_type: "model" | "settings",
  mime_type: string,
  size_bytes: number,
  metadata: Record<string, unknown>,
  uploaded_by: number,
  uploaded_at: timestamp
}
```

**Operations:**
- `saveOrderFile()` - Upload and register
- `getOrderFilesByInvoice()` - Retrieve files for invoice
- `getOrderFilesByQuote()` - Retrieve files for quote
- `getOrderFile()` - Load specific file
- `getOrderFileDownloadUrl()` - Generate signed URL
- `downloadOrderFileToBuffer()` - Retrieve contents
- `deleteOrderFile()` - Remove with cleanup
- `listOrderFiles()` - List client's files

**Ownership Validation:**
- Files linked to invoice or quote
- Client ID enforced for access control
- User ID tracked for audit trail

### Invoice Attachments

**Purpose:** Store additional documents with invoices (quotes, specifications, etc.)

**Storage:** `attachments` bucket in Supabase Storage

**Key Convention:** `{invoiceId}/{filename}`

**Operations:**
- `uploadInvoiceAttachment()` - Upload attachment
- `deleteInvoiceAttachment()` - Remove single
- `deleteInvoiceAttachments()` - Batch delete
- `getAttachmentSignedUrl()` - Generate download link
- `listInvoiceAttachments()` - List invoice attachments

**Lifecycle:**
- Created when uploading to invoice
- Deleted when invoice deleted
- Accessible via signed URLs with expiration

### PDF Storage

**Purpose:** Cache generated quotes and invoices

**Storage:** 
- Local cache: `data/pdfs/` directory
- Cloud backup: `pdfs` bucket in Supabase Storage

**Key Convention:** `{document-type}-{number}.pdf`

**Operations:**
- `uploadPdf()` - Upload to storage
- `getPdfSignedUrl()` - Generate download link
- `deletePdf()` - Remove from storage
- `listPdfs()` - List by prefix

**Cache Strategy:**
- Local cache for fast retrieval
- Supabase backup for durability
- Automatic regeneration if missing

---

## Environment Configuration

### Required Environment Variables

**Supabase Configuration:**
```env
NEXT_PUBLIC_SUPABASE_URL              # https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY         # Anon public key (for auth)
SUPABASE_SERVICE_ROLE_KEY             # Service role key (for backend)
```

**Stripe Configuration:**
```env
STRIPE_SECRET_KEY                     # sk_live_... or sk_test_...
STRIPE_WEBHOOK_SECRET                 # Webhook signing secret
STRIPE_SUCCESS_URL                    # Redirect after successful payment
STRIPE_CANCEL_URL                     # Redirect if payment cancelled
STRIPE_CURRENCY                       # Currency code (default: AUD)
```

**Application URLs:**
```env
NEXT_PUBLIC_APP_URL                   # http://localhost:3000 (development)
                                       # https://yourdomain.com (production)
```

**3D File Processing:**
```env
SLICER_BIN                            # Path to slicer binary (prusaslicer/slic3r)
SLICER_DISABLE                        # Set to "1" to disable slicing
SLICER_CONCURRENCY                    # Number of concurrent jobs (1-4)
SLICER_TIMEOUT_MS                     # Per-job timeout in milliseconds
```

### Configuration Validation

**Environment Loading:**
```typescript
// From src/lib/env.ts
// All getters include validation and throw on missing required vars
export function getSupabaseServiceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? missing('SUPABASE_SERVICE_ROLE_KEY');
}

// Optional with defaults
export function getStripeSecretKey(): string | null {
  return process.env.STRIPE_SECRET_KEY?.trim() || null;
}
```

**Development vs Production:**
- Development: Uses local Supabase (if configured), optional Stripe
- Production: Requires all Supabase and Stripe credentials
- Service role key used in both environments

### Secrets Management

**Best Practices:**
1. Never commit `.env` file to repository
2. Use `.env.example` as template
3. Store secrets in environment variables (Vercel, Heroku, etc.)
4. Rotate Stripe webhook secret periodically
5. Keep service role key private (backend only)

**Local Development:**
- Copy `.env.example` to `.env.local`
- Add real credentials for development
- Use Supabase local development if available

---

## Third-Party Dependencies

### Key Integration Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | ^2.47.0 | Supabase client SDK |
| `@supabase/ssr` | ^0.5.0 | Server-side rendering support |
| `stripe` | ^18.5.0 | Stripe API client |
| `puppeteer` | ^24.21.0 | Browser automation (fallback) |
| `puppeteer-core` | ^24.21.0 | Headless Chromium control |
| `@sparticuz/chromium` | ^123.0.0 | Lambda-optimized Chromium |
| `sharp` | ^0.34.3 | Image processing |
| `date-fns` | ^4.1.0 | Date utilities |

### Dependency Insights

**Supabase Stack:**
- `@supabase/supabase-js` - Main client for database, auth, storage
- `@supabase/ssr` - For server-side rendering support

**Payment Processing:**
- `stripe` - Stripe API for checkout and webhooks
- Webhook verification via built-in crypto

**PDF Generation:**
- `puppeteer-core` - Lightweight browser automation
- `@sparticuz/chromium` - Pre-built Chromium for AWS Lambda
- Fallback to full `puppeteer` if Chromium unavailable

**Image & File Processing:**
- `sharp` - High-performance image processing (thumbnails, optimization)
- Built-in Node.js `fs` for file operations
- Automatic MIME type detection

### Version Management

**Update Strategy:**
1. Monitor security advisories for key packages
2. Test major version updates in development
3. Use `npm audit` for vulnerability checks
4. Pin versions in `package.json`
5. Document breaking changes

**Known Compatibility:**
- Puppeteer 24.x compatible with Node.js 18+
- Supabase JS 2.47+ requires service role key handling
- Stripe 18.5+ supports webhook signature verification

---

## Integration Health & Monitoring

### Health Checks

**Supabase Connectivity:**
- Service role key validation on startup
- Database connection test via `getServiceSupabase()`
- Storage bucket accessibility via test upload

**Stripe Configuration:**
- API key validation (`resolveStripeConfig()`)
- Webhook secret presence check
- Webhook signature verification on receipt

**File Processing:**
- Slicer binary availability check
- Temporary directory creation
- Chromium/Puppeteer availability

### Error Handling

**Database Errors:**
- Logged with scope and context
- Retry logic for transient failures
- User-friendly error messages returned

**Stripe Errors:**
- Webhook processing failures logged separately
- Idempotency ensures safe retries
- Missing configuration gracefully degraded

**PDF Generation Errors:**
- Browser launch fallback mechanism
- Partial failure recovery (local cache only)
- File cleanup on error

**Slicer Errors:**
- Automatic retry (up to 2 attempts)
- Fallback metrics on persistent failure
- User notified of fallback usage

### Logging & Debugging

**Logging Configuration:**
```typescript
// Via src/lib/logger
logger.info({
  scope: "integration.operation",
  data: { /* contextual data */ }
});

logger.error({
  scope: "integration.operation",
  error: error,
  data: { /* debugging info */ }
});

logger.warn({
  scope: "integration.operation",
  message: "Description",
  error: error
});
```

**Logged Events:**
- Supabase connection establishment
- Stripe session creation and completion
- PDF generation and caching
- Slicer execution and metrics extraction
- Webhook processing and idempotency checks
- File upload/download operations

---

## Security Considerations

### Authentication & Authorization

**Service Role Usage:**
- Backend uses service role key exclusively
- Service role key never exposed to frontend
- Environment variable protected in deployment

**Client Authentication:**
- User JWT validated against Supabase Auth
- Session cookies validated on each request
- Role-based access control (ADMIN/CLIENT)

### Data Protection

**File Storage Security:**
- Signed URLs with expiration (60-300 seconds)
- File ownership validated before access
- Client ID isolation for multi-tenant data

**Payment Security:**
- PCI compliance via Stripe (no card data stored)
- Webhook signature verification required
- Idempotency keys prevent replay attacks
- Metadata encryption via HTTPS

### Credential Management

**Never:**
- Commit `.env` to version control
- Log API keys or service role keys
- Pass credentials through URLs
- Share webhook secrets

**Always:**
- Use environment variables
- Rotate secrets regularly
- Use separate keys for development/production
- Monitor access logs
