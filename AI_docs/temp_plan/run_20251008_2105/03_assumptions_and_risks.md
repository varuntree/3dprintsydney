# Assumptions & Risks — run_20251008_2105

## Assumptions
1. **Materials info destination** — No dedicated internal route exists; will link to `/materials` (admin) or external marketing page. Validation: confirm link resolves locally; document in tracker for stakeholder review.
2. **Next.js revalidation** — `revalidatePath` is available in current runtime (App Router, Node). Validation: run API handler in dev; if unsupported, fall back to incremental fetch invalidation (e.g., POST to internal API).
3. **Stripe configuration** — Legacy keys remain valid; unpaid invoices require new/refresh session before redirect. Validation: ensure API call handles missing config gracefully.
4. **Client list size manageable** — Modal with search is sufficient without server pagination. Validation: measure fetch size; ensure virtualization if performance degrades.
5. **Email notifications gated by `enableEmailSend`** — Toggle remains off in environments lacking SMTP; UI should communicate gating. Validation: inspect settings endpoint during manual smoke.

## Risks & Mitigations
- **Quick order refactor regression** — Complex state may break attachments. Mitigation: add targeted unitless checks (manual upload/remove/checkout) and inspect stored attachments.
- **Admin cache staleness** — Revalidation might miss secondary views. Mitigation: target all relevant paths (`/invoices`, `/jobs`, `/client/orders` as needed) and document.
- **Modal accessibility** — Custom picker must preserve keyboard navigation. Mitigation: reuse shadcn Dialog components and test keyboard flow.
- **Stripe session expiry** — Clients might click Pay after session stale. Mitigation: always request new session via refresh flag when invoking pay button.
- **Lint/build fallout from PDF dropdown removal** — Ensure all references replaced; run lint/build immediately after removal.
