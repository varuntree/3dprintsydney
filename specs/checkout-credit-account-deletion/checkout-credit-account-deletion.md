# Plan: checkout-credit-account-deletion

## Plan Description
Implement an explicit payment-selection workflow that lets clients decide how much account credit to apply before card authorization, ensure delivery fees update automatically from postcode inputs, give admins the ability to remove wallet credits, and design a compliant self-service account deletion pathway (with retention policy and updated Terms/Privacy). The work spans backend credit/payment services, client checkout UX (quick order + invoice payment), admin tooling, legal content, and a new account-deletion flow. Deliverables must prevent auto-debits, support split tender across all checkout surfaces, surface wallet balances clearly, and document the data-retention lifecycle.

## User Story
As a client user
I want to control how my account credits and card payments are applied while seeing accurate delivery costs and having the option to delete my account
So that I can check out confidently, understand fees, manage my privacy, and stay compliant with platform policies.

## Problem Statement
Currently the system auto-applies wallet credit during quick-order checkout, preventing clients from choosing card payments or partial credit usage. Delivery fees only resolve after manual pricing actions, so postcode edits don’t immediately update totals. Admins can add but not remove credits, and there’s no user-facing delete-account workflow or documented retention policy. These gaps block compliance, confuse users, and create accounting discrepancies.

## Solution Statement
Introduce a unified payment-intent model that stores the client’s chosen credit amount alongside card payments, disable automatic credit deductions, and reuse the PaymentMethod modal with a numeric selector wherever checkout occurs. Extend quick-order to calculate shipping instantly as postcode/state change, persist wallet balances visibly on checkout + account pages, and create admin tooling/APIs for reversing credits. For privacy compliance, add a deletion workflow (reauth → warnings → export → confirmation) that schedules data purge/anonymization, updates Terms/Privacy, and emails confirmations.

## Pattern Analysis
- **Modal-first payment orchestration**: `src/components/client/payment-method-modal.tsx:21-210` already handles credit/card branching with optimistic UI; extend this pattern to support arbitrary credit amounts and reuse it across quick-order + invoice flows instead of bespoke logic.
- **Quick-order multi-step UX**: `src/app/(client)/quick-order/page.tsx:640-905` shows how steps, guardrails, and CTA state are wired; new pre-checkout credit selection should follow this state machine and button handling approach.
- **Shipping computation pipeline**: `src/server/services/quick-order.ts:81-161` resolves state/postcode to shipping quotes; exposing this logic via a lean API keeps client logic simple while preserving server validation.
- **Credit accounting services**: `src/server/services/credits.ts:18-215` centralizes balance updates, RPC usage, and logging—new admin deduction endpoints and partial-application helpers should live here for transactional consistency.
- **Client wallet surfacing**: `src/components/client/invoice-payment-section.tsx:22-70` demonstrates how wallet balances are fetched and displayed near CTAs; replicate this pattern for quick-order checkout + account summary cards.
- **Admin client management conventions**: `src/components/clients/client-detail.tsx:300-420` and `src/components/clients/add-credit-modal.tsx:24-198` show how manage actions, dialogs, and React Query invalidations are structured; mirror this for the “remove credit” flow.
- **Account settings layout**: `src/app/(client)/client/account/page.tsx:1-70` uses tabbed cards for profile/security settings; the delete-account UX should ship as another card within the Security tab for consistency.

## Dependencies
### Previous Plans
- None explicitly referenced; this plan stands alone but must respect the multi-document tender platform architecture defined in `/Users/varunprasad/code/prjs/tendercreator/tendercreator/ai_docs/documentation/PRD.md`.

### External Dependencies
- Supabase Auth/Admin APIs for reauthentication, user deletion, and RPC calls
- Stripe Checkout for card payments (split tender relies on linking to existing sessions)

## Relevant Files
Use these files to implement the task:

