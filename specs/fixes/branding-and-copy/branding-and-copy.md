# Plan: Branding and Copy Standardization

## Plan Description
Standardize branding terminology across the application by renaming "Quick Order" to "QuickPrint" and replacing "Order" terminology with "Project" in all customer-facing contexts. This creates consistent brand language that aligns with how customers think and makes the platform easier to explain in sales and support contexts.

## User Story
As a customer
I want consistent, clear terminology throughout the application
So that I can easily understand my workflow and navigate the platform without confusion

## Problem Statement
The current application uses inconsistent terminology:
- "Quick Order" as the product name, but customers and Alan want to call it "QuickPrint"
- "Order" is used in customer-facing UI, but "Project" better reflects how clients think about their work
- Mixed terminology creates confusion in sales conversations and customer support
- Internal service names can remain as-is (e.g., "print", "quick-order" in routes)

## Solution Statement
Perform a systematic find-and-replace operation across all customer-facing UI components, page titles, navigation labels, and copy text. Replace "Quick Order" with "QuickPrint" and "Order(s)" with "Project(s)" while maintaining internal route names and API endpoints for backward compatibility. Update documentation and business guide to reflect new terminology.

## Pattern Analysis
Based on exploration findings:

**Current Patterns:**
- API routes use kebab-case: `/api/quick-order/` (keep as-is)
- Type definitions use PascalCase: `QuickOrderPriceInput` (keep as-is)
- Service functions use camelCase: `quickOrder` (keep as-is)
- UI labels use natural language: "Quick Order", "Orders" (UPDATE THESE)
- Navigation uses display names: `{ name: "Quick Order", href: "/quick-order" }` (UPDATE name only)

**Files demonstrating patterns:**
- `/src/lib/navigation.ts` - Navigation structure with display names
- `/src/components/client/client-dashboard.tsx` - Customer-facing labels and copy
- `/src/app/(client)/quick-order/page.tsx` - Page headings and flow labels

**Deviations needed:**
None - this is purely a UI copy change. Internal naming conventions remain unchanged.

## Dependencies

### Previous Plans
None - this is a foundational change

### External Dependencies
None - pure text replacement

## Relevant Files

### Files to Update (UI/Copy Changes)

**Navigation & Routes:**
- `/src/lib/navigation.ts:46` - Change `name: "Quick Order"` → `"QuickPrint"`
- `/src/lib/navigation.ts:47` - Change `name: "Orders"` → `"Projects"`
- `/src/app/(client)/client/orders/page.tsx:66` - Change `<h1>Your Orders</h1>` → `<h1>Your Projects</h1>`
- `/src/app/(client)/client/orders/page.tsx:67` - Update description text
- `/src/app/(client)/quick-order/page.tsx` - Update any "Quick Order" references in headings/copy

**Dashboard Components:**
- `/src/components/client/client-dashboard.tsx:173` - Change banner text "Quick Order" → "QuickPrint"
- `/src/components/client/client-dashboard.tsx:180` - Change button "Open Quick Order" → "Open QuickPrint"
- `/src/components/client/client-dashboard.tsx:191` - Change `CardTitle: "View All Orders"` → `"View All Projects"`
- `/src/components/client/client-dashboard.tsx:223` - Change stat label `"Total Orders"` → `"Total Projects"`
- `/src/components/client/client-dashboard.tsx:330` - Change `CardTitle: "Recent Orders"` → `"Recent Projects"`
- `/src/components/client/client-dashboard.tsx:284` - Change button `"View Orders"` → `"View Projects"`
- `/src/components/client/client-dashboard.tsx:13` - Change type property `totalOrders` → `totalProjects`

**Documentation & Business Guide:**
- `/src/components/documentation/documentation-view.tsx:336` - Change menu "Quick orders" → "QuickPrint"
- `/src/components/business-guide/sections/workflows-section.tsx:337` - Change `CardTitle: "Quick Order Self-Service Flow"` → `"QuickPrint Self-Service Flow"`
- `/src/components/business-guide/sections/pricing-section.tsx:88` - Change `CardTitle: "Quick Order Pricing Formula"` → `"QuickPrint Pricing Formula"`
- `/src/components/business-guide/sections/pricing-section.tsx:157` - Update "Quick Order" → "QuickPrint"
- `/src/components/business-guide/sections/slicing-section.tsx:49` - Update "quick order" → "QuickPrint"
- `/src/components/settings/settings-form.tsx:694` - Update "quick orders" → "QuickPrint"

