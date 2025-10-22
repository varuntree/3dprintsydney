# 3D Print Sydney - Complete Documentation

**Generated**: 2025-10-22
**Version**: 1.1
**Total Pages**: 9,680 lines across 8 documents
**Total Size**: 280 KB

---

## Documentation Index

This folder contains comprehensive technical documentation for the 3D Print Sydney business management system. All documentation is generated from codebase analysis and reflects the actual implementation as of October 21, 2025.

### Core Documents

| Document | Lines | Size | Description |
|----------|-------|------|-------------|
| **[SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md)** | 871 | 28 KB | High-level architecture, technology stack, design decisions, project statistics |
| **[API_ARCHITECTURE.md](./API_ARCHITECTURE.md)** | 850 | 25 KB | API patterns, routing, response formats, authentication, validation |
| **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** | 1,505 | 36 KB | Complete database schema, tables, relationships, indexes, migrations |
| **[AUTHENTICATION_AND_AUTHORIZATION.md](./AUTHENTICATION_AND_AUTHORIZATION.md)** | 1,131 | 29 KB | Auth flow, session management, role-based access, security features |
| **[BUSINESS_WORKFLOWS.md](./BUSINESS_WORKFLOWS.md)** | 1,201 | 39 KB | Quote lifecycle, invoice management, payment processing, job workflows |
| **[INTEGRATIONS.md](./INTEGRATIONS.md)** | 1,204 | 30 KB | Stripe payments, PDF generation, 3D slicing, file storage |
| **[FEATURES_AND_MODULES.md](./FEATURES_AND_MODULES.md)** | 1,219 | 30 KB | Feature breakdown by role, UI components, admin/client capabilities |
| **[CODE_STANDARDS_AND_PATTERNS.md](./CODE_STANDARDS_AND_PATTERNS.md)** | 1,699 | 44 KB | Coding patterns, templates, best practices, style guide |

**Total**: 9,680 lines | 280 KB

---

## Quick Start Guide

### For New Developers

**Start Here**:
1. **[SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md)** - Get the big picture
2. **[CODE_STANDARDS_AND_PATTERNS.md](./CODE_STANDARDS_AND_PATTERNS.md)** - Learn the coding patterns
3. **[API_ARCHITECTURE.md](./API_ARCHITECTURE.md)** - Understand API structure

**Then Explore**:
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Database design
- [AUTHENTICATION_AND_AUTHORIZATION.md](./AUTHENTICATION_AND_AUTHORIZATION.md) - Security model
- [BUSINESS_WORKFLOWS.md](./BUSINESS_WORKFLOWS.md) - Business logic

### For Product Managers

**Start Here**:
1. **[FEATURES_AND_MODULES.md](./FEATURES_AND_MODULES.md)** - Feature catalog
2. **[BUSINESS_WORKFLOWS.md](./BUSINESS_WORKFLOWS.md)** - How the system works
3. **[INTEGRATIONS.md](./INTEGRATIONS.md)** - External services

### For DevOps/Infrastructure

**Start Here**:
1. **[SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md)** - Architecture overview
2. **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** - Database setup
3. **[INTEGRATIONS.md](./INTEGRATIONS.md)** - Third-party dependencies

---

## Documentation Standards

### Style Guidelines

- **Lean & Technical**: No marketing fluff, just facts
- **Code Examples**: Real code from the codebase, not pseudocode
- **File Paths**: Absolute paths to actual files
- **Statistics**: Real metrics (file counts, line counts, etc.)
- **Current State**: Documents reflect actual implementation, not planned features

### Structure

Each document includes:
- **Table of Contents**: For easy navigation
- **Real Code Examples**: Copy-paste ready snippets
- **File References**: Exact file paths
- **Visual Diagrams**: ASCII diagrams for workflows
- **Version Info**: Last updated date and version

---

## Document Summaries

### 1. SYSTEM_OVERVIEW.md

**Purpose**: 30,000-foot view of the entire system

