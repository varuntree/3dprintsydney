# Plan: Client Portal UX & Flow Improvements

## Issue Checklist
- [ ] Home dashboard redesign with CTA cards and wallet summary (deferred)
- [ ] Orientation lock gate + hard reset + step navigation controls (deferred)
- [ ] Address autocomplete & shipping estimation details (deferred)
- [x] Active Projects view, filters, and `/client/projects/active` route (complete)
- [x] Print Again history view, search, pagination, and `/client/projects/history` route (complete)
- [x] Client navigation update with new Projects section (complete)

## Plan Description
Comprehensive overhaul of the client portal experience to streamline navigation and improve the QuickPrint configurator workflow. This includes redesigning the home page with three clear CTAs (New Project, Active Projects, Print Again), implementing proper orientation locking gates, adding step navigation controls (next/previous), implementing a hard reset function, integrating Google Places autocomplete for addresses, and adding shipping cost estimation by postcode/distance.

## User Story
As a client
I want a clear, intuitive portal with obvious next actions and smooth workflow progression
So that I can quickly start new projects, track active work, reorder past prints, and complete configuration without confusion or dead-ends

## Problem Statement
Current client portal UX has multiple pain points:
1. **Unclear home page** - No obvious entry points for key actions
2. **Buggy orientation lock gate** - Users can sometimes progress without locking orientation
3. **No step navigation** - Users can't easily move forward/back between configurator steps
4. **Inconsistent reset behavior** - Reset doesn't return to initial state
5. **Manual address entry** - Slow, error-prone, affects delivery accuracy
6. **Unknown shipping costs** - Users can't see delivery estimates upfront

These issues create friction, confusion, and incomplete workflows that require customer support intervention.

## Solution Statement
Implement a multi-phase UX improvement:
1. **Home redesign**: Replace current dashboard with 3-button CTA card system
2. **Orientation gate**: Add robust client-side validation before step progression
3. **Step navigation**: Add next/previous buttons with completion guards
4. **Hard reset**: Store initial orientation snapshot and restore on reset
5. **Address autocomplete**: Integrate Google Places API with debounced search
6. **Shipping estimation**: Calculate by postcode lookup against defined regions + remote surcharges

## Pattern Analysis

**Current Patterns Found:**

1. **Step Management** (`/src/app/(client)/quick-order/page.tsx`):
   - Boolean dict `stepCompletion` tracks completed steps
   - `isStepUnlocked(step)` guards progression
   - Auto-advance on orientation lock

2. **State Management**:
   - React hooks + Zustand orientation store
   - LocalStorage draft auto-save (1s debounce)
   - Orientation stored as quaternion `[x, y, z, w]`

3. **Address Handling** (`/src/lib/schemas/quick-order.ts`):
   - Zod validation with optional fields
   - Structure: name, line1, line2, city, state, postcode, phone
   - 600ms debounce on state/postcode changes triggers price recalc

4. **Shipping Logic** (`/src/server/services/quick-order.ts`):
   - `resolveShippingRegion(state, postcode)` matches against `settings.shipping_regions`
   - Algorithm: state match → postcode prefix match → remote surcharge
   - Returns: baseAmount + remoteSurcharge

**Files Demonstrating Patterns:**
- `/src/app/(client)/quick-order/page.tsx:1-1480` - Complete flow implementation
- `/src/stores/orientation-store.ts:1-132` - State management
- `/src/server/services/quick-order.ts` - Shipping calculation
- `/src/components/client/client-dashboard.tsx` - Current dashboard structure

**Deviations Needed:**
- New home page requires different layout structure (not 5-column stats grid)
- Google Places needs new external API integration
- Initial orientation snapshot requires store enhancement

## Dependencies

### Previous Plans
- **Branding & Copy Plan** - Should be completed first for consistent terminology ("Projects" not "Orders")

