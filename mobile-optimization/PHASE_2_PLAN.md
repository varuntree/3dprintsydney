# PHASE 2: ADMIN PORTAL OPTIMIZATION

**Objective**: Optimize all 14 main admin pages, 20+ sub-pages, 12+ modals, and all forms for mobile responsiveness.

**Priority**: HIGH - Admin portal is heavily used and contains complex workflows.

**Prerequisites**: Phase 1 (Shared Components) must be complete.

---

## 2.1 ADMIN LAYOUT & SHELL

### 2.1.1 Admin Layout
- **File**: `/src/app/(admin)/layout.tsx`
- **Optimizations**:
  - [ ] Verify role-based access control works on mobile
  - [ ] Test loading states on mobile
  - [ ] Ensure error states are visible
  - [ ] Verify AdminShell integration

---

## 2.2 DASHBOARD

### 2.2.1 Dashboard View
- **File**: `/src/components/dashboard/dashboard-view.tsx`
- **Optimizations**:
  - [ ] Make metrics cards stack in 1 column on mobile
  - [ ] Reduce metric card padding and font sizes
  - [ ] Make revenue chart responsive (reduce height, adjust axes)
  - [ ] Convert quote status breakdown to vertical layout on mobile
  - [ ] Convert job summary table to card view on mobile
  - [ ] Show fewer outstanding invoices on mobile (5 instead of 10)
  - [ ] Activity feed: reduce padding, smaller avatars, compact timestamps
  - [ ] Range selector: convert to dropdown on mobile
  - [ ] Test pagination on mobile
  - [ ] Ensure all data cards are touch-friendly

---

## 2.3 CLIENTS MANAGEMENT

### 2.3.1 Clients List View
- **File**: `/src/app/(admin)/clients/page.tsx`
- **Component**: `ClientsView`
- **Optimizations**:
  - [ ] Convert clients table to card view on mobile
  - [ ] Each card shows: name, company, email, outstanding balance
  - [ ] Add quick actions to each card (tap to expand or menu)
  - [ ] Search input: full-width on mobile
  - [ ] Filter chips: horizontal scroll if overflow
  - [ ] "New Client" button: prominent or floating action button
  - [ ] Test create dialog on mobile (full-screen)
  - [ ] Verify sorting and filtering works on mobile

### 2.3.2 Client Detail View
- **File**: `/src/app/(admin)/clients/[id]/page.tsx`
- **Component**: `ClientDetail`
- **Optimizations**:
  - [ ] Stack client info panel vertically (name, company, email, phone, address)
  - [ ] Action buttons: dropdown menu on mobile (Edit, Add Credit, Delete)
  - [ ] Outstanding balance: prominent display at top
  - [ ] Tabs: scroll horizontally if needed
  - [ ] Show tab counts in badges
  - [ ] **Invoices Tab**: Convert table to card view
  - [ ] **Quotes Tab**: Convert table to card view
  - [ ] **Jobs Tab**: Convert table to card view
  - [ ] **Activity Timeline**: Reduce padding, compact layout
  - [ ] **Notes Section**: Full-width textarea, larger submit button
  - [ ] **Messages/Conversation**: Full-screen on mobile, fixed input at bottom
  - [ ] Test tab switching on mobile
  - [ ] Verify all sub-sections are accessible

### 2.3.3 Client Detail - Add Credit Modal
- **Component**: Within ClientDetail
- **Optimizations**:
  - [ ] Full-screen on mobile
  - [ ] Larger amount input
  - [ ] Stack balance displays vertically
  - [ ] Reason dropdown: full-width
  - [ ] Notes textarea: larger
  - [ ] Submit button: full-width

### 2.3.4 New Client Creation
- **File**: `/src/app/(admin)/clients/new/page.tsx` or inline dialog
- **Optimizations**:
  - [ ] Full-screen dialog on mobile
  - [ ] Stack all form fields vertically
  - [ ] All inputs: full-width, larger touch targets
  - [ ] Payment terms dropdown: full-width
  - [ ] Tags input: full-width
  - [ ] Submit button: full-width on mobile

