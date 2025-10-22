# PHASE 3: CLIENT PORTAL OPTIMIZATION

**Objective**: Optimize all 7 main client pages, including the complex 5-step quick-order workflow and payment modal, for mobile responsiveness.

**Priority**: HIGH - Client portal is customer-facing and includes critical conversion workflows.

**Prerequisites**: Phase 1 (Shared Components) must be complete.

---

## 3.1 CLIENT LAYOUT & SHELL

### 3.1.1 Client Layout
- **File**: `/src/app/(client)/layout.tsx`
- **Optimizations**:
  - [ ] Verify role-based access control works on mobile
  - [ ] Test loading states on mobile
  - [ ] Ensure error states are visible
  - [ ] Verify ClientShell integration

---

## 3.2 CLIENT DASHBOARD

### 3.2.1 Client Dashboard
- **File**: `/src/app/(client)/page.tsx`
- **Optimizations**:
  - [ ] Stack metric cards in 1 column on mobile
  - [ ] Reduce padding and font sizes
  - [ ] Wallet balance: prominent display at top
  - [ ] Recent orders: convert table to card view
  - [ ] Each order card: number, status, date, total
  - [ ] Show fewer items on mobile (5 instead of 10)
  - [ ] Quick action buttons: stack or scroll horizontally
  - [ ] "New Order" or "Quick Order" button: prominent, full-width or FAB
  - [ ] Test all dashboard interactions
  - [ ] Verify navigation to other sections

---

## 3.3 ORDERS MANAGEMENT

### 3.3.1 Orders List
- **File**: `/src/app/(client)/orders/page.tsx`
- **Optimizations**:
  - [ ] Convert orders table to card view on mobile
  - [ ] Each card shows: order number, status badge, date, total
  - [ ] Add quick actions (View, Reorder, Cancel if applicable)
  - [ ] Status badge: prominent and clear
  - [ ] Tap card to navigate to order detail
  - [ ] Search input: full-width on mobile
  - [ ] Status filters: horizontal scroll chips or dropdown
  - [ ] "New Order" button: FAB or prominent header button
  - [ ] Test filtering and searching
  - [ ] Verify card navigation

### 3.3.2 Order Detail
- **File**: `/src/app/(client)/orders/[id]/page.tsx`
- **Optimizations**:
  - [ ] Stack order header vertically (number, status, date)
  - [ ] Status badge: prominent at top
  - [ ] Action buttons: dropdown or stack (Cancel, Reorder, Contact)
  - [ ] Order items section: list view on mobile
  - [ ] Each item shows: name, quantity, price, subtotal
  - [ ] Reduce padding and font sizes
  - [ ] Production timeline (8 job stages): vertical timeline on mobile
  - [ ] Compact timeline items
  - [ ] Show: stage name, status, timestamp
  - [ ] Progress indicator: clear and visible
  - [ ] Order totals section: stack as list
  - [ ] Show: subtotal, tax, discount, shipping, total with clear labels
  - [ ] Order notes: collapsible section
  - [ ] Contact/message button: prominent if needed
  - [ ] Test all order actions
  - [ ] Verify timeline readability

---

## 3.4 INVOICES

### 3.4.1 Invoices List
- **File**: `/src/app/(client)/invoices/page.tsx`
- **Optimizations**:
  - [ ] Convert invoices table to card view on mobile
  - [ ] Each card shows: invoice number, due date, status badge, amount
  - [ ] "Pay Now" button: prominent if unpaid (primary color, full-width in card)
  - [ ] "View" button: secondary
  - [ ] Status filters: horizontal scroll chips or dropdown
  - [ ] Search: full-width
  - [ ] Outstanding balance summary: prominent card at top
  - [ ] Test filtering
  - [ ] Verify navigation to invoice detail
  - [ ] Test "Pay Now" flow

### 3.4.2 Invoice Detail
- **File**: `/src/app/(client)/invoices/[id]/page.tsx`
- **Optimizations**:
  - [ ] Stack invoice header vertically (number, due date, status)
  - [ ] Status badge: prominent
  - [ ] "Pay Now" button: full-width, prominent at top (if unpaid)
  - [ ] "Download PDF" button: secondary
  - [ ] Line items section: list view on mobile
  - [ ] Each item: name, quantity, unit price, total
  - [ ] Reduce padding
  - [ ] Totals section: stack as list
  - [ ] Show: subtotal, tax, discount, shipping, total
  - [ ] Notes/terms: collapsible sections
  - [ ] Payment history: card view on mobile (if applicable)
  - [ ] Test payment flow
  - [ ] Test PDF download

---

## 3.5 MESSAGES

### 3.5.1 Client Messages
- **File**: `/src/app/(client)/messages/page.tsx`
- **Optimizations**:
  - [ ] **Mobile Strategy**: Single-pane or direct conversation
  - [ ] If multiple conversations: show list, tap to open conversation
  - [ ] If single conversation with admin: full-screen conversation view
  - [ ] Conversation view: full-screen on mobile
  - [ ] Fixed header with title/recipient
  - [ ] Scrollable message area
  - [ ] Fixed input at bottom
  - [ ] Message bubbles: reduce padding, appropriate max-width
  - [ ] Optimize message input for mobile keyboard
  - [ ] Send button: accessible and clear
  - [ ] Test message sending
  - [ ] Test message loading and scrolling
  - [ ] Verify keyboard doesn't cover input

