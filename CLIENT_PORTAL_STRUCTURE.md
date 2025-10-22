# CLIENT PORTAL STRUCTURE - COMPREHENSIVE EXPLORATION REPORT

## EXECUTIVE SUMMARY

The 3D Print Sydney application features a complete client portal system with multiple route groups, pages, and supporting components. The portal is built using Next.js App Router with role-based access control and comprehensive functionality for managing orders, invoices, and communication.

---

## 1. ROUTE MAPPING & NAVIGATION STRUCTURE

### Route Group Architecture

The application uses three main route groups:
- **(client)** - Client portal routes (protected by CLIENT role)
- **(public)** - Authentication & password reset pages (redirects authenticated users)
- **(marketing)** - Marketing and landing pages (public-facing)
- **(admin)** - Admin dashboard & management (protected by ADMIN role)

### Client Portal Routes (`/client` prefix)

All client routes are protected by `requireClient()` which validates CLIENT role server-side.

#### Primary Navigation Routes
```
/client                           → Home/Dashboard
/client/orders                    → Orders/Invoices List
/client/orders/[id]              → Order Detail View
/client/account                  → Account Settings
/quick-order                      → Quick Order Workflow (5-step process)
/client/messages                 → Redirects to /client (consolidated)
```

#### Route File Locations:
- `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(client)/client/page.tsx`
- `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(client)/client/orders/page.tsx`
- `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(client)/client/orders/[id]/page.tsx`
- `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(client)/client/account/page.tsx`
- `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(client)/quick-order/page.tsx`
- `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(client)/client/messages/page.tsx` (redirect)
- `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(client)/layout.tsx` (client shell wrapper)

### Public Authentication Routes

```
/login                    → Login form (email + password)
/signup                   → Create account form
/forgot-password          → Password reset request
/reset-password          → Password reset confirmation
```

#### Route File Locations:
- `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(public)/login/page.tsx`
- `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(public)/signup/page.tsx`
- `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(public)/forgot-password/page.tsx`
- `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(public)/reset-password/page.tsx`
- `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(public)/layout.tsx`

### Marketing/Public Pages

```
/                       → Landing page (home)
/about                  → About page
/contact                → Contact page
/materials              → Materials information
/portfolio              → Portfolio/showcase
/pricing                → Pricing information
/services               → Services overview
```

#### Route File Locations:
- `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(marketing)/page.tsx`
- `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(marketing)/about/page.tsx`
- `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(marketing)/contact/page.tsx`
- `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(marketing)/materials/page.tsx`
- `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(marketing)/portfolio/page.tsx`
- `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(marketing)/pricing/page.tsx`
- `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(marketing)/services/page.tsx`
- `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(marketing)/layout.tsx`

---

## 2. CLIENT PORTAL PAGES - DETAILED BREAKDOWN

### 2.1 CLIENT DASHBOARD (/client)

**Purpose:** Central hub for clients showing overview and quick actions

**File Location:** `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(client)/client/page.tsx`

**Component Used:** `<ClientDashboard />`
- Component File: `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/components/client/client-dashboard.tsx`

**Features:**
- Welcome header with email alerts notice
- Quick Order promotional banner with CTA
- Primary action cards (Quick Order, View All Orders)
- Statistics dashboard with 5 metric cards:
  - Available Credit (wallet balance)
  - Total Orders count
  - Pending invoices count
  - Paid invoices count
  - Total Spent amount
- Current Jobs section (displays up to 5 active jobs)
- Recent Orders table (last 5 invoices with pagination)
- Expandable Messages section (messaging with admin team)

**API Endpoints Called:**
- `GET /api/client/dashboard` - Statistics
- `GET /api/client/invoices?limit=5&offset=0` - Recent orders
- `GET /api/client/jobs` - Active jobs
- `GET /api/client/preferences` - Email notification preferences

**Sub-Components:**
- `StatusBadge` - Status display for invoices/jobs
- `Conversation` - Embedded messaging component (collapsible)
- `Card` - Statistics and section containers
- `Button` - CTA buttons

---

### 2.2 CLIENT ORDERS LIST (/client/orders)

**Purpose:** Full order/invoice management and payment

**File Location:** `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(client)/client/orders/page.tsx`

**Features:**
- Paginated invoice list (20 items per page)
- Table columns: Number | Date | Status | Total | Balance | Actions
- Status badges showing invoice status
- "Pay Online" button for unpaid invoices
- Load more pagination button
- Wallet balance display

