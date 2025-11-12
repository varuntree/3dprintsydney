# 3D Print Sydney - Feature Modules Catalog

## Project Overview

3D Print Sydney is a comprehensive 3D printing business management platform with:
- Admin portal for business management (invoices, quotes, jobs, clients, materials, printers)
- Client portal for order tracking and payment
- Real-time job board for production management
- 3D model viewer & processing capabilities
- Stripe payment integration
- Email & messaging system

**Stack:** Next.js 14 (App Router), TypeScript, React, Supabase, Tailwind CSS, React Hook Form, Zod

---

## Core Features

### 1. Invoices Module

**Purpose:** Manage invoicing, payments, and billing for print jobs

**UI Components** (`src/components/invoices/`)
- `invoice-editor.tsx` (970 LOC) - Full invoice creation/editing form with line items
- `invoice-view.tsx` (285 LOC) - Read-only invoice display with totals
- `invoices-view.tsx` (560 LOC) - List/table view of all invoices with filters
- `invoice-payments.tsx` - Payment history and manual payment recording
- `invoice-attachments.tsx` - File attachment management
- `invoice-activity.tsx` - Activity log display
- `modelling-line-item-form.tsx` - Modelling services line item form

**Backend Services** (`src/server/services/invoices.ts` - 1200+ LOC)
- `createInvoice(clientId, input)` - Create new invoice
- `updateInvoice(id, input)` - Update invoice details
- `getInvoice(id)` - Fetch single invoice
- `listInvoices(filters)` - List invoices with pagination/search
- `addInvoiceAttachment(invoiceId, file)` - Upload file to invoice
- `recordPayment(invoiceId, paymentInput)` - Record payment transaction
- `markInvoicePaid(id)` / `markInvoiceUnpaid(id)` - Status transitions
- `voidInvoice(id)` - Mark invoice as void
- `writeOffInvoice(id)` - Mark as write-off
- `applyCredit(invoiceId, amount)` - Apply client credit
- `revertInvoice(id)` - Revert to draft state
- `createStripeCheckout(invoiceId)` - Generate Stripe payment link

**Schemas** (`src/lib/schemas/invoices.ts`)
- `InvoiceInput` - Full invoice creation/update
- `InvoiceLineInput` - Individual line item (print or modelling)
- `PaymentInput` - Payment recording

**Types** (`src/lib/types/invoices.ts`)
- `InvoiceDetailDTO` - Full invoice with relations (client, lines, payments, jobs, attachments)
- `InvoiceSummaryDTO` - Lightweight list view (id, number, client, status, amounts)
- `InvoiceLineDTO` - Line item with discounts & calculator breakdown
- `PaymentDTO` - Payment transaction record
- `InvoiceAttachmentDTO` - File metadata
- `InvoiceJobDTO` - Linked job data
- `PaymentTermDTO` - Payment term configuration
- `InvoiceFilters` - Query parameters (q, statuses, sort, pagination)

**API Routes** (`src/app/api/invoices/`)
- `POST/GET /invoices` - Create/list invoices
- `GET/PUT /invoices/[id]` - Fetch/update specific invoice
- `POST /invoices/[id]/mark-paid` - Mark paid
- `POST /invoices/[id]/mark-unpaid` - Mark unpaid
- `POST /invoices/[id]/void` - Void invoice
- `POST /invoices/[id]/write-off` - Write-off invoice
- `POST /invoices/[id]/revert` - Revert to draft
- `POST /invoices/[id]/apply-credit` - Apply wallet credit
- `POST /invoices/[id]/payments` - Record payment
- `DELETE /invoices/[id]/payments/[paymentId]` - Delete payment
- `POST /invoices/[id]/attachments` - Upload file
- `DELETE /invoices/[id]/attachments/[attachmentId]` - Delete file
- `POST /invoices/[id]/stripe-session` - Create Stripe checkout
- `GET /invoices/[id]/activity` - Activity log
- `GET/POST /invoices/[id]/messages` - Messages

**Key Business Logic**
- Line total calculation with discount support (PERCENT/FIXED)
- Document totals: subtotal → discount → shipping → tax
- Payment tracking (STRIPE, BANK_TRANSFER, CASH, OTHER)
- Invoice status flow: PENDING → PAID/OVERDUE
- Line types: PRINT (auto-calculated) vs MODELLING (manual hourly)
- Stripe integration for online payments
- Auto job creation based on settings
- Student discount application
- Email notifications on state changes

