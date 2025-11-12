# E2E Testing Quick Reference

**Generated:** 2025-11-12  
**Document:** Quick lookup guide for E2E test scenarios

---

## Test Scenarios at a Glance

### Admin Flows (6 scenarios)

| # | Scenario | Duration | Key Tech |
|---|----------|----------|----------|
| 1 | Quote → Invoice → Payment | 60s | Email, Activity logs |
| 2 | Quick-Order Upload → Job | 120s | File upload, Stripe, Jobs |
| 3 | Client: Create → Credit | 90s | Wallet, Activity logs |
| 4 | Invoice: Edit → Recalculate | 60s | Form validation, Math |
| 5 | Job Board: Drag-Drop | 45s | Drag-drop, DB update |
| 6 | Material: Price → Impact | 60s | Pricing calc, DB |

### Client Flows (5 scenarios)

| # | Scenario | Duration | Key Tech |
|---|----------|----------|----------|
| 1 | Signup → Portal | 15s | Auth, Email |
| 2 | Payment: Credit + Stripe | 60s | Stripe, Payment |
| 3 | Projects: Track Lifecycle | 90s | Jobs, Notifications |
| 4 | 3D: Upload → Preview | 45s | Three.js, File upload |
| 5 | Messaging: Thread | 45s | Activity, Email |

### Auth & Session (3 scenarios)

| # | Scenario | Duration | Test Type |
|---|----------|----------|-----------|
| 1 | Login: Role-based redirect | 15s | A/B/C tests |
| 2 | Session: Persist on reload | 30s | Cookie validation |
| 3 | Logout: Cleanup | 10s | Redirect, 401 |

### Forms & Validation (2 scenarios)

| # | Scenario | Duration | Field Count |
|---|----------|----------|------------|
| 1 | Invoice: Form validation | 30s | 8+ fields |
| 2 | Quick-Order: Dynamic pricing | 45s | 5+ interactions |

### Files (3 scenarios)

| # | Scenario | Duration | Storage |
|---|----------|----------|---------|
| 1 | STL Upload | 20s | /tmp bucket |
| 2 | PDF Download | 10s | Server-generated |
| 3 | Attachment Upload | 30s | /attachments bucket |

### Real-Time (2 scenarios)

| # | Scenario | Duration | Trigger |
|---|----------|----------|---------|
| 1 | Job Status → Email | 30s | Status update |
| 2 | Dashboard Activity | 15s | DB polling |

### Permissions (2 scenarios)

| # | Scenario | Duration | Check |
|---|----------|----------|-------|
| 1 | Client blocked from /admin | 10s | Redirect |
| 2 | Admin blocked from /client | 10s | Redirect |

---

## Page Objects Checklist

```
□ AuthPage
  - login(email, password)
  - logout()
  - verifyDashboard(role)

□ AdminInvoicesPage
  - createInvoice(data)
  - viewInvoice(id)
  - markPaid(amount)
  - applyCredit(amount)
  - downloadPDF()

□ AdminQuotesPage
  - createQuote(data)
  - sendQuote()
  - acceptQuote()
  - convertToInvoice()

□ AdminClientsPage
  - createClient(data)
  - addCredit(amount)
  - viewDetail(id)

□ AdminJobBoardPage
  - dragJobToStatus(jobId, status)
  - updateJobStatus(jobId, status)

□ ClientOrdersPage
  - viewOrders()
  - applyWalletCredit(invoiceId, amount)
  - payWithStripe(invoiceId)

□ ClientProjectsPage
  - viewActiveProjects()
  - viewCompletedProjects()
  - archiveProject(id)

□ QuickOrderPage
  - uploadFile(path)
  - selectMaterial(name)
  - getPrice()
  - checkout()

□ ClientMessagesPage
  - sendMessage(text)
  - viewThread(invoiceId)
```

---

## Playwright Config Essentials

```typescript
// Minimal setup
use: {
  baseURL: 'http://localhost:3000',
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure'
}

// Workers
workers: process.env.CI ? 1 : 4

// Retries
retries: process.env.CI ? 2 : 0

// Timeout
timeout: 30000 // per test
actionTimeout: 10000 // per action
```

---

## Common Test Patterns

### Pattern 1: Login + Action

```typescript
test('admin creates invoice', async ({ page }) => {
  await authPage.login('admin@test.com', 'pass');
  await page.goto('/admin/invoices/new');
  // ... rest of test
});
```

### Pattern 2: Fill Form + Submit

```typescript
test('create invoice', async ({ page }) => {
  await page.fill('input[name="clientId"]', '123');
  await page.fill('input[name="amount"]', '500');
  await page.click('button[type="submit"]');
  await page.waitForURL('/admin/invoices/*');
});
```

### Pattern 3: Verify API Call + DB State

```typescript
test('payment recorded', async ({ page }) => {
  // Pay invoice
  await page.click('[data-testid="mark-paid"]');
  await page.fill('input[name="amount"]', '500');
  
  // Verify
  await expect(page.locator('[data-testid="status"]')).toContainText('PAID');
  
  // Check activity log
  const activities = await page.locator('[data-testid="activity"]');
  await expect(activities).toContainText('Payment recorded');
});
```

