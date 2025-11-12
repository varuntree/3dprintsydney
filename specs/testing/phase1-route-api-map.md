# 3D Print Sydney - Route & API Endpoint Map

**Generated:** 2025-11-12
**Total Routes:** 46 page routes | **Total APIs:** 86 endpoints

---

## Table of Contents
1. [Admin Portal Routes](#admin-portal-routes)
2. [Client Portal Routes](#client-portal-routes)
3. [Public Routes](#public-routes)
4. [API Endpoints by Feature](#api-endpoints-by-feature)
5. [Auth & Middleware Patterns](#auth--middleware-patterns)

---

## Admin Portal Routes

All admin routes require **ADMIN role** (enforced via `requireAdmin()` in layout.tsx)

### Dashboard & Core
| Route | Path | Purpose |
|-------|------|---------|
| Dashboard | `/dashboard` | Main admin dashboard with KPIs and activity |

### Invoices Management
| Route | Path | Purpose |
|-------|------|---------|
| Invoices List | `/invoices` | List all invoices with filters |
| Invoice Detail | `/invoices/[id]` | View, edit, manage invoice + payments/attachments |
| Create Invoice | `/invoices/new` | Create new invoice from scratch |

### Quotes Management
| Route | Path | Purpose |
|-------|------|---------|
| Quotes List | `/quotes` | List all quotes with filters |
| Quote Detail | `/quotes/[id]` | View, edit, convert/duplicate quote |
| Create Quote | `/quotes/new` | Create new quote from scratch |

### Clients Management
| Route | Path | Purpose |
|-------|------|---------|
| Clients List | `/clients` | View all clients, search, filter |
| Client Detail | `/clients/[id]` | Client profile, invoices, credit, notes |
| Create Client | `/clients/new` | Add new client |

### Jobs & Print Queue
| Route | Path | Purpose |
|-------|------|---------|
| Jobs List | `/jobs` | Print queue, status tracking |

### Inventory & Admin
| Route | Path | Purpose |
|-------|------|---------|
| Printers | `/printers` | Manage 3D printers |
| Products | `/products` | Product/template management |
| Materials | `/dashboard/materials-admin` | Material inventory, pricing |

### User & Account Management
| Route | Path | Purpose |
|-------|------|---------|
| Users | `/users` | Manage admin/staff users |
| User Detail | `/users/[id]` | View user, manage permissions |
| Account Settings | `/account` | Admin account settings |
| My Profile | `/me` | Current user profile |

### Reports & Guides
| Route | Path | Purpose |
|-------|------|---------|
| Messages | `/messages` | Internal messaging |
| Reports | `/reports` | Business reports & analytics |
| Settings | `/settings` | System configuration |
| Business Guide | `/business-guide` | Internal documentation |
| Documentation | `/documentation` | Help & docs |

---

## Client Portal Routes

All client routes require **CLIENT role** (enforced via `requireClient()` in layout.tsx)

### Dashboard & Overview
| Route | Path | Purpose |
|-------|------|---------|
| Client Dashboard | `/client` | Client overview, recent orders, balance |
| Account Settings | `/client/account` | Client profile & preferences |

### Orders & Projects
| Route | Path | Purpose |
|-------|------|---------|
| Orders List | `/client/orders` | Client's past orders |
| Order Detail | `/client/orders/[id]` | View order details, files, status |
| Projects - Active | `/client/projects/active` | Active/in-progress projects |
| Projects - Completed | `/client/projects/completed` | Finished projects |
| Projects - Archived | `/client/projects/archived` | Archived projects |
| Projects - History | `/client/projects/history` | Project history/timeline |

### Quick Order
| Route | Path | Purpose |
|-------|------|---------|
| Quick Order | `/quick-order` | Fast quote & order for STL files |

### Messages
| Route | Path | Purpose |
|-------|------|---------|
| Messages | `/client/messages` | Client inbox |

---

## Public Routes

No authentication required. Routes auto-redirect authenticated users to dashboard.

### Auth Pages
| Route | Path | Purpose |
|-------|------|---------|
| Login | `/login` | User login (redirects to dashboard if authenticated) |
| Sign Up | `/signup` | Client registration |

### Landing
| Route | Path | Purpose |
|-------|------|---------|
| Home | `/` | Public landing page |

---

## API Endpoints by Feature

### Authentication (6 endpoints)

#### `POST /api/auth/login`
- **Auth:** None (public)
- **Purpose:** User login, creates session
- **Body:** `{ email, password }`
- **Response:** `{ id, email, role, clientId, session }`

#### `POST /api/auth/signup`
- **Auth:** None (public)
- **Purpose:** Create new client account
- **Body:** `{ email, password, companyName, ... }`
- **Response:** `{ id, email, role, clientId }`

#### `POST /api/auth/logout`
- **Auth:** Required
- **Purpose:** Clear session cookies
- **Response:** `{ success: true }`

#### `GET /api/auth/me`
- **Auth:** Required
- **Purpose:** Get current user profile
- **Response:** `{ id, email, role, clientId }`

#### `POST /api/auth/change-password`
- **Auth:** Required
- **Purpose:** Change user password
- **Body:** `{ currentPassword, newPassword }`
- **Response:** `{ success: true }`

---

### Clients Management (4 endpoints)

#### Admin Clients API
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/clients` | ADMIN | List all clients (pageable, searchable) |
| POST | `/api/clients` | ADMIN | Create new client |
| GET | `/api/clients/[id]` | ADMIN | Get client details |
| PUT | `/api/clients/[id]` | ADMIN | Update client info |
| DELETE | `/api/clients/[id]` | ADMIN | Delete client |
| POST | `/api/clients/[id]/credit` | ADMIN | Add/manage client credit |
| POST | `/api/clients/[id]/notes` | ADMIN | Add notes to client |

#### Client-Specific API
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/admin/clients` | ADMIN | List clients (admin view) |
| GET | `/api/client/profile` | CLIENT | Get own profile |
| PATCH | `/api/client/profile` | CLIENT | Update own profile |
| GET | `/api/client/preferences` | CLIENT | Get client preferences |
| PATCH | `/api/client/preferences` | CLIENT | Update preferences |

---

### Invoices (18 endpoints)

#### Invoice CRUD
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/invoices` | ADMIN | List all invoices |
| POST | `/api/invoices` | ADMIN | Create new invoice |
| GET | `/api/invoices/[id]` | ADMIN/CLIENT | Get invoice details |
| PUT | `/api/invoices/[id]` | ADMIN | Update invoice |
| DELETE | `/api/invoices/[id]` | ADMIN | Delete invoice |

#### Invoice Status & Actions
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/invoices/[id]/mark-paid` | ADMIN | Mark invoice as paid |
| POST | `/api/invoices/[id]/mark-unpaid` | ADMIN | Mark invoice as unpaid |
| POST | `/api/invoices/[id]/void` | ADMIN | Void invoice |
| POST | `/api/invoices/[id]/write-off` | ADMIN | Write off invoice (debt forgiveness) |
| POST | `/api/invoices/[id]/revert` | ADMIN | Revert invoice status |
| POST | `/api/invoices/[id]/apply-credit` | ADMIN | Apply client credit to invoice |

#### Invoice Attachments
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/invoices/[id]/files` | ADMIN | List invoice files |
| POST | `/api/invoices/[id]/attachments` | ADMIN | Upload attachment |
| DELETE | `/api/invoices/[id]/attachments/[attachmentId]` | ADMIN | Delete attachment |

#### Invoice Payments & Activity
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/invoices/[id]/payments` | ADMIN | Record payment |
| DELETE | `/api/invoices/[id]/payments/[paymentId]` | ADMIN | Delete payment record |
| GET | `/api/invoices/[id]/messages` | ADMIN | Get invoice messages/notes |
| POST | `/api/invoices/[id]/messages` | ADMIN | Add message to invoice |
| GET | `/api/invoices/[id]/activity` | ADMIN | Get invoice activity log |

#### Stripe Integration
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/invoices/[id]/stripe-session` | CLIENT | Create Stripe checkout session |

#### Client Invoice API
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/client/invoices` | CLIENT | Get own invoices |

---

### Quotes (7 endpoints)

#### Quote CRUD
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/quotes` | ADMIN | List all quotes |
| POST | `/api/quotes` | ADMIN | Create new quote |
| GET | `/api/quotes/[id]` | ADMIN/CLIENT | Get quote details |
| PUT | `/api/quotes/[id]` | ADMIN | Update quote |
| DELETE | `/api/quotes/[id]` | ADMIN | Delete quote |

#### Quote Workflow Actions
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/quotes/[id]/send` | ADMIN | Send quote to client |
| POST | `/api/quotes/[id]/status` | ADMIN | Update quote status |
| POST | `/api/quotes/[id]/accept` | CLIENT/ADMIN | Accept quote |
| POST | `/api/quotes/[id]/decline` | CLIENT/ADMIN | Decline quote |
| POST | `/api/quotes/[id]/convert` | ADMIN | Convert quote to invoice |
| POST | `/api/quotes/[id]/duplicate` | ADMIN | Clone quote |

---

### Jobs & Print Queue (7 endpoints)

#### Job Management
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/jobs` | ADMIN | List print jobs |
| POST | `/api/jobs` | ADMIN | Create job |
| GET | `/api/jobs/[id]` | ADMIN | Get job details |
| PATCH | `/api/jobs/[id]` | ADMIN | Update job (partial) |
| POST | `/api/jobs/[id]/status` | ADMIN | Update job status |

#### Job Actions
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/jobs/[id]/archive` | ADMIN | Archive job |
| POST | `/api/jobs/archive` | ADMIN | Batch archive jobs |
| POST | `/api/jobs/reorder` | ADMIN | Reorder queue |

#### Client Jobs API
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/client/jobs` | CLIENT | Get own jobs |

---

### Quick Order / File Processing (6 endpoints)

#### Quick Order Workflow
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/quick-order/upload` | CLIENT | Upload STL file |
| POST | `/api/quick-order/orient` | CLIENT | Orient model (3D manipulation) |
| POST | `/api/quick-order/slice` | CLIENT | Slice model for printing |
| POST | `/api/quick-order/analyze-supports` | CLIENT | Analyze support structures |
| POST | `/api/quick-order/price` | CLIENT | Get real-time pricing |
| POST | `/api/quick-order/checkout` | CLIENT | Create order from quote |

---

### Materials & Inventory (4 endpoints)

#### Admin Materials API
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/materials` | ADMIN | List materials |
| POST | `/api/materials` | ADMIN | Add material |
| PUT | `/api/materials/[id]` | ADMIN | Update material |
| DELETE | `/api/materials/[id]` | ADMIN | Delete material |

#### Client Materials API
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/client/materials` | CLIENT | Get available materials |

---

### Printers (3 endpoints)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/printers` | ADMIN | List all 3D printers |
| POST | `/api/printers` | ADMIN | Add printer |
| PUT | `/api/printers/[id]` | ADMIN | Update printer settings |
| DELETE | `/api/printers/[id]` | ADMIN | Remove printer |
| POST | `/api/printers/[id]/clear-queue` | ADMIN | Clear printer job queue |

---

### Product Templates (4 endpoints)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/product-templates` | ADMIN | List product templates |
| POST | `/api/product-templates` | ADMIN | Create template |
| PUT | `/api/product-templates/[id]` | ADMIN | Update template |
| DELETE | `/api/product-templates/[id]` | ADMIN | Delete template |

---

### Projects (3 endpoints)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/client/projects` | CLIENT | Get client's projects |
| POST | `/api/projects/[id]/reorder` | CLIENT | Reorder existing project |
| POST | `/api/projects/archive` | CLIENT/ADMIN | Archive project |

---

### Attachments & Files (3 endpoints)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/attachments/[id]` | ADMIN/CLIENT | Download attachment |
| GET | `/api/order-files/[id]` | CLIENT | Get order file details |
| GET | `/api/order-files/[id]/download` | CLIENT | Download order file |

---

### Dashboard & Analytics (2 endpoints)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/dashboard` | ADMIN | Admin dashboard stats & KPIs |
| GET | `/api/dashboard/activity` | ADMIN | Recent activity feed |
| GET | `/api/client/dashboard` | CLIENT | Client dashboard stats |

---

### Messaging & Notifications (4 endpoints)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/messages` | AUTH | Get messages |
| POST | `/api/messages` | AUTH | Create message |
| GET | `/api/notifications` | AUTH | Get notifications |
| PATCH | `/api/notifications` | AUTH | Mark notifications read |
| GET | `/api/client/notifications` | CLIENT | Get client notifications |
| GET | `/api/admin/messages/conversations` | ADMIN | List admin conversations |
| GET | `/api/admin/users/[id]/messages` | ADMIN | Get user messages |
| POST | `/api/admin/users/[id]/messages` | ADMIN | Send message to user |

---

### Export & Reporting (6 endpoints)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/export/invoices` | ADMIN | Export invoices (CSV/Excel) |
| GET | `/api/export/payments` | ADMIN | Export payment records |
| GET | `/api/export/jobs` | ADMIN | Export job history |
| GET | `/api/export/material-usage` | ADMIN | Export material analytics |
| GET | `/api/export/ar-aging` | ADMIN | Export accounts receivable aging |
| GET | `/api/export/printer-utilization` | ADMIN | Export printer usage stats |

---

### Settings & Config (1 endpoint)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/settings` | ADMIN | Get system settings |
| PUT | `/api/settings` | ADMIN | Update system settings |

---

### External Integrations (3 endpoints)

#### Stripe
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/stripe/webhook` | Webhook | Handle Stripe events |
| POST | `/api/stripe/test` | ADMIN | Test Stripe connection |

#### Resend (Email)
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/webhooks/resend` | Webhook | Handle Resend email events |

---

### Utility Endpoints (2 endpoints)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/tmp-file/[...id]` | AUTH | Get temporary file |
| POST | `/api/maintenance/run` | ADMIN | Run maintenance tasks |

---

## Auth & Middleware Patterns

### Authentication Flow

1. **Login** → `POST /api/auth/login` → Sets `sb:token` cookie
2. **Auto-Auth** → `GET /api/auth/me` → Validates session
3. **Logout** → `POST /api/auth/logout` → Clears cookies

### Role-Based Access Control

#### Server-Side Layout Enforcement
- **Admin routes** (`(admin)/*`): `requireAdmin()` in layout blocks non-admin users
- **Client routes** (`(client)/*`): `requireClient()` in layout blocks non-client users
- **Public routes** (`(public)/*`): `getOptionalUser()` auto-redirects authenticated users to appropriate dashboard

#### API Route Protection
Two patterns used in API handlers:

**Pattern 1: Admin-only**
```typescript
await requireAdmin(request);  // Throws if not ADMIN role
```

**Pattern 2: Client-only**
```typescript
await requireClientWithId(request);  // Throws if not CLIENT role
```

**Pattern 3: Authenticated (any role)**
```typescript
await requireAuth(request);  // Throws if not authenticated
```

### Auth Helpers Location
- Server Components: `/lib/auth-utils.ts`
  - `requireAuth()` - Any authenticated user
  - `requireAdmin()` - Admin only
  - `requireClient()` - Client only
  - `getOptionalUser()` - May be null

- API Routes: `/server/auth/api-helpers.ts`
  - Same functions + `requireClientWithId()` - Client with ID validation

### Session Storage
- **Token:** HTTP-only cookie `sb:token`
- **Type:** JWT with expiration
- **Persistence:** Supabase session

---

## Route Summary by Role

### Admin User Access
- All `/dashboard/*` routes
- All `/invoices/*` routes
- All `/quotes/*` routes
- All `/clients/*` routes
- `/jobs`, `/printers`, `/products`, `/users/*`
- `/settings`, `/messages`, `/reports`, `/business-guide`
- All `/api/admin/*`, `/api/invoices/*`, `/api/quotes/*`, `/api/jobs/*`, `/api/export/*`

### Client User Access
- `/client` (dashboard)
- `/client/orders/*`
- `/client/projects/*`
- `/client/messages`
- `/quick-order`
- `/api/client/*`, `/api/quick-order/*`
- Limited invoice/quote viewing via `/api/invoices/[id]`, `/api/quotes/[id]`

### Public Access
- `/login`
- `/signup`
- `/` (landing)

---

## Key Features Identified

### Billing & Invoicing
- Full invoice lifecycle (create, draft, sent, paid, void, write-off)
- Payment tracking with multiple payment records
- Invoice credit application
- Stripe payment integration

### Quoting System
- Quote creation & editing
- Multi-state workflow (draft → sent → accepted/declined → converted to invoice)
- Quote duplication & versioning

### 3D Print Management
- Job queue management with status tracking
- Printer inventory & queue clearing
- Material inventory & pricing

### Quick Order / Self-Service
- File upload & processing
- 3D model manipulation (orient, slice, support analysis)
- Real-time pricing calculation
- Direct checkout integration

### Client Portal
- Order history & project tracking (active, completed, archived, history)
- Invoice viewing & payment
- Quick ordering with file processing
- Messaging & notifications

### Admin Dashboard
- KPI metrics & activity feed
- Multiple reporting views (AR aging, material usage, printer utilization)
- Bulk export capabilities

### User Management
- Admin/staff user creation & permissions
- Client management with credit tracking
- Internal messaging system

---

## Notable Patterns

1. **Optimistic Concurrency:** Dynamic route generation with `[id]` parameters
2. **Nested Resources:** `/api/invoices/[id]/payments/[paymentId]` - Two-level nesting
3. **Action Routes:** `/api/invoices/[id]/mark-paid`, `/api/quotes/[id]/accept` - REST-style actions
4. **Batch Operations:** `/api/jobs/archive`, `/api/projects/archive` - Bulk actions
5. **Webhook Integration:** Stripe & Resend webhooks for async processing
6. **Streaming/Uploads:** File processing in quick-order workflow
7. **Export Features:** CSV/Excel export for multiple entities

---

## Missing Routes (Not Found in Codebase)
- No GraphQL endpoints
- No WebSocket endpoints (real-time features likely handled by Supabase)
- No file deletion endpoints for some resources
- No batch invoice/quote creation