**State Management:**
- Paginated list with lazy loading
- Wallet balance state

**API Endpoints Called:**
- `GET /api/client/invoices?limit=20&offset={offset}` - Invoice list
- `GET /api/client/dashboard` - Wallet balance

**Sub-Components:**
- `StatusBadge` - Invoice status display
- `PayOnlineButton` - Payment trigger component

---

### 2.3 CLIENT ORDER DETAIL (/client/orders/[id])

**Purpose:** Comprehensive order view with production status tracking and payment

**File Location:** `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(client)/client/orders/[id]/page.tsx`

**Features:**

#### Invoice Summary Section
- Invoice number and date
- Status badge
- Subtotal, Tax, Total, Balance Due

#### Production Status Section (if jobs exist)
- Job status progression timeline (8 stages)
- Visual status indicators (circles, checkmarks, spinners)
- Job title and last updated timestamp
- Printer name display
- Cancelled job special handling
- Job notes display

**Status Flow:**
```
PRE_PROCESSING → IN_QUEUE → PRINTING → PRINTING_COMPLETE → 
POST_PROCESSING → PACKAGING → OUT_FOR_DELIVERY → COMPLETED
```

#### Attachments Section
- File list with download links
- File type and size display

#### Payment Section
- Invoice Payment Section component
- Wallet balance display
- Payment method selection

#### Messages Section
- Embedded conversation component for invoice-specific discussion
- Full messaging UI with send functionality

**API Endpoints Called:**
- `GET /api/invoices/[id]` - Invoice detail (via getInvoiceDetail function)

**Sub-Components:**
- `InvoicePaymentSection` - Payment options component
- `Conversation` - Messaging component
- `StatusBadge` - Status display
- `Card` - Container components
- `Table` - Attachments list

---

### 2.4 CLIENT ACCOUNT SETTINGS (/client/account)

**Purpose:** User account security management

**File Location:** `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(client)/client/account/page.tsx`

**Features:**
- Password change form
- Email display
- Account security section

**Sub-Components:**
- `ChangePasswordForm` - Password update functionality
  - File: `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/components/account/change-password-form.tsx`

---

### 2.5 QUICK ORDER WORKFLOW (/quick-order)

**Purpose:** Self-service order creation with file upload, configuration, orientation, and checkout

**File Location:** `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(client)/quick-order/page.tsx`

**Component:** Large client component with 1370+ lines

**Workflow Steps (5 Steps):**

1. **UPLOAD STEP**
   - Drag-and-drop file upload (STL, 3MF)
   - File list display with sizes
   - Remove file functionality
   - Visual upload progress indicator

2. **ORIENT STEP**
   - 3D STL viewer with rotation controls
   - File-by-file orientation
   - Lock orientation button
   - Skip orientation option
   - Progress tracking (X of N files oriented)
   - File status indicators

3. **CONFIGURE STEP**
   - Expandable file settings cards
   - Per-file configuration:
     - Material selection dropdown
     - Layer Height (mm)
     - Infill percentage
     - Quantity
     - Support generation toggle
     - Support pattern selection (Standard/Tree)
     - Support threshold angle
   - File preparation/slicing with fallback handling
   - Prepare files button with fallback estimate management

4. **PRICE STEP**
   - Price summary card (Subtotal, Shipping, Total)
   - Shipping information display
   - Address input form:
     - Name, Phone, Address lines 1-2
     - City, State, Postcode
   - Shipping quote display with remote surcharge info

5. **CHECKOUT STEP**
   - Place Order button
   - Redirection to payment or order confirmation

**Advanced Features:**

#### File Management
- Upload handling with FormData
- File validation (STL/3MF)
- Metrics calculation (grams, print time)
- Fallback estimate handling
- Oriented file tracking

#### 3D Viewer Integration
- STLViewerWrapper component
- Rotation controls with reset/center options
- Orientation locking with STL export
- Model centering functionality

#### Pricing Logic
- Material-based cost calculation
- Quantity multiplier
- Support structure cost
- Shipping cost with postcode-based surcharge
- Wallet credit availability check

#### Error Handling
- File preparation errors with retry
- Fallback estimate acceptance flow
- Network error messages
- File status tracking (idle, running, success, fallback, error)