---

## 2.4 INVOICES MANAGEMENT

### 2.4.1 Invoices List View
- **File**: `/src/app/(admin)/invoices/page.tsx`
- **Component**: `InvoicesView`
- **Optimizations**:
  - [ ] Data cards (totals, outstanding): stack in 1 column on mobile
  - [ ] Reduce card font sizes
  - [ ] Tabs (All, Pending, Paid, Overdue): scroll horizontally
  - [ ] Show tab counts in badges
  - [ ] Convert invoices table to card view on mobile
  - [ ] Each card shows: number, client, status, amount, due date
  - [ ] Quick actions: dropdown or tap to expand
  - [ ] Stripe status indicator: smaller icon
  - [ ] Search input: full-width
  - [ ] Filter dropdowns: collapse into "Filters" button on mobile
  - [ ] "New Invoice" button: FAB at bottom-right
  - [ ] Test tab switching
  - [ ] Verify card tap navigation works

### 2.4.2 Invoice Detail View
- **File**: `/src/app/(admin)/invoices/[id]/page.tsx`
- **Component**: `InvoiceView`
- **Optimizations**:
  - [ ] Invoice header: stack client info, invoice number, dates vertically
  - [ ] Status badge: prominent at top
  - [ ] Action buttons: dropdown menu or horizontal scroll
  - [ ] Line items table: convert to card/list view on mobile
  - [ ] Show item name, quantity, unit price, total per item
  - [ ] Subtotal, tax, discount, shipping, total: stack as list
  - [ ] Notes and terms: collapsible sections on mobile
  - [ ] PDF button: prominent
  - [ ] Edit mode toggle: clear and accessible
  - [ ] Test all status actions on mobile (Mark Paid, Void, etc.)

### 2.4.3 Invoice Editor
- **Component**: `InvoiceEditor`
- **Optimizations**:
  - [ ] Full-screen editor on mobile
  - [ ] Client picker: full-screen dialog
  - [ ] Date pickers: native date input or full-screen calendar
  - [ ] Line items: each item in expandable card
  - [ ] Add line item button: fixed at bottom or prominent
  - [ ] Calculator dialog: full-screen on mobile
  - [ ] Product template dropdown: full-width
  - [ ] Discount/tax settings: collapsible section
  - [ ] Shipping region select: full-width
  - [ ] Notes/terms textareas: full-width, larger height
  - [ ] Save/Cancel buttons: stack vertically, full-width
  - [ ] Test line item add/remove on mobile
  - [ ] Verify calculator integration

### 2.4.4 Invoice Payments Panel
- **Component**: `InvoicePayments`
- **Optimizations**:
  - [ ] Payment records table: convert to card view
  - [ ] Each card shows: amount, method, date, reference
  - [ ] "Add Payment" button: prominent, full-width
  - [ ] Add payment form: full-screen modal on mobile
  - [ ] Payment form fields: larger inputs, stack vertically
  - [ ] Method dropdown: full-width
  - [ ] Amount input: larger, number keyboard
  - [ ] Date picker: native or full-screen calendar
  - [ ] Submit button: full-width

### 2.4.5 Invoice Attachments Panel
- **Component**: `InvoiceAttachments`
- **Optimizations**:
  - [ ] Attachment list: card view with icons
  - [ ] Show file name, size, upload date
  - [ ] Upload button: prominent, full-width
  - [ ] File upload dialog: full-screen on mobile
  - [ ] Show file previews appropriately sized
  - [ ] Delete buttons: clear and accessible

### 2.4.6 Invoice Activity Panel
- **Component**: `InvoiceActivity`
- **Optimizations**:
  - [ ] Activity timeline: compact on mobile
  - [ ] Smaller icons, reduced padding
  - [ ] Stack timestamps below activities
  - [ ] Ensure readability

### 2.4.7 Invoice Messages/Conversation
- **Component**: `Conversation`
- **Optimizations**:
  - [ ] Full-screen conversation on mobile
  - [ ] Fixed input at bottom
  - [ ] Scrollable message area
  - [ ] Optimize message bubbles (reduce padding)
  - [ ] Test message input with mobile keyboard
  - [ ] Ensure send button is accessible