---

### 2. Quotes Module

**Purpose:** Create, manage, and convert quotes to invoices

**UI Components** (`src/components/quotes/`)
- `quote-editor.tsx` (1900 LOC) - Full quote creation/editing with line items
- `quote-view.tsx` (650 LOC) - Quote display for admin/client
- `quotes-view.tsx` (360 LOC) - List view of quotes with filters

**Backend Services** (`src/server/services/quotes.ts` - 900+ LOC)
- `createQuote(clientId, input)` - Create new quote
- `updateQuote(id, input)` - Update quote
- `getQuote(id)` - Fetch single quote
- `listQuotes(filters)` - List with pagination/search
- `sendQuote(id)` - Email quote to client
- `acceptQuote(id)` - Mark as accepted
- `declineQuote(id, note)` - Decline with reason
- `convertToInvoice(quoteId)` - Convert accepted quote to invoice

**Schemas** (`src/lib/schemas/quotes.ts`)
- `QuoteInput` - Quote creation/update
- `QuoteLineInput` - Line item
- `QuoteStatusInput` - Status update

**Types** (`src/lib/types/quotes.ts`)
- `QuoteDetailDTO` - Full quote with client, lines, status history
- `QuoteSummaryDTO` - List view (id, number, client, status, total, dates)
- `QuoteLineDTO` - Line item details
- `QuoteFilters` - Query parameters

**API Routes** (`src/app/api/quotes/`)
- `POST/GET /quotes` - Create/list
- `GET/PUT /quotes/[id]` - Fetch/update
- `POST /quotes/[id]/send` - Send to client
- `POST /quotes/[id]/accept` - Accept quote
- `POST /quotes/[id]/decline` - Decline with note
- `POST /quotes/[id]/convert` - Convert to invoice

**Key Business Logic**
- Same calculation engine as invoices
- Quote status: DRAFT → PENDING → ACCEPTED/DECLINED → CONVERTED
- Expiry dates for quote validity
- Quote → Invoice conversion preserves line items
- Email delivery tracking
- Supports decision notes for declined quotes

---

### 3. Jobs Module

**Purpose:** Manage print job queue, assignment, and tracking

**UI Components** (`src/components/jobs/`)
- `job-board.tsx` (1800 LOC) - Kanban board with printer columns, drag-drop job assignment

**Backend Services** (`src/server/services/jobs.ts` - 900+ LOC)
- `getJobBoard(filters)` - Fetch complete board state
- `assignJobToPrinter(jobId, printerId)` - Assign to printer
- `unassignJob(jobId)` - Remove printer assignment
- `updateJobStatus(jobId, status)` - Update status
- `startJob(jobId)` - Mark as printing
- `pauseJob(jobId)` - Pause printing
- `completeJob(jobId)` - Complete & auto-detach if enabled
- `archiveJob(jobId)` - Archive completed job
- `listClientJobs(clientId)` - Get jobs for client portal
- `getClientProjectSummary(clientId)` - Project portfolio summary

**Types** (`src/lib/types/jobs.ts`)
- `JobCardDTO` - Individual job with all display data (title, status, priority, printer, queue position)
- `JobBoardColumnDTO` - Printer column (jobs + metrics: queued, active, estimated hours)
- `JobBoardSnapshotDTO` - Full board state (columns + summary metrics)
- `JobFilters` - Query filters

**Schemas** (`src/lib/schemas/jobs.ts`)
- `JobUpdateInput` - Status/assignment updates
- `JobStatusInput` - Status transition validation

**API Routes** (`src/app/api/jobs/`)
- `GET /jobs/board` - Fetch job board
- `POST /jobs/[id]/assign` - Assign to printer
- `POST /jobs/[id]/unassign` - Remove assignment
- `POST /jobs/[id]/status` - Update status
- `POST /jobs/[id]/start` - Start printing
- `POST /jobs/[id]/pause` - Pause
- `POST /jobs/[id]/complete` - Complete
- `POST /jobs/[id]/archive` - Archive

