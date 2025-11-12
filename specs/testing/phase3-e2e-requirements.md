# Phase 3: E2E Test Coverage Requirements for Playwright

**Date:** 2025-11-12  
**Framework:** Playwright 1.40+  
**Scope:** Critical user flows, multi-step workflows, UI interactions  
**Thoroughness:** Very thorough  
**Expected Coverage:** 15-20 critical E2E scenarios per user role

---

## Executive Summary

E2E testing validates complete user journeys from UI interaction through API calls to database state changes. This document maps all critical scenarios requiring Playwright automation, organized by user role with specific test data requirements, authentication fixtures, and browser coverage guidelines.

**Key Scenarios Covered:**
- 24 critical admin workflows
- 18 critical client portal flows
- 12 authentication & session scenarios
- 20+ advanced user interactions (drag-drop, file uploads, 3D model handling)

---

## 1. CRITICAL ADMIN FLOWS (E2E SCENARIOS)

### 1.1 Quote Lifecycle: Draft → Send → Convert → Invoice → Payment

**Scenario:** Admin creates a quote, sends to client, client accepts, admin converts to invoice, receives payment

**Test: "Complete Quote-to-Payment Flow"**
```
Steps:
1. Admin logs in → navigates to /admin/quotes/new
2. Select client from dropdown (or create new)
3. Add line items (product templates + manual pricing)
4. Set discount (15% PERCENTAGE)
5. Configure shipping region
6. Click "Save as Draft" → Quote created with status DRAFT
7. Verify quote number generated (sequential)
8. Click "Send Quote" button
9. Verify email sent to client (check activity log)
10. Navigate to /admin/invoices → search for related quote
11. View invoice detail → status shows SENT
12. Click "Convert to Invoice" button
13. Confirm conversion → new invoice created
14. Navigate to invoice detail → add manual payment $500
15. Click "Mark as Paid"
16. Verify status changed to PAID, balance due = $0
17. Check activity log shows all transitions
18. Verify email sent to client (payment confirmation)

Assertions:
✓ Quote created with unique number (client-specific sequence)
✓ Email delivered (resend integration)
✓ Quote status transitions: DRAFT → SENT → CONVERTED
✓ Invoice created with matching items/totals
✓ Payment recorded with correct amount
✓ Activity log shows 5+ entries (create, send, convert, payment, mark-paid)
✓ No database errors in console
✓ Client sees invoice in their orders list

Expected Duration: 45-60 seconds
Data Required: Client profile, product templates, materials config
```

---

### 1.2 Quick-Order Admin Monitoring

**Scenario:** Client uploads 3D model, admin receives notification, tracks job through completion

**Test: "Quick-Order File Upload → Job Queue → Status Update"**
```
Steps:
[CLIENT SIDE - parallel browser session]
1. Client logs in → navigates to /quick-order
2. Drag-drop STL file (test-model.stl - 5MB)
3. Select material (PLA)
4. Select color (White)
5. Enter quantity (1)
6. Click "Get Price Quote"
7. Verify pricing displayed (material cost + shipping + tax)
8. Select "Pay with Stripe" OR "Use Wallet Credit"
9. If Stripe: Redirect to Stripe checkout, complete payment
10. Verify "Order Confirmed" page displayed

[ADMIN SIDE - monitor]
1. Admin in /admin/jobs dashboard
2. Refresh page or wait for real-time update
3. See new job appeared in queue (status: QUEUED)
4. New invoice appears in /admin/invoices
5. Click on invoice → verify order files attached
6. Click on job card → update status to IN_QUEUE
7. Verify activity shows status change
8. Update to PRINTING
9. Update to COMPLETED
10. Verify client receives notification email

Assertions:
✓ STL file uploaded successfully (tmp_files created)
✓ 3D model preview renders (ModelViewer component works)
✓ Pricing calculation correct (weight × cost/gram)
✓ Payment processed successfully (Stripe webhook fires)
✓ Invoice created with status PAID
✓ Jobs auto-created from invoice lines
✓ Admin sees new job immediately (or after refresh)
✓ Job status transitions update activity log
✓ Client notified of job completion

Expected Duration: 120+ seconds (includes payment)
Data Required: Valid STL file, Stripe test account, materials pricing
```

---

### 1.3 Client Management: Create → Credit → Invoice Cycle

**Scenario:** Admin creates new client, adds wallet credit, creates invoice, client pays using credit

**Test: "Client Onboarding with Wallet Credit"**
```
Steps:
[ADMIN CREATES CLIENT]
1. Navigate to /admin/clients/new
2. Fill form: name="ABC Corp", email="test@abc.com", phone="0412345678"
3. Fill: businessType="Manufacturing", address="123 Main St"
4. Click "Create Client"
5. Verify client created with page redirect to /admin/clients/[id]

[ADMIN ADDS WALLET CREDIT]
6. On client detail → click "Add Credit" button
7. Modal opens → enter amount=$500
8. Select reason="GIFT"
9. Add note="Welcome credit"
10. Click "Add"
11. Verify wallet balance updated to $500
12. Check activity log shows credit transaction

[CREATE INVOICE FOR CLIENT]
13. On client detail → click "New Invoice" button
14. Quick invoice form: items=$300, shipping=$20, tax=$32
15. Total: $352
16. Click "Create & Send"
17. Invoice created, email sent to client

[CLIENT APPLIES WALLET CREDIT]
18. Switch to client browser session
19. Client logs in → /client/orders
20. Click on new invoice
21. See "Balance Due: $352"
22. Click "Use Wallet Credit"
23. Modal: enter amount=$352
24. Click "Apply"
25. Verify invoice status changed to PAID
26. Wallet balance now $148

Assertions:
✓ Client created with unique ID
✓ Wallet balance transaction recorded (ADDED type)
✓ Invoice created with correct totals
✓ Credit application deducts from wallet
✓ Invoice status transitions to PAID
✓ Activity log shows both credit and payment
✓ Email notifications sent (invoice + payment confirmation)
✓ No orphaned records in database

Expected Duration: 90 seconds
Data Required: Test client email, invoice templates
```