- `ai_docs/documentation/CONTEXT.md` – Project goals, UI constraints, and Gemini/Supabase standards that govern all new features.
- `ai_docs/documentation/PRD.md` – Defines workflows (multi-document tender, credit usage expectations) that must remain intact.
- `ai_docs/documentation/standards/coding_patterns.md` – Enforces Tailwind/shadcn patterns, retry logic, and JSON prompt conventions.
- `ai_docs/documentation/standards/system-architecture.md` – Details layer boundaries to follow when adding services/routes.
- `ai_docs/documentation/standards/data-schema.sql` – Baseline schema; extend it for payment preferences and deletion scheduling.
- `ai_docs/documentation/standards/integration-contracts.md` – API contracts; ensure new endpoints align with logging/error conventions.
- `src/server/services/quick-order.ts` – Shipping calculation, invoice creation, and (currently auto) credit application logic.
- `src/app/(client)/quick-order/page.tsx` – Client checkout wizard requiring new wallet selector & auto-updating delivery fees.
- `src/components/client/payment-method-modal.tsx` & `src/components/client/pay-online-button.tsx` – Existing payment selector UI to extend for precise credit amounts and reuse in quick-order.
- `src/server/services/credits.ts` & `src/app/api/clients/[id]/credit/route.ts` – Credit RPC wrappers/APIs; add deduction endpoints and partial-application helpers here.
- `src/components/clients/client-detail.tsx` & `src/components/clients/add-credit-modal.tsx` – Admin UI patterns for wallet adjustments; add “remove credit” modal next to “Add Credit.”
- `src/app/(client)/client/account/page.tsx` plus components under `src/components/account/*` – Base for adding Delete Account UI and wallet visibility.
- `src/app/api/auth/*` & `src/server/services/auth.ts` – Reuse password validation and Supabase admin actions during account deletion.
- `src/app/(public)/**` layout/footer files – Surfaces to link updated Terms & Privacy pages.
- `.claude/commands/test_e2e.md` – Read to understand the required E2E testing workflow expectations.
- `.claude/commands/e2e/test_basic_query.md` – Review as the template for the new E2E scenario file you will create.

### New Files
- `specs/checkout-credit-account-deletion/checkout-credit-account-deletion_implementation.log` – Running log of implementation decisions per validation instructions.
- `.claude/commands/e2e/test_checkout_credit_account.md` – Detailed E2E workflow validating credit selection, shipping updates, and account deletion UX.
- `src/app/(public)/legal/terms/page.tsx` & `src/app/(public)/legal/privacy/page.tsx` – Public legal pages documenting retention policy and linked from UI.
- `supabase/migrations/<timestamp>_payment_preferences_and_account_deletion.sql` – Schema changes for payer choice, credit usage logs, and deletion scheduling tables.

## Acceptance Criteria
- Checkout never auto-deducts wallet credit; clients explicitly choose between “card only,” “credit only,” or a custom split, and that choice is persisted on both invoice and order records.
- Quick-order checkout shows current wallet balance, a numeric/slider control to choose credit amount, and a delivery fee that refreshes immediately when postcode/state changes—total updates before payment authorization.
- Split tender works end-to-end: credits apply server-side up to the requested amount, then Stripe handles the remainder without duplicate invoices.
- All client-facing checkout entry points (quick-order CTA, orders list, order detail) show the same intermediary payment modal and wallet balance.
- Admins can remove/deduct credits via UI + API, with audit logging similar to add-credit flows.
- Account settings include a delete-account flow (reauth → warnings → data export → confirmation) that schedules purge, anonymizes PIIs after retention, blocks logins, and emails confirmations.
- Terms of Service & Privacy Policy are updated to describe credit handling, retention timelines, deletion promises, and linked from relevant UI.
- E2E instructions exist for the new workflow, covering credit selection, shipping refresh, and account deletion initiation.

## Step by Step Tasks

**EXECUTION RULES:**
- Execute ALL steps below in exact order
- Check Acceptance Criteria - all items are REQUIRED
- Do NOT skip UI/frontend steps if in acceptance criteria
- If blocked, document and continue other steps