### 2.4.8 New Invoice Creation
- **File**: `/src/app/(admin)/invoices/new/page.tsx`
- **Optimizations**:
  - [ ] Same as Invoice Editor optimizations
  - [ ] Emphasize required fields
  - [ ] Clear "Create Invoice" title

---

## 2.5 QUOTES MANAGEMENT

### 2.5.1 Quotes List View
- **File**: `/src/app/(admin)/quotes/page.tsx`
- **Component**: `QuotesView`
- **Optimizations**:
  - [ ] Metrics cards: stack in 1 column on mobile
  - [ ] Reduce font sizes
  - [ ] Tabs (All, Draft, Pending, Accepted, Declined, Converted): scroll horizontally
  - [ ] Show tab counts
  - [ ] Convert quotes table to card view on mobile
  - [ ] Each card shows: number, client, status, total, expiry
  - [ ] Quick actions: dropdown or tap to expand
  - [ ] Search: full-width
  - [ ] Filters: collapse into button
  - [ ] "New Quote" button: FAB or header button
  - [ ] Test tab switching
  - [ ] Verify card navigation

### 2.5.2 Quote Detail View
- **File**: `/src/app/(admin)/quotes/[id]/page.tsx`
- **Component**: `QuoteView`
- **Optimizations**:
  - [ ] Stack quote header info vertically
  - [ ] Status badge: prominent
  - [ ] Action buttons: dropdown menu (Accept, Decline, Convert, etc.)
  - [ ] Line items: card/list view
  - [ ] Subtotal, tax, discount, shipping, total: list view
  - [ ] Notes/terms: collapsible
  - [ ] PDF button: prominent
  - [ ] Test all quote actions on mobile

### 2.5.3 Quote Editor
- **Component**: `QuoteEditor`
- **Optimizations**:
  - [ ] Full-screen editor on mobile
  - [ ] Client picker: full-screen
  - [ ] Date pickers: native or full-screen
  - [ ] Line items: expandable cards
  - [ ] Add line item button: prominent
  - [ ] Calculator dialog: full-screen
  - [ ] Product template dropdown: full-width
  - [ ] Discount/tax: collapsible
  - [ ] Shipping: full-width
  - [ ] Notes/terms: full-width, larger
  - [ ] Save/Cancel: stack vertically, full-width
  - [ ] Test line item management
  - [ ] Verify calculator

### 2.5.4 New Quote Creation
- **File**: `/src/app/(admin)/quotes/new/page.tsx`
- **Optimizations**:
  - [ ] Same as Quote Editor optimizations
  - [ ] Clear "Create Quote" title

---

## 2.6 JOBS MANAGEMENT

### 2.6.1 Jobs Board (Kanban)
- **File**: `/src/components/jobs/job-board.tsx`
- **Optimizations**:
  - [ ] **Mobile Strategy**: Horizontal scroll with snap OR vertical list
  - [ ] If horizontal: columns scroll with snap-scroll
  - [ ] If vertical: group by printer/status with collapsible sections
  - [ ] Job cards: compact layout
  - [ ] Show: title, status badge, priority, due date, client
  - [ ] Reduce padding and font sizes
  - [ ] Tap job card to open detail
  - [ ] Test drag-and-drop on mobile (or disable)
  - [ ] Batch operations: menu on mobile
  - [ ] Show selection count prominently
  - [ ] Filters: collapse into button

### 2.6.2 Job Detail Side Sheet
- **Component**: Within JobsBoard
- **Optimizations**:
  - [ ] Full-screen on mobile (not side sheet)
  - [ ] Stack all fields vertically
  - [ ] Larger input fields
  - [ ] Status dropdown: full-width
  - [ ] Priority selector: larger buttons
  - [ ] Printer dropdown: full-width
  - [ ] Notes textarea: larger
  - [ ] Custom file inputs: optimized for mobile
  - [ ] Save/Cancel: stack vertically, full-width
  - [ ] Test form submission

