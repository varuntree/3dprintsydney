# System Design — 3D Print Sydney

## 1. Architectural Overview

- **Runtime**: Next.js App Router (Node.js) running locally; SSR/ISR not required. All server logic implemented via Route Handlers under `/src/app/api/*`.
- **Front-end**: React 19 with client components using TanStack Query for data fetching/mutations, Zustand for lightweight local UI state. UI composed from Shadcn ("shards") components styled with Tailwind CSS and custom theme tokens.
- **Persistence**: SQLite database (`data/app.db`) accessed via Prisma ORM. Data migrations managed with Prisma migrate. Number sequences stored in a `NumberSequence` table to ensure atomic document numbers.
- **File Storage**: Local filesystem directories under `data/`:
  - `data/files/<invoiceId>/` for attachments.
  - `data/pdfs/` for generated quote/invoice PDFs.
- **Background Processing**: Lightweight synchronous handling. Stripe webhooks handled via dedicated API routes; job auto-creation executed immediately on payment events. No external job queue required.
- **PDF Generation**: Route handlers invoke Puppeteer (headless Chromium) to render server-side HTML templates to PDF. PDFs stored on disk and metadata recorded in Activity log.
- **Logging & Telemetry**: Minimal console logging via custom logger returning structured JSON in dev; errors sanitized before returning to client. Activity log persisted in DB for user-visible history.

## 2. Module Boundaries

- `src/lib/` contains shared utilities: formatting, logging, currency/tax calculations, file helpers, zod schemas.
- `src/server/db/` exports Prisma client, repository helpers, and transaction utilities.
- `src/server/services/` encapsulate business workflows (quotes, invoices, payments, jobs, settings, attachments, exports).
- `src/server/pdf/` handles HTML templates and PDF rendering wrappers.
- `src/server/csv/` handles CSV export logic.
- `src/app/api/` defines RESTful-ish endpoints grouped by resource (CRUD, actions). Each handler validates with zod, interacts with services, returns typed responses.
- `src/app/(dashboard)/` holds page routes (dashboard, clients, quotes, invoices, jobs, materials, products, printers, settings, reports).
- `src/components/` contains UI primitives (shard wrappers, tables, forms, dialogs) and domain components (QuoteForm, InvoiceForm, JobBoard, etc.). Components use typed props and adopt consistent theme tokens.
- `src/hooks/` provides TanStack Query hooks (e.g., `useClients`, `useCreateQuote`) built atop `/api` endpoints.

## 3. Data & State Model

Prisma schema defines entities listed in merged spec. Selected relationships:

- `Client` 1—\* `Quote`, `Invoice`, `Job`, `ActivityLog`.
- `Quote` 1—\* `QuoteItem`; optional 1—1 relationship to `Invoice` (converted).
- `Invoice` 1—\* `InvoiceItem`, `Payment`, `Attachment`, `ActivityLog`, optional 1—1 `Job`.
- `Job` optional \*—1 `Printer` (each job sits in a printer queue or unassigned). Queue position stored as integer.
- `Settings` singleton row, `NumberSequence` keyed by `kind` (quote or invoice).
- `ActivityLog` references optional entity IDs; used for timeline queries filtered by client/invoice/etc.
- Monetary values stored as `Decimal` (Prisma) to avoid floating errors; formatting handled in UI.
- `calculatorConfig` JSON fields hold pricing formula parameters and per-item breakdowns.

## 4. API Surface

