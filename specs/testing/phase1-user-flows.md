# 3D Print Sydney - Critical User Flows Documentation

## Overview
Complete mapping of user journeys across admin, client portal, and quick-order workflows. All flows include auth checks, data validation, and critical decision points.

---

## 1. AUTHENTICATION & ONBOARDING FLOWS

### 1.1 Login Flow (Admin & Client)
**Route:** `/login` → POST `/api/auth/login`

```
User visits /login
    ↓ (unauthenticated)
Display login form
    ↓ (user enters email/password)
POST /api/auth/login { email, password }
    ↓ (validation)
handleLogin(email, password) [service]
    - Query Supabase Auth for user
    - Load user profile from DB (role: ADMIN|CLIENT)
    - Resolve student discount if applicable
    ↓ (success)
Return session + profile
    - Set cookies: sb:token (httpOnly), sb:refresh-token
    - Redirect based on role:
        - ADMIN → /dashboard
        - CLIENT → /client
```

**Critical Points:**
- Email/password validation required
- Student discount resolved at login
- Cookies set as httpOnly, sameSite:lax, secure in prod
- Middleware validates token refresh on subsequent requests

---

### 1.2 Signup Flow (Client Registration)
**Route:** `/signup` → POST `/api/auth/signup`

```
User visits /signup
    ↓
Display signup form (firstName, lastName, phone, businessName, position, email, password)
    ↓ (user submits)
POST /api/auth/signup { email, password, firstName, lastName, phone, businessName, position }
    ↓ (validation + zod schema)
handleSignup(email, password, { firstName, lastName, phone, businessName, position }) [service]
    - Create Supabase Auth user
    - Create client profile in DB
    - Create user profile with role:CLIENT and client_id
    - Trigger welcome email
    ↓
Return session + profile
    - Set auth cookies
    - Redirect to /client
    ↓
Client onboarded → can access quick-order, view orders
```

**Critical Points:**
- Client profile created with all metadata
- User assigned CLIENT role automatically
- Welcome email template triggered
- Possible student discount detection in email

---

### 1.3 Session Management
**Middleware:** `/middleware.ts`

```
Incoming Request
    ↓
Extract: sb:token (accessToken), sb:refresh-token (refreshToken)
    ↓
IF accessToken exists:
    - Call supabase.auth.getUser(accessToken)
    - If valid → authUser loaded, continue
    - If invalid AND refreshToken exists:
        - Call supabase.auth.refreshSession(refreshToken)
        - If successful → extract new tokens, update cookies
        - If failed → clear cookies, redirect to login
    ↓
Load user profile (users table)
    - Query: role, client_id
    - If no profile → clear cookies, redirect to login
    ↓
Route Authorization:
    - If public route (/login, /signup) → redirect to home
    - If unauthenticated + private → redirect to /login?callbackUrl={pathname}
    - If authenticated + PUBLIC route → redirect to home (/dashboard or /client)
    - If CLIENT trying admin routes → redirect to /client
    ↓
Allow or reject request
```

**Critical Points:**
- Token refresh happens transparently
- Role-based redirects prevent unauthorized access
- Unauthenticated users can only access /login, /signup
- CallbackUrl persisted for post-login redirect

---

## 2. ADMIN WORKFLOWS

### 2.1 Client Management
**Routes:** `/admin/clients`, `/admin/clients/new`, `/admin/clients/[id]`

#### 2.1.1 Create Client
```
Admin visits /clients/new
    ↓
Display ClientCreateForm
    ↓ (admin fills: name, email, phone, businessType, address, city, state, postcode)
POST /api/clients { ...validated client data }
    ↓ (requireAdmin check)
createClient(input) [service]
    - Validate against clientInputSchema (Zod)
    - Insert into clients table
    - Generate client-specific numbering sequence
    ↓
Client profile created
    - Ready for quotes/invoices
    - Can be linked to user accounts
```

**Critical Points:**
- Email must be valid (potential duplicate check needed)
- Address fields required for shipping
- Client numbering initialized

---

#### 2.1.2 View Client Detail
```
Admin visits /clients/[id]
    ↓
GET request to page component
    ↓
getClientDetail(clientId) [service]
    - Load client profile
    - Fetch associated invoices (with status, totals)
    - Fetch associated quotes (with status)
    - Fetch associated jobs
    - Fetch activity log
    - Load wallet balance
    - Load linked user (if exists)
    ↓
Display ClientDetail component
    - Tabs: Overview, Invoices, Quotes, Jobs, Activity, Messages
    - Quick actions: Add credit, Send message, Create quote/invoice
```

**Critical Points:**
- Single-page aggregates all client data
- Activity log shows all interactions
- Linked user shows communication status

---

#### 2.1.3 Add Client Credit (Wallet)
```
Admin visits /clients/[id]
    ↓
Click "Add Credit" button
    ↓
Modal: { amount, reason (GIFT|ADJUSTMENT|RETURN|OTHER), notes? }
POST /api/clients/[id]/credit { amount, reason, notes }
    ↓ (requireAdmin + validation)
addClientCredit(clientId, amount, adminId, reason, notes) [service]
    - Create credit_transactions record
    - Update clients.wallet_balance
    - Log activity
    ↓
Return updated balance + transaction
    - Display success toast
    - Update wallet display
```