---

## 2.7 CATALOG MANAGEMENT

### 2.7.1 Printers Management
- **File**: `/src/app/(admin)/printers/page.tsx`
- **Component**: `PrintersView`
- **Optimizations**:
  - [ ] Convert printers table to card view on mobile
  - [ ] Each card: name, model, status badge, build volume
  - [ ] Quick actions: edit/delete buttons or dropdown
  - [ ] "Add Printer" button: FAB or header button
  - [ ] Add/Edit dialog: full-screen on mobile
  - [ ] All form fields: full-width, larger inputs
  - [ ] Status dropdown: full-width
  - [ ] Notes textarea: larger
  - [ ] Save/Cancel: stack vertically, full-width
  - [ ] Test CRUD operations

### 2.7.2 Products (Templates) Management
- **File**: `/src/app/(admin)/products/page.tsx`
- **Component**: `ProductsView`
- **Optimizations**:
  - [ ] Convert products table to card view on mobile
  - [ ] Each card: name, pricing type, base price
  - [ ] Quick actions: edit/delete
  - [ ] "Add Product" button: FAB or header button
  - [ ] Add/Edit dialog: full-screen on mobile
  - [ ] Form fields: full-width, larger
  - [ ] Pricing type toggle: larger buttons
  - [ ] Calculator config: collapsible or separate step
  - [ ] Material assignment: full-width multi-select
  - [ ] Save/Cancel: stack vertically, full-width
  - [ ] Test CRUD operations

### 2.7.3 Materials Management
- **File**: `/src/app/(admin)/dashboard/materials-admin/page.tsx`
- **Component**: `MaterialsView`
- **Optimizations**:
  - [ ] Convert materials table to card view on mobile
  - [ ] Each card: name, color swatch, category, cost per gram
  - [ ] Quick actions: edit/delete
  - [ ] "Add Material" button: FAB or header button
  - [ ] Add/Edit dialog: full-screen on mobile
  - [ ] Form fields: full-width, larger
  - [ ] Color picker: touch-friendly
  - [ ] Cost input: larger, number keyboard
  - [ ] Save/Cancel: stack vertically, full-width
  - [ ] Test CRUD operations

---

## 2.8 MESSAGES / ADMIN INBOX

### 2.8.1 Messages Page
- **File**: `/src/app/(admin)/messages/page.tsx`
- **Optimizations**:
  - [ ] **Mobile Strategy**: Single-pane approach
  - [ ] Show user list by default on mobile
  - [ ] Tap user to navigate to conversation (hide list)
  - [ ] Back button to return to user list
  - [ ] User list: full-width on mobile
  - [ ] Search input: full-width, larger
  - [ ] User items: larger touch targets
  - [ ] Show: avatar, name, last message preview, unread count
  - [ ] Reduce padding, compact layout
  - [ ] Conversation view: full-screen
  - [ ] Fixed header with user name and back button
  - [ ] Scrollable message area
  - [ ] Fixed input at bottom
  - [ ] Message bubbles: reduce padding
  - [ ] Optimize message input for mobile keyboard
  - [ ] Test message sending
  - [ ] Test navigation between list and conversation

---

## 2.9 USER MANAGEMENT

### 2.9.1 Users List
- **File**: `/src/app/(admin)/users/page.tsx`
- **Optimizations**:
  - [ ] Convert users table to card view on mobile
  - [ ] Each card: email, role badge, creation date, message count
  - [ ] Quick actions: message/delete buttons
  - [ ] "Invite User" button: prominent header button
  - [ ] Test card tap to navigate (if applicable)

### 2.9.2 Invite User Dialog
- **Component**: Within Users page
- **Optimizations**:
  - [ ] Full-screen on mobile
  - [ ] Email input: full-width, larger, email keyboard
  - [ ] Role selector: larger radio buttons or dropdown, full-width
  - [ ] Client picker: full-screen dialog (conditional on CLIENT role)
  - [ ] Temporary password display: larger text, easy copy button
  - [ ] Submit/Cancel: stack vertically, full-width
  - [ ] Test user creation flow