### 1. Consolidate requirements & model updates
- Reconcile user stories with PRD/legal constraints; document chosen retention window (e.g., invoices retained 7 years, PII purged after 30 days) in implementation log.
- Design DB additions: invoice `payment_preference` (enum/card/credit/split), `credit_requested_amount`, optional `delivery_quote_snapshot`, and new `account_deletion_requests` table storing userId, requestedAt, effectiveAt, status, anonymized email, and retention notes.
- Define audit trail table/fields for admin credit deductions (reuse `credit_transactions` but ensure reason codes support “admin_deduction”).
- Plan API surfaces for: `/api/clients/[id]/credit/deduct`, `/api/account/delete-request`, `/api/account/export`, `/api/shipping/quote` (or extend price endpoint), and quick-order payment intent endpoints.

### 2. Update Supabase schema & server models
- Create migration adding new columns/enums and the `account_deletion_requests` table plus indexes for scheduled purges.
- Update server DTOs/types in `src/lib/types/invoices.ts`, `src/server/services/invoices.ts`, and `src/server/services/quick-order.ts` to read/write new fields.
- Extend `credit_transactions` RPC or service to store deduction reasons and link to invoices/admin IDs.
- Implement service helpers: `applyWalletCredit(invoiceId, amountRequested)` (caps by balance), `recordPayerPreference(invoiceId, choice, amount)`, `scheduleAccountDeletion(userId, reason, effectiveAt)`.

### 3. Backend endpoints & background logic
- Add `/api/invoices/[id]/apply-credit` support for custom amounts (validate <= wallet & <= balance, require explicit payload) and stop implicit credit application in `createQuickOrderInvoice`.
- Create `/api/clients/[id]/credit/deduct` (admin-only) calling `deductClientCredit` and logging.
- Add `/api/account/delete-request` (reauth required) that validates password, stores request, queues anonymization job, emails confirmation, and revokes sessions.
- Provide `/api/account/export` to bundle invoices/orders per retention promise, leveraging existing invoice export logic.
- New `/api/shipping/quote` (or extend quick-order pricing route) returning shipping quote for given postcode/state plus current totals; throttle & validate input.
- Create cron/task placeholder (script or Supabase scheduled function) to process pending deletion requests (anonymize PII, detach auth user, retain invoices with anonymized client reference).

---
✅ CHECKPOINT: Steps 1-3 complete (Data & Backend). Continue to step 4.
---

### 4. Quick-order checkout UX refresh
- Introduce a payment review panel in `src/app/(client)/quick-order/page.tsx` when users click “Place Order”: show wallet balance, slider/input for credit amount (bounded by wallet & subtotal), delivery fee summary, and final total before confirming.
- Hook postcode/state inputs to debounce-call the shipping quote endpoint and merge results into `priceData` so totals refresh instantly.
- Feed selected credit amount + payer preference into the checkout request (`/api/quick-order/checkout`) so invoices store metadata without auto deductions.
- If credit < total, open Stripe with remaining balance automatically once invoice created; display success state if credit fully covers.

### 5. Reuse payment modal across client surfaces
- Update `PaymentMethodModal` and `PayOnlineButton` to accept wallet balance + optional default credit amount, show numeric input (with validation & helper text) instead of fixed radio-only logic, and persist selections via new API payloads.
- Ensure orders list/detail pages pass latest wallet balance and reflect applied credits after payment (refresh data or mutate SWR/cache).
- Surface wallet balance + credit selection summary inside quick-order confirmation screen as well for continuity.

### 6. Admin credit management enhancements
- Add a “Remove Credit” action next to “Add Credit” in `client-detail.tsx`, launching a new modal mirroring `AddCreditModal` (but calling the deduct endpoint, enforcing reason/note entry, showing projected balance).
- Update React Query invalidations so wallet balance + activity feed refresh after deductions.
- Extend credit history UI (if present) or add a log snippet showing last adjustments for transparency.

---
✅ CHECKPOINT: Steps 4-6 complete (Frontend Payment Flows). Continue to step 7.
---