**Critical Points:**
- Admin ID recorded for audit
- Reason required for compliance
- Real-time wallet update

---

### 2.2 Quote Workflow
**Routes:** `/admin/quotes`, `/admin/quotes/new`, `/admin/quotes/[id]`

#### 2.2.1 Create Quote
```
Admin visits /quotes/new
    ↓
Load page data:
    - listClients() [all clients]
    - listProductTemplates() [line item templates]
    - listMaterials() [pricing data]
    - getSettings() [tax rate, shipping regions, defaults]
    ↓
Display QuoteEditor (mode: "create")
    - Initialize with:
        - First client as default
        - Today's date as issueDate
        - Default shipping region
        - Empty line items
    ↓ (admin fills form)
    - Select client
    - Set issue/expiry dates
    - Add line items (product templates or manual)
    - Set discount (NONE | FIXED | PERCENTAGE)
    - Configure shipping cost
    - Add notes/terms
    ↓
POST /api/quotes { ...quoteInputSchema validated data }
    ↓
createQuote(input) [service]
    - Validate input schema
    - Load client + settings
    - Calculate totals (with discounts, tax)
    - Generate quote number (sequence per client)
    - Create quotes table record
    - Create quote_lines table records
    ↓
Quote created with status: DRAFT
    - Redirect to quote detail page
    - Can send, accept, decline, or convert to invoice
```

**Critical Points:**
- Line items flexible (template or manual pricing)
- Discount calculated on subtotal before shipping
- Quote number sequential per client
- Tax calculation configurable
- Shipping regions support different base amounts

---

#### 2.2.2 Send Quote to Client
```
Admin on quote detail page
    ↓
Click "Send Quote" button
    ↓
POST /api/quotes/[id]/send
    ↓ (requireAdmin)
sendQuote(quoteId) [service]
    - Load quote detail
    - Get client email
    - Generate quote preview (HTML/PDF)
    - Send via email (template: quote-sent)
    - Update quote_status to SENT
    - Create activity entry
    ↓
Email sent to client
    - Client receives quote-sent template
    - Contains quote number, items, total, expiry date
    - Link to client portal to view/accept
```

**Critical Points:**
- Client email required
- Quote status updated to SENT
- Activity logged
- Email template includes action buttons

---

#### 2.2.3 Accept Quote (Admin)
```
Admin views quote detail
    ↓
Click "Accept" button
    ↓
POST /api/quotes/[id]/accept { note? }
    ↓ (requireAdmin)
acceptQuote(quoteId, note) [service]
    - Validate quote not already accepted/declined
    - Update quote_status to ACCEPTED
    - Create activity entry with note
    - Notify client (email: quote-accepted)
    ↓
Quote marked accepted
    - Ready for conversion to invoice
    - Client can proceed with order
```

**Critical Points:**
- Admin-side acceptance (different from client decline/accept)
- Status changes to ACCEPTED
- Client notified

---

#### 2.2.4 Decline Quote (Admin)
```
Admin views quote detail
    ↓
Click "Decline" button
    ↓
POST /api/quotes/[id]/decline { note? }
    ↓
declineQuote(quoteId, note) [service]
    - Update quote_status to DECLINED
    - Create activity with note
    - Send email: quote-declined
    ↓
Quote marked declined
    - Client notified
    - Cannot convert to invoice
```

**Critical Points:**
- Irreversible status change
- Note required for client communication
- Client notified immediately

---

#### 2.2.5 Convert Quote to Invoice
```
Admin views accepted quote
    ↓
Click "Convert to Invoice"
    ↓
POST /api/quotes/[id]/convert
    ↓ (requireAdmin)
convertQuoteToInvoice(quoteId) [service]
    - Load quote detail
    - Create invoice with matching:
        - Client
        - Line items
        - Totals
        - Dates (issueDate set to today, dueDate optional)
    - Create invoice_lines from quote_lines
    - Update quote_status to CONVERTED
    - Create activity entries
    ↓
Invoice created with status: DRAFT
    - Redirect to invoice detail
    - Ready to send or modify
    - Quote marked as converted (read-only)
```

**Critical Points:**
- Quote becomes read-only after conversion
- All items copied exactly
- Invoice inherits client, pricing, discounts
- Date handling: issue today, due date optional

---

### 2.3 Invoice Workflow
**Routes:** `/admin/invoices`, `/admin/invoices/new`, `/admin/invoices/[id]`

#### 2.3.1 Create Invoice
```
Admin visits /invoices/new
    ↓
Load page data (same as quotes + invoice-specific fields)
    ↓
Display InvoiceEditor (mode: "create")
    - Initialize with:
        - First client as default
        - Today as issueDate
        - Default shipping region
        - Empty line items
    ↓ (admin fills)
    - Select client
    - Set issue date + due date
    - Add line items
    - Set discount
    - Add PO number (optional)
    - Configure shipping
    - Add notes/terms
    ↓
POST /api/invoices { ...validated data }
    ↓
createInvoice(input) [service]
    - Validate schema
    - Load settings
    - Calculate totals
    - Generate invoice number (sequential)
    - Create invoices + invoice_lines records
    - Create initial status: DRAFT
    ↓
Invoice created
    - Not yet sent to client
    - Can modify line items
    - Ready for payment configuration
```