**Type Definitions (Comments Only):**
- `/src/components/client/client-dashboard.tsx` - Update comments/descriptions that reference "orders"

### Files to Keep Unchanged (Internal API)

**Schemas & Types:**
- `/src/lib/schemas/quick-order.ts` - Keep internal type names
- `/src/server/services/quick-order.ts` - Keep service function names

**API Routes:**
- `/src/app/api/quick-order/**/*` - Keep route paths unchanged

### New Files
None required

## Acceptance Criteria
- [ ] All customer-facing "Quick Order" text replaced with "QuickPrint"
- [ ] All customer-facing "Order(s)" text replaced with "Project(s)"
- [ ] Navigation labels updated (sidebar, headers, breadcrumbs)
- [ ] Dashboard cards and stats show new terminology
- [ ] Business guide and documentation reflect new branding
- [ ] Page titles and headings use new terminology
- [ ] Button labels and CTAs updated
- [ ] Internal API routes and types remain unchanged
- [ ] No broken links or navigation
- [ ] TypeScript types compile without errors
- [ ] All customer-facing UI tested and verified

## Step by Step Tasks

**EXECUTION RULES:**
- Execute ALL steps below in exact order
- Check Acceptance Criteria - all items are REQUIRED
- Do NOT skip UI/frontend steps if in acceptance criteria
- If blocked, document and continue other steps

### 1. Update Navigation Configuration

- Open `/src/lib/navigation.ts`
- Line 46: Change `name: "Quick Order"` → `name: "QuickPrint"`
- Line 47: Change `name: "Orders"` → `name: "Projects"`
- Update href if needed to maintain consistency (keep `/quick-order` and `/client/orders` routes)
- Verify TypeScript compilation

### 2. Update Client Dashboard Component

- Open `/src/components/client/client-dashboard.tsx`
- Line 13: Change type property `totalOrders: number` → `totalProjects: number`
- Line 49: Change variable `recentOrders` → `recentProjects` (and update all references)
- Line 173: Update comment "Quick Order Banner" → "QuickPrint Banner"
- Line 174-178: Update banner text replacing "Quick Order" with "QuickPrint"
- Line 180: Change button text "Open Quick Order" → "Open QuickPrint"
- Line 191: Change `CardTitle` "View All Orders" → "View All Projects"
- Line 191: Update description text replacing "Orders" with "Projects"
- Line 223: Change stat label "Total Orders" → "Total Projects"
- Line 284: Change button text "View Orders" → "View Projects"
- Line 330: Change `CardTitle` "Recent Orders" → "Recent Projects"
- Update any remaining "order" references in user-facing strings

### 3. Update Projects/Orders Page

- Open `/src/app/(client)/client/orders/page.tsx`
- Line 66: Change page heading `<h1>Your Orders</h1>` → `<h1>Your Projects</h1>`
- Line 67: Update description replacing "Invoices generated from Quick Orders" → "Invoices generated from QuickPrint"
- Update any table headers or labels that say "Order" to "Project"
- Update empty state messages if they reference "orders"

### 4. Update QuickPrint Flow Page

- Open `/src/app/(client)/quick-order/page.tsx`
- Search for all instances of "Quick Order" in user-facing strings
- Replace with "QuickPrint" (maintain casing: "QuickPrint" or "quickprint" as appropriate)
- Update page title, welcome messages, step labels
- Update any help text or tooltips

### 5. Update Documentation Components

- Open `/src/components/documentation/documentation-view.tsx`
- Line 336: Change menu item "Quick orders" → "QuickPrint"
- Search for any other "order" references in documentation context
- Update to "project" where customer-facing

### 6. Update Business Guide Components

- Open `/src/components/business-guide/sections/workflows-section.tsx`
- Line 337: Change `CardTitle` "Quick Order Self-Service Flow" → "QuickPrint Self-Service Flow"
- Update workflow description text

- Open `/src/components/business-guide/sections/pricing-section.tsx`
- Line 88: Change `CardTitle` "Quick Order Pricing Formula" → "QuickPrint Pricing Formula"
- Line 157: Update "Quick Order pricing" → "QuickPrint pricing"
- Update any calculation descriptions

