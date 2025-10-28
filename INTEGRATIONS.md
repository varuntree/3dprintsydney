# Integration Documentation

This document describes all external service integrations and file processing systems used in the 3D Print Sydney application.

## Table of Contents

- [Supabase Integration](#supabase-integration)
- [Stripe Integration](#stripe-integration)
- [PDF Generation](#pdf-generation)
- [3D File Processing](#3d-file-processing)
- [File Management](#file-management)
- [Environment Configuration](#environment-configuration)

---

## Supabase Integration

Supabase provides the primary backend infrastructure for database, authentication, storage, and potential real-time features.

### Connection Setup

The application uses three different Supabase client configurations:

#### 1. Service Role Client (Server-side Admin)

Used for privileged server-side operations that bypass Row Level Security (RLS).

**Location:** `/src/server/supabase/service-client.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/env';

export function getServiceSupabase() {
  if (!cached) {
    cached = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'X-Client-Info': 'supabase-js-node',
        },
      },
    });
  }
  return cached;
}
```

**Usage:**
- Database operations requiring admin privileges
- Background jobs and webhooks
- Payment processing
- File management operations

**Key characteristics:**
- Bypasses RLS policies
- No session persistence
- Server-side only (never expose to client)
- Uses `SUPABASE_SERVICE_ROLE_KEY` environment variable

#### 2. Server-side Client (RLS-aware)

Used for server-side operations that respect user permissions.

**Location:** `/src/lib/supabase/server.ts`

```typescript
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function getServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // No-op: route handlers manage cookie mutations explicitly.
      },
    },
  });
}
```

**Usage:**
- API routes that need user context
- Server components with authentication
- Operations that should respect RLS

**Key characteristics:**
- Respects RLS policies
- Uses user session from cookies
- Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### 3. Browser Client (Client-side)

Used for client-side operations in React components.

**Location:** `/src/lib/supabase/browser.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function getBrowserSupabase() {
  if (!client) {
    client = createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
  }
  return client;
}
```

**Usage:**
- React components
- Client-side data fetching
- Real-time subscriptions (if implemented)

### Database Integration

All database operations use Supabase's PostgreSQL database through the Supabase client.

**Example query pattern:**
```typescript
const { data, error } = await supabase
  .from('invoices')
  .select('id, status, stripe_session_id')
  .eq('id', invoiceId)
  .maybeSingle();
```

**Common tables accessed:**
- `invoices` - Invoice records
- `clients` - Client information
- `materials` - 3D printing materials
- `activity_logs` - Audit trail
- `webhook_events` - Event tracking for idempotency
- `tmp_files` - Temporary file metadata
- `order_files` - Permanent file storage metadata
- `settings` - Application settings

### Storage Integration

Supabase Storage is used for all file storage with four dedicated buckets.

**Location:** `/src/server/storage/supabase.ts`

#### Storage Buckets

```typescript
const ATTACHMENTS_BUCKET = 'attachments';  // Invoice attachments
const PDF_BUCKET = 'pdfs';                  // Generated PDFs
const TMP_BUCKET = 'tmp';                   // Temporary uploads
const ORDER_FILES_BUCKET = 'order-files';  // Permanent 3D model files
```

#### Bucket Usage

**1. Attachments Bucket (`attachments`)**

Stores invoice-related attachments.

```typescript
// Upload attachment
await supabase.storage
  .from(ATTACHMENTS_BUCKET)
  .upload(`${invoiceId}/${filename}`, buffer, {
    contentType: contentType ?? 'application/octet-stream',
    upsert: true,
  });

// Get signed URL (60 seconds default)
const { data } = await supabase.storage
  .from(ATTACHMENTS_BUCKET)
  .createSignedUrl(path, 60);
```

**Path structure:** `{invoiceId}/{filename}`

**2. PDFs Bucket (`pdfs`)**

Stores generated quote and invoice PDFs.

```typescript
// Upload PDF
await supabase.storage
  .from(PDF_BUCKET)
  .upload(filename, pdfBuffer, {
    contentType: 'application/pdf',
    upsert: true,
  });

// Get signed URL (120 seconds default)
const { data } = await supabase.storage
  .from(PDF_BUCKET)
  .createSignedUrl(path, 120);
```

**Path structure:** `quote-{number}.pdf` or `invoice-{number}.pdf`

**3. Temporary Files Bucket (`tmp`)**

Stores temporary file uploads during the quick order flow.

```typescript
// Upload temporary file
const key = `${userKey}/${randomUUID()}/${filename}`;
await supabase.storage
  .from(TMP_BUCKET)
  .upload(key, buffer, {
    contentType: contentType ?? 'application/octet-stream',
    upsert: true,
  });

// Download temporary file
const { data } = await supabase.storage
  .from(TMP_BUCKET)
  .download(path);
```

**Path structure:** `{userId}/{uuid}/{filename}`

**Cleanup:** Temporary files are deleted after invoice creation.

**4. Order Files Bucket (`order-files`)**

Stores permanent 3D model files and print settings.

```typescript
// Upload order file
const key = `${clientId}/${randomUUID()}/${filename}`;
await supabase.storage
  .from(ORDER_FILES_BUCKET)
  .upload(key, buffer, {
    contentType: contentType ?? 'application/octet-stream',
    upsert: false,  // Prevent overwrites
  });

// Get signed URL (300 seconds default)
const { data } = await supabase.storage
  .from(ORDER_FILES_BUCKET)
  .createSignedUrl(path, 300);
```

**Path structure:** `{clientId}/{uuid}/{filename}`

**File types stored:**
- STL/3D model files (`type: 'model'`)
- Print settings JSON (`type: 'settings'`)

### Row Level Security (RLS)

The application relies on Supabase RLS policies to secure data access:

- **Service role client** bypasses RLS for admin operations
- **Anon key clients** respect RLS policies based on user authentication
- Storage buckets have RLS policies to control file access

---

## Stripe Integration

Stripe handles payment processing for invoices via checkout sessions and webhooks.

### Configuration

**Location:** `/src/server/services/stripe.ts`

```typescript
const config = {
  secretKey: getStripeSecretKey(),        // STRIPE_SECRET_KEY
  successUrl: getStripeSuccessUrl(),      // STRIPE_SUCCESS_URL (defaults to /payment/success)
  cancelUrl: getStripeCancelUrl(),        // STRIPE_CANCEL_URL (defaults to /payment/cancel)
  currency: getStripeCurrency(),          // STRIPE_CURRENCY (defaults to AUD)
  webhookSecret: getStripeWebhookSecret() // STRIPE_WEBHOOK_SECRET
};
```

The Stripe client is cached and initialized on first use:

```typescript
cachedStripe = new Stripe(config.secretKey);
```

### Checkout Session Creation

Creates or retrieves a Stripe checkout session for invoice payment.

**Function:** `createStripeCheckoutSession(invoiceId, options?)`

**Flow:**

1. **Validate invoice status**
   ```typescript
   // Check if invoice exists and is not already paid
   const { data: invoiceRecord } = await supabase
     .from('invoices')
     .select('id, status, stripe_session_id, stripe_checkout_url')
     .eq('id', invoiceId)
     .maybeSingle();

   if (invoiceRecord.status === InvoiceStatus.PAID) {
     throw new BadRequestError('Invoice is already paid');
   }
   ```

2. **Return existing session** (unless `refresh: true`)
   ```typescript
   if (!options?.refresh && invoiceRecord.stripe_checkout_url) {
     return {
       url: invoiceRecord.stripe_checkout_url,
       sessionId: invoiceRecord.stripe_session_id,
     };
   }
   ```

3. **Calculate balance due**
   ```typescript
   const detail = await getInvoiceDetail(invoiceId);
   const balanceDue = detail.balanceDue;
   const amountInMinor = Math.round(balanceDue * 100);
   ```

4. **Create Stripe session**
   ```typescript
   const session = await stripe.checkout.sessions.create({
     mode: 'payment',
     payment_method_types: ['card'],
     line_items: [{
       price_data: {
         currency: env.currency.toLowerCase(),
         product_data: {
           name: `Invoice ${detail.number}`,
           description: detail.client.name,
         },
         unit_amount: amountInMinor,
       },
       quantity: 1,
     }],
     metadata: {
       invoiceId: String(invoiceId),
       invoiceNumber: detail.number,
     },
     success_url: env.successUrl,
     cancel_url: env.cancelUrl,
   });
   ```

5. **Store session in database**
   ```typescript
   await supabase
     .from('invoices')
     .update({
       stripe_session_id: session.id,
       stripe_checkout_url: session.url,
     })
     .eq('id', invoiceId);
   ```

6. **Log activity**
   ```typescript
   await supabase.from('activity_logs').insert({
     invoice_id: invoiceId,
     client_id: detail.client.id,
     action: 'STRIPE_CHECKOUT_CREATED',
     message: `Stripe checkout session created for invoice ${detail.number}`,
     metadata: { sessionId: session.id, amount: balanceDue },
   });
   ```

### Webhook Handling

Processes Stripe webhook events with idempotency.

**Endpoint:** `/src/app/api/stripe/webhook/route.ts`

**Event verification:**
```typescript
const env = await getStripeEnvironment();
const bodyBuffer = Buffer.from(await request.arrayBuffer());

if (env.webhookSecret) {
  const signature = request.headers.get('stripe-signature');
  event = env.stripe.webhooks.constructEvent(
    bodyBuffer,
    signature,
    env.webhookSecret
  );
} else {
  // Development: parse JSON directly (not recommended for production)
  event = JSON.parse(bodyBuffer.toString('utf8'));
}
```

**Idempotency check:**
```typescript
// Check if event already processed
const { data: existingEvent } = await supabase
  .from('webhook_events')
  .select('id')
  .eq('stripe_event_id', event.id)
  .maybeSingle();

if (existingEvent) {
  logger.info({ message: 'Event already processed' });
  return; // Skip processing
}
```

**Event handling:**
```typescript
if (event.type === 'checkout.session.completed') {
  const session = event.data.object;
  const invoiceId = Number(session.metadata?.invoiceId);
  const amount = (session.amount_total ?? 0) / 100;

  // Mark invoice as paid
  await markInvoicePaid(invoiceId, {
    method: PaymentMethod.STRIPE,
    amount,
    processor: 'stripe',
    processorId: typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.id,
    reference: session.id,
    note: 'Stripe Checkout payment',
  });

  // Clear Stripe session fields
  await supabase
    .from('invoices')
    .update({
      stripe_session_id: null,
      stripe_checkout_url: null,
    })
    .eq('id', invoiceId);

  // Log activity
  await supabase.from('activity_logs').insert({
    invoice_id: invoiceId,
    action: 'STRIPE_CHECKOUT_COMPLETED',
    message: `Stripe checkout completed`,
    metadata: { sessionId: session.id, amount },
  });

  // Record event as processed
  await supabase.from('webhook_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    metadata: { invoiceId, sessionId: session.id, amount },
  });
}
```

### Error Handling

All Stripe operations include comprehensive error handling:

```typescript
try {
  // Stripe operation
} catch (error) {
  if (error instanceof AppError) {
    return fail(error.code, error.message, error.status, error.details);
  }
  logger.error({ scope: 'stripe.webhook', error });
  return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
}
```

---

## PDF Generation

PDF generation uses Puppeteer with Chromium to render HTML templates to high-quality PDFs.

### Technology Stack

- **Puppeteer Core:** Headless browser automation
- **@sparticuz/chromium:** Optimized Chromium binary for serverless environments
- **Fallback:** Bundled Puppeteer with full Chromium for local development

### Browser Initialization

**Location:** `/src/server/pdf/generator.ts`

```typescript
async function launchPdfBrowser(): Promise<Browser> {
  try {
    // Production: Use optimized Chromium
    const [{ default: chromium }, { default: puppeteerCore }] = await Promise.all([
      import('@sparticuz/chromium'),
      import('puppeteer-core'),
    ]);

    const executablePath = await chromium.executablePath();
    return await puppeteerCore.launch({
      args: [...chromium.args, '--font-render-hinting=none'],
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });
  } catch (error) {
    // Development: Use bundled Puppeteer
    logger.warn({ message: 'Falling back to bundled Puppeteer', error });
    const { default: puppeteer } = await import('puppeteer');
    return puppeteer.launch({
      headless: true,
      args: ['--font-render-hinting=none'],
    });
  }
}
```

### PDF Rendering Process

**Function:** `renderPdf(html, filename)`

1. **Launch browser**
   ```typescript
   browser = await launchPdfBrowser();
   const page = await browser.newPage();
   ```

2. **Configure viewport for high quality**
   ```typescript
   await page.setViewport({
     width: 1200,
     height: 1600,
     deviceScaleFactor: 2, // Higher DPI for better quality
     hasTouch: false,
     isMobile: false,
   });

   await page.emulateMediaType('print');
   ```

3. **Optimize resource loading**
   ```typescript
   await page.setRequestInterception(true);
   page.on('request', (req) => {
     if (req.resourceType() === 'image' && !req.url().includes('data:')) {
       req.abort(); // Block external images
     } else if (['stylesheet', 'font', 'document', 'script'].includes(req.resourceType())) {
       req.continue(); // Allow essential resources
     } else {
       req.abort(); // Block other resources
     }
   });
   ```

4. **Load HTML content**
   ```typescript
   await page.setContent(html, {
     waitUntil: ['networkidle0', 'domcontentloaded'],
     timeout: 30000
   });

   // Wait for fonts to load
   await page.evaluateHandle('document.fonts.ready');

   // Wait for dynamic pagination
   await new Promise(resolve => setTimeout(resolve, 500));
   ```

5. **Generate PDF**
   ```typescript
   const pdfData = await page.pdf({
     format: 'A4',
     printBackground: true,
     preferCSSPageSize: true,
     displayHeaderFooter: false,
     margin: {
       top: '20mm',
       bottom: '20mm',
       left: '16mm',
       right: '16mm',
     },
     tagged: true,
     outline: false,
     scale: 1.0,
     width: '210mm',  // A4 width
     height: '297mm', // A4 height
   });

   const pdfBuffer = Buffer.from(pdfData);
   ```

6. **Upload to Supabase Storage**
   ```typescript
   try {
     storageKey = await uploadPdf(filename, pdfBuffer);
   } catch (error) {
     logger.warn({ message: 'Failed to upload PDF to Supabase storage', error });
   }
   ```

7. **Cache locally** (optional fallback)
   ```typescript
   try {
     await cachePdf(filename, pdfBuffer);
   } catch (error) {
     logger.warn({ message: 'Failed to cache PDF locally', error });
   }
   ```

8. **Cleanup**
   ```typescript
   finally {
     if (browser) {
       await browser.close().catch(() => undefined);
     }
   }
   ```

### Template System

**Location:** `/src/server/pdf/templates/production.ts`

The application uses a single production-quality template with dynamic rendering for quotes and invoices.

**Template features:**
- Embedded business logo (base64 data URLs)
- Professional typography and layout
- Print-optimized styling
- Legacy Flask PDF layout replicated for pixel-perfect parity
- Dynamic line item rendering
- Stripe payment links (invoices only)
- Tax and shipping calculations
- Multi-page support with pagination

**Logo embedding:**
```typescript
const logoFile = join(process.cwd(), 'public', 'logo.png');
if (existsSync(logoFile)) {
  const fileBuffer = readFileSync(logoFile);
  const extension = extname(logoFile).toLowerCase();
  const mimeType = extension === '.svg' ? 'image/svg+xml'
    : extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg'
    : 'image/png';
  logoDataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
}
```

### Document Generation Functions

**Quote PDF:**
```typescript
export async function generateQuotePdf(id: number) {
  const quote = await getQuoteDetail(id);
  const settings = await getSettings().catch(() => null);
  const logoDataUrl = await resolveLogoDataUrl();

  const template = buildQuoteTemplate(quote, settings, logoDataUrl);
  const html = renderProductionQuoteHtml(template);
  const filename = `quote-${quote.number}.pdf`;
  const { buffer, path, storageKey } = await renderPdf(html, filename);
  return { buffer, filename, path, storageKey };
}
```

**Invoice PDF:**
```typescript
export async function generateInvoicePdf(id: number) {
  let invoice = await getInvoiceDetail(id);
  const settings = await getSettings().catch(() => null);

  if (invoice.balanceDue > 0) {
    const session = await createStripeCheckoutSession(id).catch((error) => {
      if (!(error instanceof Error && error.message === 'Invoice is already paid')) {
        logger.warn({ scope: 'pdf.invoice.stripe', error });
      }
      return null;
    });
    if (session?.url) {
      invoice = { ...invoice, stripeCheckoutUrl: session.url };
    }
  }

  const logoDataUrl = await resolveLogoDataUrl();
  const template = buildInvoiceTemplate(invoice, settings, logoDataUrl);
  const html = renderProductionInvoiceHtml(template);
  const filename = `invoice-${invoice.number}.pdf`;
  const { buffer, path, storageKey } = await renderPdf(html, filename);
  return { buffer, filename, path, storageKey };
}
```

### Storage Integration

Generated PDFs are stored in two locations:

1. **Supabase Storage** (primary)
   - Bucket: `pdfs`
   - Accessible via signed URLs
   - Permanent storage

2. **Local cache** (fallback)
   - File system cache
   - Used if Supabase upload fails
   - Temporary storage

---

## 3D File Processing

The application processes STL files for 3D printing quotes and orders.

### File Format Support

**Supported formats:**
- STL (binary and ASCII)
- Generic 3D model files

**MIME types:**
```typescript
const ACCEPTED_MIME_TYPES = [
  'model/stl',
  'application/sla',
  'application/octet-stream',
];
```

**Validation:**
```typescript
// Maximum file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

validateOrderFile({ size: file.size, type: file.type, name: file.name });
```

### STL Export (Client-side)

**Location:** `/src/lib/3d/export.ts`

The application can export Three.js meshes to STL format with baked transformations.

```typescript
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';

export async function exportSTL(
  mesh: THREE.Mesh,
  binary: boolean = true
): Promise<Blob> {
  // Clone mesh to avoid modifying original
  const clonedMesh = mesh.clone();
  clonedMesh.geometry = mesh.geometry.clone();

  // Bake transformations into geometry
  applyTransformToGeometry(clonedMesh);
  centerModelOnBed(clonedMesh);

  // Export to STL
  const exporter = new STLExporter();
  const result = exporter.parse(clonedMesh, { binary });

  // Convert to Blob
  if (binary) {
    const dataView = result as DataView;
    const arrayBuffer = new ArrayBuffer(dataView.byteLength);
    const view = new Uint8Array(arrayBuffer);
    const sourceView = new Uint8Array(
      dataView.buffer,
      dataView.byteOffset,
      dataView.byteLength
    );
    view.set(sourceView);

    return new Blob([arrayBuffer], {
      type: 'application/octet-stream',
    });
  } else {
    return new Blob([result as string], { type: 'text/plain' });
  }
}
```

### Slicer Integration

The application integrates with PrusaSlicer or Slic3r for estimating print time and material usage.

**Location:** `/src/server/slicer/runner.ts`

**Configuration:**
```typescript
const bin = process.env.SLICER_BIN || 'prusaslicer';
const concurrency = Number(process.env.SLICER_CONCURRENCY || 1);
const timeoutMs = Number(process.env.SLICER_TIMEOUT_MS || 120_000);
```

**Slicing process:**

1. **Build CLI arguments**
   ```typescript
   const args = [
     '--export-gcode',
     '--layer-height', String(opts.layerHeight),
     '--fill-density', `${opts.infill}%`,
   ];

   if (opts.supports?.enabled) {
     args.push('--support-material');
     args.push('--support-material-angle', String(angle));
     if (opts.supports.pattern === 'tree') {
       args.push('--support-material-style', 'organic');
     }
   }

   args.push('--output', outDir);
   args.push(inputPath);
   ```

2. **Execute slicer with timeout**
   ```typescript
   const child = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });

   const res = await new Promise((resolve) => {
     const to = setTimeout(() => {
       child.kill('SIGKILL');
     }, timeoutMs);

     let stderr = '';
     child.stderr?.on('data', (d) => (stderr += d.toString()));
     child.on('close', (code) => {
       clearTimeout(to);
       resolve({ code, stderr });
     });
   });
   ```

3. **Parse G-code output**
   ```typescript
   async function parseGcodeMetrics(gcodePath: string) {
     const buf = await fsp.readFile(gcodePath, 'utf8');
     const lines = buf.split(/\r?\n/).slice(0, 200);

     let grams = 0;
     let timeSec = 0;

     for (const line of lines) {
       const lg = line.toLowerCase();

       // Parse filament weight
       const g1 = lg.match(/filament\s+used\s*=\s*([\d.]+)\s*g/);
       const g2 = lg.match(/filament\s+used\s*\[g\]\s*=\s*([\d.]+)/);
       if (!grams && (g1 || g2)) {
         grams = Number((g1?.[1] ?? g2?.[1]) || 0);
       }

       // Parse print time
       const t1 = lg.match(/estimated\s+printing\s+time.*?=\s*([^;]+)/);
       if (!timeSec && t1?.[1]) {
         timeSec = parseTimeToSeconds(t1[1].trim());
       }
     }

     return { timeSec, grams };
   }
   ```

4. **Fallback metrics**
   ```typescript
   if (process.env.SLICER_DISABLE === '1') {
     return { timeSec: 3600, grams: 80, fallback: true };
   }
   ```

**Retry logic:**
```typescript
export async function executeSlicingWithRetry(
  srcPath: string,
  settings: SliceOptions,
  maxAttempts = 2
) {
  let attempt = 0;
  let metrics = null;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      metrics = await sliceFileWithCli(srcPath, settings);
      break;
    } catch (error) {
      logger.error({ scope: 'quick-order.slice', error, data: { attempt } });
      if (attempt >= maxAttempts) break;
    }
  }

  return metrics;
}
```

### Oriented File Processing

Users can orient STL files in the browser and upload the transformed version.

**API Endpoint:** `/src/app/api/quick-order/orient/route.ts`

```typescript
export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  const formData = await req.formData();

  const fileId = formData.get('fileId') as string;
  const orientedSTL = formData.get('orientedSTL') as File;

  const buffer = Buffer.from(await orientedSTL.arrayBuffer());
  const filename = orientedSTL.name || 'oriented.stl';
  const mimeType = orientedSTL.type || 'application/octet-stream';

  const result = await processOrientedFile(
    fileId,
    { buffer, filename, mimeType },
    user.id
  );

  return ok(result);
}
```

---

## File Management

The application manages files through a multi-tier storage system.

### File Upload Flow

**Quick Order Upload:**

1. **Client uploads file**
   ```typescript
   POST /api/quick-order/upload
   Content-Type: multipart/form-data

   files: File[]
   ```

2. **Validate file**
   ```typescript
   validateOrderFile({ size: entry.size, type: entry.type, name });
   ```

3. **Save to temporary storage**
   ```typescript
   const buf = Buffer.from(await entry.arrayBuffer());
   const { record, tmpId } = await saveTmpFile(
     user.id,
     name,
     buf,
     entry.type || 'application/octet-stream'
   );
   ```

4. **Return file metadata**
   ```typescript
   {
     id: tmpId,
     filename: record.filename,
     size: record.size_bytes,
     type: record.mime_type
   }
   ```

### File Processing Pipeline

**From temporary to permanent storage:**

1. **User initiates order** with temporary file IDs
2. **Server slices files** to calculate metrics
3. **Invoice created** with calculated pricing
4. **Files moved to permanent storage:**
   ```typescript
   // Save 3D model file
   await saveOrderFile({
     invoiceId: invoice.id,
     clientId: user.clientId,
     userId: user.id,
     filename: tmpRecord.filename,
     fileType: 'model',
     contents: buffer,
     mimeType: tmpRecord.mime_type,
     metadata: {
       originalSize: tmpRecord.size_bytes,
       uploadedFrom: 'quick-order',
     },
   });

   // Save print settings
   await saveOrderFile({
     invoiceId: invoice.id,
     clientId: user.clientId,
     userId: user.id,
     filename: `${baseName}.settings.json`,
     fileType: 'settings',
     contents: settingsJson,
     mimeType: 'application/json',
     metadata: settingsData,
   });
   ```

5. **Temporary files deleted**
   ```typescript
   await deleteTmpFile(user.id, fileId);
   ```

### Signed URLs

All file access uses time-limited signed URLs:

```typescript
// Attachments (60 seconds)
const url = await getAttachmentSignedUrl(path, 60);

// PDFs (120 seconds)
const url = await getPdfSignedUrl(path, 120);

// Order files (300 seconds)
const url = await getOrderFileSignedUrl(path, 300);

// Temporary files (60 seconds)
const url = await getTmpFileSignedUrl(path, 60);
```

### File Download

```typescript
// Download from Supabase Storage
const buffer = await downloadOrderFile(path);

// Or download temporary file
const buffer = await downloadTmpFile(path);
```

### File Cleanup

**Temporary files:**
- Deleted after invoice creation
- Can be manually deleted via API

**Permanent files:**
- Stored indefinitely in `order-files` bucket
- Organized by client ID
- Accessible to admins

---

## Environment Configuration

### Required Environment Variables

#### Supabase (Required)

```bash
# Supabase connection
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."  # Public anon key
SUPABASE_SERVICE_ROLE_KEY="eyJ..."     # Secret service role key
```

**Usage:**
- `NEXT_PUBLIC_SUPABASE_URL` - Base URL for Supabase project
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public key for client-side operations
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key for server-side operations (bypasses RLS)

#### Application URLs (Optional)

```bash
# Application URL (auto-detected from VERCEL_URL if not set)
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

**Default:** Falls back to `http://localhost:3000` in development

#### Stripe (Optional)

```bash
# Stripe payment processing
STRIPE_SECRET_KEY="sk_live_..."                    # Required for payments
STRIPE_WEBHOOK_SECRET="whsec_..."                  # Required for webhook verification
STRIPE_SUCCESS_URL="https://yourdomain.com/payment/success"  # Optional
STRIPE_CANCEL_URL="https://yourdomain.com/payment/cancel"    # Optional
STRIPE_CURRENCY="AUD"                               # Optional (default: AUD)
```

**Defaults:**
- `STRIPE_SUCCESS_URL` → `{NEXT_PUBLIC_APP_URL}/payment/success`
- `STRIPE_CANCEL_URL` → `{NEXT_PUBLIC_APP_URL}/payment/cancel`
- `STRIPE_CURRENCY` → `AUD`

**If not configured:**
- Payment features disabled
- Invoices can still be created and managed
- Manual payment recording available

#### Slicer (Optional)

```bash
# 3D slicer configuration
SLICER_BIN="prusaslicer"           # Path to slicer binary (default: prusaslicer)
SLICER_DISABLE="1"                 # Set to "1" to disable slicer (use fallback metrics)
SLICER_CONCURRENCY="1"             # Concurrent jobs (1-4, default: 1)
SLICER_TIMEOUT_MS="120000"         # Timeout in milliseconds (default: 120000)
```

**Defaults:**
- `SLICER_BIN` → `prusaslicer`
- `SLICER_CONCURRENCY` → `1`
- `SLICER_TIMEOUT_MS` → `120000` (2 minutes)

**If not configured:**
- Fallback metrics used (3600 seconds, 80 grams)
- Quick order flow still works
- Less accurate pricing estimates

#### Legacy (Unused)

```bash
# No longer used (application uses Supabase)
DATABASE_URL="file:../data/app.db"
```

### Environment Variable Validation

All required environment variables are validated at startup:

```typescript
const missing = (name: string): never => {
  throw new Error(`Missing required environment variable: ${name}`);
};

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? missing('NEXT_PUBLIC_SUPABASE_URL');
}
```

### Configuration Access

Environment variables are accessed through centralized helper functions:

**Location:** `/src/lib/env.ts`

```typescript
import {
  getSupabaseUrl,
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getStripeSecretKey,
  getStripeWebhookSecret,
  getStripeCurrency,
  getAppUrl,
} from '@/lib/env';
```

This provides:
- Type safety
- Consistent defaults
- Validation on access
- Easy mocking in tests

### Production Checklist

Before deploying to production, ensure:

- [x] `NEXT_PUBLIC_SUPABASE_URL` is set
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- [x] `SUPABASE_SERVICE_ROLE_KEY` is set
- [x] `NEXT_PUBLIC_APP_URL` is set to production domain
- [ ] `STRIPE_SECRET_KEY` is set (if using payments)
- [ ] `STRIPE_WEBHOOK_SECRET` is set (if using payments)
- [ ] `STRIPE_SUCCESS_URL` is set to production URL
- [ ] `STRIPE_CANCEL_URL` is set to production URL
- [ ] Supabase storage buckets created: `attachments`, `pdfs`, `tmp`, `order-files`
- [ ] Supabase RLS policies configured
- [ ] Stripe webhook endpoint configured: `{APP_URL}/api/stripe/webhook`

---

## Summary

The 3D Print Sydney application integrates with multiple external services:

1. **Supabase** - Primary backend (database, auth, storage, potential realtime)
2. **Stripe** - Payment processing with checkout sessions and webhooks
3. **Puppeteer + Chromium** - PDF generation from HTML templates
4. **PrusaSlicer/Slic3r** - 3D print estimation (optional)

All integrations include:
- Comprehensive error handling
- Detailed logging
- Graceful degradation
- Type-safe configuration
- Production-ready patterns