---

### 1.4 Invoice Editor: Edit → Recalculate → Send

**Scenario:** Admin creates invoice, modifies line items, verifies totals recalculated

**Test: "Invoice Multi-Item Editing with Tax & Discount"**
```
Steps:
1. Navigate to /admin/invoices/new
2. Select client
3. Add line item 1: "3D Print - 50g PLA" qty=1 price=$25.00
4. Add line item 2: "Material - Resin" qty=2 price=$15.00 each = $30.00
5. Subtotal displays: $55.00
6. Apply discount: 10% PERCENTAGE = -$5.50
7. Subtotal after discount: $49.50
8. Shipping region: NSW, shipping=$10.00
9. Tax (10%): ($49.50 + $10.00) × 0.10 = $5.95
10. Total: $65.45
11. Click "Save Draft"
12. Verify invoice saved with all calculations
13. Navigate back to invoice detail
14. Click "Edit" button
15. Modify line item 1: qty=2 (instead of 1)
16. Delete line item 2
17. Verify totals recalculate:
    - Subtotal: $50.00
    - After discount (-10%): $45.00
    - Shipping: $10.00
    - Tax: $5.50
    - Total: $60.50
18. Click "Save"
19. Click "Send Invoice"
20. Email sent with updated total

Assertions:
✓ Initial calculations accurate
✓ Discount applied to correct base (subtotal)
✓ Tax applied to (subtotal - discount + shipping)
✓ Line item modifications recalculate automatically
✓ Deletion removes from totals correctly
✓ Invoice status updates appropriately
✓ Email contains correct final total
✓ Activity log shows modifications

Expected Duration: 60 seconds
Data Required: Multiple product templates, tax/shipping configs
```

---

### 1.5 Job Board Drag-Drop: Real-Time Status Updates

**Scenario:** Admin drags job card between status columns, verifies status update

**Test: "Kanban Job Board Drag-Drop & Status Transition"**
```
Steps:
1. Navigate to /admin/jobs
2. Job board displays with columns:
   - QUEUED (2 jobs)
   - IN_QUEUE (1 job)
   - PRINTING (3 jobs)
   - PAUSED (0 jobs)
   - COMPLETED (5 jobs)
3. Drag job "Model_001" from QUEUED column to IN_QUEUE
4. Verify drag animation completes
5. Confirm modal appears (if configured) to add note
6. Enter note: "Started with Printer 2"
7. Click "Confirm"
8. Job card disappears from QUEUED, appears in IN_QUEUE
9. Verify activity log shows status change
10. Drag "Model_001" from IN_QUEUE to PRINTING
11. Drag "Model_001" from PRINTING to COMPLETED
12. Verify client notified (check email in logs)
13. Refresh page
14. Job persists in COMPLETED column

Assertions:
✓ Drag-drop registers correctly (no missing jobs)
✓ Status update saves to database
✓ Activity log created for each transition
✓ Client notification triggered on COMPLETED
✓ Job persists across page refresh
✓ No duplicate job cards
✓ Correct timestamps recorded (started_at, completed_at)

Expected Duration: 45 seconds
Data Required: Pre-created jobs in various statuses
Browser: Test with Chrome (Chromium) for stable drag-drop support
```

---

### 1.6 Material Inventory: Pricing Updates Propagate

**Scenario:** Admin updates material cost, verifies pricing calculations use new cost

**Test: "Material Price Change → Quick-Order Pricing Impact"**
```
Steps:
[ADMIN UPDATES MATERIAL]
1. Navigate to /admin/materials
2. Click on "PLA" material
3. Current cost: $0.05/gram
4. Update to: $0.08/gram
5. Click "Save"
6. Verify success message
7. Check activity shows price change

[CLIENT CHECKS PRICING]
8. Switch to client browser
9. Navigate to /quick-order
10. Upload same STL file (100g weight)
11. Select PLA material
12. Click "Get Price"
13. Verify cost calculated: 100g × $0.08 = $8.00
14. (Not $5.00 which was old price)
15. Old client's invoice shows old price locked in

[VERIFY OLD INVOICE UNAFFECTED]
16. Check previous invoice for same material
17. Line item price still shows original $0.05/gram
18. Total unchanged

Assertions:
✓ Material price updated in database
✓ New orders use new price
✓ Old invoices preserve historical price
✓ Quick-order pricing reflects new cost
✓ Activity shows who made change and when
✓ No retroactive price changes to invoices

Expected Duration: 60 seconds
Data Required: Multiple materials with different prices, test STL file
```