**Critical Points:**
- Invoice number sequential (not tied to client)
- Due date optional (can be null)
- Status starts as DRAFT
- PO number tracked for client reference

---

#### 2.3.2 Add Payment (Manual)
```
Admin on invoice detail page
    ↓
Click "Add Payment" button
    ↓
Modal: { amount, method (CASH|BANK|CHEQUE|CREDIT_CARD|OTHER), reference?, notes? }
POST /api/invoices/[id]/payments { ...validated }
    ↓ (requireInvoiceAccess)
addManualPayment(invoiceId, input) [service]
    - Validate amount > 0
    - Validate payment method
    - Create invoice_payments record
    - Update invoice.status:
        - If amountReceived < total → PARTIALLY_PAID
        - If amountReceived >= total → PAID
    - Create activity log
    - Send email: payment-confirmation
    ↓
Payment recorded
    - Balance due recalculated
    - Client notified if fully paid
    - Payment method tracked
```

**Critical Points:**
- Amount validated (must be positive)
- Payment method captured for reporting
- Status auto-updated based on received total
- Reference # for bank/cheque reconciliation

---

#### 2.3.3 Mark Invoice Paid (Admin)
```
Admin on invoice detail
    ↓
Click "Mark as Paid" button
    ↓
POST /api/invoices/[id]/mark-paid { amount?, method?, reference?, processor?, processorId?, note? }
    ↓
markInvoicePaid(invoiceId, options) [service]
    - Validate invoice not already paid
    - Create final payment record with provided details
    - Set invoice.status = PAID
    - Clear invoice.balance_due
    - Create activity log
    - Send notification
    ↓
Invoice marked paid
    - Locked from further modifications
    - Wallet credit not affected
    - Activity log shows payment method + details
```

**Critical Points:**
- Can specify payment method + processor details
- Supports Stripe, bank transfer, cash, etc.
- Note field for reconciliation
- Once PAID, limited edit capabilities

---

#### 2.3.4 Invoice Payments (Client Initiated)
```
Client on invoice detail (/client/orders/[id])
    ↓
Click "Pay Online" (Stripe) OR "Use Wallet Credit"
    ↓
[STRIPE PATH]
POST /api/invoices/[id]/stripe-session
    ↓
createStripeCheckoutSession(invoiceId, { refresh? }) [service]
    - Load invoice detail
    - Verify not already paid
    - Create Stripe checkout session:
        - Customer email = client email
        - Line items = invoice lines + shipping
        - Metadata: invoiceId, clientId
        - Success/cancel URLs
    ↓
Return stripe session URL
    - Client redirected to Stripe checkout
    - Completes payment
    - Stripe webhook: /api/stripe/webhook
        - Validates signature
        - Updates invoice status to PAID
        - Sends payment-confirmation email
    ↓
Invoice marked PAID
    - Client sees confirmation
    - Admin dashboard updates
    
[WALLET CREDIT PATH]
POST /api/invoices/[id]/apply-credit { amount }
    ↓ (requireClientWithId)
applyWalletCreditToInvoice(invoiceId, amount) [service]
    - Load invoice + client
    - Verify client owns invoice
    - Verify sufficient credit balance
    - Deduct from wallet
    - Create credit_transactions (USED)
    - If amount >= balanceDue → status = PAID
    - Else → status = PARTIALLY_PAID
    ↓
Credit applied
    - Balance updated
    - Activity logged
```

**Critical Points:**
- Stripe webhook validates signature + handles payment
- Client must own invoice
- Wallet deduction immediate upon apply
- Partial payments supported

---

#### 2.3.5 Write-Off Invoice
```
Admin on invoice detail
    ↓
Click "Write Off" (if balance due)
    ↓
Modal: { reason? }
POST /api/invoices/[id]/write-off { reason? }
    ↓
writeOffInvoice(invoiceId, reason) [service]
    - Validate invoice not already paid
    - Create invoice_write_offs record
    - Update invoice.status = WRITTEN_OFF
    - Set balance_due = 0
    - Create activity log
    ↓
Invoice marked written off
    - No longer owed
    - Cannot revert
    - Reason tracked for reporting
```

**Critical Points:**
- Admin-only action
- Reason captured (tax/accounting purposes)
- Balance immediately zeroed
- Activity entry created

---

#### 2.3.6 Void Invoice
```
Admin on invoice detail
    ↓
Click "Void" (before payment)
    ↓
Modal: { reason? }
POST /api/invoices/[id]/void { reason? }
    ↓
voidInvoice(invoiceId, reason) [service]
    - Validate not already paid/voided
    - Update invoice.status = VOIDED
    - Create invoice_voids record with reason
    - Create activity log
    ↓
Invoice voided
    - No longer valid
    - Can be superseded by new invoice
    - Reason tracked
```

**Critical Points:**
- Different from write-off (intent to cancel, not collect)
- Cannot void paid invoices
- Reason required for audit

---

### 2.4 Job Management
**Routes:** `/admin/jobs`

