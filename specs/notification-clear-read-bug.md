# Bug: Notifications "Clear Read" Resurfaces Messages

## Bug Description
In both the admin and client shells, the notifications dropdown in the top-right corner correctly shows the most recent user messages for the authenticated account. When the user clicks **Mark all as read**, the notifications visually transition to an "inactive" / read state as expected, but they remain listed in the dropdown. However, when the user clicks **Clear read**, the read notifications disappear only briefly and then reappear in the list. This makes it impossible to permanently clear read notifications from the dropdown and leads to confusion because the user expects cleared items to stay gone. The issue happens consistently for both admin and client roles and can reoccur after simple UI interactions such as reopening the dropdown or navigating to another page.

## Problem Statement
Ensure that the **Clear read** action in the notifications dropdown permanently hides read notifications for the current user (within that browser) so they do not reappear after re-renders, dropdown reopenings, or page navigations, while keeping the existing unread/mark-as-read semantics consistent for both admin and client shells and without changing the underlying `/api/messages` data model.

## Solution Statement
Refactor the notification state flow so there is a single source of truth for which notifications are considered visible vs. cleared. The `useShellNotifications` hook should own all notification state (including "last seen"/read and "cleared" state) and persist the relevant parts in `localStorage` using the existing `notifications:lastSeen:<userId>` key (and, if necessary, a closely related key) instead of relying on transient component-level filtering. The `notification-dropdown` component should become a thin view layer that renders whatever the hook exposes and forwards user actions (Mark all as read, Clear read) back into the hook. The **Clear read** logic should update the persisted notification state in a way that guarantees cleared read items are filtered out whenever the hook derives its `visibleNotifications`, so they cannot be reintroduced by subsequent renders, navigation, or message list refetches.

## Steps to Reproduce
1. Ensure dependencies are installed and start the dev server with `npm run dev` (as documented in `documentation/TESTING.md`), serving the app on `http://localhost:3000`.
2. Sign in as the admin test user (`admin@test.3dprintsydney.com` / `TestPass123!`) and navigate to any admin page that shows the top-level shell (e.g. the admin dashboard).
3. If there are no recent messages, use the messaging UI to send a message to or from the admin account so that at least one notification appears in the dropdown.
4. Open the notifications dropdown in the top-right corner and verify that the recent messages are listed and at least one appears as unread.
5. Click **Mark all as read** and confirm that all notifications become visually inactive/read but remain listed in the dropdown.
6. Click **Clear read** and observe that the read notifications disappear from the dropdown.
7. Wait a moment, reopen the dropdown (or perform a simple navigation that causes a shell re-render), and observe that the same read notifications reappear in the dropdown instead of remaining cleared.
8. Repeat the same flow using the client test user (`client@test.3dprintsydney.com` / `TestPass123!`) in the client portal; the behaviour is the same, indicating the bug is in the shared notification state rather than a role-specific view.

## Root Cause Analysis
Based on the documentation and the observed behaviour, the notifications feature is implemented as a lightweight dropdown backed by `/api/messages?limit=10&order=desc`, with unread state tracked per user via `localStorage` under the key `notifications:lastSeen:<userId>` (`documentation/NOTIFICATIONS.md`). The most plausible failure mode is that there are two competing sources of truth for notification visibility:

- The `useShellNotifications` hook, which fetches the latest messages and derives unread state based on the `lastSeen` value from `localStorage`.
- The `notification-dropdown` component, which likely maintains its own internal list of notifications (via `useState` / `useEffect`) and applies a local filter when the user clicks **Clear read**.

In this arrangement, **Mark all as read** correctly updates the persisted `lastSeen` value (or an equivalent persisted marker), so unread badges and counts behave as expected after re-renders and navigations. However, **Clear read** is probably implemented only as a local filter in the dropdown (e.g. `setItems(items.filter(item => !item.isRead))`) without updating the persisted notification state in `localStorage` or in the hook. When React re-renders, when the hook re-derives its data (e.g. due to TanStack Query refetches), or when the shell layout re-mounts on navigation, the dropdown reinitializes its internal list from the hook data, which still contains the full set of messages. As a result, the previously cleared read notifications reappear in the dropdown, causing the observed "disappears briefly then comes back" behaviour. Because both admin and client shells embed the same dropdown and hook, the bug is shared across roles.

In short, the root cause is that **Clear read** manipulates only ephemeral component state and does not update the persisted notification state controlled by `useShellNotifications` and `localStorage`, allowing cleared notifications to be reintroduced whenever the underlying data is re-derived.