---

## 3.6 PROFILE

### 3.6.1 Client Profile
- **File**: `/src/app/(client)/profile/page.tsx`
- **Optimizations**:
  - [ ] Stack all profile sections vertically
  - [ ] Profile info section: stack all fields
  - [ ] All inputs: full-width, larger (name, email, phone, company, address)
  - [ ] Edit/Save buttons: full-width or prominent
  - [ ] Wallet credit section: prominent card at top
  - [ ] Show current balance clearly
  - [ ] Transaction history: list view, compact
  - [ ] Each transaction: date, amount, reason, balance
  - [ ] Show fewer transactions on mobile with "Load More"
  - [ ] Change password section: collapsible or separate page
  - [ ] Password inputs: full-width, larger
  - [ ] Show/hide toggles: accessible
  - [ ] Submit button: full-width
  - [ ] Test profile update
  - [ ] Test password change
  - [ ] Verify wallet credit display

---

## 3.7 QUICK ORDER WORKFLOW (CRITICAL - 5 Steps)

### 3.7.1 Quick Order Page Structure
- **File**: `/src/app/quick-order/page.tsx`
- **Workflow**: File Upload → 3D Preview → Configuration → Pricing → Checkout
- **General Mobile Optimizations**:
  - [ ] Step indicator: show current step and total (e.g., "Step 2 of 5")
  - [ ] Progress bar or dots: compact on mobile
  - [ ] Navigation buttons: full-width, stacked (Back, Next, Submit)
  - [ ] Ensure workflow state persists across steps

### 3.7.2 Step 1: File Upload
- **Optimizations**:
  - [ ] File upload button: large, full-width, touch-friendly
  - [ ] Clear file type indication (.stl, .obj, etc.)
  - [ ] Disable drag-and-drop on mobile, use native file picker
  - [ ] Uploaded files list: card view with file name, size, preview
  - [ ] Delete buttons: clear and accessible per file
  - [ ] Upload progress: visible and clear
  - [ ] Error messages: prominent if upload fails
  - [ ] "Next" button: full-width, fixed at bottom
  - [ ] Test file upload on mobile browsers
  - [ ] Verify file type validation

### 3.7.3 Step 2: 3D Preview & Orientation
- **Component**: `STLViewer`
- **File**: `/src/components/3d/stl-viewer.tsx`
- **Optimizations**:
  - [ ] 3D viewer canvas: full-width, appropriate height (50vh minimum)
  - [ ] Rotation controls: larger buttons, positioned for thumb access
  - [ ] Support touch gestures: rotate with drag, pinch-to-zoom
  - [ ] Auto-rotate toggle: larger switch, clear label
  - [ ] Orientation presets: larger buttons, stack or horizontal scroll
  - [ ] Labels: "Front", "Back", "Left", "Right", "Top", "Bottom"
  - [ ] Loading state: clear spinner and message
  - [ ] Error state: informative message
  - [ ] "Reset View" button: accessible
  - [ ] "Next" and "Back" buttons: full-width, stacked
  - [ ] Test 3D viewer performance on mobile
  - [ ] Test touch gestures
  - [ ] Verify orientation selection

### 3.7.4 Step 3: Configuration (Material, Quantity, Options)
- **Optimizations**:
  - [ ] Material selection: full-screen picker/dialog on mobile
  - [ ] Show material name, color swatch clearly
  - [ ] Consider card-based selection with radio buttons
  - [ ] Quantity input: larger, number keyboard
  - [ ] + / - buttons for quantity: larger touch targets
  - [ ] Additional options: stack vertically, larger inputs/toggles
  - [ ] Option labels: clear and readable
  - [ ] Price preview: update in real-time, show prominently
  - [ ] "Next" and "Back" buttons: full-width, stacked
  - [ ] Test material selection
  - [ ] Test quantity adjustment
  - [ ] Verify price calculation

### 3.7.5 Step 4: Pricing Preview (Calculator Result)
- **Component**: May use `CalculatorDialog` or inline pricing display
- **Optimizations**:
  - [ ] Pricing breakdown: list view, clear labels
  - [ ] Show: unit price, quantity, subtotal, tax, shipping, total
  - [ ] Large total display at bottom: prominent, bold
  - [ ] Breakdown items: stack vertically
  - [ ] Edit buttons: if user wants to go back and change config
  - [ ] "Add to Cart" or "Proceed to Checkout" button: full-width, prominent
  - [ ] "Back" button: secondary, full-width
  - [ ] Summary of selected options: collapsible or always visible
  - [ ] Show: file name, material, quantity, orientation
  - [ ] Test price accuracy
  - [ ] Test navigation back to edit

### 3.7.6 Step 5: Checkout (Payment Modal)
- **See Payment Modal section below**

---

## 3.8 PAYMENT MODAL (CRITICAL)