**State Management:**
- Current step tracking
- Upload file list with metadata
- Per-file configuration (material, settings)
- Metrics tracking (grams, time)
- File status tracking
- Oriented file ID mapping
- Expanded file UI state
- Shipping quote tracking
- Price data state
- Loading/processing states
- Error messages
- Fallback acceptance tracking

**API Endpoints Called:**
- `POST /api/quick-order/upload` - File upload
- `GET /api/client/materials` - Available materials
- `POST /api/quick-order/orient` - Save oriented file
- `POST /api/quick-order/slice` - Slice/prepare file
- `POST /api/quick-order/price` - Calculate pricing
- `POST /api/quick-order/checkout` - Create order

**Sub-Components:**
- `STLViewerWrapper` - 3D model viewer
- `RotationControls` - Model rotation interface
- Form controls (Input, Select, Switch, Label)
- Button components
- Status badges and indicators

**3D Integration:**
- File: `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/components/3d/STLViewerWrapper.tsx`
- File: `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/components/3d/RotationControls.tsx`
- File: `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/components/3d/STLViewer.tsx`

---

## 3. MODALS, DIALOGS & POPUPS

### 3.1 Payment Method Modal

**File Location:** `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/components/client/payment-method-modal.tsx`

**Purpose:** Allow clients to choose between wallet credit, card, or combination payment

**Features:**
- Invoice balance summary display
- Available credit display
- Three payment options:
  1. **Credit Only** (if sufficient balance)
     - Pay full invoice from wallet
     - Display remaining balance after
  2. **Credit + Card** (if partial credit available)
     - Apply available credit
     - Pay remainder via Stripe
  3. **Card Only**
     - Skip wallet credit
     - Full amount via Stripe

**Props:**
```typescript
{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: number;
  balanceDue: number;
  walletBalance: number;
}
```

**Functionality:**
- Radio group for option selection
- Smart default option (credit-only if sufficient, else credit+card)
- Processing state management
- Success/error toast notifications
- Automatic page reload on successful full credit payment
- Redirect to Stripe checkout for card payments

**API Endpoints Called:**
- `POST /api/invoices/{invoiceId}/apply-credit` - Apply wallet credit
- `POST /api/invoices/{invoiceId}/stripe-session?refresh=true` - Get Stripe checkout URL

---

### 3.2 Payment Method Button (Trigger)

**File Location:** `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/components/client/pay-online-button.tsx`

**Purpose:** Trigger payment flow (either direct Stripe or payment method selection)

**Features:**
- Displays payment method modal if wallet balance exists
- Direct Stripe redirect if no wallet balance
- Loading state management
- Customizable button appearance (variant, size)
- Toast error handling

**Used In:**
- Orders list (compact version)
- Order detail page
- Invoice payment section

---

## 4. FORMS & FORM COMPONENTS

### 4.1 Login Form

**File Location:** `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(public)/login/page.tsx`

**Fields:**
- Email (text input)
- Password (password input)

**Features:**
- Client-side validation
- Error message display
- Loading state during submission
- Redirect to dashboard after login
- Links to signup and forgot-password

---

### 4.2 Signup Form

**File Location:** `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/app/(public)/signup/page.tsx`

**Fields:**
- Email (text input)
- Password (password input)
- Confirm Password (password input)

**Features:**
- Client-side validation
- Error message display
- Loading state during submission
- Redirect to dashboard after signup
- Link to login page

---

### 4.3 Change Password Form

**File Location:** `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/components/account/change-password-form.tsx`

**Location Used:** `/client/account` page

**Features:**
- Password change functionality
- Current email display
- Security-focused form

---

### 4.4 Quick Order Configuration Form

**Location:** Quick Order page (step 3)

**Dynamic Per-File Configuration:**
- Material select dropdown
- Layer height numeric input
- Infill percentage numeric input
- Quantity numeric input
- Supports enabled toggle
- Support pattern select
- Support angle numeric input

---

### 4.5 Quick Order Address Form

**Location:** Quick Order page (step 4)

**Fields:**
- Name (text input)
- Phone (text input)
- Address Line 1 (text input)
- Address Line 2 (text input)
- City (text input)
- State (text input, auto-uppercase)
- Postcode (text input)

**Features:**
- Shipping cost calculation on address change
- Remote surcharge detection
- Postcode-based shipping estimation

---

## 5. CLIENT PORTAL LAYOUT & NAVIGATION

### 5.1 Client Shell Layout

**File Location:** `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/components/layout/client-shell.tsx`