## Relevant Files
Use these files to fix the bug:

- `documentation/NOTIFICATIONS.md`  
  - Describes the notifications dropdown, data source (`/api/messages`), and unread state persistence via `notifications:lastSeen:<userId>`.
- `documentation/CODE_STANDARDS_AND_PATTERNS.md`  
  - Defines the layered architecture, hook/component patterns, and general guidelines that the notification hook and dropdown should follow.
- `documentation/SYSTEM_OVERVIEW.md`  
  - Provides overall architecture context (admin/client shells, shared components) relevant to understanding how notifications are embedded in the layout.
- `documentation/FEATURES_AND_MODULES.md`  
  - Documents the messaging and notification-related features for both admin and client portals, confirming that the dropdown is shared across roles.
- `src/hooks/useShellNotifications.ts`  
  - Core hook that fetches messages from `/api/messages`, reads/writes `notifications:lastSeen:<userId>` from `localStorage`, and exposes notification data and actions to the shells.
- `src/components/notifications/notification-dropdown.tsx`  
  - UI component that renders the notifications dropdown, wires up the Mark all as read and Clear read actions, and currently likely maintains its own local list of notifications.
- `src/components/layout/admin-shell.tsx`  
  - Admin shell layout that includes the notifications dropdown; must continue to work correctly after refactoring the notification state flow.
- `src/components/layout/client-shell.tsx`  
  - Client shell layout that includes the notifications dropdown; must share the same behaviour and not duplicate notification state.
- `check-notifications.ts`  
  - Script to quickly verify notification loading and basic behaviour from the command line; useful for sanity-checking changes to the hook or dropdown.
- `debug-notifications.ts`  
  - Debugging script for notifications, likely exercising mark-as-read and clear-read flows to expose state issues.
- `verify-notification-persistence.ts`  
  - Verification script focused on ensuring notifications persist and behave correctly across reloads and navigation; should pass after fixing the Clear read behaviour.
- `verify-notification-polling.ts`  
  - Verification script to ensure notifications are not incorrectly reintroduced by background polling or unexpected refetch patterns.
- `verify-notification-routing.ts`  
  - Verification script that validates notification behaviour across admin/client routing and shells, ensuring the fix is applied consistently.
- `verify-messaging.ts`  
  - Messaging verification script that can help confirm that changes to notification state do not break the underlying messaging flows.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Confirm current notification behaviour and persistence model