---

## 2. CRITICAL CLIENT PORTAL FLOWS (E2E SCENARIOS)

### 2.1 Client Authentication: Signup → Onboarding → Access Portal

**Scenario:** New client signs up, receives welcome email, accesses portal

**Test: "Complete Client Signup Flow"**
```
Steps:
1. Navigate to /signup (unauthenticated)
2. Verify redirect doesn't happen (public page)
3. Fill signup form:
   - firstName: "John"
   - lastName: "Doe"
   - businessName: "Doe Manufacturing"
   - email: "john@manufacturing.com"
   - password: "TestPass123!"
   - phone: "+61412345678"
4. Click "Create Account"
5. Verify form submission (no client errors)
6. Redirected to /client dashboard
7. Verify authenticated (user profile visible)
8. Check welcome email sent (in logs or inbox)
9. Verify client created in admin view (/admin/clients)
10. Verify user assigned CLIENT role

Assertions:
✓ Account created successfully
✓ Cookies set (sb:token, sb:refresh-token)
✓ User profile loaded with role=CLIENT
✓ Redirect to /client (not /admin)
✓ Welcome email triggered
✓ Client record created in database
✓ Can access /client routes
✓ Cannot access /admin routes (403 or redirect)

Expected Duration: 15 seconds
Data Required: Unique test email, valid password
```

---

### 2.2 Order Payment: Multiple Payment Methods

**Scenario:** Client views invoice, tries wallet credit, then Stripe payment

**Test: "Invoice Payment with Credit Fallback to Stripe"**
```
Steps:
[SETUP: Create invoice via admin with $200 total]

[CLIENT VIEWS INVOICE]
1. Client logs in → /client/orders
2. Click on invoice (balance due: $200)
3. Invoice detail shows:
   - Items list
   - Payment history (empty)
   - "Balance Due: $200"
   - Wallet balance: $150
4. Click "Use Wallet Credit" button
5. Modal: "Apply up to $150 to invoice"
6. Enter amount: $150
7. Click "Apply"
8. Verify credit applied:
   - Payment shown in history: $150
   - Balance due: $50
   - Wallet balance: $0
9. Click "Pay Online" (Stripe)
10. Redirected to Stripe checkout
11. Enter test card: 4242 4242 4242 4242
12. Expiry: 12/25, CVC: 123
13. Click "Pay"
14. Stripe processes payment
15. Webhook fires (async)
16. Redirected to /client/orders
17. Invoice shows status: PAID
18. Payment history shows $50 Stripe payment
19. Email notification received (payment confirmation)

Assertions:
✓ Wallet credit deducted correctly
✓ Partial payment recorded
✓ Balance due updated (was $200, now $50)
✓ Stripe session created
✓ Payment processed via webhook
✓ Invoice transitions to PAID
✓ Activity log shows both payments
✓ Email notifications sent
✓ No double-charging

Expected Duration: 60 seconds
Data Required: Client with wallet credit, Stripe test account
Browser: Chrome/Webkit (Stripe iframe compatibility)
```

---

### 2.3 Project Tracking: Active → Completed → Archive

**Scenario:** Client tracks job progress through project lifecycle

**Test: "Project Status Lifecycle Tracking"**
```
Steps:
[SETUP: Create quick-order with multiple jobs]

[CLIENT VIEW ACTIVE PROJECTS]
1. Client logs in → /client/projects/active
2. See "Manufacturing Project" with 3 jobs
3. Job statuses: 2 PRINTING, 1 QUEUED
4. Click project → detail view
5. See associated invoice: INV-001
6. See job progress (est. completion times)

[ADMIN COMPLETES JOBS]
7. [ADMIN BROWSER] Drag jobs to COMPLETED
8. [ADMIN] Send job status update notifications

[CLIENT SEES UPDATED STATUS]
9. [CLIENT] Refresh /client/projects/active
10. Jobs count updated (all now COMPLETED)
11. Project should move to /client/projects/completed on next load
12. Click on /client/projects/completed
13. See "Manufacturing Project" listed
14. Click project → view download button for final files

[CLIENT ARCHIVES]
15. Click "Archive Project"
16. Confirm modal
17. Project removed from other lists
18. Navigate to /client/projects/archived
19. Project visible here

Assertions:
✓ Active jobs display correctly
✓ Status updates reflect in real-time (or after refresh)
✓ Project status transitions based on job completion
✓ Completed projects appear in completed list
✓ Archive moves project to archive view
✓ Activity log shows all transitions
✓ File download works for completed projects

Expected Duration: 90 seconds
Data Required: Multi-job project, completed jobs
```

---

### 2.4 3D Model Upload & Preview in Quick-Order

**Scenario:** Client uploads STL, previews 3D model, configures materials

