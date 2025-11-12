# Plan: Cleanup TypeScript Surface

## Plan Description
Surface TypeScript warnings/errors across admin invoice/quote pages and API handlers by exporting the missing `InvoiceFormValues` type, ensuring optional data is normalized, and aligning API handlers to the Next.js 15 `request` signature. Cleaning these will let `npx tsc --noEmit` pass and prevent runtime regressions that slip past `next build`.

## User Story
As a developer
I want the TypeScript build to succeed with zero errors
So that production builds remain trustworthy and IntelliSense catches regressions

## Problem Statement
`npx tsc --noEmit` currently fails with dozens of errors (missing exports, undefined strings, missing enum fields, and stale `req` variables) across invoice/quote pages and API routes, masking real bugs and breaking CI when type checking is reinstated.

## Solution Statement
Export the shared `InvoiceFormValues` type, normalize optional props in the invoice and quote admin pages, add the required `lineType` metadata to quote lines, and update all `route.ts` handlers to accept `NextRequest request` so call sites use the proper typed variable. Then rerun the full typecheck/build to confirm zero errors.

## Pattern Analysis
- Invoice editor exports (lines 1-110) define `InvoiceFormValues` locally but never re-export; the page imports it and expects it to be public (`src/components/invoices/invoice-editor.tsx:1-200`).
- Admin pages read `project?.client?.name` etc but expect strings, so we must safely coalesce missing values to `""` (see `src/app/(admin)/invoices/[id]/page.tsx:120-160` and `src/app/(admin)/quotes/[id]/page.tsx:80-110`).
- Quote line builders rely on the `QuoteLineInput`/`calculatorBreakdown` definitions from `src/lib/types/quotes.ts`; lineType must be filled for `QUOTES` and `NEW` flows.
- API routes already use Next.js 15 `request` patterns in other files (e.g., `src/app/api/clients/route.ts`)—copy that structure (async handlers, logging) into `src/app/api/attachments/[id]/route.ts` and `/src/app/api/clients/[id]/*/route.ts`.

## Dependencies
### Previous Plans
- `specs/fixes/critical-bugs/critical-bugs.md` – built the bug fixes we are stabilizing; no direct dependencies beyond understanding the affected areas.

### External Dependencies
- None (pure TypeScript edits).

## Relevant Files
Use these files to implement the task:
- `src/components/invoices/invoice-editor.tsx` – ensure `InvoiceFormValues` is exported and matches what admin pages expect.
- `src/app/(admin)/invoices/[id]/page.tsx` and `src/app/(admin)/invoices/new/page.tsx` – normalize optional strings (client, job, contact) and update imports.
- `src/app/(admin)/quotes/[id]/page.tsx` and `/quotes/new/page.tsx` – ensure quote lines always include `lineType` and optional strings are defaulted.
- `src/lib/types/quotes.ts` – verify `lineType` type and reuse if needed.
- `src/app/api/attachments/[id]/route.ts` plus `/src/app/api/clients/[id]/*.route.ts` – replace `req` usages with `request`, ensure Next.js request behaviors.

### New Files
_None._

## Acceptance Criteria
- [ ] `InvoiceFormValues` is exported from `src/components/invoices/invoice-editor.tsx` and used consistently.
- [ ] The admin invoice/quote pages handle undefined strings (e.g., client/job name) without `string | undefined` errors.
- [ ] Quote lines now include `lineType` (PRINT/MODELLING) in both edit and create flows.
- [ ] Every API route in `/src/app/api/attachments/[id]` and `/src/app/api/clients/[id]/...` accesses `request` only (no stray `req`).
- [ ] `npx tsc --noEmit` and `npm run build` succeed without the previous TypeScript errors.

## Step by Step Tasks
**EXECUTION RULES:**
- Execute ALL steps below in exact order
- Check Acceptance Criteria - all items are REQUIRED
- Do NOT skip UI/frontend steps if in acceptance criteria
- If blocked, document and continue other steps

### 1. Export InvoiceFormValues
- Update `src/components/invoices/invoice-editor.tsx` to export `InvoiceFormValues` (matching the shape the admin pages expect).
- Ensure any helper types used in invoices (e.g., `InvoiceLineInput`) remain consistent.
- Update admin invoice pages to import from the component and adjust props if needed.

### 2. Normalize missing admin strings
- In `src/app/(admin)/invoices/[id]/page.tsx` and `/invoices/new/page.tsx`, coerce possibly undefined strings (client name, job reference, etc.) before passing to components.
- In `src/app/(admin)/quotes/[id]/page.tsx` and `/quotes/new/page.tsx`, guarantee required string props are defaulted (e.g., use `?? ""`).
- Verify there are no `string | undefined` mismatches remaining in those files.
---
✅ CHECKPOINT: Steps 1-2 complete (Admin views normalized). Continue to step 3.
---

### 3. Add missing lineType metadata for quotes
- Identify where quote lines are mapped (probably in `src/app/(admin)/quotes/[id]/page.tsx` and `/new/page.tsx`).
- Ensure every quote line object includes `lineType: "PRINT"` or `"MODELLING"` (matching the data source) before passing into typed arrays.
- Update any helper functions/types if needed so `lineType` is a required field.

### 4. Fix API routes to use `request`
- For `src/app/api/attachments/[id]/route.ts`, replace references to `req` with the handler parameter (e.g., rename `req` to `request`, or destructure as needed).
- Repeat for `/src/app/api/clients/[id]/credit/route.ts`, `/note`, `/route.ts` (GET/DELETE/PUT), ensuring `request` is consistently used and `NextResponse` attaches cookies via `attachSessionCookies` where required.
- Confirm no other `req` tokens remain in those files.
---
✅ CHECKPOINT: Steps 3-4 complete (Quote data + API signature updated). Continue to step 5.
---

### 5. Revalidate and document
- Run `npx tsc --noEmit` expecting zero errors.
- Run `npm run build` to confirm Next.js builds cleanly.
- Record the results in `specs/cleanup-typescript/cleanup-typescript_implementation.log`.
- If any steps fail, iterate and re-run the problematic commands until both pass, then document the success.

## Testing Strategy
### Unit Tests
- Not applicable (type-only refactor).

### Edge Cases
- Missing client/job names in invoices should default to `""` without breaking the UI.
- Quote lines built from calculators should still show `lineType` even if the backend returns null/undefined.

## Validation Commands
- `npx tsc --noEmit` (EXPECTED: zero TypeScript errors, previous list cleared).
- `npm run build` (EXPECTED: Next.js optimized build succeeds, no missing request errors).

**E2E Testing Strategy:**
- Not required (type/logic fixes only).

# Implementation log created at:
# specs/cleanup-typescript/cleanup-typescript_implementation.log

## Definition of Done
- [ ] All acceptance criteria met
- [ ] All validation commands pass with expected output
- [ ] No regressions (existing tests still pass)
- [ ] Patterns followed (documented in Pattern Analysis)
- [ ] E2E test created and passing (if UI change)

## Notes
- Focused TypeScript cleanup; no backend logic or new API surface introduced.
- After these changes, `npx tsc --noEmit` should become part of routine validation again.

## Research Documentation
- None