- Start the dev server with `npm run dev` and reproduce the bug for both admin and client users using the steps in **Steps to Reproduce**, verifying that **Clear read** causes notifications to disappear briefly and then reappear.
- With the browser devtools open, inspect `localStorage` for keys of the form `notifications:lastSeen:<userId>` before and after using **Mark all as read** and **Clear read` to understand which actions are currently persisted.
- Capture a short written summary (e.g. in the PR description) of how `lastSeen` and any other notification-related keys change across these actions to validate assumptions before modifying code.

### 2. Analyse notification hook and dropdown implementation
- Open `src/hooks/useShellNotifications.ts` and trace how it fetches messages from `/api/messages` and computes unread state, including how it reads and writes `notifications:lastSeen:<userId>` and what actions it exposes (e.g. `markAllRead`, `refresh`, etc.).
- Open `src/components/notifications/notification-dropdown.tsx` and identify how it consumes the hook (props, context) and how it implements the Mark all as read and Clear read event handlers.
- Look specifically for any component-local state that mirrors the hook data (e.g. `const [items, setItems] = useState(notifications)`) or `useEffect` blocks that reset local state from hook data, as these are likely responsible for reintroducing cleared notifications.

### 3. Design a single, persisted source of truth for notification visibility
- Decide how visibility should be derived from persisted state, using the existing `notifications:lastSeen:<userId>` key as the primary mechanism and introducing at most one additional key (e.g. `notifications:clearedAt:<userId>`) only if strictly necessary.
- Define exact rules for:
  - Which messages are considered unread vs. read (based on timestamps or IDs relative to `lastSeen`).
  - Which messages should be visible in the dropdown after **Mark all as read** (typically all 10 latest, but visually marked as read).
  - Which messages should remain visible after **Clear read** (typically only messages that are still considered unread/new according to the persisted state).
- Ensure the design does not require any backend or database changes and that it remains purely client-side and per-browser, consistent with `documentation/NOTIFICATIONS.md`.

### 4. Implement persisted Clear read behaviour in `useShellNotifications`
- Update `src/hooks/useShellNotifications.ts` so that the hook exposes a clear, single source of truth for the notifications list (e.g. `visibleNotifications`) derived from the fetched messages plus the persisted state (`lastSeen` and any additional key).
- Implement or update a `clearRead` (or equivalent) action in the hook that:
  - Updates the persisted state in `localStorage` (e.g. bumping `lastSeen` to the newest message timestamp or setting a `clearedAt` marker).
  - Immediately re-derives `visibleNotifications` so that read messages are filtered out at the hook level.
  - Ensures that any refetch or re-render that reuses the hook still respects the updated persisted state and does not reintroduce cleared messages.
- Make sure the hook’s public API (returned values and actions) is stable and typed clearly so both admin and client shells can consume it consistently.

### 5. Simplify the dropdown component to depend solely on the hook
- Refactor `src/components/notifications/notification-dropdown.tsx` so that it renders notifications directly from the hook’s derived list (e.g. `visibleNotifications`) without maintaining a separate local copy of the notifications array that can drift from the hook.
- Wire the **Mark all as read** and **Clear read** buttons to call the corresponding actions returned by `useShellNotifications` instead of implementing their own state manipulation logic.
- Remove or simplify any `useEffect` or `useState` logic whose only job is to mirror or filter the hook’s notification data; the component should be a thin view over the hook’s single source of truth.

### 6. Verify behaviour in admin and client shells
- With the updated hook and dropdown, run the application (`npm run dev`) and manually repeat the full sequence from **Steps to Reproduce** for both admin and client users.
- Confirm that:
  - **Mark all as read** still marks notifications as read (no unread indicators) but the items remain listed.
  - **Clear read** removes read notifications from the dropdown and they do not reappear when reopening the dropdown, navigating between pages, or reloading the browser.
- Re-check `localStorage` for `notifications:lastSeen:<userId>` (and any new key) to ensure the values are updated on **Clear read** and remain stable across navigation and reloads.

### 7. Run the Validation Commands
- In a clean terminal session, execute each command listed in **Validation Commands**.
- Confirm that each command completes without errors and that any output or logs confirm that notifications load correctly, that mark-as-read and clear-read behaviour is stable, and that no regressions appear in messaging or routing.

## Validation Commands
Execute every command to validate the bug is fixed. Run the same commands before and after applying the fix to confirm the change in behaviour.

- `npm install`  
  - Ensure all dependencies (including `tsx`) are installed before running scripts or the dev server.
- `npm run dev`  
  - Start the Next.js dev server on port 3000; used as the base for manual reproduction in the browser both before and after the fix.
- `npx tsx check-notifications.ts`  
  - Sanity-check script to confirm notifications can be fetched and basic state is wired correctly; should complete without errors.
- `npx tsx debug-notifications.ts`  
  - Debugging script to exercise mark-as-read and clear-read flows from the command line; before the fix it should reproduce the reappearing cleared notifications, and after the fix it should show stable behaviour.
- `npx tsx verify-notification-persistence.ts`  
  - Verification script to ensure notification state (including Clear read) persists correctly across re-renders and reloads; expected to fail or show incorrect behaviour before the fix and to pass after the fix.
- `npx tsx verify-notification-polling.ts`  
  - Script to confirm there is no unintended polling or refetch loop that reintroduces cleared notifications; should pass both before and after but helps catch regressions.
- `npx tsx verify-notification-routing.ts`  
  - Script to validate consistent notification behaviour across admin and client shells; ensures the Clear read semantics are uniform across roles after the fix.
- `npx tsx verify-messaging.ts`  
  - High-level messaging verification script to confirm that the underlying messaging flows still work correctly after changing notification state handling.

## Notes
- The fix should remain entirely on the client side, using `localStorage` for persistence as described in `documentation/NOTIFICATIONS.md`; no changes to the `/api/messages` endpoint or the database schema should be required.
- Focus on eliminating duplicate notification state between the hook and the dropdown component so that all visibility and read/cleared semantics flow from a single, persisted source of truth.
- Be mindful that both admin and client shells share the same notification infrastructure; avoid introducing role-specific branching in the hook unless absolutely necessary.
- No new libraries are expected to be required; if a new runtime dependency becomes necessary, add it via `uv add` and record the addition in this Notes section.
- The files `ai_docs/documentation/CONTEXT.md` and `ai_docs/documentation/PRD.md` referenced in higher-level instructions do not exist in this repository; the equivalent context has been taken from the generated documentation in the `documentation/` directory instead.