### 2.9.3 User Detail/Messages
- **File**: `/src/app/(admin)/users/[id]/page.tsx`
- **Optimizations**:
  - [ ] Same as Messages conversation optimizations
  - [ ] Full-screen conversation
  - [ ] Delete user button: prominent but destructive style
  - [ ] Confirmation dialog: full-screen on mobile
  - [ ] Test message thread
  - [ ] Test user deletion

---

## 2.10 REPORTS & EXPORTS

### 2.10.1 Reports Page
- **File**: `/src/app/(admin)/reports/page.tsx`
- **Optimizations**:
  - [ ] Date range picker: full-screen calendar or native inputs
  - [ ] Quick range buttons: scroll horizontally or stack
  - [ ] Selected range display: prominent
  - [ ] Export metrics cards: stack in 1 column
  - [ ] Reduce padding and font sizes
  - [ ] Export rows: each in a card
  - [ ] Show: export name, description, download button
  - [ ] Download buttons: full-width within card, touch-friendly
  - [ ] Test all 6 export types (Invoices, Payments, Jobs, AR Aging, Material Usage, Printer Utilization)
  - [ ] Test date range selection
  - [ ] Verify CSV downloads work on mobile

---

## 2.11 SETTINGS

### 2.11.1 Settings Form
- **File**: `/src/components/settings/settings-form.tsx`
- **Optimizations**:
  - [ ] Tabs: scroll horizontally on mobile
  - [ ] Show active tab indicator clearly
  - [ ] All sections: stack fields vertically
  - [ ] All inputs: full-width, larger
  - [ ] **Business Identity Section**: name, ABN, logo URL, tax rate full-width
  - [ ] Logo preview: appropriately sized
  - [ ] **Bank Details Section**: all fields full-width, appropriate keyboards
  - [ ] **Shipping Regions Section**: each region in expandable card
  - [ ] Code, label, states, amounts: full-width
  - [ ] States multi-select: full-screen dialog or dropdown
  - [ ] Add region button: full-width
  - [ ] **Payment Terms Section**: each term in card
  - [ ] Label and days: full-width
  - [ ] Add term button: full-width
  - [ ] **Job Creation Policy Section**: radio buttons larger, stacked
  - [ ] Webhook URL: full-width
  - [ ] Save button: fixed at bottom or sticky, full-width
  - [ ] Test all sections
  - [ ] Test form array operations (add/remove regions, terms)

---

## 2.12 ACCOUNT MANAGEMENT

### 2.12.1 Account Settings / Change Password
- **File**: `/src/app/(admin)/account/page.tsx`
- **Component**: `ChangePasswordForm`
- **Optimizations**:
  - [ ] All password inputs: full-width, larger
  - [ ] Show/hide password toggles: larger, accessible
  - [ ] Submit button: full-width
  - [ ] Error messages: clearly visible
  - [ ] Test password change flow

---

## TESTING CHECKLIST FOR PHASE 2

After optimizing each admin page/component:

- [ ] Test on mobile viewport (375px)
- [ ] Test on tablet viewport (768px)
- [ ] Test on desktop viewport (1440px)
- [ ] Test touch interactions and navigation
- [ ] Test all forms and form submissions
- [ ] Test all modals and dialogs
- [ ] Test all tables (card view on mobile)
- [ ] Test all tab interfaces
- [ ] Verify no horizontal overflow
- [ ] Verify text readability
- [ ] Test with mobile soft keyboard open
- [ ] Test data loading and error states
- [ ] Verify all CRUD operations work
- [ ] Test with Safari iOS
- [ ] Test with Chrome Android

---

## COMPLETION CRITERIA

Phase 2 is complete when:
- [ ] All 14 main admin pages are optimized
- [ ] All sub-pages and tabs are optimized
- [ ] All 12+ modals/dialogs are optimized
- [ ] All forms work correctly on mobile
- [ ] All tables have mobile-friendly views
- [ ] All pages pass the testing checklist
- [ ] No regressions in functionality
- [ ] All checkboxes in this plan are marked complete
