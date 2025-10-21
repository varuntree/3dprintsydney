# Phase 2: Type Organization - Implementation Plan

**Created:** 2025-10-21
**Status:** Ready for Implementation

---

## Executive Summary

Phase 2 will centralize all type definitions into `/lib/types/` following Pattern 4 from STANDARDS.md. Currently, types are scattered across 90+ locations including services, components, and schemas. This phase will create feature-colocated type files and update ~72 files with ~63 import statements.

**Scope:** Moderate-High (72 files to update)
**Risk Level:** Medium (many import path updates)
**Estimated Duration:** 3-4 hours

---

## Analysis Summary

### From Agent 1 (Type Definitions):
- **90+ type definitions** scattered across codebase
- **15 locations** where types are defined
- **12+ inline types** not exported (hidden)
- **4+ duplicated types** with separate implementations
- **Key Resources:** Clients (7 types), Invoices (13 types), Quotes (15 types), Jobs (20 types), Common (20+ types)

### From Agent 2 (Type Patterns):
- **Current State:** Partially organized (50/100)
- **Good Patterns:** Schema-based inputs, enum constants, service DTOs
- **Issues:** Missing filter types, scattered component types, inconsistent DTO naming
- **Anti-Patterns:** Inline filter objects, duplicate component types, mixed DTO naming

### From Agent 3 (Dependencies):
- **254 total** TypeScript/TSX files
- **95+ files** importing types (37% of codebase)
- **72 files** requiring import path updates
- **~63 import statements** to update
- **High-risk files:** invoice-editor.tsx, quote-editor.tsx, invoices.ts, quotes.ts

---

## Goals & Success Criteria

### Goals:
1. ✅ Create centralized type directory `/lib/types/`
2. ✅ Follow naming conventions: `ResourceDTO`, `ResourceInput`, `ResourceFilters`
3. ✅ Consolidate scattered types into feature-colocated files
4. ✅ Remove duplicate type definitions
5. ✅ Create missing Filter types
6. ✅ Maintain schema-based validation (keep /lib/schemas/)

### Success Criteria:
- [ ] All types follow STANDARDS.md Pattern 4
- [ ] No duplicate type definitions
- [ ] All imports use `@/lib/types/[resource]` paths
- [ ] Build passes with zero TypeScript errors
- [ ] No functionality changes
- [ ] All tests pass

---

## Implementation Strategy

### Conservative Approach:
Instead of moving ALL types to `/lib/types/`, we'll use a **hybrid approach**:

1. **Keep schemas in `/lib/schemas/`** - They provide runtime validation + types
2. **Create `/lib/types/[resource].ts`** - Define DTOs, Filters, and re-export Input types from schemas
3. **Update imports** - Services and components import from `/lib/types/`
4. **Remove duplicates** - Eliminate redundant type definitions in components

This approach:
- ✅ Preserves Zod validation
- ✅ Centralizes type definitions
- ✅ Minimizes breaking changes
- ✅ Follows STANDARDS.md patterns

---

## Files to Create

### New Type Files (6 files):

1. **`/src/lib/types/index.ts`**
   - Central export point for all types
   - Re-exports from all resource type files
   - Re-exports enums from constants

2. **`/src/lib/types/clients.ts`**
   - ClientDTO (from services/clients.ts)
   - ClientSummaryDTO (from services/clients.ts)
   - ClientDetailDTO (from services/clients.ts)
   - ClientInput (re-export from schemas/clients.ts)
   - ClientNoteInput (re-export from schemas/clients.ts)
   - ClientFilters (NEW - for list operations)

3. **`/src/lib/types/invoices.ts`**
   - InvoiceDetailDTO (from services/invoices.ts)
   - InvoiceLineDTO (NEW - for line items)
   - PaymentDTO (NEW - for payments)
   - InvoiceInput (re-export from schemas/invoices.ts)
   - InvoiceLineInput (re-export from schemas/invoices.ts)
   - PaymentInput (re-export from schemas/invoices.ts)
   - InvoiceFilters (NEW - for list operations)

4. **`/src/lib/types/quotes.ts`**
   - QuoteDetailDTO (from services/quotes.ts)
   - QuoteLineDTO (NEW - for line items)
   - QuoteInput (re-export from schemas/quotes.ts)
   - QuoteLineInput (re-export from schemas/quotes.ts)
   - QuoteFilters (NEW - for list operations)

5. **`/src/lib/types/jobs.ts`**
   - JobDTO (rename from JobCard in services/jobs.ts)
   - JobBoardColumnDTO (from services/jobs.ts)
   - JobBoardSnapshotDTO (from services/jobs.ts)
   - JobInput (re-export from schemas/jobs.ts)
   - JobUpdateInput (re-export from schemas/jobs.ts)
   - JobStatusInput (re-export from schemas/jobs.ts)
   - JobFilters (NEW - for list operations)

6. **`/src/lib/types/common.ts`**
   - PaginationOptions (NEW - base pagination type)
   - SortOptions<T> (NEW - base sort type)
   - ListResponse<T> (NEW - standardized list response)
   - SearchOptions (NEW - base search type)