**Enums**
- `JobStatus`: QUEUED, PRE_PROCESSING, IN_QUEUE, PRINTING, PAUSED, PRINTING_COMPLETE, POST_PROCESSING, PACKAGING, OUT_FOR_DELIVERY, COMPLETED, CANCELLED
- `JobPriority`: NORMAL, FAST_TRACK, URGENT
- `PrinterStatus`: ACTIVE, MAINTENANCE, OFFLINE

**Key Business Logic**
- Auto job creation from invoices (policy: ON_PAYMENT or ON_INVOICE)
- Queue position management (reordering)
- Printer capacity limits
- Active job limits per printer
- Status notifications to clients
- Estimated vs actual hours tracking
- Archive rules (auto-archive completed after N days)
- Client project portfolio (active/completed/archived views)

---

### 4. Clients Module

**Purpose:** Manage client information, contacts, and relationships

**UI Components** (`src/components/clients/`)
- `client-detail.tsx` (970 LOC) - Full client profile, invoices, quotes, jobs, activity
- `clients-view.tsx` (560 LOC) - Client list with search/sort
- `client-create-form.tsx` (325 LOC) - Create/edit client form
- `add-credit-modal.tsx` (210 LOC) - Add wallet credit dialog
- `client-form-shared.ts` - Shared form utilities

**Backend Services** (`src/server/services/clients.ts` - 600+ LOC)
- `createClient(input)` - Create new client
- `updateClient(id, input)` - Update client details
- `getClient(id)` - Fetch client with relations (invoices, quotes, jobs, activity)
- `listClients(filters)` - List with pagination/search
- `addClientNote(clientId, note)` - Add internal note
- `addClientCredit(clientId, amount)` - Add wallet credit
- `getClientStudentDiscount(clientId)` - Fetch student discount eligibility

**Schemas** (`src/lib/schemas/clients.ts`)
- `ClientInput` - Client creation/update
- `ClientNoteInput` - Internal note

**Types** (`src/lib/types/clients.ts`)
- `ClientDetailDTO` - Full profile: client info, invoices, quotes, jobs, activity, totals
- `ClientSummaryDTO` - List view: name, company, contact, balances, counts
- `ClientFilters` - Query parameters

**API Routes** (`src/app/api/clients/`)
- `POST/GET /clients` - Create/list
- `GET/PUT /clients/[id]` - Fetch/update
- `POST /clients/[id]/notes` - Add note
- `POST /clients/[id]/credit` - Add credit
- `GET /clients/[id]/credit` - Get credit balance

**Key Business Logic**
- Client wallet/credit system
- Student discount tracking (eligible flag, percentage)
- Payment terms per client
- Job status notifications opt-in
- ABN/company tracking
- Tags for categorization
- Total outstanding balance calculation

---

### 5. Quick Order Module

**Purpose:** Simplified order flow for clients - upload, price, pay

**UI Components** (`src/app/(client)/quick-order/`)
- File upload interface
- 3D model preview (using ModelViewer)
- Material & settings selection
- Real-time pricing calculation
- Shipping option selection
- Checkout

**Backend Services** (`src/server/services/quick-order.ts` - 600+ LOC)
- `priceQuickOrder(items, clientLocation)` - Calculate pricing
- `createQuickOrderInvoice(items, clientId)` - Create invoice from order
- `previewPricing(item)` - Per-item price preview
- `calculateShipping(region, weight)` - Shipping quote

**Pricing Logic**
- Material cost (grams × price per gram)
- Support material cost (if enabled)
- Print time cost (hours × hourly rate)
- Machine time cost
- Layer height/infill variations
- Regional shipping (including remote surcharge)
- Tax calculation
- Student/client discounts

**Schema** (`src/lib/schemas/quick-order.ts`)
- Material selection
- Support settings (pattern, angle, style)
- Layer height & infill configuration

**Key Features**
- Real-time pricing as user changes settings
- Support generation options (normal/tree pattern)
- Fallback metrics from previous jobs
- Temporary file storage during order composition
- Shipping region detection by postcode
- Integration with TMP file service

---

### 6. 3D Processing & Visualization

**Purpose:** Model viewing, orientation, support detection, slicing

