# Bug: Admin Messages Shows Empty State Before Loading on Conversation Select

## Bug Description
On the admin messages page (`/messages`), when clicking a user conversation from the roster, the conversation area immediately shows "No messages yet. Start the conversation!" for a brief moment before showing the loading skeleton and then the actual messages. The client side (`/client/messages`) works correctly and shows loading immediately.

Expected behavior:
1. Click user in roster
2. Show loading skeleton immediately
3. After fetch, show messages or empty state

Actual behavior on admin:
1. Click user in roster
2. Shows "No messages yet" empty state immediately
3. Brief flash, then loading skeleton appears
4. Then messages load

Client side works correctly - shows loading immediately.

## Problem Statement
The `Conversation` component is mounted fresh each time a user is selected (due to `key={selectedConversation.id}` prop). On initial mount, the component's initial state has `loading=true`, but React's rendering cycle causes the empty state condition `messages.length === 0 && !loading && !error` to evaluate to true before the loading state is properly initialized, resulting in a flash of empty state.

The issue is React-specific: The component's initial state declares `loading=true`, but during the first render cycle, the condition evaluation happens before state is fully established, or there's a render frame where the state hasn't propagated.

## Solution Statement
Initialize `loading` state to `true` is correct, but we need to add an additional guard state that prevents the empty state from showing until after the first fetch attempt completes. Add a `hasAttemptedLoad` flag that starts as `false` and only becomes `true` after the first fetch completes (success or error). The empty state should only show when `hasAttemptedLoad=true && !loading && !error && messages.length === 0`.

## Steps to Reproduce
1. Navigate to `/messages` (admin side) in browser
2. Click on any user in the conversation roster
3. Observe the conversation area on the right
4. Notice "No messages yet. Start the conversation!" flashes briefly
5. Then loading skeleton appears
6. Then actual messages load (if any exist)

Compare to client side:
1. Navigate to `/client/messages`
2. Observe it shows loading skeleton immediately
3. No flash of empty state

## Root Cause Analysis
The original code:
```tsx
const [loading, setLoading] = useState(true); // Line ~125

// Loading skeleton - Line ~707
{messages.length === 0 && loading && (

// Empty state - Line ~720
{messages.length === 0 && !loading && !error && (
```

The issue: On admin side, the component uses `key={selectedConversation.id}` which causes React to fully unmount and remount the component when switching conversations. During the remount:

1. Component declares initial state with `loading=true`
2. React schedules first render
3. **First render happens** - JSX evaluates conditions
4. At this point, `messages.length === 0` (empty array), `loading` might not be `true` yet in this render frame, `!error` is true
5. Empty state condition `messages.length === 0 && !loading && !error` evaluates to `true`
6. Empty state renders
7. Next render cycle, `loading=true` is established, loading skeleton shows

The root cause is that the empty state has no guard against showing before any load attempt has been made. On client side, it works because the component mounts once and stays mounted, so the initial `loading=true` state is in place before the first JSX evaluation.

## Relevant Files
Use these files to fix the bug:

### `src/components/messages/conversation.tsx`
- Contains the `Conversation` component
- Line ~125: State initialization with `loading` state
- Line ~707: Loading skeleton render condition
- Line ~720: Empty state render condition
- Need to add guard state to prevent empty state before first load attempt completes

## Step by Step Tasks

### Add hasAttemptedLoad guard state
- Add new state: `const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);` after line ~125 with other state declarations
- This flag tracks whether we've completed at least one fetch attempt (success or failure)

### Update fetchMessages to set hasAttemptedLoad
- In the `fetchMessages` function's `finally` block (around line ~400), add `setHasAttemptedLoad(true);`
- This ensures the flag is set after first fetch attempt regardless of success/failure
- Only set it when `!background` to ensure it's set for user-initiated loads

### Update empty state condition
- Change empty state condition from: `messages.length === 0 && !loading && !error &&`
- To: `messages.length === 0 && hasAttemptedLoad && !loading && !error &&`
- This prevents empty state from showing until after first fetch attempt completes

### Reset hasAttemptedLoad on conversation change
- In the effect that resets state when `invoiceId` or `userId` changes (around line ~440-450)
- Add `setHasAttemptedLoad(false);` alongside other state resets
- This ensures each new conversation starts fresh

## Validation Commands
Execute every command to validate the bug is fixed.

```bash
# Check TypeScript compilation
npx tsc --noEmit

# Check linting
npm run lint

# Manual testing:
# Start dev server
npm run dev

# ADMIN SIDE TEST:
# 1. Navigate to http://localhost:3000/messages
# 2. Click on a user in the conversation list
# 3. Verify loading skeleton shows IMMEDIATELY (no empty state flash)
# 4. Wait for messages to load
# 5. Verify messages display correctly
# 6. Click on a different user
# 7. Verify loading skeleton shows again (no empty state flash)
# 8. Test with a user that has NO messages
# 9. Verify loading skeleton shows first, then empty state after load completes

# CLIENT SIDE TEST (should still work):
# 1. Navigate to http://localhost:3000/client/messages
# 2. Verify loading skeleton shows immediately
# 3. Wait for messages to load
# 4. Verify messages display correctly
```

## Notes
- The client side works because the Conversation component mounts once without a `key` prop, so initial `loading=true` state is established before first render
- The admin side remounts the component on each user selection due to `key={selectedConversation.id}`, causing the initialization race condition
- Adding `hasAttemptedLoad` guard is safer than relying on `loading` state timing, as it explicitly tracks fetch lifecycle
- This fix is minimal and surgical - only adds guard state and updates one condition
- The guard state pattern is common in React for preventing UI states from showing before async operations complete
- No new dependencies needed
