# Bug: Notification System Issues

## Bug Description
Four critical issues with notification system:

1. **High compute cost**: 5s polling with complex JOINs causes excessive database queries (720/hr per user), unsustainable on free plan
2. **No real-time updates**: Notifications don't appear until bell icon clicked or next poll cycle (5-10s delay)
3. **Wrong filtering**: Notifications show even when already on messages route, creating redundant alerts
4. **Mark-read race condition**: "Mark all read" button flashes - notifications disappear then reappear after few seconds

**Expected behavior**:
- Minimal database load
- Instant notification updates when messages sent
- No notifications when viewing messages route
- Mark-read immediately clears notifications permanently

**Actual behavior**:
- Expensive polling every 5s
- Notifications delayed until manual refresh or poll
- Notifications show even on messages route
- Mark-read clears then re-shows same notifications

## Problem Statement
Notification system has architectural flaws causing high cost, poor UX, and race conditions. Polling-based approach with aggressive intervals, inadequate route-based filtering, and concurrent state updates create unreliable notification delivery.

## Solution Statement
1. Reduce polling frequency from 5s to 30s baseline
2. Improve event-driven updates using existing window events
3. Filter ALL message notifications when on messages route (not just open conversation)
4. Fix race condition by preventing concurrent polling during mark-as-read operations
5. Eliminate double markAllSeen calls

## Steps to Reproduce

**Issue 1 (High cost):**
1. Login as admin
2. Open browser DevTools Network tab
3. Observe `/api/notifications` requests every 5 seconds

**Issue 2 (No real-time):**
1. Login as client in browser A
2. Login as admin in browser B
3. Send message from client → admin
4. Observe: Admin doesn't see notification until clicking bell or waiting 5-10s

**Issue 3 (Wrong filtering):**
1. Login as admin
2. Navigate to `/messages` route (conversation list)
3. Have client send message
4. Observe: Notification badge shows unread count even though already on messages

**Issue 4 (Mark-read race):**
1. Login as admin
2. Have 3 unread messages
3. Click bell icon (see 3 notifications)
4. Click "Mark all read"
5. Observe: Dropdown reloads, still shows 3 notifications
6. Click outside dropdown
7. Observe: Badge briefly disappears, then reappears with 3 notifications

## Root Cause Analysis

**Issue 1 - High compute cost:**
- `POLL_INTERVAL_MS = 5_000` in useShellNotifications.ts:8
- Polling runs continuously when logged in (lines 298-328)
- Admin queries include expensive JOIN: `users:users(email, clients:clients(name, company))`
- Separate query for `conversation_last_seen` table
- No caching or debouncing beyond 150ms event delay

**Issue 2 - No real-time:**
- System dispatches `messages:updated` event after send (conversation.tsx:628)
- But recipient browser doesn't dispatch this event
- Recipient relies on polling (5-10s intervals)
- Event listeners only trigger on same client that sent message
- Fetch guard prevents concurrent requests, blocking updates

**Issue 3 - Wrong filtering:**
- `isMessagesRoute` flag passed but only used for polling interval (useShellNotifications.ts:314)
- NOT used to filter notification items
- Only filters specific `?user=X` conversation (lines 150-156)
- When on `/messages` root without query param, `activeConversationId = null`
- All message notifications still fetch and display

**Issue 4 - Mark-read race:**
- "Mark all read" button calls `markAllSeen()` (notification-dropdown.tsx:138)
- Popover `onOpenChange(false)` ALSO calls `markAllSeen()` (line 85)
- Background polling runs concurrently (every 5s)
- Optimistic update sets `items: []` (useShellNotifications.ts:377)
- Concurrent polling fetch overwrites optimistic state with stale data
- No mutex preventing polling during mark-as-read operation
- Double markAllSeen calls waste API requests

## Relevant Files
Use these files to fix the bug:

- **src/hooks/useShellNotifications.ts** - Main notification hook with polling logic, mark-as-read, and event listeners. Needs: slower polling, better race condition handling, route-based filtering
- **src/components/notifications/notification-dropdown.tsx** - Bell icon UI component. Needs: remove double markAllSeen call, better state coordination
- **src/app/api/notifications/route.ts** - GET/PATCH endpoints for notifications. Possibly needs: response optimization
- **src/server/services/messages.ts** - `listNotificationsForUser` function with database queries. Needs: query optimization if possible

## Step by Step Tasks

### 1. Fix polling frequency and route-based disabling
- Change `POLL_INTERVAL_MS` from 5000 to 30000 (30s baseline)
- When `isMessagesRoute = true`, disable polling entirely (don't just double interval)
- Add comment explaining cost reduction rationale

### 2. Fix race condition in mark-as-read
- Add `markingSeenRef` flag in `useShellNotifications` to track mark-as-read in progress
- Prevent polling fetch when `markingSeenRef.current = true`
- Set flag before PATCH request, clear after response
- Ensure optimistic update completes before next poll allowed

### 3. Remove double markAllSeen call
- In `notification-dropdown.tsx`, remove `markAllSeen()` from `onOpenChange` close handler
- Only keep manual "Mark all read" button click
- Users must explicitly click button to mark read (better UX clarity)

### 4. Filter notifications when on messages route
- In `useShellNotifications`, check `isMessagesRoute` flag
- When `isMessagesRoute = true`, return empty notifications array immediately
- No need to fetch if already viewing messages
- Add early return before fetch in `fetchNotifications`

### 5. Optimize event-driven updates
- Ensure `messages:updated` event debounce stays at 150ms
- Add force refresh when returning to app (visibilitychange already exists)
- Consider increasing debounce to 300ms to reduce duplicate fetches

### 6. Run validation
- Start dev server
- Test all 4 scenarios in Steps to Reproduce
- Verify polling frequency reduced (check Network tab)
- Verify mark-as-read works without flashing
- Verify no notifications show on messages route
- Check no TypeScript errors

## Validation Commands
Execute every command to validate the bug is fixed.

```bash
# Check no TypeScript errors
npm run typecheck

# Start dev server for manual testing
npm run dev

# Manual tests:
# 1. Login as admin, check Network tab - should see /api/notifications max once per 30s (not on messages route)
# 2. On /messages route, verify polling stops entirely
# 3. Send message from client, verify admin sees notification within 30s OR on next page interaction
# 4. Click bell, click "Mark all read", verify notifications clear immediately and don't reappear
# 5. Navigate to /messages, verify bell badge clears (no notifications shown)
```

## Notes
- **Cannot use Supabase Realtime** - user on free plan, too expensive
- **Polling still needed** - no websocket alternative available within budget
- **30s polling acceptable** - notifications not time-critical, reduces queries from 720/hr to 120/hr (83% reduction)
- **Route-based filtering** - when viewing messages, polling disabled + notifications hidden = further cost reduction
- **Event system stays** - still useful for same-client updates (optimistic UI)
- **Mark-as-read UX change** - removing auto-mark on close gives users explicit control, reduces unintended mark-as-read