- **Settings**: `GET /api/settings`, `PUT /api/settings` with zod validation. Returns typed Settings DTO.
- **Clients**: `GET /api/clients`, `POST`, `GET/PUT/DELETE /api/clients/[id]`, `POST /api/clients/[id]/notes`.
- **Materials** & **Product Templates**: Similar RESTful endpoints with filtering query params.
- **Quotes**: CRUD plus `POST /api/quotes/[id]/status`, `POST /api/quotes/[id]/convert`, `POST /api/quotes/[id]/duplicate`, `GET /api/quotes/[id]/pdf`.
- **Invoices**: CRUD plus actions for payments, revert to quote, pdf generation, stripe session, mark unpaid.
- **Payments**: `POST /api/invoices/[id]/payments`, `DELETE /api/payments/[id]`, `POST /api/payments/stripe-webhook`.
- **Jobs**: `GET /api/jobs`, `POST /api/jobs/reorder`, `PATCH /api/jobs/[id]/status`, `PATCH /api/jobs/[id]`.
- **Printers**: CRUD endpoints plus `GET /api/printers/metrics`.
- **Attachments**: `POST /api/invoices/[id]/attachments` (multipart), `GET /api/attachments/[id]/download`, `DELETE /api/attachments/[id]`.
- **Dashboard**: `GET /api/dashboard` aggregated metrics & charts.
- **Exports**: `GET /api/export/invoices`, `GET /api/export/payments`, `GET /api/export/jobs` (CSV streams).
All responses shaped as `{ data, error }` with typed payloads. Error objects include `code`, `message`, optional `details`. 4xx for validation or missing, 5xx for unexpected.

## 5. UI Map

- **App Shell**: Left navigation sidebar (Dashboard, Clients, Quotes, Invoices, Jobs, Catalog (Materials, Products, Printers), Reports, Settings). Top bar with quick actions (New Quote, New Invoice, New Client).
- **Dashboard**: Metric cards, revenue chart, job chart, outstanding invoices table, activity feed list.
- **Clients**: Table view with search/filter, “New Client” button. Detail page composed of overview card, contact form, payment terms, notes, timeline (activity log with filters), associated documents tables.
- **Quotes**: List with status filter, create button. Detail page uses tabs (Summary, Items, Attachments (readonly), Activity). Quote editor uses multi-section form with live totals and calculator modal for computed items.
- **Invoices**: Similar structure; includes Payments tab and attachments manager. PDF preview button and “Mark Paid”/“Stripe Checkout” buttons.
- **Jobs**: Kanban/board style grouped by printer columns plus unassigned column; cards show priority, client, item summary, estimated hours. Job drawer for editing details and viewing history.
- **Printers**: Cards list with status toggle, capacity notes, quick metrics.
- **Materials & Products**: Table + drawers for editing; product form includes pricing type switch and calculator parameter inputs.
- **Settings**: Multi-tab form with preview watchers for numbering example, tax rates, calculator defaults etc.
- **Reports**: Section for CSV exports (date pickers).

Shared components include glass panels (Card with backdrop blur), toolbar, data tables, form controls (shadcn `Form`, `Input`, `Select`, `Combobox`, `Dialog`, `Sheet`), toasts, skeleton loaders.

## 6. State Management & Data Fetching

- TanStack Query handles server data; standard hooks per resource with query keys. Mutations invalidate relevant queries.
- React Hook Form with zod resolver used for forms, ensuring synchronous validation feedback.
- Zustand keeps ephemeral UI state (e.g., active drawers, modal toggles, board drag state) to avoid prop drilling.

## 7. Error Handling & Logging

- Route handlers wrap logic in try/catch; on error log via `logger.error({ scope, error: sanitizedError })` and return JSON with status message.
- Client-side toasts display friendly messages; forms highlight invalid fields.
- Activity log creation is part of services to ensure atomic persistence with domain changes.

## 8. Security & Privacy

- Single user, local environment; no auth. Still sanitize file uploads to avoid path traversal, validate MIME types, limit size.
- Stripe keys pulled from env only; absence hides Stripe controls.
- Files served via API ensuring path checks.

## 9. Deployment & Operations

- Local run via `npm run dev`. Build script `npm run build`, `npm run start` for production preview.
- Documentation in `/docs` guiding operations and maintenance.

## 10. Open Questions / Assumptions

- Assume PDF templates are minimal, monochrome, include necessary legal text; assets stored under `src/server/pdf/templates`.
- Stripe integration optional: provide manual toggle to mark payments when keys not provided.
- For CSV exports, use streaming to avoid memory issues though dataset expected small.
- For drag-and-drop, use `@dnd-kit` or `react-beautiful-dnd`? (Minimize deps; adopt `@dnd-kit/core` if necessary and document.)
