# PHASE 1: SHARED COMPONENTS OPTIMIZATION

**Objective**: Optimize all 45+ shared UI components in `/src/components/ui/` and layout shells for mobile responsiveness.

**Priority**: HIGH - These components are used throughout both admin and client portals. Optimizing them first creates a foundation for all subsequent work.

---

## 1.1 LAYOUT COMPONENTS (2 components)

### 1.1.1 AdminShell
- **File**: `/src/components/layout/admin-shell.tsx`
- **Optimizations**:
  - [ ] Reduce header height on mobile (5rem → 4rem on sm)
  - [ ] Make quick action buttons scroll horizontally or stack on mobile
  - [ ] Optimize user profile section in mobile drawer
  - [ ] Ensure logo scales properly with max-width
  - [ ] Truncate long page titles with ellipsis on mobile
  - [ ] Test drawer swipe gesture
  - [ ] Verify header backdrop blur works on mobile

### 1.1.2 ClientShell
- **File**: `/src/components/layout/client-shell.tsx`
- **Optimizations**:
  - [ ] Apply same optimizations as AdminShell
  - [ ] Optimize quick order button placement on mobile
  - [ ] Ensure wallet credit display is readable on small screens
  - [ ] Test mobile drawer navigation

---

## 1.2 FORM COMPONENTS (8 components)

### 1.2.1 Input
- **File**: `/src/components/ui/input.tsx`
- **Optimizations**:
  - [ ] Increase touch target height (min-h-11 or 44px)
  - [ ] Increase padding for easier text selection
  - [ ] Verify proper input type attributes (email, tel, number)
  - [ ] Verify autocomplete attributes
  - [ ] Test with mobile browser autofill

### 1.2.2 Textarea
- **File**: `/src/components/ui/textarea.tsx`
- **Optimizations**:
  - [ ] Increase min-height on mobile for easier typing
  - [ ] Ensure auto-resize works with mobile keyboards
  - [ ] Test scrolling behavior

### 1.2.3 Select
- **File**: `/src/components/ui/select.tsx`
- **Optimizations**:
  - [ ] Increase touch target height (min-h-11 or 44px)
  - [ ] Ensure dropdown content doesn't overflow viewport
  - [ ] Test dropdown positioning on mobile
  - [ ] Verify scrolling in long select lists

### 1.2.4 Checkbox
- **File**: `/src/components/ui/checkbox.tsx`
- **Optimizations**:
  - [ ] Increase checkbox size on mobile (h-5 w-5 → h-6 w-6 on sm)
  - [ ] Increase touch target with padding on label
  - [ ] Ensure proper spacing between checkbox and label

### 1.2.5 RadioGroup
- **File**: `/src/components/ui/radio-group.tsx`
- **Optimizations**:
  - [ ] Increase radio button size on mobile
  - [ ] Increase touch target area
  - [ ] Ensure minimum 12px gap between radio options

### 1.2.6 Switch
- **File**: `/src/components/ui/switch.tsx`
- **Optimizations**:
  - [ ] Increase switch size on mobile for easier toggling
  - [ ] Increase touch target padding
  - [ ] Test thumb drag gesture on touch devices

### 1.2.7 Form Wrapper Components
- **Files**: Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription
- **Optimizations**:
  - [ ] Ensure labels are minimum text-sm
  - [ ] Stack form fields vertically on mobile by default
  - [ ] Increase spacing between fields (gap-4 → gap-6 on sm)
  - [ ] Ensure error messages are visible and not cut off
  - [ ] Position descriptions below fields on mobile

---

## 1.3 BUTTON COMPONENTS (3 components)

### 1.3.1 Button
- **File**: `/src/components/ui/button.tsx`
- **Optimizations**:
  - [ ] Ensure all variants meet min touch target (44x44px)
  - [ ] Adjust padding on mobile (test all sizes: default, sm, lg, icon)
  - [ ] Test all 7 variants (default, destructive, outline, secondary, ghost, subtle, link)
  - [ ] Ensure icon-only buttons have adequate touch targets
  - [ ] Test loading states on mobile