### 7. Account deletion UX & enforcement
- In the client Account → Security tab, add a Delete Account card describing retention policy, linking to data export, and requiring password re-entry + confirmation toggles before enabling deletion.
- Wire the UI to the new API: reauth user via `/api/auth/login`-style endpoint, create deletion request, sign out user, and show email sent confirmation.
- Update middleware/session checks to deny login for users with pending deletion status (return explanatory error).
- Document retention policy (durations, what data is anonymized vs deleted) in Terms/Privacy and link these pages in footers + account screen.
- Mirror the detailed deletion workflow (flow steps, retention timing, admin overrides) inside project documentation (`ai_docs/documentation/CONTEXT.md` or PRD appendix) so future contributors see the same implementation description.

### 8. Legal content & communications
- Build `terms` + `privacy` public pages using existing marketing layout, covering: wallet credit usage rules, split payments, retention/deletion timelines, and support contact for edge cases.
- Update footer/layout components to link to these pages and mention deletion policy near account deletion UI.
- Add transactional email template (or placeholder) for deletion confirmations referencing effective date; ensure data stored for support overrides.
- Update internal documentation (`ai_docs/documentation/PRD.md` and related standards) with the same implementation details (payment choice logic, credit removal ability, deletion assurances) so written specs stay in sync with code.

### 9. E2E test plan & documentation
- Read `.claude/commands/test_e2e.md` and `.claude/commands/e2e/test_basic_query.md` for format, then draft `.claude/commands/e2e/test_checkout_credit_account.md` covering: quick-order with partial credit + postcode update, invoice payment with zero credit fallback, and account deletion initiation (include screenshots placeholders per guidelines).
- Outline prerequisites (test user with wallet credit) and verification steps (credit deduction values, Stripe redirect, deletion blocker messaging).

### 10. Validation commands & manual QA
- Run lint, typecheck, targeted unit tests (credits/services), and any new integration tests.
- Execute manual QA for quick-order flow, invoice payment modal, admin credit deduction, and account deletion, logging findings in the implementation log.
- Follow the E2E instructions file to validate end-to-end scenarios and capture evidence for reviewers.

---
✅ CHECKPOINT: Steps 7-10 complete (Compliance & Validation). Project ready for review.
---

## Testing Strategy
### Unit Tests
- `credits.test.ts`: cover partial credit application, admin deduction validation, and error cascades from Supabase RPCs.
- `quick-order.service.test.ts`: ensure shipping quote recalculations respect postcode prefixes and that invoices persist payer preferences without auto credit.
- `account-deletion.service.test.ts`: verify scheduling, retention cutoffs, and status transitions (requested → scheduled → purged).

### Edge Cases
- Wallet balance smaller than desired credit usage (input clamps and informative messaging).
- Shipping regions missing postcode coverage; ensure fallback defaults and UI warnings.
- Account deletion requested while invoices unpaid; confirm policy (retain invoices, block login) and communicate to user.
- Admin attempts to deduct more credit than available; error surfaces cleanly with zero state corruption.

## Validation Commands
Execute every command to validate the task works correctly with zero regressions.

1. `npm run lint` → should finish with “✔ No ESLint warnings or errors.”
2. `npm run typecheck` → should exit 0 with no TypeScript errors.
3. `npm run build` → ensures Next.js compiles after schema/UI changes.
4. `npm run test credits` (or targeted vitest/jest command) → new credit/account deletion unit tests pass.
5. Read `.claude/commands/test_e2e.md`, then read and execute `.claude/commands/e2e/test_checkout_credit_account.md` to validate quick-order flow, payment modal, and account deletion, capturing noted artifacts.

# Implementation log created at:
# specs/checkout-credit-account-deletion/checkout-credit-account-deletion_implementation.log

## Definition of Done
- [ ] All acceptance criteria met
- [ ] All validation commands pass with expected output
- [ ] No regressions (existing tests still pass)
- [ ] Patterns followed (documented in Pattern Analysis)
- [ ] E2E test created and passing (if UI change)

## Notes
- Coordinate with finance/legal stakeholders to confirm retention duration before finalizing policy text.
- Ensure Stripe metadata reflects payer preference for reconciliation.

## Research Documentation
- None (no external research agents engaged beyond referenced project docs).