**Structure:**
```
┌─────────────────────────────────────┐
│          HEADER (sticky)             │
│  [Mobile Nav] Title  [Logout]       │
├──────────┬──────────────────────────┤
│          │                          │
│ SIDEBAR  │   MAIN CONTENT           │
│ (Desktop)│                          │
│          │  ┌────────────────────┐  │
│ - Home   │  │ Page Content       │  │
│ - Orders │  │                    │  │
│ - Quick  │  │                    │  │
│          │  │                    │  │
│ Account  │  └────────────────────┘  │
│ Settings │                          │
│ Logout   │                          │
└──────────┴──────────────────────────┘
```

**Features:**

#### Sidebar (Desktop - 260px, sticky)
- Logo/branding at top (20px height)
- Navigation sections with icons
- Scrollable area for nav items
- User profile card at bottom
- Account settings link
- Logout button

#### Header (Sticky)
- Mobile navigation drawer toggle
- Page title and description
- Logout button (mobile-friendly)
- Right-aligned actions

#### Main Content
- Responsive max-width container (1400px)
- Padding/spacing
- Children content area

#### Navigation Sections:
```typescript
CLIENT_NAV_SECTIONS = [
  {
    items: [
      { name: "Home", href: "/client", icon: "home" },
      { name: "Quick Order", href: "/quick-order", icon: "rocket" },
      { name: "Orders", href: "/client/orders", icon: "receipt" },
    ]
  }
]
```

**Components Used:**
- `NavigationLink` - Individual nav links with active state
- `ScrollArea` - Scrollable nav container
- `Separator` - Visual dividers
- `NavigationDrawer` - Mobile navigation
- `MutationLoader` - Global loading indicator
- `UserProfile` - User info display

---

### 5.2 Mobile Navigation

**File Location:** `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/components/ui/navigation-drawer.tsx`

**Features:**
- Sheet/side drawer (mobile breakpoint)
- Same navigation items as desktop
- User account info
- Logout functionality
- Closes on navigation

---

## 6. CLIENT-SPECIFIC UI COMPONENTS

### 6.1 Client Dashboard Component

**File:** `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/components/client/client-dashboard.tsx`

**Purpose:** Complete dashboard view with stats, orders, jobs, and messages

**Sections:**
1. Welcome header with alert banner
2. Quick Order promotional card
3. Primary action cards
4. Stats dashboard (5 metric cards)
5. Current jobs section
6. Recent orders table
7. Messages section (collapsible)

**Data Fetching:**
- Parallel API requests with Promise.all
- Error handling per section
- Loading states

---

### 6.2 Invoice Payment Section

**File:** `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/components/client/invoice-payment-section.tsx`

**Purpose:** Payment UI for invoice detail page

**Features:**
- Wallet balance fetching
- Available credit display (if > 0)
- Pay Online button integration
- Loading state management

---

### 6.3 Pay Online Button

**File:** `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/components/client/pay-online-button.tsx`

**Features:**
- Smart payment flow selection
- Modal trigger (if wallet balance exists)
- Direct Stripe (if no balance)
- Customizable appearance

---

### 6.4 Status Badge

**File:** `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/components/ui/status-badge.tsx`

**Purpose:** Display order, invoice, and job status

**Statuses Displayed:**
- PENDING, PAID, DRAFT (invoices)
- PRE_PROCESSING, IN_QUEUE, PRINTING, PRINTING_COMPLETE, POST_PROCESSING, PACKAGING, OUT_FOR_DELIVERY, COMPLETED, CANCELLED (jobs)

---

### 6.5 Conversation Component

**File:** `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/components/messages/conversation.tsx`

**Purpose:** Real-time messaging between client and admin

**Features:**
- Message grouping by date and sender
- Time-based clustering (5-minute threshold)
- Own messages right-aligned, others left-aligned
- Date separators
- Pagination ("load more" for older messages)
- Input textarea with send button
- Message bubbles with timestamps
- Support for both client and admin view
- Invoice-specific or user-specific threads

**Props:**
```typescript
{
  invoiceId?: number;      // For invoice-specific chat
  userId?: number | string; // For admin viewing specific user
  currentUserRole?: "ADMIN" | "CLIENT";
}
```

**API Endpoints:**
- `GET /api/messages?order=desc&limit=50&offset={offset}&invoiceId={id}`
- `GET /api/admin/users/{userId}/messages?...`
- `POST /api/messages` - Send message