**UI Components** (`src/components/3d/`)
- `ModelViewer.tsx` (1200 LOC) - Three.js-based 3D viewer with interactive controls
- `ModelViewerWrapper.tsx` - Wrapper component for safe mounting
- `OrientationGizmo.tsx` - 3D gizmo for model orientation
- `RotationControls.tsx` - Mouse/touch rotation controls
- `ViewNavigationControls.tsx` - Pan/zoom/reset controls
- `BuildPlate.tsx` - Visual representation of print bed
- `OverhangHighlight.tsx` - Highlight unprintable overhangs

**Backend Services**
- `src/server/geometry/load-geometry.ts` - Load STL/OBJ files
- `src/server/geometry/orient.ts` - Apply rotation to model
- `src/server/slicer/runner.ts` - Run slicer CLI (convert model to G-code)

**3D Libraries**
- `src/lib/3d/geometry.ts` - 3D math utilities
- `src/lib/3d/coordinates.ts` - Coordinate system helpers
- `src/lib/3d/overhang-detector.ts` - Detect unprintable areas (>45° overhangs)
- `src/lib/3d/face-alignment.ts` - Auto-orient model for printability
- `src/lib/3d/orientation.ts` - Orientation state management
- `src/lib/3d/export.ts` - Export processed models

**Key Features**
- WebGL context management
- STL file parsing & rendering
- Real-time overhang detection
- Automatic model orientation suggestions
- Support pattern visualization (tree vs normal)
- Layer height visualization
- Infill preview

---

### 7. Materials & Catalog

**Purpose:** Manage printable materials, printers, and product templates

**UI Components** (`src/components/`)
- `materials/materials-view.tsx` - Material list with pricing
- `printers/printers-view.tsx` - Printer list with status
- `products/products-view.tsx` - Product template catalog

**Backend Services** (`src/server/services/`)
- `materials.ts` - Material CRUD & pricing
- `printers.ts` - Printer management & status
- `product-templates.ts` - Product template library

**Schemas** (`src/lib/schemas/catalog.ts`)
- Material: name, price per gram, infill profiles
- Printer: name, build plate size, status
- Product template: pre-configured materials/settings

**Key Data**
- Material properties: density, cost, color
- Printer capabilities: max size, nozzle diameter
- Support materials (tree supports, breakaway, etc)
- Layer height options (0.1mm - 0.3mm)
- Infill percentages (10-100%)

---

### 8. Messages & Communication

**Purpose:** Client-admin messaging system (linked to invoices/jobs)

**UI Components** (`src/components/messages/`)
- `conversation.tsx` - Message thread with auto-scroll
- `message-bubble.tsx` - Individual message display
- `date-header.tsx` - Date separator

**Backend Services** (`src/server/services/messages.ts`)
- `addMessage(threadId, clientId, body)` - Post message
- `getMessages(threadId)` - Fetch thread messages
- `createMessageThread(clientId, context)` - Start conversation

**Types** (`src/lib/types/messages.ts`)
- `MessageThread` - Conversation with participants
- `Message` - Individual message

**Schema** (`src/lib/schemas/messages.ts`)
- Message creation validation

**Features**
- Auto-created threads per invoice/job
- Participant tracking
- Timestamp ordering
- Linked to business context (invoice, job)

---

### 9. Authentication & Users

**Purpose:** Multi-role auth (Admin/Client), user management

**Backend Services** (`src/server/services/auth.ts`)
- `signUp(email, password)` - Register admin user
- `logIn(email, password)` - Admin login
- `createClientUser(clientId)` - Create client portal account
- `validateSession()` - Check auth status

**Types** (`src/lib/types/user.ts`)
- `AuthUser` - Current authenticated user
- `ClientUser` - Client portal account

**Schemas** (`src/lib/schemas/auth.ts`)
- Sign up/login validation

**Features**
- Supabase Auth backend
- Role-based access (ADMIN/CLIENT)
- Session management
- Password hashing

---

### 10. Settings & Configuration

**Purpose:** Global app settings and pricing rules

**Backend Services** (`src/server/services/settings.ts`)
- `getSettings()` - Fetch all configuration
- `updateSettings(input)` - Update settings
- `resolvePaymentTermsOptions()` - Get available payment terms
- `getShippingRegions()` - Get shipping configuration

**Schema** (`src/lib/schemas/settings.ts`)
- Payment terms (IMMEDIATE, NET30, NET60, etc)
- Shipping regions (AU state-based)
- Tax rate
- Default job creation policy
- Auto-archive rules
- Email configuration