#### 2.4.1 Job Board View
```
Admin visits /jobs
    ↓
GET /admin/jobs/page.tsx
    ↓
getJobBoard({ includeArchived: false, statuses: [QUEUED, PRE_PROCESSING, IN_QUEUE, PRINTING, PAUSED] })
    [service]
    - Load printers with active status
    - For each printer: fetch jobs in status queue
    - Calculate metrics per printer (total jobs, runtime, utilization)
    - Group jobs by printer (columns)
    ↓
Display JobBoard (Kanban-style)
    - Columns: One per printer (grouped by status)
    - Cards: Individual jobs with:
        - Name, quantity, material, estimated time
        - Status badge
        - Project info
    - Drag-drop enabled for real-time status updates
    - Summary: Total jobs, completed today, failures
```

**Critical Points:**
- Real-time view of printer queues
- Status filtering (QUEUED, PRE_PROCESSING, IN_QUEUE, PRINTING, PAUSED)
- Printer health status displayed
- Metrics calculated on load

---

#### 2.4.2 Update Job Status
```
Admin on jobs board
    ↓
Click job card OR use context menu
    ↓
Modal/Inline editor: { status, note? }
POST /api/jobs/[id]/status { status, note? }
    ↓ (requireAdmin)
updateJobStatus(jobId, status, note) [service]
    - Validate status enum
    - Update jobs.status
    - Update jobs.started_at / completed_at / paused_at (timestamp-based)
    - Create activity entry
    - If status = COMPLETED: send notification to client
    - If status = FAILED: log error + admin alert
    ↓
Job status updated
    - Board refreshes
    - Client notified if job completed
    - Activity logged
```

**Critical Points:**
- Status enum: QUEUED, PRE_PROCESSING, IN_QUEUE, PRINTING, PAUSED, COMPLETED, FAILED, ARCHIVED
- Timestamps auto-set based on status transitions
- Client notified on completion
- Note field for failure reasons

---

### 2.5 Dashboard & Reporting
**Route:** `/admin/dashboard`

#### 2.5.1 Admin Dashboard
```
Admin visits /dashboard
    ↓
getDashboardSnapshot() [service]
    - Metrics: Revenue MTD, total invoiced, outstanding balance, new clients
    - Revenue trend (7 days, 30 days, 90 days)
    - Quote status breakdown (DRAFT, SENT, ACCEPTED, CONVERTED, DECLINED)
    - Job summary (active, completed today, failed)
    - Outstanding invoices (overdue, upcoming due)
    - Recent activity (last 20 entries across all resources)
    ↓
Display DashboardView
    - KPI cards: metrics snapshot
    - Charts: revenue trend, quote status pie, job summary
    - Tables: recent activity, outstanding invoices
    - Links to quick actions (create quote, view jobs, etc.)
```

**Critical Points:**
- Dashboard real-time on load (force-dynamic)
- Activity pagination support
- Trend calculations for reporting
- Outstanding invoices sorted by due date

---

## 3. CLIENT PORTAL WORKFLOWS

### 3.1 Client Dashboard
**Route:** `/client`

```
Client visits /client
    ↓
GET /api/client/dashboard
    ↓
Load:
    - Wallet balance (sum of credits - used)
    - Recent invoices (5 most recent)
    - Active projects (projects with active jobs)
    - Messages count (unread)
    ↓
Display ClientDashboard component
    - Wallet balance widget (with "Use Credit" option)
    - Recent orders table (clickable to detail)
    - Quick actions: New order (quick-order), View all orders
    - Active projects summary
    - Message thread preview
```

**Critical Points:**
- Wallet balance real-time
- Shows all order statuses
- Quick access to quick-order
- Message notification count

---

### 3.2 Client Orders
**Route:** `/client/orders`

#### 3.2.1 View Orders List
```
Client visits /client/orders
    ↓
GET /api/client/invoices
    ↓
listClientInvoices(clientId, { limit, offset, status?, search? })
    [service]
    - Query invoices where client_id = clientId
    - Filter by status (DRAFT, SENT, PARTIALLY_PAID, PAID, OVERDUE, WRITTEN_OFF, VOIDED)
    - Load associated payment records
    - Calculate balance_due = total - amountReceived
    ↓
Display invoices table with:
    - Invoice number
    - Issue date
    - Amount due
    - Status badge (color-coded)
    - Payment progress (if partial)
    - Action buttons: View detail, Pay, Download
```

**Critical Points:**
- Client sees only own invoices
- Status shows payment progress
- Stripe checkout URL available if configured
- Pagination supported

---

#### 3.2.2 View Order Detail
```
Client clicks on invoice number
    ↓
Route: /client/orders/[id]
    ↓
getInvoiceDetail(invoiceId) [service]
    - Load invoice record
    - Load invoice_lines
    - Load invoice_payments
    - Verify client ownership (client_id match)
    - Load activity (messages, status changes, payments)
    ↓
Display order detail page:
    - Invoice header (number, date, due date)
    - Itemized table (product, qty, unit price, line total)
    - Totals breakdown (subtotal, discount, shipping, tax, total)
    - Payment section:
        - Amount paid
        - Balance due
        - Payment history
    - Payment buttons (if balance > 0):
        - "Pay with Stripe" (if configured)
        - "Use Wallet Credit" (if balance available)
    - Action buttons:
        - "Download PDF"
        - "View Messages"
    - Messages thread
```