---

## Files to Update

### Service Files (17 files):
- `src/server/services/clients.ts` - Remove DTO definitions, import from @/lib/types/clients
- `src/server/services/invoices.ts` - Remove DTO definitions, import from @/lib/types/invoices
- `src/server/services/quotes.ts` - Remove DTO definitions, import from @/lib/types/quotes
- `src/server/services/jobs.ts` - Remove DTO definitions, import from @/lib/types/jobs
- `src/server/services/printers.ts` - Add PrinterDTO to common types
- `src/server/services/materials.ts` - Add MaterialDTO to common types
- `src/server/services/product-templates.ts` - Add ProductTemplateDTO to common types
- `src/server/services/dashboard.ts` - Add DashboardDTO to common types
- `src/server/services/quick-order.ts` - Add QuickOrderDTO to common types
- ... (additional service files)

### Component Files (25+ files):
- `src/components/invoices/invoice-editor.tsx` - Import types from @/lib/types/invoices
- `src/components/invoices/invoice-view.tsx` - Import types from @/lib/types/invoices
- `src/components/invoices/invoices-view.tsx` - Import types from @/lib/types/invoices
- `src/components/quotes/quote-editor.tsx` - Import types from @/lib/types/quotes
- `src/components/quotes/quote-view.tsx` - Import types from @/lib/types/quotes
- `src/components/quotes/quotes-view.tsx` - Import types from @/lib/types/quotes
- `src/components/clients/clients-view.tsx` - Import types from @/lib/types/clients
- `src/components/clients/client-detail.tsx` - Import types from @/lib/types/clients
- `src/components/jobs/job-board.tsx` - Import types from @/lib/types/jobs
- ... (additional component files)

### API Route Files (30+ files):
- All API routes importing service types will automatically get updated paths

---

## Implementation Order

### Step 1: Create Common Types (Low Risk)
**Time:** 15 minutes
**Risk:** LOW

1. Create `/src/lib/types/common.ts`
   - Define PaginationOptions, SortOptions, ListResponse, SearchOptions
   - No breaking changes (new file)

2. Create `/src/lib/types/index.ts`
   - Set up central export structure
   - Re-export enums from constants
   - Prepare for resource type exports

**Verification:** TypeScript check should pass, no changes yet

---

### Step 2: Create Client Types (Medium Risk)
**Time:** 30 minutes
**Risk:** MEDIUM

1. Create `/src/lib/types/clients.ts`
   - Copy ClientSummaryDTO and ClientDetailDTO from services/clients.ts
   - Re-export ClientInput and ClientNoteInput from schemas
   - Create ClientFilters type

2. Update `/src/server/services/clients.ts`
   - Remove ClientSummaryDTO and ClientDetailDTO definitions
   - Import from `@/lib/types/clients`
   - Keep internal helper types (ClientRow) as-is

3. Update `/src/lib/types/index.ts`
   - Add: `export * from './clients';`

4. Update component files (2 files):
   - `src/components/clients/clients-view.tsx`
   - `src/components/clients/client-detail.tsx`
   - Import from `@/lib/types/clients`

**Verification:** Run `npm run typecheck` and `npm run build`

---

### Step 3: Create Invoice Types (High Risk)
**Time:** 45 minutes
**Risk:** HIGH (complex types, many dependencies)

1. Create `/src/lib/types/invoices.ts`
   - Copy InvoiceDetail from services/invoices.ts
   - Define InvoiceLineDTO and PaymentDTO
   - Re-export Input types from schemas
   - Create InvoiceFilters type

2. Update `/src/server/services/invoices.ts`
   - Remove InvoiceDetail definition
   - Import from `@/lib/types/invoices`
   - Keep internal row types

3. Update `/src/lib/types/index.ts`
   - Add: `export * from './invoices';`

4. Update component files (5 files):
   - `src/components/invoices/invoice-editor.tsx`
   - `src/components/invoices/invoice-view.tsx`
   - `src/components/invoices/invoices-view.tsx`
   - `src/components/invoices/invoice-payments.tsx`
   - `src/components/invoices/invoice-attachments.tsx`

5. Update API routes (10+ files)
   - Auto-updated via service imports

**Verification:** Run `npm run typecheck` and `npm run build`

---

### Step 4: Create Quote Types (High Risk)
**Time:** 45 minutes
**Risk:** HIGH (complex types, cross-dependencies with invoices)

1. Create `/src/lib/types/quotes.ts`
   - Copy QuoteDetail from services/quotes.ts
   - Define QuoteLineDTO
   - Re-export Input types from schemas
   - Create QuoteFilters type

2. Update `/src/server/services/quotes.ts`
   - Remove QuoteDetail definition
   - Import from `@/lib/types/quotes`
   - Keep internal row types

3. Update `/src/lib/types/index.ts`
   - Add: `export * from './quotes';`

4. Update component files (3 files):
   - `src/components/quotes/quote-editor.tsx`
   - `src/components/quotes/quote-view.tsx`
   - `src/components/quotes/quotes-view.tsx`