**Test: "STL File Upload, 3D Viewer, and Configuration"**
```
Steps:
1. Client navigates to /quick-order
2. See upload zone: "Drag files or click to upload"
3. Select test file: bracket_10x10x5mm.stl (2.3MB)
4. File appears in upload list
5. 3D model viewer initializes (ModelViewerWrapper)
6. Model renders in viewport
7. Can see:
   - Model geometry (pyramid shape)
   - Bounding box dimensions (10×10×5mm)
   - Estimated weight (15g)
   - Estimated volume (150mm³)
8. Test interaction:
   - Click + drag to rotate model
   - Scroll to zoom in/out
   - Right-click + drag to pan
9. Click "Orient Model" button
10. Support analysis runs (Web Worker)
11. Overhanging faces highlighted in red
12. Display estimated support volume
13. Accept suggested orientation or manually rotate
14. Click "Confirm Orientation"
15. Model locked with arrow indicator showing base
16. Select material dropdown → "PLA"
17. Select color dropdown → "White"
18. Quantity input: 1
19. Click "Get Price"
20. Pricing calculation:
    - Weight: 15g
    - Material cost: 15g × $0.05 = $0.75
    - Setup fee: $2.00
    - Shipping: $8.50
    - Tax: $1.13
    - Total: $12.38
21. Click "Proceed to Checkout"

Assertions:
✓ STL file upload succeeds
✓ Temporary file created (tmp_files record)
✓ 3D viewer renders model correctly
✓ Dimensions/weight extracted accurately
✓ Model rotation works smoothly (no lag)
✓ Support analysis completes (< 5 seconds)
✓ Material/color selectors update dynamically
✓ Pricing calculation correct (within $0.01)
✓ Orientation saved to session/state
✓ No console errors during rendering

Expected Duration: 45 seconds
Data Required: Valid STL test file, materials in DB with pricing
Browser: Chromium (Three.js WebGL support)
```

---

### 2.5 Messaging: Client-Admin Communication

**Scenario:** Client sends message about order, admin responds

**Test: "Message Thread Creation & Response"**
```
Steps:
[CLIENT SENDS MESSAGE]
1. Client on /client/orders/[id] (invoice detail)
2. Scroll to "Messages" section
3. Text input: "Can I get this expedited?"
4. Click "Send"
5. Message appears in thread
6. Activity log shows message created
7. Email sent to admin (notification)

[ADMIN READS & RESPONDS]
8. Admin receives email notification
9. Navigate to /admin/messages
10. See conversation from "John Doe"
11. Click to open thread
12. See client's message: "Can I get this expedited?"
13. Click "Reply"
14. Type: "Yes, extra charge is $50"
15. Click "Send"
16. Admin's message sent to client

[CLIENT SEES RESPONSE]
17. Client checks /client/messages
18. See thread updated with admin response
19. Notification appears (toast or badge)
20. Click to view full response

Assertions:
✓ Message created with correct timestamp
✓ Message linked to invoice (if via order page)
✓ Both parties see message thread
✓ Email notifications sent appropriately
✓ Activity log shows message creation
✓ Conversation thread organized chronologically
✓ No message loss/duplication
✓ Special characters/formatting preserved

Expected Duration: 45 seconds
Data Required: Two user accounts (client + admin)
```

---

## 3. AUTHENTICATION & SESSION FLOWS

### 3.1 Login → Role-Based Redirect

**Test: "Login with Role-Based Navigation"**
```
Scenario A: Admin Login
1. Navigate to /login
2. Enter: email="admin@3dprintsydney.com", password="AdminPass123!"
3. Click "Login"
4. Redirected to /admin/dashboard
5. Verify admin layout visible (full navigation)
6. Check role in user profile: ADMIN

Scenario B: Client Login
1. Navigate to /login
2. Enter: email="client@company.com", password="ClientPass123!"
3. Click "Login"
4. Redirected to /client (client dashboard)
5. Verify client layout visible (limited navigation)
6. Check role in user profile: CLIENT

Scenario C: Invalid Credentials
1. Navigate to /login
2. Enter: email="wrong@email.com", password="WrongPass"
3. Click "Login"
4. Error message: "Invalid email or password"
5. Stay on /login page

Scenario D: Already Logged In User
1. Navigate to /login (while authenticated as client)
2. Middleware redirects to /client
3. Never see login form

Assertions:
✓ Correct role redirects to dashboard
✓ Invalid credentials show error (no redirect)
✓ Authenticated users cannot access /login
✓ Session created with correct role
✓ Cookies set securely (httpOnly, secure in prod)
```

---

### 3.2 Session Persistence & Token Refresh

**Test: "Session Persists Across Page Reload"**
```
Steps:
1. Client logs in
2. Navigate to /client/orders
3. Open browser DevTools → Application → Cookies
4. Verify: sb:token (access token) and sb:refresh-token present
5. Verify tokens are httpOnly (cannot access via JavaScript)
6. Open new tab, navigate to /client/orders (same domain)
7. Already authenticated (no login required)
8. Refresh page (F5)
9. Still authenticated (session persists)
10. Close browser entirely and reopen
11. Navigate to /client/orders again
12. Check if session restored (depends on token expiry)

Token Expiry Scenario:
13. Modify access token to simulate expiry
14. Make API call to /api/client/invoices
15. Server detects expired token
16. Attempts refresh using refresh_token
17. New access token issued
18. Request retried automatically
19. User sees no interruption

Assertions:
✓ Tokens stored in httpOnly cookies
✓ Tokens present after page refresh
✓ Tokens persist after browser close/reopen
✓ Token refresh happens transparently
✓ No user logout without explicit logout action
```

---

### 3.3 Logout & Session Cleanup

