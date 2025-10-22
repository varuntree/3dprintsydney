# Issue 1: Account Settings UI Integration - Exploration Summary

## Problem Statement
Both Admin and Client portals have broken account settings pages that lack proper sidebar integration and consistent UI. The current `/account` page exists outside route groups and renders without shell components.

## Current Implementation

### File Locations
- **Root Account Page**: `/src/app/account/page.tsx` - Shell-less, shared for both roles
- **Admin "Me" Page**: `/src/app/(admin)/me/page.tsx` - Just redirects, non-functional
- **Admin Settings**: `/src/app/(admin)/settings/page.tsx` - Works correctly (business settings)
- **Client Portal**: No dedicated account page
- **Change Password Form**: `/src/components/account/change-password-form.tsx` - Works for both roles
- **Admin Shell**: `/src/components/layout/admin-shell.tsx` - Provides sidebar/header
- **Client Shell**: `/src/components/layout/client-shell.tsx` - Provides sidebar/header

### What's Broken

1. **Layout Issues**
   - `/account` page NOT in `(admin)` or `(client)` route groups
   - Renders without AdminShell or ClientShell
   - No sidebar, header, or consistent styling
   - Users lose navigation context when accessing account

2. **Navigation Issues**
   - Both shells link to `/account` which has no shell
   - Creates jarring UX - sidebar disappears on click

3. **No Role-Specific Features**
   - Single page for both ADMIN and CLIENT
   - No role-specific account settings
   - Admins only get basic password change

## Current Authentication Flow

### API Endpoints
- **`POST /api/auth/change-password`**: Works for both roles via `requireAuth()`
- **`GET /api/auth/me`**: Returns user profile for any authenticated user

### Auth Utilities
- `requireAuth()` - Any authenticated user
- `requireAdmin()` - Admin only, redirects CLIENT to `/client`
- `requireClient()` - Client only, redirects ADMIN to `/`

## Shell Integration Pattern

### Admin Layout (`/src/app/(admin)/layout.tsx`)
- Uses `requireAdmin()` for validation
- Wraps content in `AdminShell`
- Sidebar includes: Dashboard, Clients, Quotes, Invoices, Jobs, etc.
- User profile section at bottom with "Account settings" link

### Client Layout (`/src/app/(client)/layout.tsx`)
- Uses `requireClient()` for validation
- Wraps content in `ClientShell`
- Sidebar includes: Home, Quick Order, Orders
- User profile section with "Account settings" link

## Reusable Components

### Change Password Form
- **File**: `/src/components/account/change-password-form.tsx`
- **Type**: Client component
- **Features**: Form validation, loading states, toast notifications
- **Status**: Works for both roles, can be reused

### Form Patterns
- React Hook Form + Zod validation
- `LoadingButton` for async operations
- Sonner toast notifications
- Standard UI components from `/src/components/ui/`

## Key Findings

1. **Architecture**: Route groups `(admin)` and `(client)` work correctly for role separation
2. **Root Cause**: Shared `/account` page designed before role separation
3. **Impact**: Users lose sidebar/header when viewing account settings
4. **Fix Complexity**: LOW - Just move page into appropriate route groups
5. **Backwards Compatibility**: URLs change from `/account` to role-specific paths

## Files Referenced
- `/src/app/(admin)/layout.tsx`
- `/src/app/(client)/layout.tsx`
- `/src/app/(admin)/settings/page.tsx`
- `/src/app/account/page.tsx`
- `/src/components/layout/admin-shell.tsx`
- `/src/components/layout/client-shell.tsx`
- `/src/components/account/change-password-form.tsx`
- `/src/app/api/auth/change-password/route.ts`
- `/src/lib/auth-utils.ts`
- `/src/lib/navigation.ts`