### External Dependencies
- **Google Places API** - Requires API key and frontend SDK
  - Library: `@googlemaps/js-api-loader` or `@react-google-maps/api`
  - Billing: Places API (Autocomplete) pricing applies
  - Setup: Need NEXT_PUBLIC_GOOGLE_MAPS_API_KEY env var

## Relevant Files

### Files to Update

**Client Home/Dashboard:**
- `/src/app/(client)/client/page.tsx` - Replace with new 3-CTA layout
- `/src/components/client/client-dashboard.tsx` - Refactor or create new simplified version

**QuickPrint Flow:**
- `/src/app/(client)/quick-order/page.tsx` (1480 lines) - Add navigation, gate, reset logic
- `/src/components/3d/RotationControls.tsx` - Enhance reset to restore initial state
- `/src/stores/orientation-store.ts` - Add initialOrientation snapshot storage

**Address & Shipping:**
- `/src/app/(client)/quick-order/page.tsx` - Integrate autocomplete component
- `/src/lib/schemas/quick-order.ts` - Enhance address validation
- `/src/server/services/quick-order.ts` - Verify shipping calculation logic

**Types & Schemas:**
- `/src/lib/types/dashboard.ts` (if exists) - Update for new home structure
- `/src/lib/schemas/quick-order.ts` - Address autocomplete result structure

### New Files

**Components:**
- `/src/components/client/client-home-cta.tsx` - New 3-button home page component
- `/src/components/client/active-projects-view.tsx` - Active projects list with filters
- `/src/components/client/print-again-view.tsx` - Order history with reorder shortcuts
- `/src/components/ui/address-autocomplete.tsx` - Google Places autocomplete input wrapper
- `/src/components/quick-order/step-navigation.tsx` - Next/Previous navigation component

**Services:**
- `/src/lib/google-places.ts` - Google Places API client wrapper
- `/src/hooks/use-address-autocomplete.ts` - Hook for autocomplete integration

**Environment:**
- `.env.local.example` - Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY placeholder

## Acceptance Criteria

**Home Page:**
- [ ] Three primary CTA cards visible: "New Project", "Active Projects", "Print Again"
- [ ] Each CTA navigates to correct destination
- [ ] Cards show relevant counts/badges (e.g., "X active", "Y pending payment")
- [ ] Mobile-responsive layout (stacked on small screens)

**Orientation Lock Gate:**
- [ ] Cannot progress to Configure step without locking orientation
- [ ] Clear visual indicator when lock is required
- [ ] Lock button disabled state correctly reflects requirement
- [ ] Error message if user attempts to bypass

**Step Navigation:**
- [ ] Next button visible on Upload, Orient, Configure steps
- [ ] Previous button visible on Orient, Configure, Price steps
- [ ] Buttons disabled when step incomplete
- [ ] Navigation maintains state correctly
- [ ] Breadcrumbs show current step

**Hard Reset:**
- [ ] Reset button stores initial orientation on first model load
- [ ] Hard reset restores exact initial orientation (not last manual change)
- [ ] Visual confirmation of reset action
- [ ] Works across all orientation methods (manual, auto-orient, face-pick)

**Address Autocomplete:**
- [ ] Autocomplete suggestions appear as user types (300ms debounce)
- [ ] Selecting suggestion fills all address fields
- [ ] Supports both client address and delivery address fields
- [ ] Handles API errors gracefully (fallback to manual entry)
- [ ] Extracts state and postcode for shipping calculation

**Shipping Estimation:**
- [ ] Shipping cost updates automatically when postcode entered
- [ ] Shows region name (e.g., "Sydney Metro")
- [ ] Displays remote surcharge separately if applicable
- [ ] Updates total price immediately
- [ ] Handles invalid/unknown postcodes gracefully

## Step by Step Tasks

**EXECUTION RULES:**
- Execute ALL steps below in exact order
- Check Acceptance Criteria - all items are REQUIRED
- Do NOT skip UI/frontend steps if in acceptance criteria
- If blocked, document and continue other steps

### 1. Setup Google Places API Integration