**Test: "Logout Clears Session"**
```
Steps:
1. Client logged in
2. Click "Logout" button (in user menu)
3. POST /api/auth/logout called
4. Cookies cleared (sb:token, sb:refresh-token removed)
5. Redirected to /login
6. Try to navigate to /client → redirected to /login?callbackUrl=/client
7. Check DevTools cookies → all auth cookies gone
8. Try API call (e.g., GET /api/client/invoices)
9. Get 401 Unauthorized (no valid token)

Assertions:
✓ Cookies deleted from storage
✓ User redirected to /login
✓ Protected routes redirect to login
✓ API calls rejected (401)
✓ Session completely cleared
```

---

## 4. FORM INTERACTIONS & DATA VALIDATION

### 4.1 Invoice Editor Form Validation

**Test: "Form Validation & Error Handling"**
```
Steps:
1. Navigate to /admin/invoices/new
2. Try submitting empty form (no client selected)
3. Error: "Client is required"
4. Select a client
5. Leave line items empty
6. Try submit
7. Error: "At least one line item required"
8. Add line item with negative quantity
9. Error: "Quantity must be positive"
10. Add line item with price
11. Try submit with future due date (invalid)
12. Error: "Due date must be in future"
13. Correct due date
14. Try submit with invalid shipping cost (-$50)
15. Error: "Shipping cost cannot be negative"
16. Fix shipping
17. Submit successfully

Assertions:
✓ Field-level validation shows inline errors
✓ Form submission blocked until valid
✓ Error messages are clear and actionable
✓ Valid form submits successfully
✓ No orphaned data on validation failure
```

---

### 4.2 Quick-Order Price Calculation Form

**Test: "Dynamic Pricing with Multiple Configuration Changes"**
```
Steps:
1. Upload STL (100g, 50g PLA + 50g support material)
2. Select material: PLA ($0.05/g)
3. Click "Get Price"
4. Calculation: 100g × $0.05 = $5.00 material cost
5. Plus $2 setup fee = $7.00
6. Display shown: $7.00
7. Change material to Resin ($0.15/g)
8. Click "Get Price" again
9. Calculation: 100g × $0.15 = $15.00 + $2 setup = $17.00
10. Change state/postcode → shipping changes
11. Old shipping: $8.50
12. New shipping: $12.00
13. Verify total updated
14. Change quantity from 1 to 2
15. All costs doubled
16. Change back to 1
17. Costs return to original

Assertions:
✓ Prices update in real-time (< 1 second)
✓ Shipping changes when location changes
✓ Quantity multiplier applied correctly
✓ Tax recalculated after each change
✓ No stale pricing displayed
```

---

## 5. FILE OPERATIONS

### 5.1 File Upload: STL → Temporary Storage

**Test: "STL File Upload Process"**
```
Steps:
1. Select STL file via file picker or drag-drop
2. Progress bar appears (if > 1MB)
3. File uploads to /tmp bucket (Supabase Storage)
4. tmp_files record created in database
5. File disappears from temp storage after checkout
   (or after configured retention period)

Edge Cases:
- Upload file > 100MB → Error: "File exceeds size limit"
- Upload non-STL file (.jpg) → Error: "Invalid file type"
- Upload valid .stl, then delete via admin
  → Client checkout fails: "File no longer available"

Assertions:
✓ File uploaded to correct bucket
✓ Temporary record created
✓ File accessible for preview
✓ File deleted after checkout (moved to order-files)
✓ Size/type validation enforced
```

---

### 5.2 Invoice PDF Download

**Test: "Generate & Download Invoice PDF"**
```
Steps:
1. View invoice detail (/admin/invoices/[id])
2. Click "Download PDF" button
3. Browser starts PDF download
4. File named: INV-{number}-{date}.pdf
5. Open PDF in viewer
6. Verify content:
   - Invoice number matches
   - Client name/address correct
   - All line items visible
   - Totals (subtotal, discount, tax, total) match DB
   - Payment status shown
7. PDF renders without errors

Assertions:
✓ PDF generated from invoice data
✓ All fields populated correctly
✓ Totals match database
✓ File downloads with correct name
✓ PDF is valid (not corrupted)
```

---

### 5.3 File Attachment Upload to Invoice

**Test: "Upload & Attach File to Invoice"**
```
Steps:
1. View invoice detail
2. Scroll to "Attachments" section
3. Click "Upload File"
4. Select file: quote-email.pdf or specification.doc
5. File uploads (progress indicator)
6. File appears in attachments list
7. Can click to download attachment
8. Can delete attachment (with confirm)
9. Attachment metadata shown (name, size, uploaded_at)

Assertions:
✓ File stored in attachments bucket
✓ Metadata recorded in database
✓ File accessible for download
✓ Deletion removes file and record
✓ Attachment linked to invoice (no orphans)
```

---

## 6. REAL-TIME UPDATES & NOTIFICATIONS

### 6.1 Job Status Update → Client Notification

