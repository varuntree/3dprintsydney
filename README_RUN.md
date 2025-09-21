# Quick Run Guide

Follow these steps from a clean checkout to run the 3D Print Sydney console locally.

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Generate Prisma client & apply the baseline migration** (optional after the first install, Prisma generates automatically during build)

   ```bash
   npm run prisma
   npm run db:migrate
   npm run db:seed
   ```

3. **Start the development server**

   ```bash
   npm run dev
   ```

4. **Open the app** at [http://localhost:3000](http://localhost:3000).

5. **Common dev commands**
   - `npm run lint` – ESLint (must stay clean)
   - `npm run format` / `npm run format:write` – Prettier check/fix
   - `npm run typecheck` – TypeScript project-wide type validation
   - `npm run build` – Production build (runs lint/typecheck internally)
   - `npm run audit` – npm security audit

6. **Stripe setup (optional)**
   1. With the dev server running, open **Settings → Payments** and paste Stripe publishable/secret keys (test keys are fine).
   2. For automatic payment reconciliation, run `stripe listen --forward-to http://localhost:3000/api/stripe/webhook` in another terminal.
   3. When hosting somewhere other than `localhost`, set `APP_URL` before starting the server so redirect URLs point to the correct domain.
   4. Skip this step to keep manual payments only—Stripe is opt-in.

7. **Quick smoke check (optional)**
   - Run `node --import tsx scripts/smoke.ts` to exercise the quote → invoice → payment → job → CSV export flow. The script seeds temporary records and removes them when finished.

> Data lives under `data/` (SQLite DB, files, PDFs, temp folders). Back it up between environments or delete it to start with a fresh store.
