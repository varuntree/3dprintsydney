# System Overview: 3D Print Sydney

## Table of Contents
1. [Project Background & Evolution](#project-background--evolution)
2. [High-Level Architecture](#high-level-architecture)
3. [Technology Stack Overview](#technology-stack-overview)
4. [Key Design Decisions](#key-design-decisions)
5. [System Boundaries](#system-boundaries)
6. [Data Architecture](#data-architecture)
7. [Authentication & Authorization](#authentication--authorization)
8. [Key Features by Role](#key-features-by-role)

---

## Project Background & Evolution

### Phase 1: Local Admin Portal (Inception)
The 3D Print Sydney application began as a local-only business management tool designed for the business owner to manage print jobs, clients, and invoicing. Key characteristics:
- **Single User Focus**: Admin-only portal for the business owner
- **Local Deployment**: No cloud requirements, ran locally
- **Core Features**: Client management, job tracking, invoicing, quoting
- **Minimal Architecture**: Monolithic structure with basic data storage

### Phase 2: Cloud Migration & Client Portal (Current State)
The application evolved into a full-stack SaaS platform deployed on modern cloud infrastructure with a dual-portal approach:
- **Full-Stack Migration**: Transitioned from local-only to cloud-deployed application
- **Multi-Tenant Support**: Added admin and client separate portals
- **Client Self-Service**: Clients can now view orders, track job status, and access their documentation
- **Cloud Infrastructure**: Deployed on Vercel with Supabase as the backend
- **Payment Integration**: Added Stripe integration for invoice payment processing
- **Enhanced Capabilities**: 3D file visualization, PDF generation, comprehensive reporting

### Key Milestones
- **Initial Commit**: Basic Next.js setup
- **Phase 1 Completion**: Admin portal with essential business features
- **Phase 2 Initiation**: Cloud architecture planning and implementation
- **Client Portal Launch**: Self-service portal for external users
- **Current Phase**: Multi-tenant SaaS with advanced 3D visualization and payment processing

---

## High-Level Architecture

### Application Type
**Full-Stack Next.js SaaS** (Server-Side Rendering + API Routes)

The application leverages Next.js 15 with the App Router and React Server Components for a modern, performant architecture with server-side rendering capabilities.

### Architectural Layers

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  React Components | Tailwind CSS | Radix UI | 3D Rendering  │
└───────────────┬───────────────────────────────────────────┬──┘
                │                                           │
┌───────────────▼─────────────────────┐  ┌────────────────▼──┐
│   Admin Portal                      │  │  Client Portal    │
│   (Admin-only routes)               │  │  (Client-only)    │
│   - Clients, Jobs, Invoices, etc.   │  │  - Orders, Docs   │
└───────────────┬─────────────────────┘  └────────────────┬──┘
                │                                         │
┌───────────────▼─────────────────────────────────────────▼──┐
│                   Application Layer                        │
│  Next.js Route Handlers (API Routes) | Server Components  │
│  Authentication & Authorization | Error Handling         │
└───────────────┬─────────────────────────────────────────┬──┘
                │                                         │
┌───────────────▼─────────────────────┐  ┌────────────────▼──┐
│   Business Logic Layer              │  │  External Services│
│   (Service Pattern)                 │  │  - Stripe         │
│   - Clients Service                 │  │  - Puppeteer PDF  │
│   - Invoices Service                │  │  - Cloud Storage  │
│   - Jobs Service                    │  │                   │
│   - Quotes Service                  │  │                   │
│   - And 10+ more...                 │  │                   │
└───────────────┬─────────────────────┘  └────────────────┬──┘
                │                                         │
┌───────────────▼───────────────────────────────────────▼────┐
│              Data Access Layer                              │
│  Supabase Client | Service Role Key | Database Queries     │
└───────────────┬───────────────────────────────────────┬────┘
                │                                       │
┌───────────────▼─────────────────────┐  ┌─────────────▼────┐
│  Supabase PostgreSQL Database       │  │  Cloud Storage   │
│  - Tables: clients, invoices, jobs  │  │  Buckets:        │
│  - Users & Auth                     │  │  - PDFs          │
│  - Metadata & Settings              │  │  - Attachments   │
│                                     │  │  - Temp Files    │
│                                     │  │  - Order Files   │
└─────────────────────────────────────┘  └──────────────────┘
```

### Routing Architecture

The application uses **Route Groups** (Next.js App Router) to organize portals with built-in role validation:

```
src/app/
├── (public)/              # Public pages - login, signup, password reset
│   ├── login/
│   ├── signup/
│   └── reset-password/
├── (admin)/               # Admin portal - role-validated at layout level
│   ├── layout.tsx         # Wraps all admin pages with requireAdmin()
│   ├── clients/
│   ├── invoices/
│   ├── jobs/
│   ├── quotes/
│   ├── products/
│   ├── materials/
│   ├── printers/
│   ├── messages/
│   ├── reports/
│   └── settings/
├── (client)/              # Client portal - role-validated at layout level
│   ├── layout.tsx         # Wraps all client pages with requireClient()
│   ├── client/orders/
│   ├── client/messages/
│   └── quick-order/
├── api/                   # RESTful API routes
│   ├── clients/
│   ├── invoices/
│   ├── jobs/
│   ├── materials/
│   ├── messages/
│   └── [resource]/[id]/...
└── layout.tsx             # Root layout - CSS, providers, top-level config
```

### Deployment Architecture

```
┌──────────────────────────────────────────┐
│         GitHub (Version Control)         │
└──────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────┐
│  Vercel (Compute & CDN)                  │
│  - Next.js Server Components             │
│  - API Route Handlers                    │
│  - Static File Serving                   │
│  - Edge Functions                        │
└──────┬───────────────────────────────────┘
       │
       ├─────────────────────────────┬────────────────────┐
       │                             │                    │
       ▼                             ▼                    ▼
┌─────────────────────┐   ┌──────────────────┐   ┌──────────────┐
│ Supabase            │   │ Stripe           │   │ Puppeteer    │
│ - PostgreSQL DB     │   │ - Payments       │   │ - PDF Gen    │
│ - Auth              │   │ - Webhooks       │   │              │
│ - Storage           │   │                  │   │              │
│ - Realtime          │   │                  │   │              │
└─────────────────────┘   └──────────────────┘   └──────────────┘
```

---

## Technology Stack Overview

### Frontend Technologies
- **React 19**: Modern component library with concurrent rendering
- **Next.js 15**: Full-stack framework with App Router and Server Components
- **TypeScript 5**: Strict type safety across the application
- **Tailwind CSS 4**: Utility-first CSS framework
- **Radix UI**: Unstyled, accessible component primitives
- **Class Variance Authority (CVA)**: Component style composition
- **Lucide React**: Icon library with 500+ icons
- **React Hook Form**: Performant form handling with minimal re-renders
- **Zod**: TypeScript-first schema validation

### 3D Visualization Stack
- **Three.js**: WebGL 3D graphics library
- **React Three Fiber**: React renderer for Three.js
- **React Three Drei**: Useful helpers and prebuilt components for R3F
- **STL Viewer**: Custom component for loading and displaying STL files
- **Rotation Controls**: Interactive 3D model manipulation

### Backend Technologies
- **Node.js**: Runtime for Next.js API routes
- **Next.js API Routes**: RESTful endpoints using route handlers
- **TypeScript**: Type-safe backend code
- **Zod**: Request/response validation
- **Puppeteer & Puppeteer Core**: Headless browser for PDF generation
- **Sharp**: Image processing and optimization

### Database & Storage
- **Supabase**: Complete backend-as-a-service platform
  - **PostgreSQL**: Relational database with custom triggers and policies
  - **Auth**: Built-in user authentication with JWT tokens
  - **Storage**: S3-compatible object storage for files
  - **Realtime**: WebSocket subscriptions for real-time updates

### State Management & Data Fetching
- **TanStack React Query (v5)**: Server state management with automatic caching and synchronization
- **Zustand**: Lightweight client state management
- **React Context**: Navigation state provider
- **Immer**: Immutable state updates

### Key Libraries & Utilities
- **date-fns**: Date manipulation and formatting (AUD timezone support)
- **UUID**: Unique identifier generation
- **Stripe SDK**: Payment processing integration
- **Sonner**: Toast notifications
- **fast-csv & json2csv**: CSV export functionality

### Development Tools
- **ESLint**: Code quality and style enforcement
- **Prettier**: Code formatting
- **Tailwind PostCSS 4**: Advanced CSS-in-JS transformations
- **tsx**: TypeScript execution for scripts
- **Axe Core (React)**: Accessibility testing in development

### Build & Deployment
- **Next.js Build**: Optimized production builds with tree-shaking
- **Vercel Platform**: Zero-config deployment and auto-scaling
- **Environment Variables**: Secure configuration management

---

## Key Design Decisions

### 1. Next.js App Router with Server Components

**Decision**: Use Next.js 15 App Router with React Server Components for all pages and layouts.

**Rationale**:
- **Performance**: Server-side rendering reduces JavaScript sent to browser
- **Data Freshness**: Server components can access database directly without API calls
- **Security**: Sensitive operations (auth checks, database queries) happen on server
- **Developer Experience**: Unified framework for frontend and backend logic
- **SEO & UX**: Server-rendered pages provide better initial page load

**Implementation**:
- Route group layouts (`(admin)/layout.tsx`, `(client)/layout.tsx`) validate user roles at render time
- Server components call `requireAdmin()`, `requireClient()`, or `requireAuth()` helpers
- No client-side redirects or permission flickers
- API routes for client-side mutations and real-time data

### 2. Supabase as Backend Platform

**Decision**: Use Supabase over alternatives (Firebase, Auth0, custom backend).

**Rationale**:
- **Cost Efficiency**: Generous free tier and predictable pricing
- **PostgreSQL Power**: Full SQL capabilities vs. document-based alternatives
- **Row-Level Security**: Fine-grained access control built-in
- **Multiple Features**: Auth, database, storage, and realtime in one platform
- **Open Source**: Community-driven, self-hostable if needed
- **Integration**: Seamless Supabase SDK with Next.js

**Implementation**:
- Service role key for server-side admin operations
- Anon key + session management for client-side queries
- Row-level security policies for multi-tenant isolation
- Database triggers for audit logging and automatic updates

### 3. Service Layer Pattern

**Decision**: Implement business logic in dedicated service modules (`/server/services/*`).

**Rationale**:
- **Separation of Concerns**: Business logic isolated from API routes
- **Reusability**: Services called from multiple API endpoints
- **Testability**: Services can be tested independently
- **Maintainability**: Clear boundaries between data access and business rules
- **Consistency**: Centralized logic prevents duplicated code

**Structure**:
```
/server/services/
├── clients.ts         # Client CRUD and relationship operations
├── invoices.ts        # Invoice creation, updates, payment tracking
├── jobs.ts            # Job lifecycle management
├── quotes.ts          # Quote generation and conversion
├── materials.ts       # Material catalog management
├── products.ts        # Product template management
├── settings.ts        # Business settings and configurations
├── stripe.ts          # Stripe integration and webhooks
├── exports.ts         # Data export functionality
├── dashboard.ts       # Analytics and reporting
└── ... (10+ more)
```

**Usage Pattern**:
```
API Route → Service Layer → Supabase Client → Database/Storage
```

### 4. State Management Approach

**Decision**: Use a hybrid approach combining React Query for server state, Zustand for client state, and Context for app-level state.

**Rationale**:
- **React Query**: Automatic caching, synchronization, and refetching of server state
- **Zustand**: Lightweight alternative to Redux for global client state (navigation)
- **Context**: App-wide providers (theme, locale, etc.) without prop drilling
- **Flexibility**: Each tool for its specific use case

**Implementation**:
- React Query manages data fetched from `/api/*` endpoints
- Zustand stores UI state (navigation state)
- Providers wrapped in root layout
- QueryClient configured with 30-second stale time

### 5. File Storage Strategy

**Decision**: Use Supabase Storage (S3-compatible) with multiple organized buckets.

**Rationale**:
- **Scalability**: Handles large STL and PDF files efficiently
- **Security**: Fine-grained access control per bucket
- **Simplicity**: No separate S3 account or CDN configuration needed
- **Organization**: Logical bucket separation for different file types
- **Cost**: Pay-per-use without upfront storage commitments

**Bucket Structure**:
```
/attachments      # Invoice and order attachments (client uploads)
/pdfs             # Generated invoices and quotes as PDF
/tmp              # Temporary processing files
/order-files      # Customer-uploaded 3D model files (STL, etc.)
```

### 6. Role-Based Access Control

**Decision**: Implement role-based access control at multiple layers (auth, routes, API, database).

**Rationale**:
- **Security**: Multiple layers prevent unauthorized access
- **Performance**: Early rejection at route level avoids rendering unauthorized content
- **Consistency**: Same roles (ADMIN, CLIENT) enforced everywhere

**Implementation Layers**:
- **Route Validation**: Server component layouts call `requireAdmin()` or `requireClient()`
- **API Validation**: API routes check user role via `requireAdminAPI()`, `requireClientAPI()`
- **Database Policies**: Supabase Row-Level Security enforces data access rules
- **Component Level**: Conditional rendering based on user role (fallback UX)

### 7. API Design Pattern

**Decision**: RESTful API with consistent response format and error handling.

**Rationale**:
- **Standardization**: Consistent interface for all API consumers
- **Developer Experience**: Predictable error messages and status codes
- **Testing**: Easy to mock and test API calls

**Response Format**:
```typescript
// Success
{ data: T }

// Error
{ error: { code: string, message: string, details?: object } }
```

### 8. 3D Visualization with Three.js

**Decision**: Use React Three Fiber for 3D STL file visualization in client portal.

**Rationale**:
- **Client-Side**: No server processing needed, instant loading
- **Interactive**: Users can rotate, zoom, and inspect 3D models
- **Familiar**: React component model for 3D objects
- **Performance**: WebGL acceleration and automatic optimization

**Use Cases**:
- Order preview before confirming
- Quick-order 3D model upload and visualization
- Quote generation with visual reference

---

## System Boundaries

### What the System Does

**Core Responsibilities**:
1. **Client Management**: Add, edit, track, and organize customer accounts
2. **Job Management**: Create, track, and manage 3D print jobs through lifecycle
3. **Invoicing**: Generate, send, track, and manage invoice payments
4. **Quoting**: Create, customize, and convert quotes to invoices
5. **Product Catalog**: Manage product templates and pricing
6. **Material Tracking**: Track material inventory and costs
7. **Printer Management**: Manage printer fleet and capabilities
8. **Reporting & Analytics**: Dashboard, reports, and data exports
9. **File Handling**: Upload, store, and manage 3D model files and documents
10. **Client Portal**: Self-service platform for customers to view orders
11. **Messaging**: Communication between admin and clients within the system

### What External Services Handle

1. **Authentication & JWT**: Supabase Auth (handles token generation, refresh, validation)
2. **Payment Processing**: Stripe (handles card processing, PCI compliance, webhooks)
3. **PDF Generation**: Puppeteer (headless browser for HTML-to-PDF conversion)
4. **Object Storage**: Supabase Storage (S3-compatible, handles file persistence)
5. **Database**: Supabase PostgreSQL (handles data persistence, transactions, triggers)
6. **DNS & CDN**: Vercel (handles domain routing and static asset delivery)
7. **Email**: Not currently implemented (could be SendGrid, Mailgun, etc.)
8. **Analytics**: Currently basic; could integrate Posthog, Segment, etc.

### Integration Points Overview

```
3D Print Sydney App
│
├─── Supabase
│    ├── PostgreSQL (SELECT, INSERT, UPDATE, DELETE)
│    ├── Auth (JWT token validation)
│    └── Storage (file upload/download)
│
├─── Stripe
│    ├── Create payment sessions
│    ├── Validate payments
│    └── Handle webhooks
│
├─── Puppeteer
│    └── Render HTML → PDF (invoices, quotes)
│
└─── Vercel
     ├── Deploy & host
     ├── Environment variables
     └── Build logs
```

### Out of Scope (Not Implemented)
- Email delivery (no SMTP integration)
- SMS notifications
- Video conferencing
- Advanced AI/ML features
- Multi-company/location support (currently single-tenant from business perspective)
- Mobile-native apps (web-only)
- Inventory forecasting
- Supply chain integration
- ERP/accounting software connectors

---

## Data Architecture

### Key Entities

**Core Tables**:
- `users`: Authentication users with roles (ADMIN, CLIENT)
- `clients`: Customer accounts with contact info and metadata
- `invoices`: Invoice documents with line items and payment tracking
- `invoice_line_items`: Individual lines within invoices
- `payments`: Payment records linked to invoices (Stripe integration)
- `quotes`: Quote documents (similar structure to invoices)
- `jobs`: 3D print jobs with status tracking
- `materials`: Material catalog with properties and costs
- `printers`: Printer definitions with capabilities
- `product_templates`: Reusable product definitions
- `messages`: Chat messages between admin and clients
- `settings`: Business configuration and preferences

### Multi-Tenancy Model

The application is currently **single-tenant from business perspective** but **multi-user from architecture perspective**:
- One admin account (business owner)
- Multiple client accounts (customers)
- Data isolation via foreign key relationships and RLS policies
- Clients can only see their own orders, invoices, and messages

**Future Scalability**: Architecture supports multi-company SaaS if needed.

### Relationships

```
Client
  ├── Many Invoices
  ├── Many Quotes
  ├── Many Jobs
  ├── Many Messages (conversations)
  └── One User Account (role: CLIENT)

Invoice
  ├── Many Line Items
  ├── Many Payments
  ├── Many Messages (discussion)
  ├── One Client
  └── Many Attachments (storage)

Quote
  ├── Many Line Items
  ├── Many Messages
  ├── One Client
  └── Can Convert → Invoice

Job
  ├── One Client
  ├── One Printer (assignment)
  ├── Many Materials (usage)
  └── Lifecycle tracking
```

### Database Constraints & Policies

- **Row-Level Security**: Each CLIENT user can only view their own records
- **Audit Trail**: Created_at, updated_at, updated_by timestamps on all tables
- **Soft Deletes**: Some tables use deleted_at for archive capability
- **Foreign Keys**: Referential integrity enforced
- **Check Constraints**: Data validation at database level (e.g., positive amounts)

---

## Authentication & Authorization

### Authentication Flow

1. **Public Pages** (`/login`, `/signup`): User enters credentials or creates account
2. **Supabase Auth**: Validates credentials, returns JWT token
3. **Token Storage**: JWT stored in HTTP-only cookie (`sb:token`)
4. **Session Retrieval**: 
   - Server components call `getUserFromCookies()` (server-side)
   - Browser-side: Token automatically included in API calls via Supabase SDK
5. **Token Validation**: Every server component/API route validates token and loads user profile

### Role-Based Access

**User Roles**:
- `ADMIN`: Business owner with full system access
- `CLIENT`: Customer with limited portal access

**Route Protection**:
```typescript
// Admin pages
(admin)/page.tsx → calls requireAdmin() → redirects non-admin to /client

// Client pages
(client)/page.tsx → calls requireClient() → redirects non-client to /

// Public pages
(public)/login → redirects authenticated users to their dashboard
```

**API Protection**:
```typescript
// Admin endpoints
POST /api/invoices → requireAdminAPI(req) → 403 if not admin

// Client endpoints
GET /api/client/orders → requireClientAPI(req) → 403 if not client

// Public endpoints
GET /api/public/health → no auth required
```

### Session Management

- **Token Expiration**: Supabase Auth handles expiration (default: 1 hour)
- **Token Refresh**: Supabase SDK auto-refreshes if refresh token available
- **Logout**: Client-side cookie deletion and session invalidation
- **CSRF Protection**: Next.js built-in CSRF protection via cookie-based sessions

---

## Key Features by Role

### Admin Portal Features

**Dashboard**:
- Real-time business metrics
- Invoice summary (sent, paid, pending)
- Job queue overview
- Recent activity feed

**Client Management**:
- Create and manage customer accounts
- Track contact information and communication history
- View client invoices and orders
- Client segment filtering

**Invoice Management**:
- Create invoices from scratch or templates
- Line item management with calculations
- Automatic tax and discount calculations
- Payment tracking and reconciliation
- Mark as paid/unpaid
- Revert invoices
- PDF generation and attachment
- Stripe payment integration

**Quote Management**:
- Create quotes with itemized pricing
- Customize terms and conditions
- Convert quotes to invoices
- Quote status tracking
- Expiration dates

**Job Tracking**:
- Create jobs from invoices or manually
- Track job status (queued, printing, completed, failed)
- Assign to printers
- Material consumption tracking
- Printer management and capabilities

**Product Catalog**:
- Product templates with pricing
- Reusable product definitions
- Quick-add to invoices and quotes

**Material Management**:
- Material inventory
- Cost per unit tracking
- Material properties and specifications

**Messaging**:
- Internal communication with clients
- Message history and archives
- Real-time notifications

**Settings**:
- Business information and branding
- Payment terms configuration
- Tax rates and shipping defaults
- API keys and integrations
- User management

**Reports**:
- Revenue reports
- Client profitability
- Data exports (CSV)
- Invoice status reports

### Client Portal Features

**Orders**:
- View all orders/invoices
- Status tracking (pending, sent, paid)
- Download invoice PDFs
- Track 3D model files
- View quotes and history

**Messages**:
- Communicate with business owner
- Message history
- Real-time notifications

**Quick Order**:
- Self-service order placement
- 3D model file upload
- 3D preview with STL viewer
- Order customization
- Material selection
- Instant quoting

**Account**:
- Profile information
- Account settings
- Password management
- Contact preferences

---

## Performance Considerations

### Client-Side Optimization
- Code splitting via Next.js route-based splitting
- Image optimization with Sharp
- CSS-in-JS optimizations via Tailwind
- React Query automatic deduplication and caching
- Lazy loading of 3D components

### Server-Side Optimization
- Database query optimization via service layer
- Connection pooling via Supabase
- Caching layer for frequent queries
- PDF generation with Puppeteer (headless, no UI overhead)
- Storage with CDN delivery

### Monitoring & Observability
- Error logging via structured logging
- Performance metrics via Next.js analytics
- Stripe webhook validation and retry logic
- Request/response logging in development

---

## Security Considerations

### Data Protection
- HTTPS only (enforced by Vercel)
- PostgreSQL encryption at rest (Supabase managed)
- Row-Level Security on sensitive tables
- API request validation via Zod

### Authentication & Authorization
- JWT tokens with expiration
- HTTP-only cookies for token storage
- Role-based access control at multiple layers
- Server-side session validation

### File Handling
- File upload validation (type, size, virus scan)
- Secure storage in Supabase buckets
- Signed URLs for file download (time-limited)
- No direct file path exposure

### API Security
- Rate limiting (via Vercel)
- Request validation (Zod schemas)
- Error messages don't leak sensitive info
- CORS policies configured
- Stripe webhook signature verification

### Secrets Management
- Environment variables for sensitive keys
- No secrets in version control (.gitignore)
- Vercel secrets dashboard for production

---

## Future Scalability & Extensibility

### Architecture Supports
- **Multi-company SaaS**: RLS policies already per-organization-ready
- **Team collaboration**: Multiple admin accounts per business
- **Advanced integrations**: Webhook system for external integrations
- **Real-time features**: Supabase Realtime subscriptions ready
- **Mobile apps**: API already decoupled from UI
- **Offline-first**: Could add service workers and local sync

### Potential Enhancements
- WebSocket real-time order updates
- Advanced reporting and BI dashboards
- Machine learning for pricing optimization
- Inventory forecasting
- Customer payment reminders (email/SMS)
- Automated quote templates
- Integration with accounting software

---

## Development Workflow

### Local Development
```bash
npm install              # Install dependencies
npm run dev              # Start development server (http://localhost:3000)
npm run typecheck        # Type check TypeScript
npm run lint             # Run ESLint
npm run format:write     # Auto-format code
```

### Key Files for Architecture Understanding
- `/src/app/layout.tsx` - Root layout and setup
- `/src/app/(admin)/layout.tsx` - Admin route group
- `/src/app/(client)/layout.tsx` - Client route group
- `/src/server/services/*` - Business logic
- `/src/lib/auth-utils.ts` - Authentication helpers
- `/src/server/auth/session.ts` - Session management
- `/src/components/providers/app-providers.tsx` - Global providers

---

**Last Updated**: October 2024
**Application Version**: 0.1.0
**Status**: Production-ready SaaS platform
