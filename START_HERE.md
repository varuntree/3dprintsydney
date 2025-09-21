# 3D Print Sydney – Start Here (One‑Command Setup)

This guide is for non‑technical users. Run a single command and the app will start locally.

## Prerequisites

- macOS or Windows (PowerShell/WSL) or Linux
- Node.js 20+ and npm installed
  - Check versions: `node -v` and `npm -v`

## One Command

1) Open a terminal in the project folder (the folder with `package.json`).
2) Run:

```bash
npm run up
```

What this does for you:
- Installs dependencies
- Creates local data folders (`./data/files` and `./data/pdfs`)
- Generates Prisma client
- Synchronizes the database schema (SQLite file at `./data/app.db`)
- Starts the app at http://localhost:3000

That’s it. Open your browser to http://localhost:3000.

## Optional (But Useful)

- Seed sample data (from a new terminal, with the app stopped):
  ```bash
  npm run db:seed
  ```

- Stripe online payments (optional):
  - In Settings → Integrations, paste your Stripe keys
  - Use “Test Stripe” to confirm

## Where Things Live

- Database (SQLite): `./data/app.db`
- Uploaded attachments: `./data/files/<invoiceId>/...`
- Generated PDFs: `./data/pdfs/...`

## Everyday Flows

- Quotes → Invoices → Payments → Jobs (auto‑creation can be configured in Settings → Job automation)
- Jobs board: drag between printers, start/pause/complete, select multiple and archive
- Dashboard: switch range (Today/7d/30d/YTD), paginate Recent Activity
- Reports: export Invoices/Payments/Jobs, plus AR Aging, Material Usage, Printer Utilization

## Troubleshooting

- “Command not found: npm” → Install Node.js (https://nodejs.org/)
- “Prisma schema mismatch / column does not exist” → Re‑run:
  ```bash
  npx prisma db push
  ```
- Port in use (3000) → Close other apps using 3000 or set `PORT=3001` before running:
  ```bash
  PORT=3001 npm run up
  ```
- File upload blocked → Check file type/size. Allowed: PDF, PNG, JPG, WEBP, TXT, ZIP. Max ~200MB.

## Production (optional)

For a local production preview:
```bash
npm install
npx prisma generate
npx prisma db push
npm run build
npm run start
```

## Need help?

If anything fails, copy the exact error and share it. The system writes clear logs for activity and errors.