**UI Components** (`src/components/settings/`)
- `settings-form.tsx` - Admin settings editor

**Types** (`src/lib/types/dashboard.ts`)
- Settings configuration structure

---

### 11. Dashboard & Analytics

**Purpose:** Admin overview, metrics, and business intelligence

**UI Components** (`src/components/dashboard/`)
- `dashboard-view.tsx` - KPI cards, charts, quick stats

**Backend Services** (`src/server/services/dashboard.ts`)
- `getDashboardMetrics()` - Fetch overview data
- `getRevenueByMonth()` - Revenue chart
- `getJobMetrics()` - Job status breakdown
- `getClientMetrics()` - Top clients, new signups

**Types** (`src/lib/types/dashboard.ts`)
- `DashboardMetrics` - KPI structure

**Key Metrics**
- Total revenue (monthly/ytd)
- Outstanding balance
- Job count by status
- Printer utilization
- Client activity
- Payment collection rate

---

### 12. Client Portal Features

**Purpose:** Client self-service for orders, invoices, projects

**UI Components** (`src/components/client/`)
- `client-dashboard.tsx` (600 LOC) - Dashboard with active/completed projects
- `active-projects-view.tsx` - Ongoing jobs and invoices
- `completed-projects-view.tsx` - Historical projects
- `archived-projects-view.tsx` - Archived work
- `print-again-view.tsx` - Reorder previous prints
- `invoice-payment-section.tsx` - Payment interface
- `pay-online-button.tsx` - Stripe payment button
- `payment-method-modal.tsx` - Payment method selection

**Routes** (`src/app/(client)/`)
- `/dashboard` - Main portal
- `/projects` - Project portfolio
- `/quick-order` - New order form
- `/invoices` - Invoice list & details
- `/account` - Profile settings

**Features**
- View active/completed/archived projects
- Track job status in real-time
- Download invoices (PDF)
- Pay online via Stripe
- Reorder previous prints
- Message support team
- Manage account & password

---

## Shared Utilities & Libraries

### Calculations (`src/lib/calculations.ts`)
```typescript
calculateLineTotal(quantity, unitPrice, discountType, discountValue)
calculateDocumentTotals(lines, discountType, discountValue, shippingCost, taxRate)
```

### Formatting (`src/lib/utils/formatters.ts`)
- `formatCurrency(amount, locale)` - Currency formatting
- Date/time formatting helpers

### Validators (`src/lib/utils/validators.ts`)
- Email validation
- File type validation
- Invoice attachment validation
- ABN validation (Australian Business Number)

### Auth Helpers (`src/lib/utils/auth-helpers.ts`)
- Session management
- Role checking
- Protected route logic

### API Utilities (`src/lib/utils/api-params.ts`)
- Query parameter parsing
- Pagination helpers
- Filter building

### Supabase Clients
- `src/lib/supabase/browser.ts` - Client-side Supabase instance
- `src/lib/supabase/server.ts` - Server-side instance
- `src/server/supabase/service-client.ts` - Service role client for admin operations

### Navigation (`src/lib/navigation.ts`)
- Route definitions
- URL builders
- Breadcrumb generation

### Constants (`src/lib/constants/`)
- `enums.ts` - Status/type enums (InvoiceStatus, QuoteStatus, JobStatus, etc)
- `client-project-status.ts` - Client-visible status mappings

### Logging (`src/lib/logger.ts`)
- Structured logging with correlation IDs
- Error tracking
- Performance monitoring

### PDF Generation (`src/lib/pdf/`)
- `data.ts` - PDF data extraction from invoices/quotes
- `stripe.ts` - Stripe receipt PDF handling

### Email Service (`src/server/services/email.ts`)
- Invoice/quote delivery
- Payment confirmations
- Job status notifications
- Template rendering

### Student Discount (`src/server/services/student-discount.ts`)
- Verify student status
- Apply discounts
- Track eligibility

### File Management (`src/server/services/`)
- `tmp-files.ts` - Temporary file storage during order composition
- `order-files.ts` - Save finalized print files
- Storage integration with Supabase

### Stripe Integration (`src/server/services/stripe.ts`)
- Create payment sessions
- Handle webhooks
- Process refunds

---

## Component Architecture Patterns