### Pattern 4: File Upload

```typescript
test('upload STL file', async ({ page }) => {
  await page.setInputFiles('[type="file"]', 'test-file.stl');
  await page.waitForSelector('[data-testid="model-viewer"]');
  
  // Verify preview
  const viewer = page.locator('[data-testid="model-viewer"]');
  await expect(viewer).toBeVisible();
});
```

### Pattern 5: Drag-Drop

```typescript
test('drag job to status', async ({ page }) => {
  const jobCard = page.locator('[data-testid="job-Model_001"]');
  const column = page.locator('[data-testid="column-PRINTING"]');
  
  await jobCard.dragTo(column);
  
  // Verify
  await expect(column).toContainText('Model_001');
});
```

---

## Test Data Fixtures

### Minimal Setup

```typescript
// Clients
acme: { name: 'ACME', email: 'acme@test.com' }
mfg: { name: 'MFG', email: 'mfg@test.com' }

// Materials
pla: { cost: 0.05, color: 'White' }
resin: { cost: 0.15, color: 'Clear' }

// Files
small.stl: 2MB, 15g, valid
large.stl: 45MB, 450g, valid
image.jpg: invalid file type

// Auth
admin@test.com / AdminPass123!
client@test.com / ClientPass123!
```

---

## Browser Matrix

```
Test Type              Browsers           Viewport
─────────────────────────────────────────────────────
Quote/Invoice          Chromium, Firefox  1920×1080
Quick-Order            Chromium, Mobile   1920×1080, 375×667
3D Viewer              Chromium only      1920×1080
Job Board              Chromium only      1920×1080
Authentication         All                All
Client Portal          Chromium, Firefox  1920×1080
```

---

## Assertion Examples

### Visibility & Text

```typescript
// Element visible
await expect(page.locator('[data-testid="invoice"]')).toBeVisible();

// Contains text
await expect(page.locator('[data-testid="total"]')).toContainText('$500');

// Has exact value
await expect(page.locator('input[name="amount"]')).toHaveValue('500');

// Attribute check
await expect(page.locator('[data-testid="button"]')).toBeEnabled();
```

### Navigation & URL

```typescript
// URL matches
await page.waitForURL('/admin/invoices/*');

// Contains URL
await expect(page).toHaveURL(/\/admin\/invoices\//);
```

### Count & Lists

```typescript
// Count elements
const items = page.locator('[data-testid="invoice-row"]');
await expect(items).toHaveCount(5);

// First element
const first = page.locator('[data-testid="invoice-row"]').first();
await expect(first).toContainText('INV-001');
```

### Async Operations

```typescript
// Wait for element
await page.waitForSelector('[data-testid="success-message"]');

// Wait for function
await page.waitForFunction(() => {
  const element = document.querySelector('[data-testid="status"]');
  return element?.textContent?.includes('PAID');
});
```

---

## Troubleshooting

### Flaky Tests

Problem: Test passes sometimes, fails other times

Solutions:
- Remove `await page.waitForTimeout(1000)`
- Use `waitForSelector()` instead of hard waits
- Use `waitForURL()` instead of `waitForNavigation()`
- Add `retries: 2` to config

### Element Not Found

Problem: `locator not found`

Solutions:
- Verify selector with `page.waitForSelector()`
- Check element visibility with `isVisible()`
- Add explicit wait: `page.waitForFunction()`
- Use `page.pause()` to debug

### Timeout

Problem: Test takes > 30 seconds

Solutions:
- API auth setup instead of UI login
- Reuse sessions between tests
- Mock external API calls
- Run in parallel on CI

### Cross-Browser Issues

Problem: Passes on Chrome, fails on Firefox

Solutions:
- Test in all browsers locally before commit
- Use `page.evaluate()` for browser-specific code
- Check for unsupported CSS (e.g., webkit prefixes)
- Mock browser-specific APIs

---

## CI/CD Checklist

Before merging:

```
□ All tests pass locally (chromium)
□ Tests pass in Firefox & WebKit
□ No flaky tests (run 3x)
□ Average duration < 60 seconds
□ Total suite < 30 minutes
□ Screenshots/videos on failure
□ HTML report generated
□ No hardcoded test URLs
□ Fixtures used for setup
```

---

## Command Reference

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/admin/invoices.spec.ts

# Run in debug mode (step through)
npx playwright test --debug

# Run with UI mode (visual)
npx playwright test --ui

# Run specific browser
npx playwright test --project=chromium

# Update snapshots
npx playwright test --update-snapshots

# Generate HTML report
npx playwright test && npx playwright show-report

# Record new test
npx playwright codegen http://localhost:3000
```

---

## Performance Tips

1. **Parallel execution** (4 workers for local)
2. **Reuse auth** (one login, multiple tests)
3. **Mock external APIs** (Stripe, email)
4. **Minimize actions** (batch related steps)
5. **Use fixtures** (faster than setup per test)
6. **Run headless** (faster rendering)

---

## Resources

- [Playwright Docs](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [Locators Guide](https://playwright.dev/docs/locators)

---

Generated: 2025-11-12