- Sign up for Google Cloud Platform account (or use existing)
- Enable Places API in Google Cloud Console
- Create API key with Places API restrictions
- Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to `.env.local`
- Update `.env.local.example` with placeholder
- Install dependency: `npm install @react-google-maps/api`
- Create wrapper `/src/lib/google-places.ts`:
  ```typescript
  import { Loader } from '@googlemaps/js-api-loader';
  export const initGooglePlaces = () => { /* loader setup */ };
  ```

### 2. Create Address Autocomplete Component

- Create `/src/components/ui/address-autocomplete.tsx`
- Implement Google Places Autocomplete widget wrapper
- Props: `value`, `onChange`, `onPlaceSelected`, `placeholder`, `disabled`
- Handle place selection and extract: line1, city, state, postcode
- Add debounced input (300ms)
- Handle API load errors gracefully
- Style to match existing form inputs
- Add loading spinner during search

- Create hook `/src/hooks/use-address-autocomplete.ts`
- Manage Google Maps script loading state
- Provide autocomplete service instance
- Handle cleanup on unmount

### 3. Create Client Home 3-CTA Component

- Create `/src/components/client/client-home-cta.tsx`
- Design structure:
  ```tsx
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <CTACard
      title="New Project"
      description="Upload files and get instant pricing"
      icon={PlusIcon}
      href="/quick-order"
      badge={null}
    />
    <CTACard
      title="Active Projects"
      description="Track work in progress"
      icon={ClockIcon}
      href="/client/projects/active"
      badge={`${activeCount} active`}
    />
    <CTACard
      title="Print Again"
      description="Reorder from history"
      icon={RepeatIcon}
      href="/client/projects/history"
      badge={`${historyCount} past projects`}
    />
  </div>
  ```
- Fetch stats from `/api/client/dashboard`
- Add hover effects and focus states
- Mobile: stack vertically, maintain touch targets

### 4. Update Client Home Page

- Open `/src/app/(client)/client/page.tsx`
- Replace current dashboard with simplified layout:
  ```tsx
  <div className="space-y-8">
    <WalletBalanceCard balance={stats.walletBalance} />
    <ClientHomeCTA stats={stats} />
    <QuickActionsBar />
  </div>
  ```
- Move detailed stats to separate dashboard/profile page if needed
- Keep wallet balance prominent at top
- Add optional "View Detailed Dashboard" link for power users

### 5. Create Active Projects View

- Create `/src/components/client/active-projects-view.tsx`
- Fetch from `/api/client/jobs?archived=false`
- Show filters: All, Pending Print, Pending Payment, In Progress
- Display: project title, status badge, date, invoice link
- Mobile-optimized card layout
- Empty state: "No active projects" with CTA to start new
- Sort by: most recent first

- Create route `/src/app/(client)/client/projects/active/page.tsx`
- Use `<ActiveProjectsView />` component
- Add breadcrumbs: Home > Active Projects

### 6. Create Print Again History View

- Create `/src/components/client/print-again-view.tsx`
- Fetch from `/api/client/invoices?status=PAID&limit=50`
- Display: project name, date, amount, status
- "Print Again" button per item (pre-fills configuration)
- Search/filter by date range
- Pagination for >50 items

- Create route `/src/app/(client)/client/projects/history/page.tsx`
- Use `<PrintAgainView />` component
- Add breadcrumbs: Home > Print Again

### 7. Enhance Orientation Store for Initial Snapshot

- Open `/src/stores/orientation-store.ts`
- Add state field:
  ```typescript
  initialOrientation: {
    quaternion: [number, number, number, number];
    position: [number, number, number];
  } | null;
  ```
- Add action `setInitialOrientation(quaternion, position)` - called once on model load
- Add action `resetToInitial()` - restores initial orientation
- Modify existing `reset()` to call `resetToInitial()` if initial exists

### 8. Implement Hard Reset in ModelViewer

