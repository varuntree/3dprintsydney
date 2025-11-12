# Phase 2: Test Coverage Audit

**Date:** 2025-11-12
**Project:** 3D Print Sydney  
**Testing Framework:** Vitest 4.0.8  
**Total Project Code:** ~16,052 LOC

---

## Executive Summary

**Current State:** Minimal test coverage with only 4 test files covering ~180 LOC.  
**Coverage Ratio:** ~1.1% of source code has test coverage.  
**Assessment:** Foundation exists but extensive gaps. Most critical business logic untested.

---

## 1. Vitest Configuration

### Configuration Summary

**File:** `vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
  },
});
```

**Settings:**
- Environment: Node.js (correct for unit tests)
- TS Path Aliases: Configured via `vite-tsconfig-paths`
- Coverage: NOT configured (no coverage thresholds, reporters, or paths)
- No watch mode or reporter customization

**Gaps:**
- No coverage configuration (no `coverage` object in test config)
- No reporter setup (missing c8, istanbul, or coverage reporting)
- No test patterns defined (relies on defaults: `**/*.test.ts`, `**/*.spec.ts`)
- No excluded paths specified
- No setup files configured

**Recommendations:**
- Add coverage config with thresholds (lines, branches, functions)
- Configure coverage reporters (html, json, text)
- Define explicit test include/exclude patterns
- Add test setup files if needed (mocking, fixtures)

---

## 2. Existing Test Inventory

### Test Files Found (4 files, 180 LOC)

#### lib/3d Module (2 tests)
- **face-alignment.test.ts** (33 LOC)
  - Tests: `calculateFaceToGroundQuaternion`, `raycastFace`
  - Focus: 3D mesh rotation & face raycasting
  - Coverage: 3 test cases

- **overhang-detector.test.ts** (57 LOC)
  - Tests: `detectOverhangs`
  - Focus: Support structure detection
  - Coverage: 5 test cases

#### lib/utils Module (1 test)
- **validators.test.ts** (16 LOC)
  - Tests: `validateOrderFile`
  - Focus: 3D model file validation
  - Coverage: 2 test cases

#### server/services Module (1 test)
- **quick-order-pricing.test.ts** (75 LOC)
  - Tests: `priceQuickOrder`
  - Focus: Order pricing calculation
  - Coverage: 2 test cases with mocking

### Test Statistics

| Metric | Count |
|--------|-------|
| Total Test Files | 4 |
| Total Test Cases | 12 |
| Total Test LOC | 180 |
| Test Commands | `npm test` (runs all) |

---

## 3. Coverage Analysis

### What's Tested Well ✓

1. **3D Geometry Operations**
   - Face-to-ground quaternion calculation
   - Raycasting face normals
   - Overhang detection algorithms
   - Support weight estimation
   - Custom threshold angles

2. **File Validation**
   - Order file MIME type validation
   - Extension-based fallback validation
   - Basic constraint checking

3. **Pricing Logic (Partial)**
   - Material cost separation
   - Support material handling
   - Mocking patterns established

---

## 4. Coverage Gaps (Critical)

### Server Services (11.3K LOC, ~0.5% tested)

**Completely Untested:**
- `invoices.ts` (1501 LOC) - Core billing service
  - Invoice CRUD, status transitions, calculations
  - Payment tracking, refunds, write-offs
  - Attachment management, activity logs
  
- `quick-order.ts` (882 LOC) - Only 2 test cases
  - 95% untested: shipping, taxes, discounts
  - Order creation, file processing
  - Integration with pricing engine

- `quotes.ts` (1111 LOC) - 0% tested
  - Quote generation, acceptance, conversion
  - Status workflows, decline handling
  - Client communication triggers

- `jobs.ts` (1205 LOC) - 0% tested
  - Job scheduling, queue management
  - Status transitions, printer allocation
  - Material & support calculations

- `messages.ts` (773 LOC) - 0% tested
  - Message creation, threading, search
  - Notification logic, user tagging

- `exports.ts` (375 LOC) - 0% tested
- `product-templates.ts` (284 LOC) - 0% tested
- `settings.ts` (294 LOC) - 0% tested
- `stripe.ts` (303 LOC) - 0% tested
- `clients.ts` - 0% tested
- `materials.ts` (223 LOC) - 0% tested
- `order-files.ts` (249 LOC) - 0% tested
- `users.ts` (246 LOC) - 0% tested
- `credits.ts` - 0% tested
- `email.ts` - 0% tested
- `dashboard.ts` - 0% tested

