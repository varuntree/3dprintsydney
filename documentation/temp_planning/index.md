# Implementation Plan - Multi-Issue Session

**Date**: 2025-01-21
**Issues**: 5 total
**Estimated Total Effort**: 22-33 hours
**Recommended Execution**: Sequential, in priority order

---

## 📋 Executive Summary

This session implements 5 distinct improvements to the 3D Print Sydney application:

1. **Account Settings UI Integration** - Fix broken account pages for admin/client portals
2. **Storage/Database/Payments Verification** - Add file cleanup, verify payments working
3. **Admin-Client Data Sync** - Fix file access control, optional real-time updates
4. **Quick Order UI Reordering** - Reorganize UI sections, modify 3D controls
5. **Credit System Implementation** - Full client wallet/credit system

All issues follow established code patterns and standards documented in `/documentation/`.

---

## 🎯 Issues Overview

### Issue 1: Account Settings UI Integration
**Priority**: Medium
**Effort**: 2 hours
**Complexity**: Low

**Problem**: Account settings page exists outside route groups, lacks sidebar/header integration.

**Solution**: Create role-specific account pages in `(admin)/account` and `(client)/account` route groups to leverage existing shell layouts.

**Key Changes**:
- Create `/src/app/(admin)/account/page.tsx`
- Create `/src/app/(client)/account/page.tsx`
- Delete `/src/app/account/page.tsx`
- Reuse existing ChangePasswordForm component

**Files Modified**: 3 files (2 created, 1 deleted)
**Testing**: Manual UI verification, password change functionality

---

### Issue 2: Storage/Database/Payments Verification
**Priority**: High (Critical Fixes)
**Effort**: 4-6 hours (critical path only)
**Complexity**: Medium

**Problem**: Files not cleaned up when invoices/quotes deleted, temporary files accumulate.

**Solution**: Add storage cleanup logic to delete operations, document tmp file strategy.

**Key Changes**:
- Add file deletion to `deleteInvoice()` and `deleteQuote()`
- Create `deleteFromStorage()` helper in storage service
- Add Stripe session staleness validation
- Document temporary file cleanup strategy

**Files Modified**: 5 files
**Testing**: Storage verification, payment flow testing

**Skip**: File deletion API (optional), full tmp cleanup implementation (document only)

---

### Issue 3: Admin-Client Data Synchronization
**Priority**: High (Access Control), Low (Real-time)
**Effort**: 2-3 hours (critical only), 11-16 hours (with optional)
**Complexity**: Low (access control), High (real-time)

**Problem**: Order files lack proper authorization checks at API level.

**Solution**: Add access control to file routes, verify client ownership.

**Key Changes** (Critical):
- Add authorization to `/api/order-files/[id]/route.ts`
- Add authorization to `/api/attachments/[id]/route.ts`
- Update services to include `clientId` in DTOs

**Files Modified**: 3 files (critical path)
**Testing**: File access authorization, admin vs client access

**Skip for Now** (Optional):
- Real-time status updates via WebSocket/polling (6-8 hours)
- Email notifications (4-6 hours)
- Client-side refresh UI (1-2 hours)

**Rationale**: Current implementation works (client sees updates on page refresh). Real-time features add significant complexity for minimal UX gain.

---

### Issue 4: Quick Order UI Reordering
**Priority**: Low
**Effort**: 1.5-2.5 hours
**Complexity**: Low

**Problem**: UI component order not optimal, 3D controls too complex, always visible.

**Solution**: Reorder JSX sections, add toggle for controls, remove X/Y/Z axis controls.

**Key Changes**:
- Reorder sections in page.tsx: Files → Settings → Orient
- Add `showRotationControls` state and toggle button
- Remove X/Y/Z grid from RotationControls component
- Keep Reset, Center, Lock buttons

**Files Modified**: 2 files
**Testing**: Visual verification, functionality testing

---

### Issue 5: Credit System Implementation
**Priority**: Medium-High
**Effort**: 11-16 hours
**Complexity**: High

**Problem**: No credit/wallet system for clients.

**Solution**: Full implementation with database schema, admin UI, client display, payment integration.