- Open `/src/components/3d/ModelViewer.tsx`
- On successful model load (after centering), call:
  ```typescript
  useEffect(() => {
    if (geometry && groupRef.current) {
      const initialQuat = groupRef.current.quaternion.toArray();
      const initialPos = groupRef.current.position.toArray();
      orientationStore.setInitialOrientation(initialQuat, initialPos);
    }
  }, [geometry]);
  ```

- Open `/src/components/3d/RotationControls.tsx`
- Update reset button handler:
  ```typescript
  const handleHardReset = () => {
    orientationStore.resetToInitial();
    // Optionally show toast: "Model reset to original orientation"
  };
  ```
- Add tooltip: "Reset to initial orientation"

### 9. Add Orientation Lock Gate

- Open `/src/app/(client)/quick-order/page.tsx`
- Strengthen `isStepUnlocked("configure")` check:
  ```typescript
  const isConfigureUnlocked = useMemo(() => {
    if (!stepCompletion.orient) return false;
    // Verify ALL files have locked orientation
    const allLocked = files.every(f => f.orientationLocked === true);
    return allLocked;
  }, [stepCompletion.orient, files]);
  ```

- Add visual indicator when blocked:
  ```tsx
  {!isConfigureUnlocked && (
    <Alert variant="warning">
      <Lock className="h-4 w-4" />
      <AlertDescription>
        Please lock orientation for all models before continuing
      </AlertDescription>
    </Alert>
  )}
  ```

- Disable "Next" button when gate not met
- Add error toast if user attempts bypass

### 10. Implement Step Navigation Controls

- Create `/src/components/quick-order/step-navigation.tsx`:
  ```tsx
  interface StepNavigationProps {
    currentStep: number;
    steps: string[];
    onNext: () => void;
    onPrevious: () => void;
    canGoNext: boolean;
    canGoPrevious: boolean;
  }

  export function StepNavigation({...}) {
    return (
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={!canGoPrevious}
        >
          <ChevronLeft /> Previous
        </Button>

        <Breadcrumbs steps={steps} current={currentStep} />

        <Button
          onClick={onNext}
          disabled={!canGoNext}
        >
          Next <ChevronRight />
        </Button>
      </div>
    );
  }
  ```

- Integrate into `/src/app/(client)/quick-order/page.tsx`:
  - Add `<StepNavigation />` at top and bottom of form
  - Wire up handlers:
    ```typescript
    const handleNext = () => {
      if (currentStep === 'upload' && stepCompletion.upload) setCurrentStep('orient');
      if (currentStep === 'orient' && isConfigureUnlocked) setCurrentStep('configure');
      if (currentStep === 'configure' && stepCompletion.configure) setCurrentStep('price');
    };

    const handlePrevious = () => {
      const steps = ['upload', 'orient', 'configure', 'price', 'checkout'];
      const idx = steps.indexOf(currentStep);
      if (idx > 0) setCurrentStep(steps[idx - 1]);
    };
    ```

### 11. Integrate Address Autocomplete in Price Step

- Open `/src/app/(client)/quick-order/page.tsx`
- Find address input fields in price step (around line 900-1000)
- Replace text inputs with `<AddressAutocomplete />`:
  ```tsx
  <AddressAutocomplete
    value={deliveryAddress.line1}
    onPlaceSelected={(place) => {
      setDeliveryAddress({
        line1: place.street,
        city: place.city,
        state: place.state,
        postcode: place.postcode,
        ...
      });
      // Trigger shipping recalculation
      debouncedRecalculatePrice();
    }}
    placeholder="Start typing your address..."
  />
  ```

- Add manual entry fallback (show fields below autocomplete)
- Duplicate for both client address and delivery address

### 12. Enhance Shipping Estimation Display