**Completely Untested Modules:**
- Auth services (session, permissions, API helpers)
- Geometry loading & orientation
- Slicer runner integration
- Supabase client initialization

### lib Utilities (4.4K LOC, ~4% tested)

**Untested:**
- `calculations.ts` - Discount & tax calculations
- `student-discount.ts` - Student pricing logic
- `currency.ts` - Currency formatting
- `datetime.ts` - Date utilities
- `auth-utils.ts` - Auth helper functions
- `chat/group-messages.ts` - Message grouping logic
- Schemas (validation schemas, not logic tests)
- Error handling classes

**Partially Tested:**
- `validators.ts` - Only `validateOrderFile` tested
  - Missing: `validatePasswordChange`, `validateFileSize`, `validateFileType`, `validateInvoiceAttachment`

### API Routes (untested)

All ~50 Next.js API route handlers untested:
- Invoice CRUD endpoints
- Quote workflow endpoints
- Client management endpoints
- Payment processing endpoints
- Material endpoints
- Settings endpoints
- Auth endpoints

### UI/Components (untested)

No tests for React components:
- Invoice editor
- Quote preview
- Quick order form
- Client dashboard
- Admin panels

---

## 5. Test Quality Assessment

### Strengths

1. **Good Test Structure**
   - Clear `describe`/`it` blocks
   - Readable test names
   - Proper setup with `beforeEach`

2. **Proper Mocking**
   - `vi.mock()` used correctly in `quick-order-pricing.test.ts`
   - Mock data realistic and maintainable
   - Service boundaries respected

3. **Geometric Math Testing**
   - Edge cases tested (different normals, rotations)
   - Numerical assertions with `toBeCloseTo()` (prevents float precision issues)
   - Three.js integration validated

4. **Assertion Quality**
   - Specific expectations (not just "doesn't throw")
   - Multiple assertions per test
   - Boolean comparisons appropriate

### Weaknesses

1. **Limited Scope**
   - Only unit tests, no integration tests
   - No error path testing (most tests are happy paths)
   - No edge case testing beyond basic scenarios

2. **Minimal Test Data**
   - Simple fixtures (no complex real-world scenarios)
   - No negative test cases
   - No boundary value testing

3. **No Test Helpers/Utilities**
   - No shared fixtures or factory functions
   - Repeated mock setup in `quick-order-pricing.test.ts`
   - No test data builders

4. **Missing Coverage Areas**
   - No error handling tests
   - No validation failure cases
   - No async error scenarios
   - No database transaction tests

5. **No E2E or Integration Tests**
   - Services mocked at module level
   - Real database interactions untested
   - API routes not tested end-to-end

---

## 6. Testing Framework Assessment

### What Works Well

1. **Vitest Setup**
   - Fast execution (no test overhead)
   - ESM & TS native support
   - Good mocking capabilities

2. **Path Alias Resolution**
   - `@/*` paths work in tests
   - tsconfig paths plugin configured
   - Imports translate correctly

3. **Test Discovery**
   - Files auto-discovered from `__tests__` & `.test.ts`
   - Single command execution (`npm test`)

### Gaps

1. **No Coverage Reporting**
   - Can't measure coverage %
   - No coverage thresholds
   - No HTML report generation

2. **No CI/CD Integration**
   - No GitHub Actions workflow
   - No coverage gates
   - No test result reporting

3. **No Test Utilities**
   - No custom helpers
   - No test database setup
   - No async test utilities

---

## 7. Recommendations by Priority

### Phase 1: Foundation (Weeks 1-2)

1. **Enhance Vitest Config**
   - Add coverage configuration (c8 provider)
   - Set coverage thresholds (aim for 80%+ eventually)
   - Configure HTML/JSON reporters
   - Add setup files for global mocks

2. **Create Test Utilities**
   - Test data builders/factories
   - Common mocking helpers
   - Database test utilities
   - Auth mock helpers

3. **Test Critical Math**
   - Pricing calculations (`priceQuickOrder`)
   - Discount/tax logic
   - Support weight estimation

