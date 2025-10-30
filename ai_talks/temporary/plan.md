# Conversation Cleanup Plan

- Date: 2025-10-30
- Time (UTC): 23:38

## Phase 1 Findings
- Admin portal embeds `Conversation` in the dedicated messages page (`src/app/(admin)/messages/page.tsx`). This should remain as the canonical admin conversation hub.
- Admin invoice detail view (`src/app/(admin)/invoices/[id]/page.tsx`) still renders a Messages card with the `Conversation` component tied to the invoice.
- Admin client detail surface (`src/components/clients/client-detail.tsx`) exposes a "Messages" tab that mounts `Conversation` when the client has a portal user.
- Client portal has the dedicated messages route (`src/app/(client)/client/messages/page.tsx`). This should remain as the canonical client conversation hub.
- Client order detail view (`src/app/(client)/client/orders/[id]/page.tsx`) still contains an embedded Messages card with the shared `Conversation` component.

## Phase 2 Do's
1. Remove the invoice-level `Conversation` card from the admin invoice detail page, including related imports and layout spacing adjustments.
2. Remove the "Messages" tab and associated `Conversation` usage from the admin `ClientDetail` component while preserving the rest of the tab navigation.
3. Remove the Messages card and `Conversation` mount from the client order detail page, keeping the remaining invoice information intact.
4. After code updates, verify that the dedicated admin and client messages pages still import and render the shared `Conversation` component.
5. Run the existing lint/test command suite (or at least `npm run lint`) to ensure no type or lint regressions.

## Additional Cleanup Notes
- Identified legacy messaging widgets (`src/components/messages/thread-panel.tsx` and `src/components/messages/sidebar.tsx`) that are no longer referenced after consolidating conversations. Safe to remove alongside their unused fetch logic to avoid confusion in future maintenance.