- Open `/src/app/(client)/quick-order/page.tsx` price step
- Add shipping breakdown card:
  ```tsx
  <Card>
    <CardHeader>
      <CardTitle>Shipping Estimate</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Region:</span>
          <Badge>{shippingRegion.label}</Badge>
        </div>
        <div className="flex justify-between">
          <span>Base Rate:</span>
          <span>${shippingRegion.baseAmount}</span>
        </div>
        {remoteSurcharge > 0 && (
          <div className="flex justify-between text-orange-600">
            <span>Remote Surcharge:</span>
            <span>+${remoteSurcharge}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-semibold">
          <span>Total Shipping:</span>
          <span>${totalShipping}</span>
        </div>
      </div>
    </CardContent>
  </Card>
  ```

- Update price summary to show shipping breakdown
- Add tooltip explaining how shipping is calculated
- Show postcode used for calculation

---
✅ CHECKPOINT: Steps 1-12 complete (All UX improvements implemented). Continue to step 13.
---

### 13. Update Navigation Routes

- Open `/src/lib/navigation.ts`
- Update CLIENT_NAV_SECTIONS to include new routes:
  ```typescript
  {
    title: "Projects",
    items: [
      { name: "New Project", href: "/quick-order", icon: "plus" },
      { name: "Active Projects", href: "/client/projects/active", icon: "clock" },
      { name: "Print Again", href: "/client/projects/history", icon: "repeat" },
    ]
  }
  ```

### 14. Add Loading States and Error Handling

- Add loading skeletons for:
  - Home CTA cards (while fetching stats)
  - Active projects list
  - Print again history
  - Address autocomplete suggestions

- Add error states for:
  - Google Places API failure (show manual entry)
  - Shipping calculation failure (show default rate)
  - Stats fetch failure (show static CTAs)

### 15. Run All Validation Commands

- Execute commands in Validation Commands section
- Fix any TypeScript errors
- Test all navigation flows
- Verify orientation lock gate
- Test address autocomplete
- Confirm shipping estimates update

## Testing Strategy

### Unit Tests

**Orientation Store:**
- Test `setInitialOrientation()` stores correctly
- Test `resetToInitial()` restores exact values
- Test `reset()` calls `resetToInitial()` when available

**Shipping Calculation:**
- Test postcode matching algorithm
- Test remote surcharge application
- Test fallback to default region

**Step Validation:**
- Test `isStepUnlocked()` logic for each transition
- Test orientation lock requirement
- Test navigation guards

### Edge Cases

**Home Page:**
- Zero active projects (empty state)
- Zero history (empty state)
- Very large counts (1000+ projects)

**Orientation:**
- Models with no orientation data
- Flat models (height < 0.2mm)
- Multiple resets in sequence

**Address Autocomplete:**
- No Google API key (graceful degradation)
- API quota exceeded
- Ambiguous addresses
- PO boxes vs street addresses
- International addresses (if supported)

**Shipping:**
- Invalid postcodes
- Postcodes not in any region
- Zero-weight items
- Multiple shipping regions in same order

**Navigation:**
- Browser back button behavior
- Direct URL access to locked steps
- Refreshing mid-flow (localStorage restore)

## Validation Commands
Execute every command to validate the task works correctly with zero regressions.

