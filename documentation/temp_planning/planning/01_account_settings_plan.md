# Issue 1: Account Settings UI Integration - Implementation Plan

## Objective
Fix broken account settings pages for both Admin and Client portals by integrating them properly into their respective shells with sidebar navigation.

## Solution Approach
Move the root-level `/account` page into the `(admin)` and `(client)` route groups to leverage existing shell layouts. Create role-specific account pages that automatically inherit sidebar, header, and proper styling.

---

## Implementation Steps

### Step 1: Create Admin Account Page (30 min)
**File**: `/src/app/(admin)/account/page.tsx`

```typescript
import { requireAdmin } from "@/lib/auth-utils";
import { ChangePasswordForm } from "@/components/account/change-password-form";

export default async function AdminAccountPage() {
  const user = await requireAdmin();

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account security and preferences
        </p>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-4">Security</h2>
          <ChangePasswordForm email={user.email} />
        </section>

        {/* Future: Add admin-specific settings */}
        {/* - API keys, audit log, security settings */}
      </div>
    </div>
  );
}
```

**Why**: This page will automatically be wrapped by AdminShell (from layout.tsx), giving it the sidebar and header.

---

### Step 2: Create Client Account Page (30 min)
**File**: `/src/app/(client)/account/page.tsx`

```typescript
import { requireClient } from "@/lib/auth-utils";
import { ChangePasswordForm } from "@/components/account/change-password-form";

export default async function ClientAccountPage() {
  const user = await requireClient();

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account security and contact information
        </p>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-4">Security</h2>
          <ChangePasswordForm email={user.email} />
        </section>

        {/* Future: Add client-specific settings */}
        {/* - Profile info, notification preferences */}
      </div>
    </div>
  );
}
```

**Why**: This page will automatically be wrapped by ClientShell, providing consistent navigation.

---

### Step 3: Delete Old Root Account Page (5 min)
**File**: `/src/app/account/page.tsx`

**Action**: DELETE this file completely

**Alternative** (if concerned about breaking links):
```typescript
import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/auth-utils";

export default async function AccountRedirectPage() {
  const user = await getOptionalUser();

  if (!user) {
    redirect("/login");
  }

  // Redirect based on role
  if (user.role === "ADMIN") {
    redirect("/account");  // Will resolve to (admin)/account
  } else {
    redirect("/account");  // Will resolve to (client)/account
  }
}
```

**Recommendation**: Delete completely since route groups will handle the routing automatically.

---

### Step 4: Update Shell Components (10 min)

**No changes needed** - Links already point to `/account`:
- `/src/components/layout/admin-shell.tsx` - Links to `/account` (works due to route group)
- `/src/components/layout/client-shell.tsx` - Links to `/account` (works due to route group)

**How it works**: Next.js route resolution prioritizes routes within the same route group, so:
- Admin clicks `/account` → Resolves to `(admin)/account/page.tsx`
- Client clicks `/account` → Resolves to `(client)/account/page.tsx`

---

### Step 5: Verify Change Password API (5 min)
**File**: `/src/app/api/auth/change-password/route.ts`

**Check**: Confirm it uses `requireAuth()` (any role) ✓

**Current implementation**:
```typescript
export async function POST(request: NextRequest) {
  const user = await requireAuth(request);  // ✓ Works for both
  // ... handles password change
}
```

**Status**: No changes needed - works for both roles

---

### Step 6: Optional - Add Account to Sidebar Nav (15 min)

**File**: `/src/lib/navigation.ts`

Currently, "Account settings" is only in the user profile dropdown at the bottom. Optionally add it to main navigation:

```typescript
// In OWNER_NAV_SECTIONS (admin):
{
  title: "Settings",
  items: [
    { title: "Business Settings", href: "/settings", icon: Settings },
    { title: "Account", href: "/account", icon: User },  // NEW
  ]
}

// In CLIENT_NAV_SECTIONS (client):
{
  title: "Account",
  items: [
    { title: "My Account", href: "/account", icon: User },  // NEW
  ]
}
```

**Recommendation**: Skip for now - keep in user profile dropdown only to avoid sidebar clutter.

---

## Testing Plan

### Manual Testing Checklist
- [ ] **Admin Portal**:
  - [ ] Log in as admin
  - [ ] Click "Account settings" in sidebar user profile
  - [ ] Verify sidebar remains visible
  - [ ] Verify header remains visible
  - [ ] Verify page has consistent styling
  - [ ] Test change password functionality
  - [ ] Verify success toast notification

- [ ] **Client Portal**:
  - [ ] Log in as client
  - [ ] Click "Account settings" in sidebar user profile
  - [ ] Verify sidebar remains visible
  - [ ] Verify header remains visible
  - [ ] Verify page has consistent styling
  - [ ] Test change password functionality
  - [ ] Verify success toast notification

- [ ] **Navigation**:
  - [ ] Direct URL access: `/account` (admin) → admin account page
  - [ ] Direct URL access: `/account` (client) → client account page
  - [ ] Breadcrumbs work correctly
  - [ ] Back navigation works

- [ ] **Old Route**:
  - [ ] Confirm `/app/account/page.tsx` deleted
  - [ ] No broken links
  - [ ] No console errors

### Edge Cases
- [ ] Unauthenticated user accessing `/account` → Redirects to login
- [ ] Client accessing admin routes → Redirects to `/client`
- [ ] Admin accessing client routes → Redirects to `/`

---

## Files Changed Summary

### Created
- `/src/app/(admin)/account/page.tsx` - Admin account page
- `/src/app/(client)/account/page.tsx` - Client account page

### Deleted
- `/src/app/account/page.tsx` - Old shared account page

### No Changes Needed
- `/src/components/account/change-password-form.tsx` - Reused as-is
- `/src/components/layout/admin-shell.tsx` - Links already correct
- `/src/components/layout/client-shell.tsx` - Links already correct
- `/src/app/api/auth/change-password/route.ts` - Already works for both
- `/src/app/(admin)/layout.tsx` - Already wraps with AdminShell
- `/src/app/(client)/layout.tsx` - Already wraps with ClientShell

---

## Estimated Effort
- **Development**: 1.5 hours
- **Testing**: 30 minutes
- **Total**: 2 hours

---

## Success Criteria
✅ Admin account page integrated with AdminShell (sidebar + header visible)
✅ Client account page integrated with ClientShell (sidebar + header visible)
✅ Change password works for both admin and client
✅ No broken navigation links
✅ Consistent styling with rest of portal
✅ Old root account page removed
✅ No console errors or warnings

---

## Future Enhancements
- Add admin-specific settings (API keys, security settings, audit log)
- Add client-specific settings (profile info, notification preferences, contact details)
- Add tabs for multiple account sections
- Add avatar upload
- Add email verification status
- Add two-factor authentication settings