### Page Components (`src/app/[route]/page.tsx`)
- Server components by default
- Data fetching with auth guards
- Layout composition

### Feature Components
**Convention:** Named by feature + function
- `feature-list.tsx` - Table/grid view
- `feature-view.tsx` - Detail/read-only display
- `feature-editor.tsx` - Create/edit form
- `feature-detail.tsx` - Full page detail with tabs/sections

**Example:** Invoices
- `invoice-editor.tsx` - Form wrapper
- `invoice-view.tsx` - Display
- `invoices-view.tsx` - List
- `invoice-activity.tsx` - Activity tab
- `invoice-payments.tsx` - Payments tab

### UI Components (`src/components/ui/`)
**Shadcn/ui-based atomic components**
- Form primitives: `button.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`
- Containers: `card.tsx`, `sheet.tsx`, `dialog.tsx`
- Display: `badge.tsx`, `alert.tsx`, `status-badge.tsx`, `metric-card.tsx`
- Navigation: `tabs.tsx`, `breadcrumb.tsx`, `navigation-link.tsx`
- Layout: `table.tsx`, `scroll-area.tsx`, `separator.tsx`
- Specialized: `action-button.tsx`, `loading-button.tsx`, `pdf-generate-button.tsx`

### Layout Components (`src/components/layout/`)
- `admin-shell.tsx` - Admin portal wrapper (sidebar, header, nav)
- `client-shell.tsx` - Client portal wrapper
- `user-profile.tsx` - User menu

### Provider Pattern (`src/components/providers/`)
- `app-providers.tsx` - Root context providers (auth, query, theme)
- `analytics.tsx` - Analytics tracking

### React Hook Form + Zod
**All forms follow pattern:**
```typescript
const form = useForm({ resolver: zodResolver(schema), defaultValues })
<Form {...form}>
  <FormField control={form.control} name="field" render={...} />
</Form>
```

### Server Actions (App Router)
- Form submissions via `'use server'` functions
- Validation with Zod schemas
- Error handling with AppError, NotFoundError types

---

## Data Flow Patterns

### Invoices Example
1. **Create Invoice**
   - Page: `src/app/(admin)/invoices/new/page.tsx`
   - Component: `invoice-editor.tsx` with form
   - Action: `POST /api/invoices` → `invoices.createInvoice()`
   - Service calculates totals, stores in DB
   - Returns `InvoiceDetailDTO` with ID

2. **List Invoices**
   - Page: `src/app/(admin)/invoices/page.tsx`
   - Component: `invoices-view.tsx` with table
   - Action: `GET /api/invoices?q=&statuses=PENDING` → `invoices.listInvoices(filters)`
   - Returns array of `InvoiceSummaryDTO`
   - Client-side filtering/sorting via table component

3. **View Invoice**
   - Page: `src/app/(admin)/invoices/[id]/page.tsx`
   - Component: `invoice-view.tsx` with tabs
   - Fetch: `GET /api/invoices/[id]` → `invoices.getInvoice(id)`
   - Returns `InvoiceDetailDTO`
   - Display all related data: lines, payments, jobs, attachments

4. **Payment Recording**
   - Component: `invoice-payments.tsx`
   - Action: `POST /api/invoices/[id]/payments` → `invoices.recordPayment()`
   - Updates payment status
   - Triggers email notification if enabled
   - Updates invoice balance

### Jobs Example
1. **Load Job Board**
   - Page: `src/app/(admin)/jobs/page.tsx`
   - Component: `job-board.tsx`
   - Fetch: `GET /api/jobs/board` → `jobs.getJobBoard(filters)`
   - Returns `JobBoardSnapshotDTO` with columns per printer
   - Real-time updates via polling/websocket (if implemented)

2. **Assign Job**
   - Drag-drop in board component
   - Action: `POST /api/jobs/[id]/assign?printerId=X` → `jobs.assignJobToPrinter()`
   - Validates printer status
   - Checks capacity limits
   - Updates queue position
   - Sends notification if client opted-in

3. **Update Status**
   - Status button in job card
   - Action: `POST /api/jobs/[id]/status?status=PRINTING` → `jobs.updateJobStatus()`
   - Validates status transition
   - Logs activity
   - May trigger notifications

---

## Database Schema (Key Tables)

