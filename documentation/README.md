# 3D Print Sydney - Documentation

Welcome to the comprehensive documentation for the 3D Print Sydney application. This documentation provides a complete reference for understanding the system architecture, features, and technical implementation.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Database Schema](#database-schema)
4. [Business Workflows](#business-workflows)
5. [API Architecture](#api-architecture)
6. [Integrations](#integrations)
7. [Features & Modules](#features--modules)

---

## Quick Navigation

### For New Developers
Start here to understand the system:
1. **[SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md)** - Project background, architecture, and technology stack
2. **[FEATURES_AND_MODULES.md](./FEATURES_AND_MODULES.md)** - What the application does (admin and client features)
3. **[AUTHENTICATION_AND_AUTHORIZATION.md](./AUTHENTICATION_AND_AUTHORIZATION.md)** - How security works

### For Backend Developers
Deep dive into server-side architecture:
1. **[API_ARCHITECTURE.md](./API_ARCHITECTURE.md)** - API design patterns and endpoint organization
2. **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** - Database entities and relationships
3. **[BUSINESS_WORKFLOWS.md](./BUSINESS_WORKFLOWS.md)** - Core business processes and state machines
4. **[INTEGRATIONS.md](./INTEGRATIONS.md)** - External services (Supabase, Stripe, PDF generation)

### For Product Managers & Stakeholders
Understand the business functionality:
1. **[FEATURES_AND_MODULES.md](./FEATURES_AND_MODULES.md)** - Complete feature list by user role
2. **[BUSINESS_WORKFLOWS.md](./BUSINESS_WORKFLOWS.md)** - How quotes, invoices, jobs, and payments work
3. **[SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md)** - High-level architecture and design decisions

---

## Documentation Files

### 1. SYSTEM_OVERVIEW.md
**Purpose:** High-level system architecture and project context

**Contents:**
- Project evolution (Phase 1 → Phase 2)
- Technology stack (React 19, Next.js 15, Supabase, Stripe)
- Architectural layers and deployment architecture
- Key design decisions and rationale
- System boundaries and responsibilities

**Best for:** Understanding the "big picture" and technical foundation

**File:** [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) | **Size:** 762 lines

---

### 2. AUTHENTICATION_AND_AUTHORIZATION.md
**Purpose:** Security model and access control

**Contents:**
- Supabase Auth with JWT tokens
- Cookie-based session management
- Role-based authorization (ADMIN vs CLIENT)
- Protected routes and middleware
- Permission patterns and data-level access control
- Security features (HttpOnly cookies, RLS)

**Best for:** Understanding authentication flows and implementing secure features

**File:** [AUTHENTICATION_AND_AUTHORIZATION.md](./AUTHENTICATION_AND_AUTHORIZATION.md) | **Size:** 559 lines

---

### 3. DATABASE_SCHEMA.md
**Purpose:** Database structure and entity relationships

**Contents:**
- 19 core database tables overview
- Entity relationships (clients → quotes → invoices → jobs)
- PostgreSQL enums (10 custom types)
- Foreign key relationships and cascade rules
- JSONB usage patterns
- Migration management

**Best for:** Database queries, schema changes, and understanding data model

**File:** [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | **Size:** 665 lines

---

### 4. BUSINESS_WORKFLOWS.md
**Purpose:** Core business processes and state machines

**Contents:**
- Quote lifecycle (DRAFT → PENDING → ACCEPTED/DECLINED/CONVERTED)
- Invoice management (PENDING → PAID/OVERDUE)
- Payment processing with Stripe
- Job lifecycle (11 statuses from QUEUED to COMPLETED)
- Quick Order self-service flow (7-step process)
- Client onboarding and document numbering

**Best for:** Implementing features, understanding business logic, troubleshooting workflows

**File:** [BUSINESS_WORKFLOWS.md](./BUSINESS_WORKFLOWS.md) | **Size:** 523 lines

---

### 5. API_ARCHITECTURE.md
**Purpose:** API design patterns and endpoint organization

**Contents:**
- REST API conventions
- Endpoint organization (admin, client, public routes)
- Request/response patterns (success/error envelopes)
- Service layer pattern
- Data Transfer Objects (DTOs)
- Validation with Zod
- Error handling and logging

**Best for:** Building new endpoints, API integration, frontend-backend communication

**File:** [API_ARCHITECTURE.md](./API_ARCHITECTURE.md) | **Size:** 325 lines

---

### 6. INTEGRATIONS.md
**Purpose:** External service integrations

**Contents:**
- **Supabase:** Database, Auth, Storage (4 buckets)
- **Stripe:** Payment processing and webhook handling
- **PDF Generation:** Puppeteer + Chromium for quote/invoice PDFs
- **3D File Processing:** STL slicing and metrics extraction
- **File Management:** Temporary files, order files, attachments
- Environment configuration and secrets

**Best for:** Integration troubleshooting, adding new external services, configuration

**File:** [INTEGRATIONS.md](./INTEGRATIONS.md) | **Size:** 937 lines

---

### 7. FEATURES_AND_MODULES.md
**Purpose:** User-facing features by role

**Contents:**
- **Admin Portal:** Dashboard, client management, quotes, invoices, jobs, printers, materials, reporting
- **Client Portal:** Dashboard, invoice viewing, job tracking, Quick Order self-service
- **Shared Features:** 3D visualization, messaging, authentication
- Feature access matrix (ADMIN vs CLIENT permissions)
- Pricing and calculation engine
- Automated workflows

**Best for:** Feature planning, user training, understanding capabilities

**File:** [FEATURES_AND_MODULES.md](./FEATURES_AND_MODULES.md) | **Size:** 1,129 lines

---

## Documentation Statistics

| Document | Lines | Size | Focus Area |
|----------|-------|------|------------|
| SYSTEM_OVERVIEW.md | 762 | 29KB | Architecture & Stack |
| AUTHENTICATION_AND_AUTHORIZATION.md | 559 | 8.4KB | Security & Access |
| DATABASE_SCHEMA.md | 665 | 20KB | Data Model |
| BUSINESS_WORKFLOWS.md | 523 | 15KB | Business Logic |
| API_ARCHITECTURE.md | 325 | 9.7KB | API Patterns |
| INTEGRATIONS.md | 937 | 26KB | External Services |
| FEATURES_AND_MODULES.md | 1,129 | 31KB | User Features |
| **Total** | **4,900** | **~140KB** | **Complete System** |

---

## Key Concepts at a Glance

### Technology Stack
- **Frontend:** React 19, Next.js 15 (App Router), Tailwind CSS 4, shadcn/ui, Three.js
- **Backend:** Next.js API Routes, Node.js, Service Layer Pattern
- **Database:** Supabase PostgreSQL (19 tables, 10 enums)
- **Auth:** Supabase Auth with JWT cookies
- **Storage:** Supabase Storage (4 buckets)
- **Payments:** Stripe Checkout + Webhooks
- **PDF:** Puppeteer + Chromium

### User Roles
- **ADMIN:** Full system access (quotes, invoices, jobs, clients, printers, settings)
- **CLIENT:** Own data only (invoices, jobs, Quick Order)

### Core Workflows
1. **Quote → Invoice → Payment → Job**
2. **Quick Order:** Upload STL → Configure → Price → Checkout → Auto-create Job
3. **Job Management:** Assign to Printer → Queue → Print → Complete → Archive

### Database Entities
Settings → Clients → Quotes → Invoices → Payments
Invoices → Jobs → Printers
Attachments, Activity Logs, User Messages

---

## How to Use This Documentation

### For Onboarding New Team Members
1. Read SYSTEM_OVERVIEW.md to understand project context
2. Read FEATURES_AND_MODULES.md to see what the app does
3. Read AUTHENTICATION_AND_AUTHORIZATION.md to understand security
4. Dive into specific areas as needed (API, Database, Workflows)

### For Feature Development
1. Check FEATURES_AND_MODULES.md to understand existing features
2. Review BUSINESS_WORKFLOWS.md for related processes
3. Consult DATABASE_SCHEMA.md for data requirements
4. Follow patterns in API_ARCHITECTURE.md for implementation
5. Check INTEGRATIONS.md if external services are needed

### For Troubleshooting
1. BUSINESS_WORKFLOWS.md - Understand expected behavior
2. DATABASE_SCHEMA.md - Check data relationships and constraints
3. INTEGRATIONS.md - Verify external service configuration
4. AUTHENTICATION_AND_AUTHORIZATION.md - Debug access issues

### For Architecture Decisions
1. SYSTEM_OVERVIEW.md - Review existing design decisions
2. API_ARCHITECTURE.md - Understand current patterns
3. DATABASE_SCHEMA.md - Consider data model implications
4. INTEGRATIONS.md - Evaluate external service trade-offs

---

## Documentation Principles

These documents follow these principles:

✓ **Concise:** Focus on "what" and "why", not exhaustive "how"
✓ **Clear:** Use diagrams, examples, and structured sections
✓ **Complete:** Cover all aspects without code implementation dumps
✓ **Navigable:** Cross-references between documents
✓ **Maintained:** Version dates and update notes included
✓ **Code-free:** Architecture and patterns, not implementation details

---

## Project Context

### Phase 1: Local Admin Portal
- Business owner managing 3D printing operations locally
- Admin-only interface
- Manual client and job management

### Phase 2: Cloud SaaS Application
- Deployed on Vercel with Supabase backend
- Added client self-service portal
- Stripe payment integration
- Quick Order workflow for client autonomy
- Full-stack TypeScript application

---

## Getting Started

### Required Reading (30 minutes)
1. [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) (15 min) - Architecture foundation
2. [FEATURES_AND_MODULES.md](./FEATURES_AND_MODULES.md) (15 min) - What the system does

### Deep Dive (2-3 hours)
3. [AUTHENTICATION_AND_AUTHORIZATION.md](./AUTHENTICATION_AND_AUTHORIZATION.md) (20 min)
4. [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) (30 min)
5. [BUSINESS_WORKFLOWS.md](./BUSINESS_WORKFLOWS.md) (30 min)
6. [API_ARCHITECTURE.md](./API_ARCHITECTURE.md) (20 min)
7. [INTEGRATIONS.md](./INTEGRATIONS.md) (30 min)

---

## Maintaining This Documentation

### When to Update
- Adding new features or workflows
- Changing architecture or design patterns
- Adding/modifying database tables
- Adding new external integrations
- Changing authentication/authorization logic

### How to Update
1. Update the relevant documentation file(s)
2. Keep all documents in sync
3. Update this README if adding new sections
4. Ensure diagrams and examples remain accurate
5. Update the "Last Updated" date in each file

---

## Questions or Feedback?

If you find gaps, errors, or have suggestions for improvement:
1. Open an issue in the project repository
2. Contact the development team
3. Submit a pull request with documentation improvements

---

**Last Updated:** October 21, 2025
**Documentation Version:** 1.0
**Application:** 3D Print Sydney (Phase 2)
**Status:** Current and Maintained

---

**Ready to dive in? Start with [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md)**
