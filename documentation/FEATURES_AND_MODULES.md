# Features & Modules

**Last Updated:** 2025-10-21
**Status:** Complete System Inventory

This document provides a comprehensive catalog of all user-facing features, backend modules, and system capabilities in the 3D Print Sydney platform.

---

## Table of Contents

1. [Admin Portal Features](#admin-portal-features)
2. [Client Portal Features](#client-portal-features)
3. [Public Features](#public-features)
4. [Shared Features](#shared-features)
5. [Feature Access Matrix](#feature-access-matrix)
6. [UI Component Catalog](#ui-component-catalog)
7. [Pricing & Calculation Engine](#pricing--calculation-engine)
8. [Automated Workflows](#automated-workflows)
9. [Technical Modules](#technical-modules)

---

## Admin Portal Features

**Base Path:** `/src/app/(admin)/`

### 1. Dashboard (Daily Console)
**Route:** `/` (admin homepage)
**Component:** `DashboardView`

**Capabilities:**
- Real-time business metrics (revenue, outstanding balance, queued jobs)
- Revenue trend visualization (last 6 months sparkline chart)
- Quote pipeline status breakdown (Pending, Accepted, Converted, Declined, Draft)
- Outstanding invoices tracking with overdue detection
- Printer load monitoring (active vs queued jobs per printer)
- Recent activity timeline (infinite scroll with pagination)
- Time range filtering (Today, 7 days, 30 days, Year-to-Date)
- Executive overview metrics with percentage deltas
- Responsive layout with color-coded status indicators

**Key Metrics Displayed:**
- Revenue change (vs previous period)
- Invoices overdue count
- Jobs printing / queued
- Quotes pending / accepted

---

### 2. Client Management
**Route:** `/clients`
**Component:** `ClientsView`

**Capabilities:**
- Client listing with search and filtering
- Create new clients (inline dialog with validation)
- View client details (/clients/[id])
- Edit client information (company, contact, address)
- Track client statistics (total orders, revenue, outstanding balance)
- Client activity history
- Associated invoices and quotes view
- Quick actions (create quote, create invoice for client)

**Client Data Tracked:**
- Company name, contact person
- Email, phone
- Full address details
- Creation date
- Financial summaries

---

### 3. Quote Management
**Route:** `/quotes`
**Components:** `QuotesView`, `QuoteEditor`

**Capabilities:**
- Quote listing with status filtering
- Create new quotes (/quotes/new)
- Edit existing quotes (/quotes/[id])
- View quote details with PDF preview
- Convert quotes to invoices (one-click)
- Quote status transitions (Draft → Pending → Accepted/Declined → Converted)
- Line item management with product templates
- Discount application (percentage or fixed)
- Shipping cost configuration
- Tax calculation
- Quote expiry date tracking
- PDF generation and email delivery
- Bulk actions on quotes

**Quote Statuses:**
- `DRAFT` - Not yet sent to client
- `PENDING` - Awaiting client response
- `ACCEPTED` - Client accepted
- `DECLINED` - Client declined
- `CONVERTED` - Converted to invoice

---

### 4. Invoice Management
**Route:** `/invoices`
**Components:** `InvoicesView`, `InvoiceEditor`

**Capabilities:**
- Invoice listing with advanced filtering (status, date range, client)
- Create new invoices (/invoices/new)
- Edit existing invoices (/invoices/[id])
- View invoice details with line items
- Payment tracking (record payments, refunds)
- Invoice status management (Draft, Pending, Paid, Overdue, Cancelled)
- PDF generation and download
- Email invoices to clients
- Stripe payment integration (online payment links)
- Balance due calculation
- Due date tracking with overdue detection
- PO number support
- Custom terms and notes
- Line item product templates

**Invoice Statuses:**
- `DRAFT` - Not finalized
- `PENDING` - Awaiting payment
- `PAID` - Fully paid
- `OVERDUE` - Past due date
- `CANCELLED` - Voided

**Payment Features:**
- Record manual payments (cash, bank transfer)
- Online payment via Stripe Checkout
- Wallet credit application (full or partial payment)
- Payment method selection modal (credits, card, or both)
- Payment history tracking
- Balance calculation (total - payments - credits applied)

---

### 5. Job Tracking & Production Board
**Route:** `/jobs`
**Component:** `JobsBoard`

**Capabilities:**
- Kanban-style job board organized by printer
- Job status visualization (Queued, Pre-processing, In Queue, Printing, Paused)
- Drag-and-drop job assignment to printers
- Job metrics per printer (count, total time, material usage)
- Job priority management (Low, Normal, High, Urgent)
- Real-time job status updates
- Job creation from invoices
- Job filtering (hide archived, status filters)
- Printer capacity overview
- Time tracking (queued, started, completed)

**Job Statuses:**
- `QUEUED` - Ready for production
- `PRE_PROCESSING` - File preparation
- `IN_QUEUE` - Waiting for printer
- `PRINTING` - Currently printing
- `PAUSED` - Temporarily stopped
- `COMPLETED` - Finished
- `FAILED` - Print failed
- `CANCELLED` - Cancelled

**Job Board Layout:**
- Column per printer showing assigned jobs
- Unassigned jobs queue
- Per-printer metrics (active/queued counts)
- Visual priority indicators

---

### 6. Printer Management
**Route:** `/printers`
**Component:** `PrintersView`

**Capabilities:**
- Printer inventory management
- Add/edit/archive printers
- Printer specifications (model, build volume, nozzle size)
- Printer status tracking (Available, Busy, Maintenance, Offline)
- Material type compatibility
- Printer metrics (total jobs, hours printed)
- Assign printers to jobs
- Printer utilization reports

**Printer Data:**
- Name, model
- Status (Available, Busy, Maintenance, Offline)
- Build volume dimensions
- Compatible materials
- Creation and update timestamps

---

### 7. Material Management
**Route:** `/materials`
**Component:** `MaterialsView`

**Capabilities:**
- Material catalog management
- Add/edit/archive materials
- Material properties (type, color, density)
- Cost per gram pricing
- Material availability status
- Material usage tracking (linked to jobs)
- Supplier information
- Inventory management

**Material Data:**
- Name (e.g., "PLA", "ABS", "PETG")
- Type classification
- Color/finish
- Cost per gram
- Density (g/cm³)
- Availability status

---

### 8. Product Catalog (Templates)
**Route:** `/products`
**Component:** `ProductsView`

**Capabilities:**
- Product template library
- Create reusable product templates
- Template pricing with calculator configurations
- Material associations
- Quick add templates to quotes/invoices
- Template categories
- Base price configuration
- Volume-based pricing tiers
- Calculator settings for auto-pricing

**Product Template Features:**
- Name, description
- Base price
- Associated material
- Calculator configuration (for 3D models)
- Reusable across quotes and invoices

---

### 9. Reports & Data Exports
**Route:** `/reports`
**Component:** Client-side export interface

**Capabilities:**
- Date range selection (Today, 7 days, 30 days, Year-to-Date, custom)
- CSV exports for:
  - **Invoices** - All invoice data within date range
  - **Payments** - Payment transactions
  - **Jobs** - Print jobs created
  - **AR Aging** - Outstanding invoices by aging buckets
  - **Material Usage** - Usage by material type
  - **Printer Utilization** - Hours and jobs per printer
- Calendar-based date picker
- Quick range presets
- Real-time export status
- Downloadable CSV files with proper headers

---

### 10. System Settings
**Route:** `/settings`
**Component:** `SettingsForm`

**Capabilities:**
- Business identity configuration
  - Company name, ABN
  - Contact details
  - Logo upload (future)
- Tax rate configuration
- Invoice/Quote numbering patterns
- Default payment terms
- Shipping regions and rates
  - Region definitions (NSW, VIC, QLD, etc.)
  - Base shipping amounts
  - Remote area surcharges
  - Postcode-based pricing rules
- Default settings for new documents
- System preferences

**Configurable Settings:**
- Business name, ABN, email, phone, address
- Tax rate (%)
- Invoice prefix, quote prefix
- Default payment terms (days)
- Shipping regions with base rates and remote surcharges

---

### 11. User Management
**Route:** `/users`
**Component:** Admin users page

**Capabilities:**
- User listing (all users - admin and client)
- Invite new users (admin or client)
- User role management (ADMIN, CLIENT)
- Assign users to clients
- Generate temporary passwords
- View user details (/users/[id])
- Track user activity (message count)
- User authentication management

**User Invitation Flow:**
1. Admin enters email and selects role
2. If CLIENT role, must select associated client
3. System generates temporary password
4. Password displayed for admin to share
5. User must change password on first login

---

### 12. Messaging & Communication
**Route:** `/messages`
**Component:** Admin messages interface

**Capabilities:**
- Conversation list (all users)
- User search/filtering
- Select user to view conversation
- Real-time messaging with Conversation component
- Message history
- Unread message indicators (via message count)
- User avatars (first letter of email)
- Conversation view shows:
  - User email and role
  - Full message thread
  - Message composition interface

**Message Features:**
- Send messages to any user
- View message history
- Real-time updates
- Per-user conversation threads

---

### 13. Account Settings (Personal)
**Route:** `/me`
**Purpose:** Admin personal account management

**Capabilities:**
- Change password
- Update personal information
- Security settings
- (Shared with client users via `/account`)

---

## Client Portal Features

**Base Path:** `/src/app/(client)/`

### 1. Client Dashboard
**Route:** `/client`
**Component:** `ClientDashboard`

**Capabilities:**
- Welcome section with personalized greeting
- Quick order call-to-action (prominent)
- Statistics overview:
  - Total orders
  - Pending orders
  - Paid orders
  - Total spent
- Recent orders table (last 5 invoices)
- Current jobs tracking (active print jobs)
- Expandable messaging interface (inline conversation)
- Quick links to:
  - Quick Order flow
  - View all orders
  - Account settings
- Email notification preference indicator

**Dashboard Sections:**
1. **Welcome Header** - Personalized greeting
2. **Quick Actions** - Quick Order, View Orders cards
3. **Stats Cards** - Key metrics at a glance
4. **Current Jobs** - Active print jobs with status
5. **Recent Orders** - Last 5 invoices with links
6. **Messages** - Expandable conversation view (300px collapsed, 600px expanded)

---

### 2. Order Viewing & Management
**Route:** `/client/orders`
**Component:** Client orders list

**Capabilities:**
- View all invoices/orders
- Invoice listing with pagination (20 per page, load more)
- Order details:
  - Invoice number
  - Issue date
  - Status badge
  - Total amount
  - Balance due
- Click invoice number to view details (/client/orders/[id])
- Pay online button (if balance due > 0)
- Status tracking

**Order Detail View (/client/orders/[id]):**
- Full invoice details
- Line items breakdown
- Payment history
- Wallet balance display (if credits available)
- Pay online functionality with payment method selection:
  - Use wallet credits only (if sufficient balance)
  - Use wallet credits + card (partial payment)
  - Pay full amount via card (Stripe Checkout)
- Download PDF (future)

---

### 3. Quick Order (Self-Service Ordering)
**Route:** `/quick-order`
**Component:** Complex multi-step wizard

**Capabilities:**

**Step 1: Upload**
- Drag-and-drop file upload (STL, 3MF)
- Multi-file support
- File size and format validation
- Upload progress indicator
- File list management (add/remove files)

**Step 2: Orient (Optional)**
- 3D model viewer (STLViewerWrapper with Three.js)
 - Camera navigation controls (pan, zoom, top/bottom/front/back/left/right/iso presets, grid/axes toggle)
- Interactive model rotation (X, Y, Z axes)
- Rotation controls (15°, 30°, 45°, 90° increments)
- Reset orientation
- Center model on build plate
- Lock orientation (saves oriented STL)
- Per-file orientation
- Skip orientation option

**Step 3: Configure**
- Per-file settings:
  - Material selection (from available materials)
  - Layer height (0.01mm increments)
  - Infill percentage (0-100%)
  - Quantity
  - Support generation toggle
  - Support pattern (Standard, Organic/Tree)
  - Support angle threshold (degrees)
- Expandable file cards
- Prepare files (triggers slicer analysis)
- Real-time file status indicators:
  - Idle, Preparing, Ready, Fallback, Error
- Fallback estimation handling (accept estimates)
- Validation of settings before pricing

**Step 4: Price**
- Calculate pricing button
- Price breakdown:
  - Subtotal (all items)
  - Shipping (based on location)
  - Total
- Shipping quote with method and surcharges
- Address entry for shipping calculation:
  - Name, phone
  - Address lines
  - City, state, postcode
- Real-time shipping calculation based on postcode

**Step 5: Checkout**
- Review summary
- Confirm address
- Place order
- Stripe Checkout integration (if enabled)
- Or create invoice for manual payment
- Redirect to order confirmation

**Advanced Features:**
- Slicer integration (prepare files with PrusaSlicer via API)
- Material weight and print time estimation
- Fallback estimations when slicer fails
- Support for oriented and non-oriented models
- Real-time pricing updates
- Remote area surcharge calculation

---

### 4. Messaging
**Route:** `/client/messages` → Redirects to `/client`
**Note:** Messages are now integrated into the client dashboard

**Capabilities:**
- Conversation with admin team
- Send and receive messages
- Message history
- Real-time updates (via Conversation component)
- Compact view on dashboard (expandable)

---

### 5. Account Settings
**Route:** `/account`
**Component:** `ChangePasswordForm`

**Capabilities:**
- Change password (current password required)
- Security settings
- Password strength validation
- Account security overview

---

## Public Features

**Base Path:** `/src/app/(public)/`

### 1. User Authentication

**Login**
- Route: `/login`
- Email and password authentication
- Remember me option
- Redirect to appropriate portal (admin or client)
- Error handling
- "Forgot password" link

**Sign Up**
- Route: `/signup`
- New client registration
- Email verification
- Auto-create client account
- Temporary password system (via admin invitation)

**Password Reset**
- Route: `/forgot-password`
- Email-based password reset flow
- Secure token generation
- Route: `/reset-password`
- New password entry with confirmation
- Token validation

---

## Shared Features

Features accessible to both admin and client users.

### 1. 3D Visualization
**Components:** `STLViewerWrapper`, `RotationControls`

**Capabilities:**
- STL file rendering (Three.js)
- Interactive 3D viewer
- Orbit controls (rotate, pan, zoom)
- Model rotation by axis and degree
- Reset orientation
- Center model
- Build plate visualization
- Real-time rendering
- Export oriented STL

**Technology:**
- Three.js for WebGL rendering
- STL loader
- Coordinate system conversion
- Export functionality

---

### 2. PDF Generation
**Service:** `@react-pdf/renderer`

**Capabilities:**
- Quote PDF generation
- Invoice PDF generation
- Custom branding (company details)
- Line items with pricing
- Tax and discount calculations
- Terms and notes inclusion
- Professional formatting

**PDF Features:**
- Company header
- Client details
- Document number and date
- Line items table
- Subtotal, tax, total
- Payment terms
- Custom notes

---

### 3. File Management
**Services:** `tmp-files`, `order-files`

**Capabilities:**
- Temporary file storage (for Quick Order)
- Order file persistence (STL, 3MF)
- File upload handling (Formidable)
- File download/streaming
- File cleanup (temporary files)
- Secure file access (session-based)

**File Types Supported:**
- STL (3D models)
- 3MF (3D models with metadata)
- Oriented STL (post-rotation)

---

### 4. Authentication & Authorization
**Service:** `auth.ts`

**Capabilities:**
- Session-based authentication (cookies)
- Password hashing (bcrypt)
- Role-based access control (ADMIN, CLIENT)
- Temporary password system
- Force password change on first login
- Session management
- Route protection (middleware)

**User Roles:**
- **ADMIN** - Full system access
- **CLIENT** - Limited to client portal

---

### 5. Messaging System
**Component:** `Conversation`

**Capabilities:**
- Real-time messaging (server-side polling)
- Message thread display
- Message composition
- Auto-scroll to latest message
- Message status indicators
- Sender/recipient identification
- Timestamp display
- Infinite scroll (load older messages)

**Message Data:**
- Sender user ID
- Recipient user ID
- Message content (text)
- Timestamp
- Read status (future)

---

## Feature Access Matrix

| Feature | Admin | Client | Public |
|---------|-------|--------|--------|
| Dashboard (Daily Console) | ✅ | ❌ | ❌ |
| Client Dashboard | ❌ | ✅ | ❌ |
| Client Management | ✅ | ❌ | ❌ |
| Quote Management (Create/Edit) | ✅ | ❌ | ❌ |
| Quote Viewing (PDF) | ✅ | ⚠️ (Own quotes) | ❌ |
| Invoice Management (Create/Edit) | ✅ | ❌ | ❌ |
| Invoice Viewing | ✅ | ⚠️ (Own invoices) | ❌ |
| Payment (Online) | ✅ | ✅ | ❌ |
| Job Board | ✅ | ❌ | ❌ |
| Job Viewing | ✅ | ⚠️ (Own jobs) | ❌ |
| Printer Management | ✅ | ❌ | ❌ |
| Material Management | ✅ | ❌ | ❌ |
| Product Templates | ✅ | ❌ | ❌ |
| Reports & Exports | ✅ | ❌ | ❌ |
| System Settings | ✅ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ |
| Quick Order | ✅ | ✅ | ❌ |
| Messaging | ✅ | ✅ | ❌ |
| Account Settings | ✅ | ✅ | ❌ |
| Login/Signup | ❌ | ❌ | ✅ |
| Password Reset | ❌ | ❌ | ✅ |

**Legend:**
- ✅ Full access
- ⚠️ Limited/restricted access (own data only)
- ❌ No access

---

## UI Component Catalog

### Core UI Components (shadcn/ui based)

**Location:** `/src/components/ui/`

**Form Components:**
- Button, LoadingButton
- Input, Textarea
- Select, Combobox
- Calendar, DatePicker
- Switch, Checkbox
- Label
- Form (react-hook-form integration)

**Layout Components:**
- Card, CardHeader, CardContent
- Dialog, DialogTrigger, DialogContent
- Sheet (slide-over)
- Tabs
- Separator
- ScrollArea

**Feedback Components:**
- Toast (Sonner)
- Badge, StatusBadge
- Skeleton (loading states)
- InlineLoader
- DataCard (metric display)
- PageHeader

**Data Display:**
- Table (with sorting, filtering)
- Timeline (activity feed)
- Sparkline (revenue chart)
- Status indicators

**Navigation:**
- Sidebar (admin/client layouts)
- Header with role-based navigation
- Breadcrumbs
- Link (Next.js)

---

### Feature-Specific Components

**Dashboard:**
- `DashboardView` - Main admin dashboard
- `DashboardHeader` - Header with range toggle
- `ExecutiveOverview` - Metrics cards
- `RevenueCard` - Revenue trend chart
- `QuotePipelineCard` - Quote status breakdown
- `OutstandingInvoicesCard` - AR list
- `PrinterLoadCard` - Printer utilization
- `ActivityTimeline` - Recent activity feed

**Client:**
- `ClientDashboard` - Client portal home
- `ClientsView` - Client management table
- `ClientDetails` - Individual client page

**Quotes:**
- `QuotesView` - Quote list
- `QuoteEditor` - Create/edit quotes
- `QuoteLineItemEditor` - Line item management

**Invoices:**
- `InvoicesView` - Invoice list
- `InvoiceEditor` - Create/edit invoices
- `PayOnlineButton` - Stripe payment trigger with credit option
- `PaymentMethodModal` - Payment method selection modal (credits/card)
- `InvoicePaymentSection` - Wallet balance fetching and payment UI wrapper

**Jobs:**
- `JobsBoard` - Kanban job board
- `JobCard` - Individual job display

**Materials/Printers/Products:**
- `MaterialsView` - Material catalog
- `PrintersView` - Printer management
- `ProductsView` - Product template library

**Settings:**
- `SettingsForm` - System settings editor

**Messages:**
- `Conversation` - Message thread UI

**3D Viewer:**
- `STLViewerWrapper` - 3D model renderer
- `RotationControls` - Model rotation interface

---

## Pricing & Calculation Engine

**Location:** `/src/lib/calculations.ts`, `/src/server/services/`

### Line Item Calculation

**Function:** `calculateLineTotal()`

```typescript
Input:
- quantity: number
- unitPrice: number
- discountType: "NONE" | "PERCENT" | "FIXED"
- discountValue: number

Output:
- lineTotal: number

Formula:
base = quantity * unitPrice
if PERCENT: base - (base * discountValue / 100)
if FIXED: base - discountValue
else: base
```

### Document Totals Calculation

**Function:** `calculateDocumentTotals()`

```typescript
Input:
- lines: { total: number }[]
- discountType: "NONE" | "PERCENT" | "FIXED"
- discountValue: number
- shippingCost: number
- taxRate: number

Output:
- subtotal: sum of line totals
- discounted: subtotal after discount
- shippingCost: as provided
- tax: (discounted + shippingCost) * (taxRate / 100)
- total: discounted + shippingCost + tax
```

**Application:**
- Quotes
- Invoices
- Quick Order pricing

### Product Template Pricing

**Calculator Configuration:**
Product templates can define calculator settings for auto-pricing 3D models:
- Base price
- Material cost multiplier
- Volume-based pricing
- Time-based pricing (print duration)

### Shipping Calculation

**Service:** `calculateShipping()` in Quick Order

**Logic:**
1. Determine region by state
2. Get base shipping amount for region
3. Check postcode for remote area classification
4. Apply remote surcharge if applicable
5. Return shipping quote with breakdown

**Remote Area Detection:**
- Postcode range matching
- Configurable per region
- Surcharge amounts per region

### Slicer Integration (Quick Order)

**Service:** `/api/quick-order/slice`

**Process:**
1. Accept STL file and print settings
2. Invoke PrusaSlicer CLI via child process
3. Parse G-code output for:
   - Material weight (grams)
   - Print time (seconds)
4. Return metrics or fallback estimates
5. Handle slicer errors gracefully

**Fallback Estimation:**
- If slicer fails, use default estimates
- 80g material, 3600 seconds (~1 hour)
- Require client acceptance before checkout

---

## Automated Workflows

### 1. Quote → Invoice Conversion

**Trigger:** Admin clicks "Convert to Invoice" on accepted quote

**Process:**
1. Create new invoice
2. Copy line items from quote
3. Copy client, pricing, discounts, shipping, tax
4. Set invoice status to DRAFT
5. Link invoice to original quote
6. Update quote status to CONVERTED
7. Redirect admin to invoice editor

**Business Logic:**
- Quote must be in ACCEPTED status
- Original quote is marked CONVERTED
- All financial data transferred accurately

---

### 2. Quick Order → Invoice Creation

**Trigger:** Client completes Quick Order checkout

**Process:**
1. Validate all files prepared (or fallbacks accepted)
2. Calculate final pricing (items + shipping)
3. Create invoice in PENDING status
4. Generate line items for each file:
   - Name: filename
   - Description: material, settings
   - Quantity: as configured
   - Unit price: calculated from weight, material cost, time
5. Add shipping line item
6. Create jobs for each file
7. Store file references
8. Send confirmation (email or redirect)

**Integration:**
- Creates invoice automatically
- Links jobs to invoice
- Stores STL files in order-files directory
- Optionally triggers Stripe Checkout for immediate payment

---

### 3. Payment Recording

**Trigger:**
- Admin records manual payment
- Stripe webhook (successful payment)

**Process:**
1. Validate invoice exists and is not paid
2. Create payment record:
   - Amount
   - Method (CASH, BANK_TRANSFER, STRIPE)
   - Reference (transaction ID)
   - Date
3. Recalculate invoice balance
4. If balance = 0, update invoice status to PAID
5. If partial payment, status remains PENDING
6. Record activity log

**Payment Methods:**
- Manual (admin-entered): CASH, BANK_TRANSFER
- Automated: STRIPE (webhook-driven)

---

### 4. Job Lifecycle

**States:** QUEUED → PRE_PROCESSING → IN_QUEUE → PRINTING → COMPLETED

**Transitions:**
1. **Create Job** (from invoice)
   - Status: QUEUED
   - Link to invoice line item
   - Store file reference

2. **Assign Printer**
   - Status: IN_QUEUE
   - Assign to specific printer

3. **Start Print**
   - Status: PRINTING
   - Record start time

4. **Complete Print**
   - Status: COMPLETED
   - Record completion time
   - Calculate actual time

5. **Handle Failures**
   - Status: FAILED or PAUSED
   - Allow restart or cancellation

**Job Board Visualization:**
- Kanban columns per printer
- Drag-and-drop assignment
- Status badges
- Priority indicators

---

### 5. User Invitation & First Login

**Trigger:** Admin invites new user

**Process:**
1. Admin provides email and role (CLIENT role requires client assignment)
2. System generates random temporary password (8 chars)
3. Create user record with tempPassword flag
4. Display password to admin (one-time)
5. Admin shares password with user manually
6. User logs in with temporary password
7. System detects tempPassword flag
8. Force password change before accessing portal
9. Clear tempPassword flag after successful change

**Security:**
- Temporary passwords are bcrypt-hashed
- Not sent via email (manual sharing)
- Must be changed on first login
- Old password validation required for change

---

### 6. Overdue Invoice Detection

**Process:**
- Dashboard query checks invoices with:
  - Status: PENDING
  - Due date < today
- Mark as overdue in UI
- Display count in dashboard metrics
- Color-coded indicators (red)

**No Automated Actions:**
- No automatic emails (currently paused)
- Manual follow-up by admin

---

## Technical Modules

### Backend Services

**Location:** `/src/server/services/`

| Service | Purpose |
|---------|---------|
| `auth.ts` | User authentication, sessions, password management |
| `clients.ts` | Client CRUD, statistics, activity tracking |
| `quotes.ts` | Quote lifecycle, PDF generation, conversion |
| `invoices.ts` | Invoice lifecycle, payments, PDF generation |
| `jobs.ts` | Job management, board data, printer assignment |
| `printers.ts` | Printer CRUD, status management |
| `materials.ts` | Material catalog, pricing |
| `product-templates.ts` | Template CRUD, calculator configs |
| `dashboard.ts` | Admin dashboard data aggregation |
| `exports.ts` | CSV export generation for reports |
| `quick-order.ts` | Quick Order workflow, slicer integration |
| `messages.ts` | Messaging CRUD, conversation threads |
| `settings.ts` | System settings, shipping regions |
| `stripe.ts` | Stripe payment processing, webhooks |
| `tmp-files.ts` | Temporary file handling (Quick Order uploads) |
| `order-files.ts` | Persistent order file storage |
| `users.ts` | User management, invitation |

### Database Schema (Prisma)

**Key Models:**
- `User` - Authentication and role
- `Client` - Client accounts
- `Quote` - Quotations with line items
- `QuoteLine` - Individual quote line items
- `Invoice` - Invoices with line items
- `InvoiceLine` - Individual invoice line items
- `Payment` - Payment transactions
- `Job` - Print jobs
- `Printer` - 3D printer inventory
- `Material` - Material catalog
- `ProductTemplate` - Reusable product templates
- `Message` - Messaging system
- `Settings` - System configuration
- `ActivityLog` - Audit trail
- `TmpFile` - Temporary file tracking
- `OrderFile` - Persistent order files

### API Routes

**Location:** `/src/app/api/`

**Admin APIs:**
- `/api/admin/clients` - Client CRUD
- `/api/admin/users` - User management
- `/api/dashboard` - Dashboard data
- `/api/dashboard/activity` - Activity feed pagination
- `/api/export/*` - CSV exports

**Client APIs:**
- `/api/client/dashboard` - Client stats
- `/api/client/invoices` - Client's invoices
- `/api/client/jobs` - Client's jobs
- `/api/client/materials` - Material list (for Quick Order)
- `/api/client/preferences` - User preferences

**Shared APIs:**
- `/api/auth/login` - User login
- `/api/auth/logout` - User logout
- `/api/auth/me` - Current user session
- `/api/auth/change-password` - Password change
- `/api/messages` - Messaging CRUD
- `/api/quick-order/*` - Quick Order workflow APIs
  - `/upload` - File upload
  - `/orient` - Save oriented file
  - `/slice` - Slicer analysis
  - `/price` - Calculate pricing
  - `/checkout` - Create invoice/order

**Resource APIs:**
- `/api/clients` - Client CRUD
- `/api/quotes` - Quote CRUD
- `/api/invoices` - Invoice CRUD
- `/api/jobs` - Job CRUD
- `/api/printers` - Printer CRUD
- `/api/materials` - Material CRUD
- `/api/product-templates` - Template CRUD
- `/api/settings` - Settings CRUD
- `/api/tmp-file/[id]` - Temporary file download
- `/api/order-files/[id]` - Order file download

**Payment APIs:**
- `/api/stripe/create-checkout-session` - Initiate Stripe payment
- `/api/stripe/webhook` - Handle Stripe events

### External Integrations

**Stripe:**
- Payment processing (Checkout Sessions)
- Webhook handling (payment success/failure)
- Invoice payment links

**PrusaSlicer:**
- CLI invocation via child process
- STL file analysis
- G-code parsing for metrics (weight, time)
- Fallback to estimates on failure

**Email (Future):**
- Currently paused
- Planned: SendGrid or similar for:
  - Quote delivery
  - Invoice delivery
  - Payment confirmations
  - Job status updates

### File Storage

**Strategy:**
- Local filesystem (no S3 currently)
- Temporary files: `/tmp/3dprintsydney/*`
- Order files: `/order-files/*` (persistent)
- Cleanup: Temporary files removed after checkout

**Security:**
- Session-based file access
- Temporary files scoped to user session
- Order files restricted to invoice owner

### Authentication Strategy

**Method:** Session cookies (not JWT)

**Flow:**
1. Login: Validate credentials, create session cookie
2. Middleware: Check cookie on protected routes
3. Session data: User ID, role
4. Logout: Clear cookie

**Password Security:**
- bcrypt hashing (10 rounds)
- Minimum length validation
- Temporary password system
- Force change on first login

---

## System Architecture Notes

**Frontend:**
- Next.js 14 (App Router)
- React Server Components where possible
- Client components for interactivity
- TypeScript throughout
- Tailwind CSS for styling
- shadcn/ui component library

**Backend:**
- Next.js API routes (App Router)
- Prisma ORM
- PostgreSQL database
- Zod validation schemas

**State Management:**
- React Query (TanStack Query) for server state
- React hooks for local state
- Server actions for mutations

**UI Patterns:**
- Responsive design (mobile-first)
- Dark/light mode support (theme system)
- Loading skeletons
- Optimistic updates
- Infinite scroll (activity feeds)
- Real-time updates (polling)

**Performance:**
- Server-side rendering
- Data fetching at page level
- Suspense boundaries
- Code splitting
- Image optimization

---

## Future Enhancements (Not Yet Implemented)

**Planned Features:**
1. Email delivery (quotes, invoices, notifications)
2. SMS notifications (job status updates)
3. Advanced reporting (charts, analytics)
4. Client file library (reorder previous prints)
5. Batch invoice operations
6. Recurring billing
7. Multi-user collaboration (admin teams)
8. Client portal customization
9. Advanced job scheduling
10. Printer fleet management
11. Material inventory tracking
12. Automated pricing rules engine

---

**End of Document**

For technical implementation details, refer to:
- `ARCHITECTURE.md` - System design and structure
- `API.md` - API endpoint specifications
- `DATABASE.md` - Schema and relationships
- Source code in `/src/`