### Phase 2: Core Services (Weeks 3-4)

1. **Invoice Service** (1501 LOC)
   - CRUD operations
   - Status transitions
   - Payment handling
   - Calculation validation

2. **Quick Order Service** (882 LOC)
   - Pricing edge cases
   - Shipping calculation
   - Tax handling
   - Error scenarios

3. **Quote Service** (1111 LOC)
   - Quote generation
   - Status workflows
   - Conversion logic

### Phase 3: Supporting Services (Week 5)

1. **Auth Services** (session, permissions)
2. **Job Service** (queue, scheduling)
3. **Message Service** (threading, search)

### Phase 4: Integration & E2E (Weeks 6-7)

1. **API Route Testing**
   - Mock Supabase at handler level
   - Test request/response handling
   - Error response validation

2. **Database Integration Tests**
   - Use test database or SQLite
   - Real transaction testing
   - RLS policy validation

3. **Component Tests** (if adopting)
   - Critical forms
   - Data display components

### Phase 5: Continuous Improvement (Ongoing)

1. **Coverage Targets**
   - Lines: 80%+ of services
   - Branches: 70%+ of services
   - Functions: 90%+ of services

2. **Pre-commit Hooks**
   - Run tests on commit
   - Block commits if coverage drops
   - Type checking on commit

3. **CI/CD Pipeline**
   - GitHub Actions for test runs
   - Coverage reports in PRs
   - Automated coverage tracking

---

## 8. Implementation Strategy

### Test Structure Proposal

```
src/
├── lib/
│   ├── __tests__/
│   │   ├── calculations.test.ts
│   │   ├── currency.test.ts
│   │   └── validators/
│   │       ├── password.test.ts
│   │       └── files.test.ts
│   └── [modules]
└── server/
    ├── __tests__/
    │   ├── test-fixtures.ts (shared data)
    │   ├── test-mocks.ts (service mocks)
    │   └── db-helpers.ts (database utilities)
    └── services/
        ├── __tests__/
        │   ├── invoices.test.ts
        │   ├── quotes.test.ts
        │   ├── quick-order.test.ts
        │   └── pricing/
        │       ├── calculations.test.ts
        │       └── discounts.test.ts
        └── [modules]
```

### Test Utility Kit

```typescript
// test-fixtures.ts
export const mockMaterial = (overrides?) => ({
  id: 1,
  name: "PLA",
  cost_per_gram: 0.05,
  ...overrides,
});

export const mockQuickOrderItem = (overrides?) => ({
  materialId: 1,
  supportMaterialId: 2,
  metrics: { grams: 50, supportGrams: 10, timeSec: 3600 },
  ...overrides,
});

// test-mocks.ts
export const createMockSupabase = () => ({
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  }),
});
```

---

## 9. Metrics & Baselines

### Current Metrics

| Metric | Value |
|--------|-------|
| Total Source LOC | 16,052 |
| Tested LOC | ~180 |
| Coverage % | ~1.1% |
| Test Files | 4 |
| Test Cases | 12 |
| Test LOC | 180 |

### Target Metrics (End of Phase 2)

| Metric | Target |
|--------|--------|
| Service Coverage | 80%+ |
| Test LOC | 1,500+ |
| Test Cases | 100+ |
| CI/CD Pipeline | Implemented |

---

## 10. Next Steps

1. **Immediate (This Sprint)**
   - Enhance `vitest.config.ts` with coverage settings
   - Create test utilities & fixtures
   - Add 5-10 tests to validators module

2. **Short-term (Next 2 Weeks)**
   - Complete pricing calculation tests
   - Add invoice service foundation tests
   - Set up CI/CD test automation

3. **Medium-term (Next Month)**
   - 80% coverage on critical services
   - API route test harness
   - Integration test framework

---

## Summary

The project has a solid testing foundation with Vitest properly configured and good examples in 3D geometry and pricing. However, coverage is minimal (~1.1%) with vast gaps in core business logic. Prioritize invoice, quote, and job services. With focused effort, reaching 50% coverage is achievable in 4 weeks.

**Key Actions:**
1. Enhance vitest config with coverage reporting
2. Build test utility library
3. Test critical math operations
4. Add invoice service tests
5. Set up CI/CD integration