### 3.8.1 Payment Modal Component
- **Used in**: Quick Order checkout, Invoice payment
- **Payment Options**: Credit-only, Credit+Card, Card-only
- **Optimizations**:
  - [ ] **Modal Structure**: Full-screen on mobile
  - [ ] Close button: large, top-right, accessible
  - [ ] Title: clear ("Complete Payment", "Pay Invoice")
  - [ ] **Payment Amount Display**: large, prominent at top
  - [ ] Total amount: bold, large font (text-3xl or larger)
  - [ ] Breakdown: collapsible or always visible list
  - [ ] Show: subtotal, tax, shipping, discount, total
  - [ ] **Wallet Credit Section**: if user has credit
  - [ ] Show available credit clearly
  - [ ] Toggle/checkbox to use credit: larger, clear label
  - [ ] Real-time calculation: show remaining amount after credit
  - [ ] **Payment Method Selection**: stack vertically
  - [ ] Radio buttons or segmented control for methods
  - [ ] Larger touch targets
  - [ ] Clear labels: "Wallet Credit Only", "Credit + Card", "Card Only"
  - [ ] **Option 1: Credit Only** (if sufficient balance)
  - [ ] Simple confirmation message
  - [ ] Show credit amount to be deducted
  - [ ] Submit button: full-width, prominent
  - [ ] **Option 2: Credit + Card** (partial credit)
  - [ ] Show credit amount to be used
  - [ ] Show remaining amount clearly
  - [ ] Stripe card input: full-width, larger
  - [ ] Card fields: number, expiry, CVC
  - [ ] Test Stripe Elements mobile rendering
  - [ ] Submit button: full-width, shows remaining amount
  - [ ] **Option 3: Card Only** (no credit or user opts out)
  - [ ] Stripe card input: full-width, larger
  - [ ] Submit button: full-width, shows total amount
  - [ ] **Loading State**: clear spinner, disable button
  - [ ] Loading message: "Processing payment..."
  - [ ] **Success State**: clear success message
  - [ ] Redirect or close modal with confirmation
  - [ ] **Error State**: clear error message, retry option
  - [ ] Test all three payment options
  - [ ] Test with and without wallet credit
  - [ ] Test Stripe integration on mobile
  - [ ] Verify payment success flow
  - [ ] Test error handling

---

## 3.9 CALCULATOR DIALOG (if used separately)

### 3.9.1 Calculator Dialog Component
- **File**: May be in quotes/invoices components or shared
- **Used for**: Dynamic pricing calculation
- **Optimizations**:
  - [ ] Full-screen on mobile
  - [ ] Title: clear ("Calculate Price")
  - [ ] All inputs: full-width, larger
  - [ ] Material picker: full-screen dialog
  - [ ] Weight/volume inputs: larger, number keyboard
  - [ ] Quantity input: larger, number keyboard
  - [ ] Real-time calculation: show result prominently
  - [ ] Result display: large, bold
  - [ ] Breakdown: show calculation steps if applicable
  - [ ] "Apply" button: full-width
  - [ ] "Cancel" button: secondary, full-width
  - [ ] Test calculation accuracy
  - [ ] Test material selection

---

## 3.10 OTHER CLIENT PAGES (if applicable)

### 3.10.1 Quotes (if client can view quotes)
- **Optimizations**:
  - [ ] Similar to invoices list and detail
  - [ ] Convert table to card view
  - [ ] Stack quote details vertically
  - [ ] Actions: prominent and clear

### 3.10.2 Files/Uploads (if separate page)
- **Optimizations**:
  - [ ] File list: card view on mobile
  - [ ] Each card: file name, size, upload date, preview
  - [ ] Upload button: prominent
  - [ ] Delete/download actions: clear

---

## TESTING CHECKLIST FOR PHASE 3

After optimizing each client page/component:

- [ ] Test on mobile viewport (375px - iPhone SE)
- [ ] Test on tablet viewport (768px - iPad)
- [ ] Test on desktop viewport (1440px)
- [ ] Test touch interactions and gestures
- [ ] Test 3D viewer on mobile (rotation, zoom, orientation)
- [ ] Test file upload on mobile browsers
- [ ] Test quick order workflow end-to-end
- [ ] Test payment modal with all 3 options
- [ ] Test Stripe integration on mobile
- [ ] Test wallet credit application
- [ ] Test with mobile soft keyboard open
- [ ] Verify no horizontal overflow
- [ ] Verify text readability
- [ ] Test with Safari iOS
- [ ] Test with Chrome Android
- [ ] Test conversion funnel (quick order → payment → success)

---

## COMPLETION CRITERIA

Phase 3 is complete when:
- [ ] All 7 main client pages are optimized
- [ ] Quick order 5-step workflow is fully mobile-optimized
- [ ] Payment modal works perfectly on mobile
- [ ] 3D viewer is touch-friendly and performant
- [ ] All forms work correctly on mobile
- [ ] All pages pass the testing checklist
- [ ] No regressions in functionality
- [ ] Conversion funnel works end-to-end on mobile
- [ ] All checkboxes in this plan are marked complete
