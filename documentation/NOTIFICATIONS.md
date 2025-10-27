# Notifications Overview

The application shells now include a lightweight notifications dropdown located in the top-right corner. This dropdown lists the most recent user messages (latest 10) for the authenticated account. The list refreshes whenever a page navigation or browser reload occurs; there is no background polling or realtime subscription.

- **Component:** `src/components/notifications/notification-dropdown.tsx`
- **Hook:** `src/hooks/useShellNotifications.ts`
- **Usage:** Embedded inside both `admin-shell.tsx` and `client-shell.tsx`
- **Data source:** `/api/messages?limit=10&order=desc`
- **Unread state:** Tracked locally per user via `localStorage` (`notifications:lastSeen:<userId>`)
- **CTA:** Each item links to the respective messages index (`/admin/messages` or `/client/messages`)

To adjust capacity (default 10 items) or copy, update the hook constants and component strings respectively.