**Critical Points:**
- Client can only view own invoices (permission check)
- Payment history shows all transactions
- Stripe button only appears if not paid + Stripe configured
- Wallet credit only shows if balance > 0
- Download PDF generates on-demand

---

#### 3.2.3 Apply Wallet Credit
```
Client on order detail (balance due > 0)
    ↓
Click "Use Wallet Credit"
    ↓
Modal: { amount (max = min(walletBalance, balanceDue)) }
POST /api/invoices/[id]/apply-credit { amount }
    ↓ (requireClientWithId)
applyWalletCreditToInvoice(invoiceId, amount) [service]
    - Load invoice + client
    - Verify ownership
    - Verify balance_due > 0
    - Verify walletBalance >= amount
    - Create credit_transactions (USED)
    - Deduct from client.wallet_balance
    - Recalculate balance_due
    - If balance_due <= 0: status = PAID
    - Create activity entry
    ↓
Credit applied
    - Display confirmation
    - Update balance due
    - Refresh payments table
```

**Critical Points:**
- Amount capped at (wallet balance, balance due)
- Transaction created for audit
- Immediate wallet deduction
- Status auto-updates if fully paid

---

### 3.3 Project Tracking
**Routes:** `/client/projects/active`, `/client/projects/completed`, `/client/projects/archived`, `/client/projects/history`

#### 3.3.1 View Active Projects
```
Client visits /client/projects/active
    ↓
GET /api/client/projects
    ↓
List projects with associated jobs status:
    - QUEUED, PRE_PROCESSING, IN_QUEUE, PRINTING, PAUSED
    ↓
Display projects in table:
    - Project name
    - Created date
    - Job count + status breakdown
    - Estimated completion
    - Actions: View detail, Download files
```

**Critical Points:**
- Shows only projects with active jobs
- Status summary per project
- Real-time job count

---

#### 3.3.2 View Completed Projects
```
Client visits /client/projects/completed
    ↓
List projects with all jobs = COMPLETED
    ↓
Display completed projects
    - Completion date
    - Total cost
    - Job count
```

**Critical Points:**
- Read-only historical view
- Shows completed job count

---

### 3.4 Client Messaging
**Route:** `/client/messages`

#### 3.4.1 Send Message to Admin
```
Client on /client/messages
    ↓
Display Conversation component (currentUserRole: CLIENT)
    - Message list (all messages in client conversation)
    - Input field
    ↓
Client types message
    ↓
POST /api/messages { content, invoiceId? }
    ↓ (requireAuth + permission check)
createMessage(userId, content, sender: CLIENT, invoiceId) [service]
    - Validate content length > 0
    - Create messages record
    - Set sender = CLIENT
    - Link to invoice if provided
    - Create activity entry
    - Notify admin (via email or in-app)
    ↓
Message delivered
    - Displayed in conversation
    - Admin notified
```

**Critical Points:**
- Client role automatically set
- Optional invoice link for context
- Timestamps tracked
- Admin notified immediately

---

## 4. QUICK-ORDER WORKFLOW
**Route:** `/quick-order`

This is the primary flow for clients to order prints directly.

### 4.1 File Upload & Processing
```
Client visits /quick-order
    ↓
Display QuickOrderForm component
    - Drag-drop zone OR file picker
    - Supported formats: STL, OBJ, 3MF (validation in browser + server)
    ↓
Client drops/selects files
    ↓
Browser-side validation:
    - File size < 100MB
    - File type in allowlist
    - Prevent duplicate uploads
    ↓
POST /api/quick-order/upload (FormData with files[])
    ↓ (requireAuth)
saveTmpFile() [service]
    - For each file:
        - Validate: size, MIME type, filename
        - Create tmp_files record
        - Stream to storage
        - Return tmpId + metadata
    ↓
Response: [{ id: tmpId, filename, size, type }]
    - Store tmpIds in client state
    - Display file in preview list
    - Enable next step
```

**Critical Points:**
- Client must be authenticated
- File validation twice (browser + server)
- Temporary storage until checkout
- Filename preserved for reference

---

### 4.2 Model Viewing & Orientation
```
Client with uploaded file
    ↓
Display 3D model viewer (THREE.js)
    - Load STL from tmp storage
    - Render in viewport
    - Show bounding box + dimensions
    ↓
Client can:
    - Rotate model (mouse drag)
    - Pan (middle mouse)
    - Zoom (scroll)
    - Reset view
    - Save orientation (stored in Zustand persistence)
    ↓
[OPTIONAL] Orient for printing
    ↓
POST /api/quick-order/orient
    ↓
Analyze optimal orientation (support analysis)
    - Calculate volume, surface area
    - Estimate support material needed
    - Return orientation + metrics
    ↓
Client accepts orientation OR keeps manual
```

**Critical Points:**
- Model viewer required for dimension verification
- Orientation optional
- Supports analysis gives cost estimate
- Client final decision on orientation

---

