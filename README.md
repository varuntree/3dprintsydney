# 3D Print Sydney Console

Internal operations console for a boutique 3D printing business. The app streamlines quoting, invoicing, payments, job scheduling, client records, and attachments while keeping everything local-first (Next.js + SQLite).

## Feature Coverage (current build)

### Completed

- **Settings** – Business identity, numbering prefixes, tax rates, payment terms, shipping options, calculator defaults, plus job automation guidance (ON_INVOICE vs ON_PAYMENT) and activity logging. Stripe checkout keys now live in the hard-coded legacy config and are no longer edited here.
- **Catalog** – Materials, product templates (fixed or calculated pricing), printers. Product templates integrate with the calculator and printers expose status & capacity notes.
- **Clients** – Directory with search stats, detail view with activity timeline, notes, linked quotes/invoices/jobs, and per-client job status email preference.
- **Quotes** – Full lifecycle (draft/pending/accepted/declined/converted) with a high-contrast read-only view, top-level actions (send/accept/decline/convert/duplicate/PDF), quick Edit toggle, and calculator-driven line items.
- **Invoices** – Read-only view with status/due/payment-term chips, Stripe controls, list badge when a payment link exists, manual payments (add/remove) with balance recalculation, attachments (upload/download/delete), revert/void/write-off, and Edit mode on demand.
- **Stripe payments** – Legacy checkout session flow restored with the hard-coded secret key, webhook handler kept permissive (no signature checks), list badges for linked invoices, and activity logging.
- **Jobs & queue management** – Auto-create jobs from policy, printer board with drag/drop, expanded status actions, client-facing timeline, optional notifications, and activity logging.
- **Client portal** – Dashboard with prominent quick order CTA, recent orders/jobs, messaging, and a persisted job-status email toggle.
- **Dashboard & reporting** – KPI metrics, revenue trend, outstanding invoices, printer load, recent activity feed, CSV exports.
- **File/PDF infrastructure** – Local storage under `data/`, Puppeteer-based PDF generator, attachment streaming endpoints.
- **Quality gates** – `npm run lint`, `npm run format`, `npm run typecheck`, `npm run build`, and `npm run audit` all passing as of the latest run.

### In Progress / Planned

- **Documentation polish** – Final README/README_RUN/OPERATIONS, manual smoke steps, release notes once features land.

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### One-time setup & run

```bash
npm install
npm run prisma
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to explore the console.

> All application state lives under `data/` – remove the folder to reset the environment (database, generated PDFs, and attachments).

### Useful scripts

- `npm run dev` – Next.js dev server
- `npm run lint` – ESLint (must remain warning-free)
- `npm run format` / `npm run format:write` – Prettier check/fix
- `npm run typecheck` – TypeScript project-wide type validation
- `npm run build` – Production build (runs lint/typecheck internally)
- `npm run audit` – npm security audit
- `node --import tsx scripts/smoke.ts` – Headless smoke test (creates a client/quote/invoice, records payment, verifies job + CSV exports, and then cleans up)

### Stripe checkout (legacy flow)

The current build mirrors the original app: Stripe keys are hard-coded in `src/server/config/stripe-legacy.ts` and Checkout sessions are generated automatically when an invoice PDF is requested. No UI exists to change the keys, and the webhook endpoint accepts notifications without signature verification (matching the legacy behaviour). Update the config file locally if you need to swap in different credentials.

Invoices still support manual payments regardless of Stripe availability.

## Local Data Model

- **SQLite** – `data/app.db` (Prisma migrations manage schema).
- **Files** – `data/files/<invoiceId>/` attachment payloads saved per invoice/quote.
- **PDFs** – `data/pdfs/` generated quote/invoice PDFs.
- **Cache & tmp** – any additional helper folders get created under `data/` at runtime.

> Keep the entire `data/` directory out of version control. Back up or remove it to migrate between environments; deleting the folder resets the app to a clean slate.

## Test the Current Flows

- Settings → adjust business details, numbering prefixes, calculator defaults, and confirm the toast/Activity log entry.
- Catalog → create/edit materials, product templates (use calculator for calculated templates), printers.
- Clients → add a client, open detail view, log an internal note, verify activity timeline.
- Quotes → create a quote with template + manual line items, download the PDF, update status, duplicate, convert to invoice.
- Invoices → open the converted invoice, edit line items, add manual payments, upload/remove attachments, download PDF.
- Client portal → log in as a client, toggle job status emails in the header, reload to confirm the preference persists, and open an order to review the production timeline.

Remaining backlog: documentation polish and deeper automation guardrails (see `docs/build/02_plan.md`).

## Project Structure

### Route Group Architecture (Updated October 2025)

The application uses Next.js 15 route groups for clean portal separation:

```
src/
├── app/
│   ├── (admin)/              # Admin portal (requireAdmin in layout)
│   │   ├── layout.tsx       # AdminShell wrapper with navigation
│   │   ├── page.tsx         # Dashboard
│   │   ├── clients/         # Client management
│   │   ├── invoices/        # Invoice management
│   │   ├── quotes/          # Quote management
│   │   ├── jobs/            # Job scheduling & queue
│   │   ├── materials/       # Material catalog
│   │   ├── printers/        # Printer management
│   │   ├── products/        # Product templates
│   │   ├── messages/        # Admin messaging hub
│   │   ├── users/           # User management
│   │   ├── reports/         # Analytics & exports
│   │   └── settings/        # Business settings
│   ├── (client)/            # Client portal (requireClient in layout)
│   │   ├── layout.tsx       # ClientShell wrapper
│   │   ├── client/
│   │   │   ├── page.tsx     # Client dashboard
│   │   │   ├── orders/      # View invoices & payments
│   │   │   └── messages/    # Client messaging
│   │   └── quick-order/     # Self-service ordering
│   ├── (public)/            # Public routes
│   │   ├── login/           # Authentication
│   │   └── signup/          # Registration
│   └── api/                 # API routes (all secured)
├── components/
│   ├── layout/              # AdminShell, ClientShell
│   ├── messages/            # WhatsApp-style messaging
│   └── ui/                  # shadcn components
├── lib/
│   ├── auth-utils.ts        # Server Component auth
│   ├── nav-utils.ts         # Navigation helpers
│   └── chat/                # Message grouping logic
├── server/
│   ├── auth/
│   │   ├── session.ts       # Session management
│   │   ├── api-helpers.ts   # API authorization
│   │   └── permissions.ts   # Invoice/attachment access
│   ├── services/            # Domain services
│   ├── pdf/                 # PDF generation
│   └── files/               # File storage
└── middleware.ts            # Edge route protection
```

### Security Architecture

**Three-Layer Security:**
1. **Middleware** (`/middleware.ts`) - Edge protection, routes CLIENT users away from admin areas
2. **Layout Auth** (route group layouts) - Server-side user resolution, no role flicker
3. **API Authorization** (65/65 routes secured) - `requireAdmin`, `requireUser`, `requireInvoiceAccess`

**User Roles:**
- `ADMIN` - Full access to all management features, analytics, and settings
- `CLIENT` - Access to own invoices, quick-order, and messaging only

See `/MIGRATION_SUMMARY.md` for complete architecture documentation.

## Contributing / Next Steps

- Finish the outstanding slices listed above.
- Keep docs (`docs/build/`) in sync with progress.
- Maintain clean lint/typecheck/build before landing new code.
- Extend the activity log as new flows (jobs, Stripe) are added.

Let me know when you need the next feature slice or deployment packaging – the remaining backlog items are captured in `docs/build/02_plan.md` and `status/state.json`.