**Key Sections**:
- High-level architecture (layered service architecture)
- Technology stack breakdown (Next.js 15, React 19, Supabase, TypeScript)
- 8 key design decisions (service layer, response format, DTOs, etc.)
- System boundaries (what it does and doesn't do)
- Data architecture and entity relationships
- Project statistics (271 TS files, 77 API routes, 79 components)

**Use When**: Onboarding new developers, explaining system to stakeholders

---

### 2. API_ARCHITECTURE.md

**Purpose**: Deep dive into API layer design and patterns

**Key Sections**:
- RESTful conventions and directory structure
- Standardized response envelope format
- Error handling strategy (AppError hierarchy)
- Authentication patterns (API helpers, session validation)
- Service layer integration pattern
- Data Transfer Objects (DTOs)
- Complete endpoint inventory (77 routes)
- Common code patterns and templates

**Use When**: Building new API endpoints, debugging API issues

---

### 3. DATABASE_SCHEMA.md

**Purpose**: Complete database reference

**Key Sections**:
- Schema overview (20 tables, 9 enums, 15 indexes)
- Custom types and enums (status types, roles, etc.)
- All 20 tables with full column definitions
- Entity relationships and foreign keys
- Indexes and performance considerations
- Row-Level Security policies
- Database functions (next_document_number)
- Migration history (10 migrations)
- Common query patterns

**Use When**: Database design decisions, schema changes, debugging data issues

---

### 4. AUTHENTICATION_AND_AUTHORIZATION.md

**Purpose**: Security model and auth implementation

**Key Sections**:
- Architecture overview (Supabase Auth + JWT + cookies)
- Authentication flows (login, signup, logout)
- Session management (cookies, refresh, validation)
- Role-based access control (ADMIN vs CLIENT)
- Route protection (middleware, layouts)
- API authentication helpers
- Resource-level permissions
- Security features (HttpOnly cookies, CSRF protection, etc.)
- Helper function reference

**Use When**: Implementing auth features, debugging login issues, security audits

---

### 5. BUSINESS_WORKFLOWS.md

**Purpose**: How business processes actually work

**Key Sections**:
- Quote lifecycle (DRAFT → PENDING → ACCEPTED/DECLINED/CONVERTED)
- Invoice management (status transitions, payments)
- Payment processing (Stripe, manual payments)
- Job lifecycle (production workflow)
- Quick order flow (instant quotes from STL uploads)
- Client onboarding
- Document numbering (sequential generation)
- Automated workflows and business rules

**Use When**: Understanding business logic, training users, building features

---

### 6. INTEGRATIONS.md

**Purpose**: External service integrations

**Key Sections**:
- Stripe integration (checkout, webhooks, error handling)
- PDF generation (Puppeteer, templates, styling)
- 3D file processing (STL upload, slicing, orientation)
- File storage (Supabase Storage, buckets)
- Email integration (future)
- Third-party dependencies

**Use When**: Debugging payment issues, PDF generation, file uploads

---

### 7. FEATURES_AND_MODULES.md

**Purpose**: Feature catalog by user role

**Key Sections**:
- Admin features (13 modules)
  - Dashboard, quotes, invoices, jobs, clients, messaging, settings, reports
- Client features (5 modules)
  - Dashboard, orders, invoices, payments, messaging
- UI component library (79 components)
- Feature implementation details
- Access control matrix

**Use When**: Understanding what users can do, planning features, user training

---

### 8. CODE_STANDARDS_AND_PATTERNS.md

**Purpose**: Coding conventions and templates

**Key Sections**:
- Core architectural principles
- 10 standard patterns:
  1. Database access (services only)
  2. Service layer structure
  3. Error handling (AppError hierarchy)
  4. Type organization (DTOs, schemas)
  5. API response format
  6. Authentication patterns
  7. Validation (Zod schemas)
  8. Logging (structured JSON)
  9. File naming conventions
  10. Import organization
- Complete code templates for:
  - CRUD API routes
  - Service functions
  - Type definitions
  - Error handling
- Quick reference guide

**Use When**: Writing new code, code reviews, refactoring

---

## Technology Stack Summary

### Core Framework
- **Next.js**: 15.5.3 (App Router, React Server Components)
- **React**: 19.1.0
- **TypeScript**: 5.x

### Database & Backend
- **Supabase**: PostgreSQL + Auth + Storage
- **Zod**: Runtime schema validation

### UI & Styling
- **Tailwind CSS**: 4.x
- **Radix UI**: Accessible component primitives
- **shadcn/ui**: Pre-built component library

### State Management
- **TanStack Query**: Server state + caching
- **React Hook Form**: Form management
- **Zustand**: Client state

### Payments & PDF
- **Stripe**: Payment processing
- **Puppeteer**: PDF generation

### 3D Processing
- **Three.js**: 3D rendering
- **React Three Fiber**: React renderer for Three.js

---

## Project Statistics

| Metric | Value |
|--------|-------|
| Total TypeScript Files | 271 |
| API Routes | 77 |
| React Components | 79 |
| Service Layer Functions | 19 |
| Database Tables | 20 |
| Database Migrations | 10 |
| Custom Hooks | 5 |
| Storage Buckets | 4 |
| Custom Enums | 9 |
| Database Indexes | 15 |

---

## Key Design Decisions

1. **Layered Service Architecture**: API routes are thin, services contain all business logic
2. **Standardized API Response Format**: `{ data: T }` or `{ error: { code, message, details } }`
3. **Type-Safe DTOs**: Services return strongly-typed Data Transfer Objects
4. **Centralized Error Handling**: Custom `AppError` classes with consistent handling
5. **Structured Logging**: All logs in JSON format with scope/data/error
6. **Route-Based Authorization**: Next.js route groups + middleware + layout guards
7. **React Server Components**: Default server components, client only when needed
8. **Optimistic UI Updates**: TanStack Query handles optimistic mutations

---

## Document Cross-References

### Learning Path: Building a New Feature

1. **Planning**: [FEATURES_AND_MODULES.md](./FEATURES_AND_MODULES.md) - Check existing features
2. **Database**: [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Design schema changes
3. **Business Logic**: [BUSINESS_WORKFLOWS.md](./BUSINESS_WORKFLOWS.md) - Define workflow
4. **API Design**: [API_ARCHITECTURE.md](./API_ARCHITECTURE.md) - Plan endpoints
5. **Coding**: [CODE_STANDARDS_AND_PATTERNS.md](./CODE_STANDARDS_AND_PATTERNS.md) - Follow patterns
6. **Security**: [AUTHENTICATION_AND_AUTHORIZATION.md](./AUTHENTICATION_AND_AUTHORIZATION.md) - Add auth

### Debugging Path: Troubleshooting Issues

1. **Auth Issues**: [AUTHENTICATION_AND_AUTHORIZATION.md](./AUTHENTICATION_AND_AUTHORIZATION.md)
2. **API Errors**: [API_ARCHITECTURE.md](./API_ARCHITECTURE.md)
3. **Database Errors**: [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
4. **Workflow Issues**: [BUSINESS_WORKFLOWS.md](./BUSINESS_WORKFLOWS.md)
5. **Integration Failures**: [INTEGRATIONS.md](./INTEGRATIONS.md)

---

## Maintenance

### Updating Documentation

When making significant code changes, update relevant documentation:

- **New API route** → Update API_ARCHITECTURE.md endpoint inventory
- **Database migration** → Update DATABASE_SCHEMA.md migration history
- **New feature** → Update FEATURES_AND_MODULES.md
- **Auth changes** → Update AUTHENTICATION_AND_AUTHORIZATION.md
- **New integration** → Update INTEGRATIONS.md
- **Pattern changes** → Update CODE_STANDARDS_AND_PATTERNS.md

### Version History

- **v1.1** (2025-10-22): Wallet credit payment system documentation
  - Added wallet credit application workflow
  - Documented payment method selection modal
  - Updated API endpoints for credit management
  - Enhanced payment processing documentation
- **v1.0** (2025-10-21): Initial comprehensive documentation generation
  - Generated from codebase analysis
  - 8 documents covering all aspects
  - 9,680 total lines of documentation

---

## Contact & Support

For questions about this documentation:

1. **Code Questions**: Refer to CODE_STANDARDS_AND_PATTERNS.md
2. **Architecture Questions**: Refer to SYSTEM_OVERVIEW.md
3. **Feature Questions**: Refer to FEATURES_AND_MODULES.md

---

**Last Updated**: 2025-10-22
**Documentation Generator**: Claude Code Agent
**Codebase Version**: After wallet credit payment system implementation