### 1.3.2 LoadingButton
- **File**: `/src/components/ui/loading-button.tsx`
- **Optimizations**:
  - [ ] Ensure spinner is visible on small buttons
  - [ ] Maintain button width during loading state
  - [ ] Test touch interaction disabling during loading

### 1.3.3 ActionButton
- **File**: `/src/components/ui/action-button.tsx`
- **Optimizations**:
  - [ ] Apply same optimizations as Button
  - [ ] Ensure async loading state is clear on mobile

---

## 1.4 CARD COMPONENTS (3 components)

### 1.4.1 Card
- **File**: `/src/components/ui/card.tsx`
- **Optimizations**:
  - [ ] Reduce horizontal padding on mobile (p-6 → p-4 on sm)
  - [ ] Consider reducing border radius (rounded-3xl → rounded-2xl on mobile)
  - [ ] Ensure card content doesn't overflow on narrow screens
  - [ ] Stack CardHeader action buttons vertically on mobile

### 1.4.2 MetricCard / DataCard
- **File**: `/src/components/ui/data-card.tsx` or similar
- **Optimizations**:
  - [ ] Create mobile variant with optimized layout
  - [ ] Reduce font sizes on mobile (text-3xl → text-2xl for values)
  - [ ] Ensure tone colors are visible on small screens
  - [ ] Test grid layouts (2 columns max on mobile)
  - [ ] Stack icon and content appropriately

---

## 1.5 TABLE COMPONENTS (2 components) - CRITICAL

### 1.5.1 Table
- **File**: `/src/components/ui/table.tsx`
- **Optimizations**:
  - [ ] Add responsive wrapper with horizontal scroll
  - [ ] Make first column sticky (position: sticky, left: 0)
  - [ ] Add shadow indicator for scrollable content
  - [ ] Ensure min-width on columns
  - [ ] Add optional `mobileView` prop ("scroll" | "cards")
  - [ ] Test horizontal scroll on touch devices

### 1.5.2 TableSkeleton
- **File**: `/src/components/ui/table-skeleton.tsx` (if exists)
- **Optimizations**:
  - [ ] Show fewer skeleton rows on mobile (10 → 5)
  - [ ] Adjust column widths for mobile
  - [ ] Create card skeleton variant if needed

### 1.5.3 TableCard (NEW COMPONENT)
- **File**: `/src/components/ui/table-card.tsx` (to be created)
- **Purpose**: Alternative table view for mobile (card-based)
- **Implementation**:
  - [ ] Create component that displays table data as cards
  - [ ] Support expandable rows for additional details
  - [ ] Maintain click/tap handlers from table rows

---

## 1.6 DIALOG & MODAL COMPONENTS (4 components)

### 1.6.1 Dialog
- **File**: `/src/components/ui/dialog.tsx`
- **Optimizations**:
  - [ ] Make dialogs full-screen or near-full on mobile (sm:max-w-md)
  - [ ] Reduce max-width appropriately for mobile
  - [ ] Ensure close button is easily tappable (larger target)
  - [ ] Stack DialogFooter buttons vertically on mobile
  - [ ] Reduce padding (p-6 → p-4 on mobile)
  - [ ] Ensure content scrolls properly if long
  - [ ] Test keyboard interaction with mobile soft keyboard

### 1.6.2 Sheet
- **File**: `/src/components/ui/sheet.tsx`
- **Optimizations**:
  - [ ] Ensure sheet sizing is appropriate on mobile
  - [ ] Test all 4 sides (top, right, bottom, left)
  - [ ] Optimize content padding
  - [ ] Test swipe-to-close gesture

### 1.6.3 ClientPickerDialog
- **File**: `/src/components/ui/client-picker-dialog.tsx`
- **Optimizations**:
  - [ ] Make full-screen on mobile
  - [ ] Enlarge search input
  - [ ] Show client list as cards instead of table on mobile
  - [ ] Larger touch targets for client selection

### 1.6.4 AddCreditModal
- **File**: `/src/components/clients/add-credit-modal.tsx`
- **Optimizations**:
  - [ ] Follow Dialog mobile optimizations
  - [ ] Larger amount input field
  - [ ] Stack balance displays vertically on mobile

