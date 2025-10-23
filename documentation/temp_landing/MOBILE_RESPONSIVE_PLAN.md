## Navigation & Route Inventory

### Admin portal

- **Quick actions (New Quote, New Invoice, New Client)** – All surfaced in the shell header/drawer via `QUICK_ACTIONS`, pointing at `/quotes/new`, `/invoices/new`, and `/clients/new` (which currently redirects to `/clients?new=1`).

- **Dashboard (`/dashboard`)** – Server route hydrates `DashboardView`, which renders header metrics, performance charts, operations summaries, and activity feeds in several flex/grid sections.

- **Catalog → Materials (`/dashboard/materials-admin`)** – Lists materials through `MaterialsView`, combining metric cards, table, and management dialog.

- **Catalog → Products (`/products`)** – `ProductsView` manages product templates with metric cards, data table, and modal editor.

- **Catalog → Printers (`/printers`)** – `PrintersView` renders printer metrics, status badges, and CRUD dialog over a table layout.

- **Clients (`/clients`)** – `ClientsView` drives a table-based directory, aggregate stats, and modal creation flow fed by query params; detail lives at `/clients/[id]` in `ClientDetail` (tabs for invoices, quotes, jobs, notes, messaging) with `/clients/new` redirecting into the modal flow.

- **Quotes (`/quotes`)** – `QuotesView` mirrors the invoices UI with status tabs and table, while `/quotes/new` & `/quotes/[id]` host the full editor/viewer pairing.

- **Invoices (`/invoices`)** – `InvoicesView` provides summary cards, tabs, and tabular data; `/invoices/new` initializes `InvoiceEditor`, and `/invoices/[id]` swaps between editor and read-only panels plus attachments, payments, and conversation.

- **Jobs (`/jobs`)** – `JobsBoard` exposes the kanban-style column layout, summary cards, and edit sheet for job management.

- **Operations → Messages (`/messages`)** – Two-pane messaging inbox (user list + conversation) pulling in the shared `Conversation` component.

- **Operations → Reports (`/reports`)** – Range picker, export metrics, and export actions across a responsive grid.

- **Operations → Settings (`/settings`)** – Wraps `SettingsForm`, a tabbed multi-section business configuration form.

- **Additional admin pages** – Account security at `/account`, user invitations & management at `/users`, and the `/me` redirect helper.

### Client portal

- **Home (`/client`)** – `ClientDashboard` aggregates stats, quick actions, recent orders, jobs, and embedded messaging prompts.

- **Quick Order (`/quick-order`)** – Multi-step upload, orientation, configuration, pricing, and checkout workflow with 3D viewer integration.

- **Orders (`/client/orders`)** – Mobile card + desktop table list of invoices with wallet-aware payment button, pagination, and student discount badges; `/client/orders/[id]` shows invoice detail, production status timeline, payment section, and conversation.

- **Account (`/client/account`)** – Password management form mirroring the admin account experience.

- **Messages redirect (`/client/messages`)** – Sends visitors back to `/client` now that messaging lives on the dashboard.

### Shared layout components

- **Portal shells** – `AdminShell` and `ClientShell` drive sidebar, header, and main content spacing, while `NavigationDrawer` loads role-specific sections and quick actions for mobile.

- **Navigation link helper** – `NavigationLink` centralizes active state, router integration, and touch target sizing.

## Responsive optimization plan

- [x] **Normalize admin/client shell responsiveness** – Update `AdminShell`, `ClientShell`, and supporting layout tokens to: Introduce breakpoint-aware `px`/`py` spacing and `gap` utilities so content gains breathing room on narrow viewports (e.g., clamp-based padding); replace the fixed sidebar `ScrollArea` sizing with `flex` containers that let profile actions anchor to the bottom while preventing empty gutters; add min-height guardrails for large phones; audit `NavigationDrawer` and `NavigationLink` styles to keep touch targets ≥44px and apply consistent padding, ensuring quick actions scroll horizontally without clipping; validate both portals in mobile emulation, adjusting background colors/border radii to eliminate the “blank footer” feel at the bottom of the navigation stack.

- [x] **Refine admin navigation and quick-action UX** – Replace the `/clients/new` redirect with a dedicated creation page (or shallow route) so quick actions and navigation deliver full-page forms instead of forcing modal state; introduce a shared quick-action layout that collapses to icon-only chips on small screens and defers secondary actions into sheet sections to avoid cramped drawers; ensure `useNavigation` transitions still work with the new routes by updating `NavigationLink` handling if necessary; add regression coverage for keyboard and screen-reader navigation in both sidebar and drawer contexts.

- [x] **Introduce responsive patterns for admin data screens** – Define reusable “card list” variants for tables (stacked rows with key metrics & action affordances) and apply them to major listings under `src/components/*`; wrap any remaining tables in `overflow-x-auto` containers with caption cues, ensuring sticky headers degrade gracefully on touch devices; rework JobsBoard’s header controls into collapsible groups on xs breakpoints and enforce horizontal scroll for columns while maintaining accessible drag-and-drop affordances; update Reports’ two-column grid to stack on small widths, aligning buttons beneath the calendar for easier tapping; verify focus states and empty states remain visible once layouts switch to single-column flows.

- [x] **Responsive overhaul for editors and settings** – Add breakpoint-aware grid utilities (e.g., swap `md:grid-cols-2` for `grid-cols-1` on `sm`) and convert multi-column sections into collapsible fieldsets on phones; introduce floating action areas (sticky footers or top bars) for primary CTAs like “Save Invoice” so users don’t scroll endlessly to submit; refine Quick Order stepper by exposing a compact progress header, grouping configuration controls into accordions, and ensuring 3D viewer controls stay usable on narrow screens; ensure dialogs used for client/material/product creation gain full-width behavior on mobile, perhaps promoting them to dedicated routes where modals become unwieldy; revisit validation messaging to avoid layout jumps when lines wrap in smaller viewports.

- [x] **Responsive messaging experience** – Refactor `AdminMessagesPage` to stack panes vertically on mobile with a toggle or drawer for the user list, ensuring avatar sizing and spacing remain legible; adjust `Conversation` to use viewport units responsibly (e.g., `min-h` + flex) instead of a rigid `calc(100vh-300px)` so input areas remain visible above the keyboard; add safe-area padding for mobile browsers and ensure load-more / send actions remain reachable without horizontal scrolling; test both admin and client message contexts to confirm consistent behavior after layout changes.

- [x] **Optimize client portal mobile flows** – Streamline `ClientDashboard` hero sections (alerts, student discount cards, quick actions) into collapsible panels and ensure cards wrap cleanly at `sm` and below; enhance `ClientOrdersPage` mobile cards with clearer affordances (status chips, CTA buttons) while reducing redundant totals; align the table header for tablets; tighten the `/client/orders/[id]` summary grid so financial blocks stack gracefully, and convert the production status timeline into a vertically scrolling stepper suited for touch; revisit Quick Order’s checkout summary to align pricing totals, wallet usage, and buttons in a readable vertical sequence; validate payment components (wallet vs. checkout) across discount scenarios to avoid clipped badges or overflowing text.