**Test: "Job Status Change Triggers Email"**
```
Steps:
[SETUP: Create job in PRINTING status]

[ADMIN UPDATES]
1. Admin on /admin/jobs board
2. Click job card or context menu
3. Click "Mark as Completed"
4. Optional: Add note "Successfully printed"
5. Click "Confirm"
6. Job status updates to COMPLETED
7. Activity log created
8. Email triggered to client

[CLIENT VERIFICATION]
9. Client checks email (mock email service)
10. Email received: "Your job is completed!"
11. Email contains job details
12. Client navigates to /client/projects/completed
13. Project status updated (all jobs done)
14. Dashboard shows project as completed

Assertions:
✓ Job status persisted correctly
✓ Email sent to correct client
✓ Email contains job details
✓ Client view updated (or after refresh)
✓ Activity log shows status change
```

---

### 6.2 Admin Dashboard Activity Feed Real-Time

**Test: "Dashboard Activity Updates"**
```
Steps:
1. Admin on /admin/dashboard
2. Activity feed shows last 10 actions
3. [Parallel: Another admin creates invoice via API]
4. Activity feed updates (either real-time or after refresh)
5. New invoice creation appears in feed
6. Timestamp shows current time
7. Actor shows other admin's name
8. Click activity entry → navigates to invoice detail

Assertions:
✓ Activity recorded for all major actions
✓ Feed displays correct data
✓ Timestamps accurate
✓ Activity links navigate correctly
```

---

## 7. PERMISSION & ACCESS CONTROL

### 7.1 Client Cannot Access Admin Routes

**Test: "RBAC - Client Blocked from Admin"**
```
Steps:
1. Client logged in
2. Try direct navigate to /admin/invoices
3. Redirected to /client (or 403 error)
4. Try API call: GET /api/invoices
5. Get 403 Forbidden response
6. Cannot view other clients' data
7. Try: GET /api/invoices?client_id=123
8. API filters to own client only (or 403)

Assertions:
✓ Admin routes return 403/redirect
✓ API endpoints enforce permission
✓ Client cannot see other clients' data
✓ Role mismatch handled securely
```

---

### 7.2 Admin Cannot Access Client Routes as Admin

**Test: "Admin Cannot Access /client Routes"**
```
Steps:
1. Admin logged in
2. Try direct navigate to /client
3. Redirected to /admin/dashboard
4. Admin has no access to "Pay Invoice" button
5. Cannot use wallet credit (not applicable)

Assertions:
✓ /client routes redirect admin
✓ Client-specific features hidden from admin
```

---

## 8. PAGE OBJECT MODEL STRUCTURE

Recommended Playwright Page Objects for maintainability:

```typescript
// pages/auth.page.ts
export class AuthPage {
  constructor(private page: Page) {}

  async login(email: string, password: string) {
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.click('button[type="submit"]');
    await this.page.waitForURL(/dashboard|client/);
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('button:has-text("Logout")');
    await this.page.waitForURL('/login');
  }
}

// pages/admin/invoices.page.ts
export class AdminInvoicesPage {
  constructor(private page: Page) {}

  async createInvoice(data: InvoiceData) {
    await this.page.goto('/admin/invoices/new');
    await this.selectClient(data.clientId);
    await this.addLineItems(data.items);
    await this.setDiscount(data.discount);
    await this.click('button:has-text("Create")');
  }

  async viewInvoice(invoiceNumber: string) {
    await this.page.click(`text=${invoiceNumber}`);
    await this.page.waitForURL(/invoices\/\d+/);
  }

  async markPaid(amount: number) {
    await this.click('[data-testid="mark-paid"]');
    await this.page.fill('input[name="amount"]', amount.toString());
    await this.click('button:has-text("Confirm")');
  }
}

// pages/client/orders.page.ts
export class ClientOrdersPage {
  constructor(private page: Page) {}

  async viewOrders() {
    await this.page.goto('/client/orders');
  }

  async applyWalletCredit(invoiceId: string, amount: number) {
    await this.page.click(`[data-invoice-id="${invoiceId}"]`);
    await this.click('[data-testid="use-credit"]');
    await this.page.fill('input[name="amount"]', amount.toString());
    await this.click('button:has-text("Apply")');
  }

  async payWithStripe(invoiceId: string) {
    await this.click(`[data-invoice-id="${invoiceId}"]`);
    await this.click('[data-testid="pay-stripe"]');
    // Handle Stripe iframe
  }
}

// pages/quick-order.page.ts
export class QuickOrderPage {
  constructor(private page: Page) {}

  async uploadFile(filePath: string) {
    await this.page.setInputFiles('[type="file"]', filePath);
    await this.page.waitForSelector('[data-testid="model-viewer"]');
  }

  async selectMaterial(material: string) {
    await this.page.selectOption('select[name="material"]', material);
  }

  async getPrice() {
    await this.click('button:has-text("Get Price")');
    return await this.page.textContent('[data-testid="total"]');
  }

  async checkout() {
    await this.click('button:has-text("Proceed to Checkout")');
  }
}
```

---

## 9. TEST DATA SETUP REQUIREMENTS

### Fixtures & Seed Data