**Sub-Components:**
- `MessageBubble` - Individual message display
- `DateHeader` - Date separator
- Textarea for input

---

## 7. STYLING & DESIGN PATTERNS

### Design System
- Tailwind CSS utility classes
- Custom CSS variables for theming
- Component library using shadcn/ui patterns

### Color/Theme
- `bg-surface-overlay` - Overlay backgrounds
- `bg-surface-canvas` - Canvas/page background
- `bg-surface-muted` - Muted areas
- `text-foreground` - Primary text
- `text-muted-foreground` - Secondary text
- `border-border` - Border color
- `bg-primary` - Primary actions
- Primary/Success/Warning/Destructive status colors

### Layout Patterns
- 2-column grids for desktop
- Responsive single column on mobile
- Max-width containers (1400px, 2xl, etc.)
- Consistent padding/spacing (6, 8, 12 unit system)
- Sticky headers
- Scrollable sections

---

## 8. API ENDPOINTS FOR CLIENT PORTAL

### Dashboard APIs
```
GET /api/client/dashboard
  Response: { data: { totalOrders, pendingCount, paidCount, totalSpent, walletBalance } }

GET /api/client/invoices?limit=20&offset=0
  Response: { data: InvoiceRow[] }

GET /api/client/jobs
  Response: { data: JobRow[] }

GET /api/client/preferences
  Response: { data: { notifyOnJobStatus } }

GET /api/client/materials
  Response: { data: Material[] }
```

### Order/Invoice APIs
```
GET /api/invoices/{id}
  Response: Invoice detail with jobs, attachments, payments

POST /api/invoices/{id}/apply-credit
  Body: {}
  Response: { creditApplied, newBalanceDue, fullyPaid }

POST /api/invoices/{id}/stripe-session?refresh=true
  Body: {}
  Response: { url: string }
```

### Quick Order APIs
```
POST /api/quick-order/upload
  Body: FormData with files
  Response: { data: Upload[] }

POST /api/quick-order/orient
  Body: FormData with fileId and orientedSTL
  Response: { data: { newFileId } }

POST /api/quick-order/slice
  Body: { file: { id, layerHeight, infill, supports } }
  Response: { data: { grams, timeSec, fallback?, error? } }

POST /api/quick-order/price
  Body: { items, location: { state, postcode } }
  Response: { data: { subtotal, shipping, total } }

POST /api/quick-order/checkout
  Body: { items, address }
  Response: { data: { checkoutUrl?, invoiceId } }
```

### Messaging APIs
```
GET /api/messages?order=desc&limit=50&offset=0&invoiceId=X
  Response: { data: Message[] }

POST /api/messages
  Body: { content, invoiceId? }
  Response: { data: Message }
```

---

## 9. AUTHENTICATION & ROLE-BASED ACCESS

### Auth Utilities
**File:** `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/lib/auth-utils.ts`

Functions:
- `requireClient()` - Server-side CLIENT role validation (blocks without rendering)
- `getOptionalUser()` - Get user if authenticated
- `getUserFromCookies()` - Direct session retrieval

### Protection Pattern
```typescript
// In client layout
const user = await requireClient(); // Throws redirect if not CLIENT
```

### Redirect Logic
- **Public Layout:** Authenticated users redirected to dashboard
  - ADMIN → `/`
  - CLIENT → `/client`
- **Client Layout:** Non-CLIENT users redirected to login
- **Marketing:** No auth required

---

## 10. NAVIGATION PATTERNS & LINKS

### Navigation Configuration
**File:** `/Users/varunprasad/Downloads/Archive/3dprintsydney/src/lib/navigation.ts`

**Navigation Helper Functions:**
- `isNavItemActive()` - Determines if nav item matches current route
- `getIcon()` - Retrieves icon component by name

**Nav Items:**
```typescript
CLIENT_NAV_SECTIONS = [
  {
    items: [
      { name: "Home", href: "/client", icon: "home" },
      { name: "Quick Order", href: "/quick-order", icon: "rocket" },
      { name: "Orders", href: "/client/orders", icon: "receipt" },
    ]
  }
]
```

### Active State Detection
- Uses pathname matching from `usePathname()`
- Highlights current route in navigation
- Handles partial matches for sections

---

## 11. PERFORMANCE & OPTIMIZATION

### Code Splitting
- Dynamic imports via `next/dynamic`
- Client component markers for interactive features
- Server-side session validation