- Open `/src/components/business-guide/sections/slicing-section.tsx`
- Line 49: Update "quick order" → "QuickPrint"
- Update any related process descriptions

### 7. Update Settings Component

- Open `/src/components/settings/settings-form.tsx`
- Line 694: Update description "quick orders" → "QuickPrint"
- Search for any other "order" references in settings context

### 8. Update API Response Types (Comments Only)

- Open `/src/server/services/dashboard.ts`
- Update JSDoc comments referencing "orders" to "projects"
- Do NOT change function names or return type property names yet (breaking change)
- Add TODO comments for future type migration

---
✅ CHECKPOINT: Steps 1-8 complete (All UI copy updates). Continue to step 9.
---

### 9. Create Type Migration Plan

- Create file `/src/types/dashboard-migration.ts`
- Document the type property migrations needed:
  - `DashboardStats.totalOrders` → `totalProjects`
  - Any API response interfaces that need updating
- Add deprecation warnings in JSDoc
- Plan for gradual migration in future PR

### 10. Update Admin References (If Any)

- Search admin components for customer-facing "order" terminology
- Update admin dashboard if it references "client orders"
- Keep admin-specific terminology (quotes, invoices, jobs) unchanged

### 11. Run Validation Commands

- Execute all commands in Validation Commands section
- Fix any TypeScript compilation errors
- Test navigation and links
- Verify dashboard displays correctly
- Check business guide renders properly

## Testing Strategy

### Unit Tests
No unit tests required - pure UI copy changes

### Edge Cases
- Mobile navigation labels fit correctly
- Long project names don't break layout
- Dashboard stats cards remain aligned
- Breadcrumbs show correct terminology
- Search functionality still works with new terms

## Validation Commands
Execute every command to validate the task works correctly with zero regressions.

```bash
# 1. TypeScript compilation check
npm run build
# EXPECTED: Build succeeds with 0 type errors

# 2. Check for remaining "Quick Order" references (case-insensitive)
grep -ri "quick order" src/components src/app --include="*.tsx" --include="*.ts" | grep -v "quick-order" | grep -v "node_modules"
# EXPECTED: Only internal route/type references remain (quick-order in paths/filenames OK)

# 3. Check for customer-facing "Order" references (excluding admin contexts)
grep -r "\"Order" src/components/client src/app/\(client\) --include="*.tsx" | grep -v "OrderFiles" | grep -v "ReOrder"
# EXPECTED: No matches (all should be "Project")

# 4. Verify navigation structure compiles
npm run dev
# Navigate to http://localhost:3000 and check:
# - Sidebar shows "QuickPrint" and "Projects"
# - Dashboard shows "Total Projects", "Recent Projects"
# - QuickPrint banner says "QuickPrint"
# - Projects page heading is "Your Projects"

# 5. Screenshot verification
# Take screenshots of:
# - Client dashboard (should show QuickPrint banner, Total Projects stat)
# - Projects page (should show "Your Projects" heading)
# - Navigation sidebar (should show "QuickPrint" and "Projects")
# - Business guide (should reference QuickPrint in workflow section)
```

# Implementation log created at:
# specs/fixes/branding-and-copy/branding-and-copy_implementation.log

## Definition of Done
- [x] All acceptance criteria met
- [x] All validation commands pass with expected output
- [x] No regressions (existing tests still pass)
- [x] Patterns followed (documented in Pattern Analysis)
- [ ] E2E test created and passing (N/A - copy changes only)

## Notes

**Breaking Changes:**
- `DashboardStats.totalOrders` type property will need gradual migration
- Consider creating a v2 API endpoint for dashboard stats with new property names
- For now, backend can return both `totalOrders` and `totalProjects` for compatibility

**Future Considerations:**
- Add "QuickPrint" to marketing materials
- Update any external documentation or help docs
- Consider SEO impact if "Quick Order" was used in meta tags
- Plan for gradual type migration in subsequent PR

**Style Guide:**
- "QuickPrint" - one word, capital Q and P (product name)
- "Projects" - plural when referring to list/collection
- "Project" - singular when referring to one item
- Maintain consistency in capitalization across all contexts

## Research Documentation
None required - straightforward text replacement based on exploration findings.