```typescript
// fixtures/test-data.ts
export const testData = {
  clients: {
    acme: {
      name: 'ACME Corp',
      email: 'test-acme@example.com',
      phone: '0412345678',
      address: '123 Main St, Sydney NSW 2000'
    },
    manufacturing: {
      name: 'ABC Manufacturing',
      email: 'test-mfg@example.com'
    }
  },

  materials: {
    pla: { name: 'PLA', costPerGram: 0.05, color: 'White' },
    resin: { name: 'Resin', costPerGram: 0.15, color: 'Clear' }
  },

  stlFiles: {
    small: 'test-files/bracket-small.stl', // 2MB, 15g
    large: 'test-files/model-large.stl',   // 50MB, 500g
    invalid: 'test-files/image.jpg'
  }
};

// fixtures/auth.fixture.ts
export const authenticatedContext = async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Login
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@test.com');
  await page.fill('input[name="password"]', 'TestPass123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('/admin/dashboard');
  
  return { page, context };
};

// fixtures/database.fixture.ts
export const seededDatabase = async () => {
  // Create test clients
  // Create test materials
  // Create test invoices/quotes
  // Return setup state
};
```

---

## 10. AUTHENTICATION FIXTURE STRATEGIES

### Session-Based Auth (Current Implementation)

```typescript
// fixtures/auth.ts
async function loginAs(page: Page, role: 'admin' | 'client') {
  const credentials = {
    admin: { email: 'admin@test.com', password: 'AdminPass123!' },
    client: { email: 'client@test.com', password: 'ClientPass123!' }
  };

  const { email, password } = credentials[role];
  
  await page.goto('/login');
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for redirect to confirm auth
  await page.waitForURL(role === 'admin' ? '/admin/*' : '/client');
  
  return { email, role };
}

// Usage in test
test('admin creates invoice', async ({ page }) => {
  const { email } = await loginAs(page, 'admin');
  // ... rest of test
});
```

### API-Based Auth (Faster for Setup)

```typescript
// fixtures/api-auth.ts
async function getAuthToken(role: 'admin' | 'client') {
  const credentials = {
    admin: { email: 'admin@test.com', password: 'AdminPass123!' },
    client: { email: 'client@test.com', password: 'ClientPass123!' }
  };

  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials[role])
  });

  const { session } = await response.json();
  return session.access_token;
}

// Set cookies before page load
async function authenticateViaAPI(page: Page, role: 'admin' | 'client') {
  const token = await getAuthToken(role);
  const refreshToken = await getRefreshToken(role);
  
  await page.context().addCookies([
    {
      name: 'sb:token',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
      expires: Date.now() / 1000 + 3600
    },
    {
      name: 'sb:refresh-token',
      value: refreshToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax'
    }
  ]);
}
```

---

## 11. BROWSER & VIEWPORT COVERAGE

### Recommended Coverage Matrix

| Browser | Versions | Priority | Use Case |
|---------|----------|----------|----------|
| Chromium | Latest | Critical | Primary browser, Linux CI/CD |
| Firefox | Latest | High | Cross-browser validation |
| WebKit | Latest | Medium | Safari compatibility |
| Chrome Mobile | Latest | Medium | Responsive design (iPad width) |

### Viewport Configurations

```typescript
// playwright.config.ts
const viewports = {
  desktop: { width: 1920, height: 1080 },
  laptop: { width: 1366, height: 768 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 }
};

// Critical flows: desktop + laptop
// Quick-order: desktop + mobile (file upload important)
// Job board drag-drop: desktop only (mobile drag unreliable)
```

### Device Pixel Ratio

- Desktop: 1x (most common)
- Mobile: 2x (iOS retina)
- Test both for consistency

---

## 12. PLAYWRIGHT-SPECIFIC RECOMMENDATIONS