### 4.3 Configure & Price Order
```
Client has uploaded files + set orientation
    ↓
Display configuration panel
    - For each item:
        - Select material (dropdown: all materials in DB)
        - Select color (tied to material)
        - Select quality level (STANDARD, DETAIL, GLOSSY, etc. - if applicable)
        - Set quantity
        - View estimated dimensions from model
    ↓
Client configures all items
    ↓
POST /api/quick-order/price { items: [{ tmpId, material, color, quality?, qty, state?, postcode? }] }
    ↓ (requireAuth)
priceQuickOrder(items, location, discount?) [service]
    - For each item:
        - Load material costPerGram
        - Get model weight/volume from tmp_files
        - Calculate cost: (weight * costPerGram) + setup fee
        - Apply material upcharge if applicable
        - Apply quality upcharge if applicable
    - Calculate shipping:
        - Load shipping region by state/postcode
        - Lookup base rate for region
        - Apply volume adjustment
    - Apply discounts:
        - Student discount (if eligible)
        - Admin-applied discount (if any)
    - Apply tax (configurable rate)
    - Return itemized pricing
    ↓
Response:
    - Per-item breakdown (price, weight, setup fee)
    - Subtotal
    - Discount (amount + type)
    - Shipping (base + adjusted)
    - Tax
    - Total
    - Student discount eligibility indicator
    ↓
Display pricing breakdown to client
    - Can reconfigure + re-price
```

**Critical Points:**
- Material cost per gram critical
- Weight extracted from model file
- Shipping calculated by region (state/postcode)
- Student discount resolved at pricing time
- Tax configurable in settings

---

### 4.4 Payment & Checkout
```
Client reviews pricing + clicks "Proceed to Checkout"
    ↓
Display checkout form:
    - Shipping address (pre-filled if available)
    - Payment preference (Stripe, wallet credit, invoice)
    - Option to request credit (if client account)
    ↓ (client fills form)
POST /api/quick-order/checkout { items: [...], address, creditRequestedAmount?, paymentPreference }
    ↓ (requireClientWithId)
createQuickOrderInvoice(items, userId, clientId, address, { creditRequestedAmount, paymentPreference })
    [service]
    - Move tmp_files → order_files (permanent storage)
    - Create invoice with:
        - Lines copied from pricing
        - Client from clientId
        - Address from input
        - Status: DRAFT (if paying later) or PARTIALLY_PAID/PAID (if paid immediately)
    - Process payment based on preference:
        [STRIPE]
        - Create Stripe checkout session
        - Return URL to client
        [WALLET]
        - Apply credit to invoice
        - If insufficient: balance due
        [BOTH]
        - Apply wallet first, then Stripe for remainder
    ↓
Revalidate paths: /invoices, /jobs, /clients, /client/orders
    ↓
Return result:
    - Invoice ID
    - Payment status
    - Next action (redirect to Stripe OR show confirmation)
    ↓
[IF STRIPE]
    - Client redirected to Stripe checkout
    - Completes payment
    - Stripe webhook updates invoice status
    - Email: invoice-created OR payment-confirmation
[IF WALLET ONLY]
    - Invoice marked PAID or PARTIALLY_PAID
    - Email: invoice-created
    - Admin sees new job in queue
```

**Critical Points:**
- Tmp files moved to permanent storage
- Invoice created in single transaction
- Payment preference determines flow
- Address override for shipping
- Credit request flag saved for admin review
- Files no longer deletable after checkout

---

### 4.5 Order Confirmation
```
After successful checkout
    ↓
IF Stripe flow:
    - Stripe webhook confirms payment
    - Invoice status: PAID
    - Email: payment-confirmation
ELSE:
    - Invoice status based on payment method
ALWAYS:
    - Jobs created from invoice lines
    - Jobs status: QUEUED
    - Client dashboard updated
    - Order visible in /client/orders
    ↓
Admin sees order:
    - New invoice in /invoices
    - New jobs in /jobs board
    - Can track status
```

**Critical Points:**
- Jobs auto-created from invoice lines
- Clients see orders immediately
- Admin notified via dashboard refresh
- Invoice status determines job queue entry

---

## 5. CROSS-CUTTING FLOWS

### 5.1 Email Notifications
**Service:** `/server/services/email.ts`
**Templates:** `/emails/templates/`

All critical events trigger emails:

| Event | Recipient | Template | Trigger |
|-------|-----------|----------|---------|
| Signup | Client | welcome.tsx | handleSignup complete |
| Quote Sent | Client | quote-sent.tsx | sendQuote() |
| Quote Accepted | Client | quote-accepted.tsx | acceptQuote() (admin-side) |
| Quote Declined | Client | quote-declined.tsx | declineQuote() |
| Invoice Created | Client | invoice-created.tsx | createInvoice OR createQuickOrderInvoice |
| Payment Confirmed | Client | payment-confirmation.tsx | markInvoicePaid OR Stripe webhook |
| Job Status Update | Client | job-status-update.tsx | updateJobStatus (if COMPLETED/FAILED) |

**Critical Points:**
- All emails async (fire-and-forget pattern)
- Client email from clients table
- Admin email from settings
- Templates use Resend API
- No email blocking on order submission

---

### 5.2 Activity Logging
**Service:** `/server/services/activity.ts` (implicit in detail services)

All user actions logged:

```
Types of activities:
- QUOTE_CREATED
- QUOTE_SENT
- QUOTE_ACCEPTED / DECLINED
- QUOTE_CONVERTED
- INVOICE_CREATED
- INVOICE_PAID / PARTIALLY_PAID
- INVOICE_WRITE_OFF / VOIDED
- PAYMENT_ADDED
- MESSAGE_CREATED
- JOB_STATUS_CHANGED
- CLIENT_CREDIT_ADJUSTED
- ATTACHMENT_UPLOADED

Each entry includes:
- timestamp (created_at)
- actor (user_id)
- actor_type (ADMIN | CLIENT)
- action_type (enum above)
- resource_id (invoice/quote/job/client id)
- resource_type (INVOICE | QUOTE | JOB | CLIENT | MESSAGE)
- details (JSON: before/after values, reason, note)
```

**Critical Points:**
- Immutable audit trail
- Used for detail page history view
- Accessible to both admin + affected client
- Supports compliance requirements

---

### 5.3 Wallet/Credit System
**Service:** `/server/services/credits.ts`

```
Admin adds credit:
POST /api/clients/[id]/credit { amount, reason, notes }
    ↓
createTransaction:
    - type: ADDED
    - amount: positive
    - reason: enum (GIFT, ADJUSTMENT, RETURN, OTHER)
    - Update client.wallet_balance += amount
    ↓

Client uses credit:
POST /api/invoices/[id]/apply-credit { amount }
    ↓
createTransaction:
    - type: USED
    - amount: positive (stored as deduction)
    - Deduct from wallet_balance
    - Apply to invoice
    ↓

Wallet balance calculation:
    wallet_balance = SUM(credits ADDED) - SUM(credits USED)

Visible to:
    - Admin: all clients' balances
    - Client: own balance only
```

**Critical Points:**
- Wallet balance always calculated from transactions
- Immutable transaction history
- Reason tracking for audits
- Real-time balance updates

---

### 5.4 Quote/Invoice Permissions
**Service:** `/server/auth/permissions.ts`

```
requireInvoiceAccess(req, invoiceId):
    - Get user from request
    - If user.role === ADMIN: allow
    - If user.role === CLIENT:
        - Load invoice
        - Verify invoice.client_id === user.client_id
        - If yes: allow
        - If no: throw FORBIDDEN
    - Else: throw UNAUTHORIZED
    ↓
Used in:
    - GET /api/invoices/[id]
    - POST /api/invoices/[id]/payments
    - POST /api/invoices/[id]/apply-credit
    - POST /api/invoices/[id]/stripe-session
    - Any invoice modification
```

**Critical Points:**
- Clients can only access own invoices
- Admins access all invoices
- Permission checked before processing
- Clear error responses

---

## 6. ERROR HANDLING & EDGE CASES

### 6.1 Common Error Scenarios

```
[Authentication Errors]
- No token: redirect to /login?callbackUrl={pathname}
- Invalid token: refresh if refresh_token available, else logout
- Role mismatch: redirect to appropriate dashboard
- Session expired: 401 Unauthorized

[Validation Errors]
- ZodError: return 422 with error.issues
- Missing required fields: 422
- Invalid enum values: 422
- Out-of-range values: 422

[Business Logic Errors]
- Quote already converted: 400 "Quote already converted"
- Invoice already paid: 409 "Invoice is already paid"
- Insufficient wallet credit: 400 "Insufficient credit balance"
- File too large: 413 "File exceeds size limit"
- Unsupported file type: 415 "File type not supported"

[Resource Errors]
- Invoice not found: 404
- Client not found: 404
- Quote not found: 404
- Access forbidden: 403

[External Service Errors]
- Stripe not configured: 400 "Stripe is not configured"
- Email service down: 500 (logged, doesn't block order)
- Storage service error: 500
```

**Critical Points:**
- All errors logged with scope
- Client errors don't reveal system details
- 401 triggers logout + redirect
- 403 for permission violations
- 400 for business logic violations

---

### 6.2 Concurrent Update Handling

```
Race conditions:
1. Two admins modify same invoice simultaneously
   - First write wins (no optimistic locking)
   - Second gets conflict (handled gracefully)
   - UI refreshes to show current state

2. Client applies credit while admin marks paid
   - Credit deducted first in transaction order
   - Invoice status determined by final total
   - Activity log shows both actions

3. Quick-order checkout + admin delete tmp file
   - Checkout transaction validates files exist
   - If deleted: fail with clear error
   - User can re-upload + retry
```

**Critical Points:**
- No distributed locking
- Last-write-wins for UI updates
- Transactions ensure data consistency
- Activity log captures ordering

---

## 7. CRITICAL TESTING CHECKLIST

### Auth & Session
- [ ] Login with valid credentials → dashboard redirect
- [ ] Login with invalid email → validation error
- [ ] Login with wrong password → auth error
- [ ] Signup new client → welcome email + dashboard access
- [ ] Session timeout → redirect to login
- [ ] Token refresh → background refresh, no user interruption
- [ ] Role-based redirects: ADMIN tries /client → redirect /dashboard
- [ ] Role-based redirects: CLIENT tries /quotes → redirect /client