5. Update API routes (8+ files)
   - Auto-updated via service imports

**Verification:** Run `npm run typecheck` and `npm run build`

---

### Step 5: Create Job Types (Medium Risk)
**Time:** 30 minutes
**Risk:** MEDIUM

1. Create `/src/lib/types/jobs.ts`
   - Copy JobCard, JobBoardColumn, JobBoardSnapshot from services/jobs.ts
   - Re-export Input types from schemas
   - Create JobFilters type

2. Update `/src/server/services/jobs.ts`
   - Remove type definitions
   - Import from `@/lib/types/jobs`

3. Update `/src/lib/types/index.ts`
   - Add: `export * from './jobs';`

4. Update component files (1 file):
   - `src/components/jobs/job-board.tsx`

**Verification:** Run `npm run typecheck` and `npm run build`

---

### Step 6: Clean Up & Final Verification (Low Risk)
**Time:** 30 minutes
**Risk:** LOW

1. Remove duplicate type definitions from components
2. Update any remaining imports to use `@/lib/types/`
3. Run full build verification
4. Run code review agent
5. Fix any issues found

---

## Dependencies & Side Effects

### Cross-Schema Dependencies:
- **invoices.ts imports from quotes.ts** - Both use shared discount types
- **Resolution:** Create shared types in common.ts or keep in schemas

### Enum Dependencies:
- Enums in `/lib/constants/enums.ts` are imported widely
- **Resolution:** Re-export from `/lib/types/index.ts` for convenience

### Service Internal Types:
- Row types (ClientRow, InvoiceRow, etc.) are internal to services
- **Resolution:** Keep as internal types, do not export to /lib/types/

### Component Form Types:
- InvoiceFormValues, QuoteFormValues in components
- **Resolution:** Define as type aliases to Input types or keep as component-local

---

## Risk Assessment

### High-Risk Areas:
1. **Invoice Editor Component** (3 type imports, complex form logic)
   - Mitigation: Test thoroughly, update incrementally

2. **Quote Editor Component** (2 type imports, calculator logic)
   - Mitigation: Test calculator functionality after changes

3. **Service Files** (4+ type imports each)
   - Mitigation: Update one service at a time, verify build

### Medium-Risk Areas:
1. **API Routes** (auto-updated via service imports)
   - Mitigation: Build verification catches issues

2. **Job Board** (5 types used)
   - Mitigation: Test drag-and-drop functionality

### Low-Risk Areas:
1. **New common types** (no existing dependencies)
2. **Re-export from index** (additive only)

---

## Rollback Plan

If build fails or issues arise:

1. **Immediate Rollback:**
   ```bash
   git reset --hard [last-working-commit]
   ```

2. **Partial Rollback:**
   - Keep completed steps
   - Revert problematic step only
   - Document issue in workspace.md

3. **Adjust Plan:**
   - Reduce scope (e.g., only move DTOs, not all types)
   - Use different structure
   - Retry with more incremental approach

---

## Testing Strategy

### After Each Step:
```bash
# Type check
npm run typecheck

# Build
npm run build

# Lint
npm run lint
```

### Before Final Commit:
```bash
# Full clean build
rm -rf .next
npm run build

# Start dev server (manual smoke test)
npm run dev
```

### Manual Testing Checklist:
- [ ] Client list loads
- [ ] Invoice editor opens
- [ ] Quote editor calculator works
- [ ] Job board drag-and-drop works
- [ ] Forms submit successfully

---

## Success Metrics

### Quantitative:
- **Types centralized:** 90+ types → 6 files
- **Import paths updated:** ~63 statements
- **Files updated:** ~72 files
- **Duplicate types removed:** 4+ duplicates
- **Build errors:** 0

### Qualitative:
- ✅ Types follow consistent naming convention
- ✅ Clear separation of concerns (DTOs, Inputs, Filters)
- ✅ Single source of truth for each type
- ✅ Easy to find types (centralized location)
- ✅ Improved developer experience

---

## Notes for Implementation

1. **Keep it incremental:** Complete one resource at a time, verify build after each
2. **Don't move schemas:** Keep Zod schemas in /lib/schemas/ for runtime validation
3. **Don't export internal types:** Row types stay internal to services
4. **Use import type:** Where possible, use `import type` for type-only imports
5. **Update workspace.md:** Track progress for each resource

---

## Estimated Timeline

| Step | Task | Duration | Cumulative |
|------|------|----------|------------|
| 1 | Create common types | 15 min | 15 min |
| 2 | Create client types + update imports | 30 min | 45 min |
| 3 | Create invoice types + update imports | 45 min | 90 min |
| 4 | Create quote types + update imports | 45 min | 135 min |
| 5 | Create job types + update imports | 30 min | 165 min |
| 6 | Clean up & verification | 30 min | 195 min |
| **TOTAL** | | **3.25 hours** | |

---

**Ready to Execute:** Yes ✅
**Last Updated:** 2025-10-21