### Setup & Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ],
  
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
});
```

### Best Practices

1. **Locator Strategy**: Prefer `data-testid` over CSS selectors
   ```typescript
   // Good
   await page.click('[data-testid="submit-button"]');
   
   // Avoid
   await page.click('button.btn.btn-primary');
   ```

2. **Wait Strategies**: Use `waitForURL()` over `waitForNavigation()`
   ```typescript
   // Good
   await page.click('a[href="/admin/invoices"]');
   await page.waitForURL('/admin/invoices');
   
   // Avoid
   await Promise.all([
     page.waitForNavigation(),
     page.click('a')
   ]);
   ```

3. **Assertion Patterns**: Use soft assertions for non-blocking validations
   ```typescript
   // Soft assertions (test continues on failure)
   await expect.soft(page.locator('[data-testid="balance"]')).toContainText('$0');
   
   // Hard assertions (test stops)
   await expect(page.locator('[data-testid="status"]')).toContainText('PAID');
   ```

4. **Async/Await**: Always use `await` for async operations
   ```typescript
   // Good
   const content = await page.locator('[data-testid="message"]').textContent();
   
   // Avoid
   page.locator('[data-testid="message"]').textContent().then(...);
   ```

5. **Fixtures for Setup**: Use Playwright fixtures for reusable setup
   ```typescript
   // conftest.ts or fixtures.ts
   export const authenticatedAdmin = test.extend({
     admin: async ({ page }, use) => {
       await loginAs(page, 'admin');
       await use(page);
     }
   });
   
   // Usage
   authenticatedAdmin('should create invoice', async ({ admin }) => {
     // admin is already logged in
   });
   ```

6. **Network Interception**: Mock API responses for deterministic tests
   ```typescript
   await page.route('**/api/invoices/**', route => {
     if (route.request().method() === 'POST') {
       route.abort('blockedbyclient'); // Block payment creation
     } else {
       route.continue();
     }
   });
   ```

7. **Error Handling**: Catch and verify error states
   ```typescript
   const errorLocator = page.locator('[role="alert"]');
   await expect(errorLocator).toBeVisible();
   await expect(errorLocator).toContainText('Insufficient credit balance');
   ```

---

## 13. TEST DATA SETUP REQUIREMENTS

### Pre-Test Fixtures

1. **Database Seeding**
   - Create 2-3 test clients with different statuses
   - Create materials with various costs
   - Create product templates
   - Create shipping configs for multiple regions
   - Seed auth users (admin + 2 clients)

2. **File Fixtures**
   - Small STL (valid, 2MB, 15g)
   - Large STL (valid, 45MB, 450g)
   - Invalid files (image.jpg, bad.txt)
   - Gcode samples (for slicer testing)

3. **API Setup**
   - Stripe test keys configured
   - Resend mock email service ready
   - Supabase test project initialized
   - Test database with RLS policies disabled (or test user with all perms)

### Cleanup Strategy

- Delete test invoices/quotes after each test
- Clear temp files after file upload tests
- Reset client wallet balances
- Clear test messages
- Maintain test users (for reuse)

---

## 14. CI/CD INTEGRATION

### GitHub Actions Workflow

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run build
      
      - run: npx playwright install --with-deps
      
      - run: npm run test:e2e
      
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

---

## 15. CRITICAL SUCCESS CRITERIA

### Test Execution

✓ All tests pass on Chromium  
✓ 90%+ tests pass on Firefox/WebKit  
✓ No flaky tests (0 intermittent failures)  
✓ Average test duration < 60 seconds  
✓ Total suite execution < 30 minutes  
✓ Screenshots/videos captured on failure  

### Coverage

✓ All 6 critical admin flows tested  
✓ All 5 critical client flows tested  
✓ 3+ authentication scenarios  
✓ 4+ permission/access control scenarios  
✓ 5+ form validation scenarios  
✓ 3+ file operation scenarios  
✓ 2+ real-time update scenarios  

### Maintainability

✓ Page Object Model implemented  
✓ Fixtures used for setup  
✓ Data-testid attributes added to UI  
✓ Test documentation complete  
✓ CI/CD pipeline configured  
✓ Failure diagnostics (screenshots, videos, traces)  

---

## 16. PHASE BREAKDOWN & TIMELINE

### Phase 3a: Foundation (Week 1)
- [ ] Set up Playwright configuration
- [ ] Create page objects (Auth, Admin, Client)
- [ ] Build test fixtures (auth, data)
- [ ] Create 5 smoke tests (basic login, create invoice, etc.)

### Phase 3b: Admin Flows (Week 2)
- [ ] Complete quote lifecycle test
- [ ] Invoice CRUD + payment test
- [ ] Client management test
- [ ] Job board drag-drop test
- [ ] Material pricing test
- [ ] 3+ additional admin workflows

### Phase 3c: Client & Auth (Week 3)
- [ ] Signup → portal access test
- [ ] Multi-method payment test
- [ ] Quick-order upload + pricing test
- [ ] Project tracking lifecycle test
- [ ] Session persistence test
- [ ] 3+ auth/permission tests

### Phase 3d: Edge Cases & CI (Week 4)
- [ ] Form validation scenarios
- [ ] File upload edge cases
- [ ] Concurrent update scenarios
- [ ] Error handling paths
- [ ] CI/CD pipeline setup
- [ ] Cross-browser testing

---

## 17. KNOWN ISSUES & WORKAROUNDS

### Stripe Testing
- Use Stripe test keys (never live keys)
- Test webhook via webhook CLI or mock responses
- Cannot fully test Stripe iframe in headless (use manual testing for that)

### File Uploads
- Use actual STL files (not data URLs) for realistic testing
- File sizes matter for timeout testing (use small files for CI)
- Mock storage responses if needed (for faster tests)

### 3D Model Viewer
- Three.js WebGL requires Chromium/Firefox
- WebKit may have rendering differences
- Test model loading separately from interaction (Chromium only)

### Real-Time Updates
- No WebSocket in this app (uses Supabase DB polling)
- Test by refreshing page or use `page.reload()` between state changes
- Cannot test true "push" updates without WebSocket

---

## 18. SUMMARY & NEXT STEPS

### What This Document Provides

1. **18 detailed E2E scenarios** mapping complete user journeys
2. **Page Object Model structure** for maintainable tests
3. **Test data fixtures** for consistent setup
4. **Auth strategies** for role-based testing
5. **Browser coverage matrix** for cross-browser validation
6. **Playwright best practices** specific to this app
7. **CI/CD configuration** for automated test runs
8. **Phase breakdown** for incremental implementation

### Immediate Actions

1. **Week 1:**
   - Set up Playwright project
   - Configure page objects
   - Create 3 smoke tests
   - Set up CI/CD stub

2. **Week 2-3:**
   - Implement 15-20 critical E2E tests
   - Build test data fixtures
   - Add data-testid attributes to UI
   - Validate cross-browser runs

3. **Week 4+:**
   - Complete remaining scenarios
   - Add edge case testing
   - Optimize test execution time
   - Establish baseline metrics

---

**Generated:** 2025-11-12  
**Framework Version:** Playwright 1.40+  
**Node Version:** 18+  
**Status:** Ready for implementation  