### Core Entities
- `clients` - Client profiles
- `users` (auth) - Admin & client users
- `invoices` - Invoice documents
- `invoice_lines` - Line items
- `invoice_payments` - Payment records
- `invoice_attachments` - File attachments
- `quotes` - Quote documents
- `quote_lines` - Quote line items
- `jobs` - Print jobs
- `printers` - Printer inventory
- `materials` - Material catalog
- `product_templates` - Pre-built products
- `settings` - App configuration
- `messages` - Conversation messages
- `activity_logs` - Audit trail

---

## Feature Modules Summary

| Module | Components | Services | Key Types | Purpose |
|--------|-----------|----------|-----------|---------|
| Invoices | 7 | invoices.ts | InvoiceDetailDTO | Billing & payment management |
| Quotes | 3 | quotes.ts | QuoteDetailDTO | Estimate & quote management |
| Jobs | 1 | jobs.ts | JobBoardSnapshotDTO | Production queue management |
| Clients | 4 | clients.ts | ClientDetailDTO | Client relationship mgmt |
| Quick Order | Form UI | quick-order.ts | QuickOrderPrice | Self-service ordering |
| 3D Viewer | 7 | geometry, slicer | Geometry data | Model visualization |
| Materials | 1 | materials.ts | Material | Catalog mgmt |
| Printers | 1 | printers.ts | Printer | Equipment mgmt |
| Messages | 3 | messages.ts | MessageThread | Communication |
| Auth | Forms | auth.ts | AuthUser | User management |
| Settings | 1 | settings.ts | SettingsInput | Configuration |
| Dashboard | 1 | dashboard.ts | DashboardMetrics | Analytics & overview |
| Client Portal | 9 | (shared) | (shared) | Client self-service |

---

## Cross-Feature Integrations

### Invoice → Jobs
- Auto-job creation when invoice paid (based on policy)
- Job linked to invoice for tracking
- Job status visible in invoice detail

### Invoice → Payments → Stripe
- Generate Stripe checkout session from invoice
- Webhook listener records payment
- Auto-marks invoice PAID if Stripe confirms

### Quote → Invoice
- Quote conversion creates new invoice
- Preserves all line items
- Linked via `converted_invoice_id`

### Jobs → Notifications
- Job status changes trigger client email (if opted-in)
- Messages in invoice thread
- Activity log recorded

### Quick Order → Invoice
- Creates temporary files during composition
- Generates pricing with real-time calculations
- Creates invoice with order items as lines
- Integrates 3D model processing

### Client → Projects
- Dashboard shows active/completed projects
- Projects are invoices with associated jobs
- Reorder feature lets clients repeat previous orders

### Materials → Quick Order → Pricing
- Material pricing used in quick order calc
- Printer capabilities considered for feasibility
- Support material options per material

---

## Development Patterns

### Adding a New Feature
1. **Create Schema** (`src/lib/schemas/feature.ts`)
   - Zod validation rules
   - Input types

2. **Create Types** (`src/lib/types/feature.ts`)
   - DTO for detail view
   - DTO for list view
   - Filter type

3. **Create Service** (`src/server/services/feature.ts`)
   - CRUD operations
   - Business logic
   - Database queries

4. **Create API Route** (`src/app/api/feature/route.ts`)
   - Request validation
   - Call service
   - Response mapping

5. **Create Components**
   - `feature-view.tsx` - Read-only display
   - `feature-editor.tsx` - Create/edit form
   - `feature-list.tsx` - List view

6. **Create Page** (`src/app/(admin)/feature/page.tsx`)
   - Compose components
   - Add to navigation

### Testing
- Unit tests in `__tests__` directories
- Service tests for business logic
- Component tests for UI behavior
- No E2E suite currently (area for improvement)

### Error Handling
- Custom error classes: `AppError`, `NotFoundError`, `BadRequestError`
- Propagated to client with status codes
- User-facing messages in `lib/errors/user-messages.ts`

---

## Areas for Improvement

1. **Testing** - Limited unit/integration test coverage
2. **Logging** - Could be more comprehensive for debugging
3. **Error Handling** - Some routes lack proper validation
4. **Performance** - Pagination could be stricter on large datasets
5. **Documentation** - Type documentation could be more detailed
6. **Accessibility** - Form labels and ARIA attributes could be enhanced

---

Generated: November 12, 2025
