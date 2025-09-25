# 3D Print Sydney Console

Internal operations console for a boutique 3D printing business. The app streamlines quoting, invoicing, payments, job scheduling, client records, and attachments while keeping everything local-first (Next.js + SQLite).

## Feature Coverage (current build)

### Completed

- **Settings** – Business identity, numbering prefixes, tax rates, payment terms, shipping options, calculator defaults, plus job automation guidance (ON_INVOICE vs ON_PAYMENT) and activity logging. Stripe checkout keys now live in the hard-coded legacy config and are no longer edited here.
- **Catalog** – Materials, product templates (fixed or calculated pricing), printers. Product templates integrate with the calculator and printers expose status & capacity notes.
- **Clients** – Directory with search stats, detail view with activity timeline, notes, and linked quotes/invoices/jobs.
- **Quotes** – Full lifecycle (draft/pending/accepted/declined/converted) with a high-contrast read-only view, top-level actions (send/accept/decline/convert/duplicate/PDF), quick Edit toggle, and calculator-driven line items.
- **Invoices** – Read-only view with status/due/payment-term chips, Stripe controls, list badge when a payment link exists, manual payments (add/remove) with balance recalculation, attachments (upload/download/delete), revert/void/write-off, and Edit mode on demand.
- **Stripe payments** – Legacy checkout session flow restored with the hard-coded secret key, webhook handler kept permissive (no signature checks), list badges for linked invoices, and activity logging.
- **Jobs & queue management** – Auto-create jobs from policy, printer board with drag/drop, status updates, activity logging.
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

Stripe checkout, jobs/queue, dashboard metrics, CSV exports, and final documentation are still pending; expect rapid iteration in those areas next.

## Project Structure Highlights

```
src/
  app/           # Next.js app routes (pages + API routes)
  components/    # shadcn-based UI components + feature views
  lib/           # util functions (currency, datetime, schemas, http helpers)
  server/        # Prisma services, file storage, PDF generator
  server/pdf/    # HTML renderers and Puppeteer wrapper
  server/files/  # local storage helpers
  server/services/# domain-specific service layers
```

## Contributing / Next Steps

- Finish the outstanding slices listed above.
- Keep docs (`docs/build/`) in sync with progress.
- Maintain clean lint/typecheck/build before landing new code.
- Extend the activity log as new flows (jobs, Stripe) are added.

Let me know when you need the next feature slice or deployment packaging – the remaining backlog items are captured in `docs/build/02_plan.md` and `status/state.json`.