---

## 1.7 NAVIGATION COMPONENTS (3 components)

### 1.7.1 NavigationLink
- **File**: `/src/components/ui/navigation-link.tsx`
- **Optimizations**:
  - [ ] Increase touch target height (h-9 → h-11 on mobile)
  - [ ] Increase padding (px-3 → px-4)
  - [ ] Ensure icon and text are properly spaced
  - [ ] Test active state visibility on mobile

### 1.7.2 NavigationDrawer
- **File**: `/src/components/ui/navigation-drawer.tsx` or within shells
- **Optimizations**:
  - [ ] Ensure drawer width is appropriate (300px max)
  - [ ] Ensure navigation links are touch-friendly
  - [ ] Optimize user profile section at bottom
  - [ ] Test overlay backdrop opacity

### 1.7.3 ActionRail
- **File**: `/src/components/ui/action-rail.tsx` or similar
- **Optimizations**:
  - [ ] Make buttons scroll horizontally if overflow
  - [ ] Add scroll snap for button groups
  - [ ] Ensure buttons maintain min touch target

---

## 1.8 STATUS & BADGE COMPONENTS (2 components)

### 1.8.1 Badge
- **File**: `/src/components/ui/badge.tsx`
- **Optimizations**:
  - [ ] Ensure text is readable (text-xs minimum)
  - [ ] Increase padding slightly (px-2 py-0.5 → px-2.5 py-1 on mobile)
  - [ ] Test all 4 variants
  - [ ] Verify on small screens

### 1.8.2 StatusBadge
- **File**: Design system utility or component
- **Optimizations**:
  - [ ] Same as Badge
  - [ ] Ensure semantic colors are visible on mobile

---

## 1.9 LOADING & PROGRESS COMPONENTS (5 components)

### 1.9.1 Loader
- **File**: `/src/components/ui/loader.tsx`
- **Optimizations**:
  - [ ] Ensure spinner size is appropriate for mobile
  - [ ] Test with different loading messages

### 1.9.2 InlineLoader
- **File**: `/src/components/ui/inline-loader.tsx`
- **Optimizations**:
  - [ ] Same as Loader
  - [ ] Verify inline positioning

### 1.9.3 MutationLoader
- **File**: `/src/components/ui/mutation-loader.tsx`
- **Optimizations**:
  - [ ] Position appropriately on mobile (top-center)
  - [ ] Reduce size slightly on mobile if needed
  - [ ] Ensure not blocking critical content

### 1.9.4 RouteProgressBar
- **File**: Component or hook
- **Optimizations**:
  - [ ] Ensure progress bar is visible at top of mobile viewport
  - [ ] Appropriate height (2px - 4px)

### 1.9.5 Progress & Skeleton
- **Files**: `/src/components/ui/progress.tsx`, `/src/components/ui/skeleton.tsx`
- **Optimizations**:
  - [ ] Test skeleton loading states on mobile
  - [ ] Ensure progress bars are visible
  - [ ] Verify sizing

---

## 1.10 POPOVER & DROPDOWN COMPONENTS (3 components)

### 1.10.1 Popover
- **File**: `/src/components/ui/popover.tsx`
- **Optimizations**:
  - [ ] Ensure popover content doesn't overflow viewport
  - [ ] Use intelligent positioning based on trigger position
  - [ ] Increase touch dismiss area
  - [ ] Consider converting complex popovers to modal on mobile

### 1.10.2 DropdownMenu
- **File**: `/src/components/ui/dropdown-menu.tsx`
- **Optimizations**:
  - [ ] Increase menu item height (min-h-9 → min-h-11 on mobile)
  - [ ] Increase padding (px-2 py-1.5 → px-3 py-2.5)
  - [ ] Ensure menu doesn't overflow viewport
  - [ ] Test nested menus on mobile

### 1.10.3 HoverCard
- **File**: `/src/components/ui/hover-card.tsx`
- **Optimizations**:
  - [ ] Convert hover to tap on mobile
  - [ ] Ensure content is readable
  - [ ] Add tap-outside to close

---