### Quotes
- [ ] Create quote → generates number, saved as DRAFT
- [ ] Send quote → status SENT, client gets email
- [ ] Accept quote → status ACCEPTED, client notified
- [ ] Decline quote → status DECLINED, client notified
- [ ] Convert to invoice → creates invoice with same items/pricing
- [ ] Edit quote → modifies draft only
- [ ] Duplicate quote → creates new with same items
- [ ] Delete quote → removes if not sent/converted

### Invoices
- [ ] Create invoice → generates number, saved as DRAFT
- [ ] Add payment (manual) → updates status + sends email
- [ ] Mark paid → sets status PAID, locks from edit
- [ ] Apply wallet credit → deducts balance, updates status
- [ ] Stripe checkout → creates session, webhooks updates payment
- [ ] Write-off invoice → zeroes balance, status WRITTEN_OFF
- [ ] Void invoice → cancels, status VOIDED
- [ ] Download PDF → generates valid invoice document

### Client Portal
- [ ] Login to client portal → /client dashboard
- [ ] View orders → lists all invoices with correct status
- [ ] View order detail → shows items, payments, balance
- [ ] Apply wallet credit → deducts from balance, updates display
- [ ] Pay with Stripe → redirects to checkout, webhook confirms
- [ ] View active projects → lists projects with active jobs
- [ ] Track job status → shows current status + estimated completion
- [ ] Send message to admin → appears in conversation, admin notified

### Quick-Order
- [ ] Upload STL file → stored as tmp file, preview rendered
- [ ] Upload invalid file → validation error, file rejected
- [ ] Set material + color → persisted in state
- [ ] Get price quote → calculates material + shipping + tax
- [ ] Change location (state/postcode) → shipping recalculated
- [ ] Apply student discount → deducted from price
- [ ] Checkout with Stripe → invoice created, payment processed
- [ ] Checkout with wallet credit → credit deducted, balance applied
- [ ] Stripe webhook → invoice marked paid, email sent
- [ ] Admin sees new invoice/jobs → appears in dashboard/queue

### Permissions & Access Control
- [ ] Client A cannot view Client B's invoices
- [ ] Client cannot access /admin routes
- [ ] Admin cannot access /client routes
- [ ] Unauthenticated user cannot access protected routes
- [ ] Client can only send credits via admin interface
- [ ] Client can only modify own profile/addresses

### Email & Notifications
- [ ] Quote sent → email contains quote details + link
- [ ] Invoice created → email sent to client
- [ ] Payment confirmed → email sent to client
- [ ] Job completed → email sent to client
- [ ] Admin notified of messages → email or in-app notification

---

## 8. KEY FLOWS SUMMARY TABLE

| Flow | Start | Key Actions | End State | Critical Auth |
|------|-------|------------|-----------|---------------|
| Login | /login form | Validate email/password, load profile | Logged in + redirected | Session created |
| Signup | /signup form | Create auth user + client + user profile | Welcome email sent | Session created |
| Create Quote | /quotes/new | Fill form, add items, set dates | Quote DRAFT created | Admin required |
| Send Quote | Quote detail | Click send, validate email | Quote SENT, email delivered | Admin required |
| Convert Quote | Quote detail | Click convert, create invoice | Invoice DRAFT created | Admin required |
| Create Invoice | /invoices/new | Fill form, add items, set due date | Invoice DRAFT created | Admin required |
| Add Payment | Invoice detail | Enter amount, method, reference | Payment recorded, status updated | Invoice access required |
| Quick-Order | /quick-order | Upload file → configure → price → checkout | Invoice created, job queued | Client required |
| Stripe Pay | Order detail | Click pay, complete Stripe form | Webhook confirms payment | Invoice access + Stripe |
| Apply Wallet | Order detail | Enter amount, confirm | Credit deducted, invoice updated | Client ownership required |
| View Orders | /client/orders | List invoices, sort/filter | Paginated invoice list | Client self access |
| Track Project | /client/projects/active | Select project | Job status view | Client self access |
| Send Message | /messages form | Type message, optional invoice link | Message created, admin notified | Auth required |
| Update Job Status | Job card | Click status, enter note | Job status updated, client notified | Admin required |
| Add Credit | Client detail | Enter amount, reason, notes | Credit added, wallet updated | Admin required |

---

## 9. TECHNICAL NOTES

### Database Transactions
- Quote → Invoice conversion uses transaction to ensure atomicity
- Quick-order checkout moves tmp_files → order_files in transaction
- Payment processing updates multiple tables atomically

### Async Operations
- Email sending is fire-and-forget (doesn't block response)
- Stripe webhook is async, invoice status eventually consistent
- Revalidation paths use Next.js ISR (on-demand)

### Caching & State
- Client state for quick-order (orientation, material selection) persisted to Zustand
- Admin dashboard force-dynamic (no caching)
- Client pages mostly static with revalidation on mutations

### Rate Limiting
- API routes should implement rate limiting (currently implicit via Supabase/Next.js)
- File uploads limited by size validation + database constraints
- Quick-order pricing + checkout limited by request rate

### Logging & Monitoring
- All errors logged via browserLogger (client-side) + logger (server-side)
- Bug logger for specific error types (bugLogger.logBug32, etc.)
- Activity log immutable audit trail in database

---