### Data Fetching Patterns
- Server-side async page components
- Client-side fetch for dynamic data
- Parallel data loading with Promise.all
- Pagination for large lists

### 3D Viewer Optimization
- STLViewerWrapper with lazy loading
- Optional rotation controls
- Conditional rendering based on step

### Loading States
- Loading skeletons
- Progress indicators
- Disabled buttons during submission
- Spinner animations

---

## 12. FILE ORGANIZATION SUMMARY

### Client Portal Directory Structure
```
src/
├── app/(client)/
│   ├── client/
│   │   ├── page.tsx                 [Dashboard]
│   │   ├── orders/
│   │   │   ├── page.tsx             [Orders List]
│   │   │   └── [id]/
│   │   │       └── page.tsx         [Order Detail]
│   │   └── account/
│   │       └── page.tsx             [Account Settings]
│   ├── quick-order/
│   │   └── page.tsx                 [Quick Order Workflow]
│   └── layout.tsx                   [Client Shell]
│
├── components/
│   ├── client/
│   │   ├── client-dashboard.tsx     [Dashboard Component]
│   │   ├── invoice-payment-section.tsx
│   │   ├── pay-online-button.tsx    [Payment Trigger]
│   │   └── payment-method-modal.tsx [Payment Modal]
│   │
│   ├── layout/
│   │   ├── client-shell.tsx         [Navigation Layout]
│   │   ├── admin-shell.tsx
│   │   └── user-profile.tsx
│   │
│   ├── messages/
│   │   ├── conversation.tsx         [Messaging UI]
│   │   ├── message-bubble.tsx
│   │   ├── date-header.tsx
│   │   ├── sidebar.tsx
│   │   └── thread-panel.tsx
│   │
│   ├── 3d/
│   │   ├── STLViewerWrapper.tsx      [3D Viewer]
│   │   ├── STLViewer.tsx
│   │   └── RotationControls.tsx
│   │
│   ├── account/
│   │   └── change-password-form.tsx
│   │
│   ├── ui/
│   │   ├── dialog.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── navigation-drawer.tsx
│   │   ├── status-badge.tsx
│   │   └── ... (48 UI components)
│   │
│   └── marketing/
│       ├── header.tsx
│       ├── footer.tsx
│       ├── hero.tsx
│       ├── services-overview.tsx
│       ├── how-it-works.tsx
│       ├── materials-preview.tsx
│       └── social-proof.tsx
│
├── app/(public)/
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── forgot-password/page.tsx
│   ├── reset-password/page.tsx
│   └── layout.tsx
│
├── app/(marketing)/
│   ├── page.tsx
│   ├── about/page.tsx
│   ├── contact/page.tsx
│   ├── materials/page.tsx
│   ├── portfolio/page.tsx
│   ├── pricing/page.tsx
│   ├── services/page.tsx
│   └── layout.tsx
│
└── app/api/
    ├── client/
    │   ├── dashboard/route.ts
    │   ├── invoices/route.ts
    │   ├── jobs/route.ts
    │   ├── materials/route.ts
    │   └── preferences/route.ts
    └── quick-order/
        ├── upload/route.ts
        ├── orient/route.ts
        ├── slice/route.ts
        ├── price/route.ts
        └── checkout/route.ts
```

---

## 13. USER FLOWS & WORKFLOWS

### Client Registration & Login Flow
```
1. User visits / (landing page)
2. Clicks "Get Started" or "Quick Order"
3. Redirected to /login (if not authenticated)
4. Chooses /signup for new account
5. Fills signup form (email, password, confirm)
6. Server creates CLIENT account
7. Redirected to /client (dashboard)
```

### Quick Order Workflow
```
1. Start at /quick-order
2. UPLOAD: Drag/drop or select STL/3MF files
3. ORIENT: Rotate each model for optimal printing
4. CONFIGURE: Set material, layer height, infill, supports
5. PRICE: Enter address, view shipping costs and total
6. CHECKOUT: Place order, pay with wallet credit/card
7. Confirm: Redirected to order detail page
```

### Payment Flow (Invoice)
```
1. View order detail at /client/orders/[id]
2. Click "Pay Online" button
3. If wallet balance > 0:
   a. Payment method modal opens
   b. Choose: Credit only | Credit+Card | Card only
   c. Process payment
4. If no balance:
   a. Direct to Stripe checkout
5. Success: Page reloads or redirects to order
```