**Key Changes** (5 Phases):
1. Database migration (wallet_balance, credit_transactions table)
2. Admin credit management UI (modal to add credit)
3. Client wallet display (dashboard card)
4. Payment flow integration (deduct before Stripe)
5. Security hardening (atomic operations, locking)

**Files Created**: 4 new files
**Files Modified**: 10 files
**Testing**: Credit operations, payment flow, security validation

**Database Functions**: Atomic operations with row-level locking to prevent race conditions

---

## 📊 Effort Breakdown

| Issue | Critical Path | Optional | Total Range |
|-------|---------------|----------|-------------|
| 1. Account Settings | 2 hours | - | 2 hours |
| 2. Storage/DB/Payments | 4-6 hours | 2-4 hours | 6-10 hours |
| 3. Admin-Client Sync | 2-3 hours | 11-16 hours | 13-19 hours |
| 4. Quick Order UI | 1.5-2.5 hours | - | 1.5-2.5 hours |
| 5. Credit System | 11-16 hours | - | 11-16 hours |
| **TOTALS** | **20.5-29.5 hours** | **13-20 hours** | **33.5-49.5 hours** |

**Recommended Execution**: Critical path only = 20.5-29.5 hours (~ 3-4 days)

---

## 🔄 Sequential Execution Plan

### Session 1: Quick Wins (3-4 hours)
**Order**: Issues 1 → 4

**Rationale**: Start with low-complexity, high-visibility improvements.

1. **Issue 1: Account Settings** (2 hours)
   - Create admin/client account pages
   - Test password change for both roles
   - Delete old root account page

2. **Issue 4: Quick Order UI** (1.5-2.5 hours)
   - Reorder UI sections
   - Add controls toggle
   - Remove X/Y/Z controls

**Output**: Immediate UX improvements, no dependencies

---

### Session 2: Critical Security (4-6 hours)
**Order**: Issue 2 (critical fixes) → Issue 3 (access control)

1. **Issue 2: Storage Cleanup** (4-6 hours)
   - Add file deletion to invoice/quote delete
   - Create storage helpers
   - Add Stripe session validation
   - Document tmp file strategy

2. **Issue 3: File Access Control** (2-3 hours)
   - Add authorization to file routes
   - Update services with clientId
   - Test access restrictions

**Output**: Security holes closed, storage properly managed

---

### Session 3: Feature Implementation (11-16 hours)
**Order**: Issue 5 (Credit System)

**Phase 1**: Database & Services (3-4 hours)
- Run migration
- Create credit service
- Add database functions

**Phase 2**: Admin UI (2-3 hours)
- Create API route
- Build add credit modal
- Update client detail

**Phase 3**: Client Display (1-2 hours)
- Update dashboard service
- Add wallet card

**Phase 4**: Payment Integration (3-4 hours)
- Update invoice creation
- Integrate with quick order
- Validate Stripe flow

**Phase 5**: Security & Testing (2-3 hours)
- Comprehensive testing
- Security validation
- Edge case handling

**Output**: Complete credit system, ready for production

---

## ⏭️ Optional Enhancements (Future Sessions)

If time permits or user requests:

### Optional A: Real-Time Status Updates (6-8 hours)
- Implement polling mechanism (simpler than WebSocket)
- Add "Last updated" timestamp
- Add manual refresh button

### Optional B: Email Notifications (4-6 hours)
- Integrate email service (SendGrid/Resend)
- Create email templates
- Implement job status notifications

### Optional C: File Management (2-4 hours)
- Add file deletion API for admins
- Implement scheduled tmp file cleanup
- Add storage usage dashboard

**Total Optional**: 12-18 hours

---

## 🧪 Testing Strategy

### Per-Issue Testing
Each issue includes detailed testing checklist in individual plan file.

### Integration Testing (After All Issues)
1. **End-to-End Workflow**:
   - Client signup → Admin sees in list
   - Admin adds credit → Client sees in dashboard
   - Client uploads files → Admin accesses files
   - Client places order with credit → Deduction + Stripe
   - Admin updates job status → Client sees update (on refresh)

2. **Cross-Issue Verification**:
   - Account settings accessible from both portals
   - Files properly deleted when invoices removed
   - Credit applied before Stripe checkout
   - Quick order UI reordering doesn't break workflow

