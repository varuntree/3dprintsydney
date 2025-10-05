# Checklists

## Implementation Checklist
- [x] 1.1 Add `invoiceId` to `UserMessage` model
- [x] 1.2 Add message indexes
- [x] 1.3 Generate migration + Prisma client
- [x] 2.1 Implement `requireInvoiceAccess`
- [x] 2.2 Guard `/api/invoices/[id]` (GET/PUT/DELETE)
- [x] 2.3 Guard invoice subroutes (attachments, payments, mark-paid/unpaid, stripe-session)
- [x] 3.1 Add `src/app/client/orders/[id]/page.tsx`
- [x] 3.2 Build read-only client invoice view
- [x] 3.3 Add right-side messages/activity panel
- [x] 4.1 Update client orders links
- [x] 4.2 Update quick-order redirect by role
- [x] 5.1 Extend `/api/messages` GET `?invoiceId=`
- [x] 5.2 Extend `/api/messages` POST `{ invoiceId? }`
- [x] 5.3 Create shared UI components (conversation + threads panel)
- [x] 5.4 Replace ad-hoc message UIs with shared components
- [x] 6.1 New `/api/invoices/[id]/activity` (paged)
- [x] 6.2 Wire activity tab UI
- [x] 7.1–7.3 Quick Order UI polish (states, fallback badges, errors)
- [x] 8.1–8.2 Slicer UX warnings/queued state
- [x] 9.1 Docs update (developer doc)
- [x] 9.2 `.env.example` slicer vars
- [ ] 10.1 Remove legacy message UIs
- [ ] 10.2 Ensure all client invoice links use client paths

## Review Checklist
- [ ] Alignment with acceptance criteria
- [ ] Correctness of auth guards and scoping
- [ ] Simplicity (minimal new abstractions)
- [ ] Maintainability (clear boundaries; shared components)
- [ ] Observability: logs on critical paths (messages, slicer, checkout)
- [ ] Quality gates pass: typecheck, build, lint/format, audit
- [ ] No secrets in code; env placeholders only
- [ ] Dead/duplicate code removed; no toggles left
- [ ] Docs updated (auth, routes, slicer config)
- [ ] Minimal manual smoke steps defined and reproducible