### Order Tracking
```
1. Client views /client/orders or /client (dashboard)
2. Sees recent/active orders
3. Clicks order number to see detail
4. Views production status with timeline
5. Sees job progression through stages
6. Can message team about order
7. Can download attachments
8. Can make payment if balance due
```

---

## 14. MARKETING PAGES INTEGRATION

### Landing Page Structure
```
/home (root)
  ├── Hero section
  ├── Services overview
  ├── How it works
  ├── Materials preview
  ├── Social proof
  └── Final CTA (Quick Order)

/about → About page
/contact → Contact form
/materials → Materials information
/portfolio → Portfolio showcase
/pricing → Pricing details
/services → Services overview
```

### Marketing-to-Client Flow
```
Marketing Header
  ├── Logo/branding
  ├── Nav links
  └── Login/Account links

Landing Page
  ├── Hero with CTA (Quick Order, Get Quote)
  └── Material links → /materials

Services Page
  └── Quick Order CTA → /quick-order

Contact Page
  └── Support contact info

All Pages
  └── Footer with links & contact info
```

---

## 15. KEY PATTERNS & CONVENTIONS

### Client Component Markers
- Payment flows use client components ("use client")
- Quick order is large client component (complex state)
- Dashboard uses client component for data loading
- Forms are client components

### Server Component Usage
- Page files are server components (async)
- Server-side auth validation
- Direct database queries
- Session retrieval

### State Management
- React hooks for local state
- Fetch API for async operations
- Toast notifications for feedback
- URL state for pagination

### Error Handling
- Try-catch blocks for API calls
- Error messages displayed in UI
- Toast error notifications
- Fallback UI states

### Responsive Design
- Mobile-first approach
- Hidden desktop elements on mobile (lg: breakpoint)
- Full-width mobile, constrained desktop
- Touch-friendly buttons and spacing

---

## 16. COMPREHENSIVE COMPONENT LIST

### Client Portal Specific Components (12)
1. `ClientDashboard` - Dashboard view
2. `PayOnlineButton` - Payment trigger
3. `PaymentMethodModal` - Payment selection dialog
4. `InvoicePaymentSection` - Payment UI section
5. `ChangePasswordForm` - Password change
6. `Conversation` - Real-time messaging
7. `MessageBubble` - Message display
8. `DateHeader` - Message date separator
9. `STLViewerWrapper` - 3D model viewer
10. `RotationControls` - 3D model rotation
11. `NavigationDrawer` - Mobile nav
12. `ClientShell` - Client portal layout

### UI Components (48 components)
- Button, Input, Label, Textarea
- Card, Badge, Dialog
- Table, Dropdown, Select
- Radio, Checkbox, Switch
- Popover, Tooltip, Hover Card
- Calendar, Scroll Area, Separator
- Navigation Link, Status Badge
- PDF Button, Loading Button
- Skeleton, Empty State
- And more...

---

## 17. QUICK REFERENCE: COMMON TASKS

### Adding a New Client Page
1. Create folder: `/app/(client)/path-name/`
2. Create `page.tsx` with server component
3. Use `requireClient()` for auth
4. Import `ClientShell` from layout
5. Build page content

### Adding a Modal
1. Create component file in `/components/`
2. Use Dialog from shadcn/ui
3. Export as client component
4. Pass open/onOpenChange props
5. Implement submit handler

### Adding API Route
1. Create `/app/api/path/route.ts`
2. Export `GET`, `POST`, `PUT`, `DELETE`
3. Use session auth for protection
4. Return JSON responses

### Adding Form
1. Use Button, Input, Label from UI
2. Use useState for form state
3. Add onChange handlers
4. Submit to API route via fetch
5. Handle errors with toast/display

---

## CONCLUSION

The client portal is a comprehensive web application with:
- **7 main routes** (1 dashboard, 2 order pages, 1 account, 1 quick order workflow, 2 messaging)
- **12 client-specific components** for unique functionality
- **48 reusable UI components** for consistency
- **Multiple API endpoints** for data management
- **Role-based access control** with server-side validation
- **Complex workflows** (quick order 5-step, payment flow)
- **Real-time messaging** between clients and admins
- **3D model visualization** and manipulation
- **Responsive design** for all devices
- **Professional payment integration** with Stripe

The architecture follows Next.js best practices with clear separation of concerns, proper use of server vs client components, and comprehensive error handling.