3. **Regression Testing**:
   - Existing quote/invoice workflows
   - PDF generation
   - Payment processing
   - Client-admin separation

---

## 📁 Documentation Structure

```
/documentation/temp_planning/
├── index.md                           # THIS FILE (high-level plan)
├── exploration_summary/               # Context from parallel exploration
│   ├── 01_account_settings.md        # Current state analysis
│   ├── 02_storage_database_payments.md
│   ├── 03_admin_client_sync.md
│   ├── 04_quick_order_ui.md
│   └── 05_credit_system.md
└── planning/                          # Detailed implementation plans
    ├── 01_account_settings_plan.md   # Step-by-step implementation
    ├── 02_storage_database_payments_plan.md
    ├── 03_admin_client_sync_plan.md
    ├── 04_quick_order_ui_plan.md
    └── 05_credit_system_plan.md
```

**How to Use**:
1. Read this index for high-level understanding
2. Refer to individual planning files for detailed implementation steps
3. Consult exploration files for context on current implementation

---

## ⚠️ Risk Assessment

### Low Risk
- **Issue 1** (Account Settings): Simple file moves, no business logic changes
- **Issue 4** (Quick Order UI): UI reordering only, state management unchanged

### Medium Risk
- **Issue 2** (Storage Cleanup): Edge case: File deletion failure shouldn't block DB deletion
- **Issue 3** (Access Control): Must thoroughly test authorization to prevent data leaks

### High Risk
- **Issue 5** (Credit System): Complex state management, race conditions possible
  - **Mitigation**: Atomic database functions with row locking
  - **Testing**: Concurrent operation tests, negative balance prevention

---

## 🎓 Code Standards Compliance

All implementations follow established patterns from `/documentation/CODE_STANDARDS_AND_PATTERNS.md`:

✅ **Service Layer**: All business logic in `/src/server/services/`
✅ **Error Handling**: Custom AppError classes with consistent codes
✅ **Validation**: Zod schemas for all inputs
✅ **API Response**: Standardized `ok()` and `fail()` envelopes
✅ **Logging**: Structured JSON logs with scope-based naming
✅ **Authentication**: requireAdmin/requireClient/requireAuth patterns
✅ **Type Safety**: DTOs for all service responses

---

## 📝 Pre-Execution Checklist

Before starting implementation:

- [ ] Review all exploration summaries
- [ ] Review all planning documents
- [ ] Understand dependencies between issues
- [ ] Confirm execution order (recommend 1 → 4 → 2 → 3 → 5)
- [ ] Backup database before migration (Issue 5)
- [ ] Ensure dev environment up to date
- [ ] Review CODE_STANDARDS_AND_PATTERNS.md
- [ ] Prepare testing accounts (admin + client)

---

## 🚀 Ready to Execute

**Recommended Start**: Issue 1 (Account Settings)
**Reasoning**: Lowest complexity, immediate UX improvement, no dependencies

**Critical Path**: Issues 1, 4, 2 (critical), 3 (access control), 5
**Timeline**: 3-4 working days for critical path
**Full Implementation**: 4-6 working days with optional features

**Next Steps**:
1. ✅ User reviews this plan
2. User approves or requests modifications
3. Begin sequential execution starting with Issue 1
4. Test after each issue before moving to next
5. Integration testing after all issues complete

---

## 📖 Detailed Plans

For step-by-step implementation instructions, see:

- **Issue 1**: [Account Settings Plan](./planning/01_account_settings_plan.md)
- **Issue 2**: [Storage/Database/Payments Plan](./planning/02_storage_database_payments_plan.md)
- **Issue 3**: [Admin-Client Sync Plan](./planning/03_admin_client_sync_plan.md)
- **Issue 4**: [Quick Order UI Plan](./planning/04_quick_order_ui_plan.md)
- **Issue 5**: [Credit System Plan](./planning/05_credit_system_plan.md)

Each plan includes:
- Detailed implementation steps with code examples
- Testing checklists
- Files modified summary
- Success criteria

---

**Status**: ⏸️ **AWAITING APPROVAL**
**Action Required**: User review and approval to proceed with execution