## 1.11 UTILITY COMPONENTS (7 components)

### 1.11.1 Avatar
- **File**: `/src/components/ui/avatar.tsx`
- **Optimizations**:
  - [ ] Ensure avatars are visible on mobile (min 32px)
  - [ ] Test fallback initials readability

### 1.11.2 Label
- **File**: `/src/components/ui/label.tsx`
- **Optimizations**:
  - [ ] Ensure labels are large enough (text-sm)
  - [ ] Verify spacing

### 1.11.3 Tooltip
- **File**: `/src/components/ui/tooltip.tsx`
- **Optimizations**:
  - [ ] Convert tooltips to tap-to-show on mobile
  - [ ] Test tooltip positioning on mobile
  - [ ] Ensure tooltip content is readable

### 1.11.4 Separator
- **File**: `/src/components/ui/separator.tsx`
- **Optimizations**:
  - [ ] Verify visibility on mobile
  - [ ] Test both horizontal and vertical

### 1.11.5 Alert
- **File**: `/src/components/ui/alert.tsx`
- **Optimizations**:
  - [ ] Reduce padding on mobile
  - [ ] Stack icon and text if needed
  - [ ] Ensure alert doesn't overflow
  - [ ] Test all variants

### 1.11.6 Tabs
- **File**: `/src/components/ui/tabs.tsx`
- **Optimizations**:
  - [ ] Make TabsList scroll horizontally if overflow
  - [ ] Add scroll snap for tabs
  - [ ] Increase tab height (h-9 → h-11 on mobile)
  - [ ] Ensure active tab indicator is visible
  - [ ] Test long tab labels (truncate or wrap)

### 1.11.7 Calendar
- **File**: `/src/components/ui/calendar.tsx`
- **Optimizations**:
  - [ ] Ensure calendar grid is touch-friendly
  - [ ] Larger date cells (min 44x44px touch target)
  - [ ] Test date picker on mobile
  - [ ] Consider native date picker on mobile for better UX

---

## 1.12 INFORMATION DISPLAY COMPONENTS (4 components)

### 1.12.1 EmptyState
- **File**: `/src/components/ui/empty-state.tsx`
- **Optimizations**:
  - [ ] Reduce icon size on mobile (h-12 → h-10)
  - [ ] Reduce text sizes (text-lg → text-base)
  - [ ] Stack action buttons vertically
  - [ ] Reduce padding

### 1.12.2 Breadcrumb
- **File**: `/src/components/ui/breadcrumb.tsx`
- **Optimizations**:
  - [ ] Show only last 2-3 breadcrumbs on mobile
  - [ ] Add ellipsis for hidden breadcrumbs
  - [ ] Ensure breadcrumb links are touch-friendly

### 1.12.3 PageHeader
- **File**: `/src/components/ui/page-header.tsx` or similar
- **Optimizations**:
  - [ ] Reduce title size on mobile (text-3xl → text-2xl)
  - [ ] Reduce description size
  - [ ] Stack header actions vertically or scroll horizontally

### 1.12.4 ScrollArea
- **File**: `/src/components/ui/scroll-area.tsx`
- **Optimizations**:
  - [ ] Ensure scroll indicators are visible
  - [ ] Test vertical and horizontal scroll
  - [ ] Add momentum scrolling

---

## TESTING CHECKLIST FOR PHASE 1

After optimizing each component:

- [ ] Test on mobile viewport (375px - iPhone SE)
- [ ] Test on tablet viewport (768px - iPad)
- [ ] Test on desktop viewport (1440px)
- [ ] Test touch interactions
- [ ] Verify no horizontal overflow
- [ ] Verify text readability
- [ ] Verify touch target sizes (44x44px minimum)
- [ ] Test with Safari iOS
- [ ] Test with Chrome Android
- [ ] Verify component works in both admin and client contexts

---

## COMPLETION CRITERIA

Phase 1 is complete when:
- [ ] All 45+ shared components are optimized for mobile
- [ ] All components pass the testing checklist
- [ ] No regressions in existing functionality
- [ ] Components work correctly in admin and client portals
- [ ] All checkboxes in this plan are marked complete