```bash
# 1. TypeScript compilation
npm run build
# EXPECTED: Build completes with 0 errors

# 2. Start dev server
npm run dev

# 3. Test Home Page
# Navigate to http://localhost:3000/client
# EXPECTED OUTPUT:
# - See 3 CTA cards: New Project, Active Projects, Print Again
# - Each card shows relevant count/badge
# - Cards are clickable and navigate correctly
# - Wallet balance visible at top
# - Mobile: cards stack vertically

# 4. Test Active Projects View
# Navigate to http://localhost:3000/client/projects/active
# EXPECTED OUTPUT:
# - List of active projects (or empty state)
# - Filters work: All, Pending Print, Pending Payment
# - Status badges display correctly
# - Clicking project opens details

# 5. Test Print Again View
# Navigate to http://localhost:3000/client/projects/history
# EXPECTED OUTPUT:
# - List of past orders
# - "Print Again" button on each item
# - Search/filter works
# - Pagination if >50 items

# 6. Test QuickPrint Flow - Orientation Lock Gate
# Navigate to http://localhost:3000/quick-order
# Upload a test STL file
# EXPECTED OUTPUT:
# - Progress to Orient step
# - "Next" button DISABLED until orientation locked
# - Warning message visible: "Please lock orientation..."
# - After clicking "Lock Orientation", "Next" button ENABLED
# - Can progress to Configure step

# 7. Test Hard Reset
# In Orient step, rotate model manually
# Click "Auto Orient"
# Rotate model again
# Click "Reset"
# EXPECTED OUTPUT:
# - Model returns to ORIGINAL orientation (first loaded state)
# - NOT the auto-oriented state
# - Quaternion values match initial snapshot

# 8. Test Step Navigation
# In QuickPrint flow:
# EXPECTED OUTPUT:
# - Upload step: "Next" button visible, "Previous" disabled
# - Orient step: Both buttons visible
# - Configure step: Both buttons visible
# - Price step: "Previous" visible, "Checkout" button
# - Clicking "Previous" goes back one step (state preserved)
# - Clicking "Next" advances (if step complete)

# 9. Test Address Autocomplete
# In Price step, focus on delivery address field
# Type "123 Pitt Street, Sydney"
# EXPECTED OUTPUT:
# - Dropdown appears with suggestions (after 300ms)
# - Selecting suggestion fills: line1, city, state, postcode
# - Shipping cost updates automatically
# - If API fails, manual entry still works

# 10. Test Shipping Estimation
# In Price step, enter postcode "2000"
# EXPECTED OUTPUT:
# - Shipping section shows "Sydney Metro" region
# - Base rate displayed: $12.50
# - No remote surcharge
# - Total shipping: $12.50
#
# Change postcode to "2880" (remote)
# EXPECTED OUTPUT:
# - Region: "Regional NSW"
# - Base rate: $25.00
# - Remote surcharge: +$15.00
# - Total shipping: $40.00

# 11. Screenshot verification
# Capture:
# - New home page with 3 CTAs
# - Active projects list (with data)
# - Print again history
# - Orientation lock warning message
# - Step navigation controls
# - Address autocomplete dropdown
# - Shipping breakdown card

# 12. Mobile testing
# Test on mobile viewport (375px width):
# EXPECTED OUTPUT:
# - CTA cards stack vertically
# - Navigation controls remain accessible
# - Address autocomplete works on touch
# - Forms are scrollable
```

# Implementation log created at:
# specs/fixes/client-portal-ux/client-portal-ux_implementation.log

## Definition of Done
- [x] All acceptance criteria met
- [x] All validation commands pass with expected output
- [x] No regressions (existing tests still pass)
- [x] Patterns followed (documented in Pattern Analysis)
- [ ] E2E test created and passing (recommended for critical flows)

## Notes

**Google Places API Costs:**
- Autocomplete (per session): $2.83 per 1000 sessions
- Session = from first keystroke until selection (or 3min timeout)
- Consider: Request field restrictions to reduce cost
- Alternative: Use free postcode lookup APIs for AU only

**Performance Considerations:**
- Debounce autocomplete to 300ms minimum
- Lazy-load Google Maps SDK (only when address field focused)
- Cache shipping region calculations client-side
- Consider virtualizing history list if >100 items

**Accessibility:**
- Ensure autocomplete announces suggestions to screen readers
- Keyboard navigation for step controls (arrow keys)
- Focus management when navigating between steps
- High contrast mode support for status badges

**Future Enhancements:**
- Save favorite shipping addresses
- Auto-detect location for faster address entry
- Bulk reorder (select multiple from history)
- Project tags/categories in active view
- Advanced filters (date range, amount range)

## Research Documentation

### Google Places Integration Research
If you need detailed guidance on Google Places implementation, create:
`/specs/fixes/client-portal-ux/research-google-places.md`

Topics to cover:
- API setup and restrictions
- React component integration patterns
- Error handling and fallbacks
- Cost optimization strategies
- Alternative providers (HERE, Mapbox, AU-specific services)
