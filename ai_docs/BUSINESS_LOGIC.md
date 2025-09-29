# Business Logic Documentation

## Overview

This document provides comprehensive documentation of the business logic, domain knowledge, and business rules implemented in the 3D Print Sydney management system. The system manages quotes, invoices, jobs, printers, clients, and materials for a 3D printing business.

## Table of Contents

1. [Pricing Calculations & Formulas](#pricing-calculations--formulas)
2. [Payment Terms & Policies](#payment-terms--policies)
3. [Job Creation Policies & Rules](#job-creation-policies--rules)
4. [Status Management Rules](#status-management-rules)
5. [Automation Triggers & Conditions](#automation-triggers--conditions)
6. [Financial Calculations & Tax Handling](#financial-calculations--tax-handling)
7. [Material Cost Tracking](#material-cost-tracking)
8. [Reporting & Analytics Logic](#reporting--analytics-logic)
9. [Business Validation Rules](#business-validation-rules)

---

## Pricing Calculations & Formulas

### Line Item Calculations

**Formula**: `calculateLineTotal(quantity, unitPrice, discountType, discountValue)`

```typescript
// Base calculation
base = quantity * unitPrice

// Discount application
if (discountType === "PERCENT"):
    total = max(0, base - (base * (discountValue / 100)))
else if (discountType === "FIXED"):
    total = max(0, base - discountValue)
else:
    total = max(0, base)
```

**Business Rules**:
- Minimum total is always 0 (negative totals not allowed)
- Percentage discounts are calculated against the base amount
- Fixed discounts are subtracted directly from base amount
- Three discount types: `NONE`, `PERCENT`, `FIXED`

### Document-Level Calculations

**Formula**: `calculateDocumentTotals(lines, discountType, discountValue, shippingCost, taxRate)`

```typescript
// Subtotal calculation
subtotal = sum(all line totals)

// Document-level discount
if (discountType === "PERCENT"):
    discounted = max(0, subtotal - (subtotal * (discountValue / 100)))
else if (discountType === "FIXED"):
    discounted = max(0, subtotal - discountValue)
else:
    discounted = subtotal

// Tax calculation (applied to discounted amount + shipping)
taxableBase = discounted + shippingCost
tax = max(0, taxableBase * (taxRate / 100))

// Final total
total = max(0, taxableBase + tax)
```

**Tax Logic**:
- Tax is calculated on the discounted subtotal plus shipping
- Tax rate is stored as percentage (e.g., 10 for 10%)
- Tax amount is always non-negative

### Calculator Configuration

The system supports configurable pricing parameters:

```typescript
calculatorConfig: {
    hourlyRate: number,          // Base hourly rate for printing
    setupFee: number,            // Fixed setup fee per job
    minimumPrice?: number,       // Minimum price enforcement
    qualityMultipliers: {        // Quality-based price multipliers
        [quality: string]: number  // e.g., { "standard": 1, "high": 1.5 }
    },
    infillMultipliers: {         // Infill density multipliers
        [infill: string]: number   // e.g., { "low": 0.8, "medium": 1, "high": 1.3 }
    }
}
```

---

## Payment Terms & Policies

### Default Payment Terms

The system includes predefined payment terms:

```typescript
DEFAULT_PAYMENT_TERMS = [
    { code: "COD", label: "COD", days: 0 },
    { code: "7_days", label: "7 days", days: 7 },
    { code: "14_days", label: "14 days", days: 14 },
    { code: "30_days", label: "30 days", days: 30 }
]
```

### Due Date Calculation Logic

**Algorithm**:
1. If explicit due date provided → use explicit date
2. If payment term has days ≤ 0 → due date = issue date (immediate payment)
3. Otherwise → due date = issue date + payment term days

```typescript
function deriveDueDate(issueDate, paymentTerm, explicitDueDate) {
    if (explicitDueDate) return explicitDueDate
    if (!paymentTerm || paymentTerm.days <= 0) return issueDate
    return addDays(issueDate, paymentTerm.days)
}
```

### Payment Term Resolution Priority

1. **Client-specific payment terms** (if set and valid)
2. **System default payment terms** (from settings)
3. **First available payment term** (fallback)

### Payment Processing

**Balance Calculation**:
```typescript
paidAmount = sum(all payments for invoice)
rawBalance = invoiceTotal - paidAmount
balance = max(rawBalance, 0)
isFullyPaid = abs(rawBalance) < 0.005  // 0.5 cent tolerance for rounding
```

**Status Updates**:
- Invoice marked as `PAID` when balance ≤ 0.005
- `paidAt` timestamp set when invoice becomes fully paid
- Balance updates immediately when payments added/removed

---

## Job Creation Policies & Rules

### Job Creation Triggers

**Two Policies Available**:

1. **`ON_PAYMENT`** (Default): Jobs created only when invoice is fully paid
2. **`ON_INVOICE`**: Jobs created immediately when invoice is created

**Implementation Logic**:
```typescript
// On invoice creation
if (jobCreationPolicy === "ON_INVOICE") {
    await ensureJobForInvoice(invoiceId)
}

// On payment completion
if (invoice.balance <= 0 && jobCreationPolicy === "ON_PAYMENT") {
    await ensureJobForInvoice(invoiceId)
}
```

### Job Creation Rules

**Automatic Job Properties**:
- **Title**: `"Invoice {invoiceNumber}"`
- **Status**: `QUEUED`
- **Priority**: `NORMAL`
- **Printer**: `null` (unassigned)
- **Queue Position**: Next available position in unassigned queue

**Duplicate Prevention**:
- Only one job per invoice allowed
- `ensureJobForInvoice()` checks for existing jobs before creating

---

## Status Management Rules

### Quote Status Lifecycle

**States**: `DRAFT` → `PENDING` → `ACCEPTED`/`DECLINED`/`CONVERTED`

**Transition Rules**:
- **DRAFT**: Initial state, editable
- **PENDING**: Sent to client, awaiting response
- **ACCEPTED**: Client approved, can be converted to invoice
- **DECLINED**: Client rejected or expired
- **CONVERTED**: Successfully converted to invoice (terminal state)

**Status Triggers**:
- `sendQuote()` → `DRAFT` to `PENDING`
- `acceptQuote()` → `PENDING` to `ACCEPTED`
- `declineQuote()` → `PENDING` to `DECLINED`
- `convertQuoteToInvoice()` → any state to `CONVERTED`
- Auto-expiry → `PENDING` to `DECLINED` (daily maintenance)

### Invoice Status Lifecycle

**States**: `PENDING` → `PAID`/`OVERDUE`

**Transition Rules**:
- **PENDING**: Awaiting payment
- **PAID**: Fully paid or written off/voided
- **OVERDUE**: Past due date (automatic transition)

**Special Cases**:
- **Voided invoices**: Set to `PAID` with `voidedAt` timestamp
- **Written-off invoices**: Set to `PAID` with `writtenOffAt` timestamp
- **Balance tolerance**: ±0.005 for rounding differences

### Job Status Lifecycle

**States**: `QUEUED` → `PRINTING` → `COMPLETED`/`CANCELLED`/`PAUSED`

**Status Validation Rules**:

```typescript
// Starting a job (QUEUED → PRINTING)
- Must have printer assigned
- Printer must not be OFFLINE or MAINTENANCE (if prevented by settings)
- Printer must not exceed maxActivePrintingPerPrinter limit

// Pausing a job (PRINTING → PAUSED)
- Accumulates actual hours from lastRunStartedAt
- Sets pausedAt timestamp

// Completing a job (any → COMPLETED)
- Accumulates final actual hours
- Sets completedAt timestamp
- Auto-detaches from printer if autoDetachJobOnComplete enabled
- Auto-archives if autoArchiveCompletedJobsAfterDays = 0

// Cancelling a job (any → CANCELLED)
- Immediately archives with cancellation reason
- Removes printer assignment
- Resets timing fields
```

---

## Automation Triggers & Conditions

### Operational Automation Settings

**Configuration Options**:
```typescript
{
    autoDetachJobOnComplete: boolean,           // Default: true
    autoArchiveCompletedJobsAfterDays: number, // Default: 7
    preventAssignToOffline: boolean,           // Default: true
    preventAssignToMaintenance: boolean,       // Default: true
    maxActivePrintingPerPrinter: number,       // Default: 1
    overdueDays: number,                       // Default: 0
    reminderCadenceDays: number,               // Default: 7
    enableEmailSend: boolean                   // Default: false
}
```

### Daily Maintenance Automation

**Scheduled Tasks** (runs daily):

1. **Overdue Invoice Detection**:
   ```typescript
   cutoffDate = today - overdueDays
   UPDATE invoices SET status = 'OVERDUE'
   WHERE status = 'PENDING' AND dueDate <= cutoffDate
   ```

2. **Quote Expiration**:
   ```typescript
   UPDATE quotes SET status = 'DECLINED'
   WHERE status = 'PENDING' AND (expiryDate <= now OR expiresAt <= now)
   ```

3. **Job Auto-Archiving**:
   ```typescript
   if (autoArchiveCompletedJobsAfterDays > 0) {
       cutoffDate = today - autoArchiveCompletedJobsAfterDays
       UPDATE jobs SET archivedAt = now, archivedReason = 'auto-archive'
       WHERE completedAt <= cutoffDate AND archivedAt IS NULL
   }
   ```

### Printer Assignment Validation

**Real-time Enforcement**:
```typescript
function validatePrinterAssignment(printerId) {
    if (preventAssignToOffline && printer.status === 'OFFLINE') {
        throw Error("Assignment blocked: printer is offline")
    }
    if (preventAssignToMaintenance && printer.status === 'MAINTENANCE') {
        throw Error("Assignment blocked: printer in maintenance")
    }

    activeJobs = count(jobs WHERE printerId = printerId AND status = 'PRINTING')
    if (activeJobs >= maxActivePrintingPerPrinter) {
        throw Error("Printer is busy: active job limit reached")
    }
}
```

---

## Financial Calculations & Tax Handling

### Currency and Precision

**Default Currency**: `AUD`
**Decimal Precision**: All monetary values stored as strings to preserve precision
**Rounding Tolerance**: ±0.005 for payment balance calculations

### Tax Calculation Rules

**Tax Application Order**:
1. Calculate line totals (including line-level discounts)
2. Sum to subtotal
3. Apply document-level discount to subtotal
4. Add shipping cost to discounted subtotal
5. Apply tax rate to (discounted subtotal + shipping)
6. Add tax to get final total

**Tax Rate Storage**: Percentage format (10.0 = 10%)

### Balance Due Tracking

**Real-time Balance Updates**:
```typescript
function updateInvoiceBalance(invoiceId) {
    payments = getAllPayments(invoiceId)
    paidAmount = sum(payments.amount)
    total = invoice.total
    rawBalance = total - paidAmount
    balance = max(rawBalance, 0)
    isFullyPaid = abs(rawBalance) < 0.005

    invoice.balanceDue = isFullyPaid ? 0 : balance
    invoice.status = isFullyPaid ? 'PAID' : 'PENDING'
    invoice.paidAt = isFullyPaid ? (existingPaidAt ?? now) : null
}
```

### Write-offs and Voids

**Void Invoice**:
- Cannot void paid invoices
- Sets `voidedAt`, `voidReason`
- Marks as `PAID` with `balanceDue = 0`

**Write-off Invoice**:
- Can write-off any unpaid invoice
- Sets `writtenOffAt`, `writeOffReason`
- Marks as `PAID` with `balanceDue = 0`
- No-op if already paid

---

## Material Cost Tracking

### Material Costing Model

**Material Properties**:
```typescript
{
    name: string,
    color?: string,
    category?: string,
    costPerGram: Decimal,  // Cost in default currency per gram
    notes?: string
}
```

### Cost Integration

**Product Template Integration**:
- Product templates can reference materials
- Calculator breakdown can include material costs
- Cost calculations stored in `calculatorBreakdown` JSON field

**Usage Tracking**:
- Material usage tracked through invoice items
- Export functionality aggregates usage by material
- Tracks both quantity (item count) and revenue by material

---

## Reporting & Analytics Logic

### Dashboard Metrics

**Revenue Calculation**:
```typescript
// 30-day revenue
revenue30 = sum(payments WHERE paidAt >= (today - 30 days))

// Previous period comparison
revenue30Prev = sum(payments WHERE paidAt >= (today - 60 days) AND paidAt < (today - 30 days))
```

**Outstanding Balance**:
```typescript
outstandingBalance = sum(invoices.balanceDue WHERE status IN ['PENDING', 'OVERDUE'])
```

**Revenue Trend** (6-month rolling):
```typescript
// Monthly aggregation for last 6 months
for each month in last 6 months:
    monthlyRevenue[month] = sum(payments WHERE paidAt in month)
```

### Job Board Analytics

**Printer Utilization**:
```typescript
for each printer:
    queuedCount = count(jobs WHERE printerId = printer.id AND status = 'QUEUED')
    activeCount = count(jobs WHERE printerId = printer.id AND status = 'PRINTING')
    totalEstimatedHours = sum(jobs.estimatedHours WHERE printerId = printer.id)
```

**Summary Metrics**:
- Total jobs across all statuses
- Unassigned job count
- Completed jobs today
- Printers with active work

### Export Analytics

**Available Exports**:
1. **Invoices**: All invoice data with client info and totals
2. **Payments**: Payment history with method and processor details
3. **Jobs**: Job lifecycle data with timing and printer assignment
4. **AR Aging**: Outstanding invoices bucketed by age (Current, 1-30, 31-60, 61-90, 90+ days)
5. **Material Usage**: Aggregated material consumption and revenue
6. **Printer Utilization**: Completed jobs and hours by printer

**Date Range Filtering**: All exports support optional date range filtering

---

## Business Validation Rules

### Quote Validation Rules

**Creating/Updating Quotes**:
- Must have at least one line item
- Client must exist and be valid
- Line quantities must be positive
- Unit prices must be non-negative
- Discount values must be non-negative
- Percentage discounts must be ≤ 100%

**Quote Conversion Rules**:
- Quote must exist and be accessible
- Conversion creates invoice with same line items and totals
- Source quote marked as `CONVERTED` with reference to new invoice
- Due date calculation based on payment terms at conversion time

### Invoice Validation Rules

**Payment Validation**:
- Payment amount must be positive
- Cannot add payments to voided invoices
- Cannot add payments exceeding balance due (with tolerance)
- Payment dates cannot be in future (business rule)

**Status Change Validation**:
- Cannot void paid invoices
- Cannot revert paid invoices without removing payments first
- Cannot delete invoices with associated jobs (must archive first)

### Job Validation Rules

**Job Assignment**:
- Jobs can only be assigned to `ACTIVE` printers (unless overridden)
- Cannot start printing without printer assignment
- Printer capacity limits enforced (max concurrent jobs)

**Status Transitions**:
- `QUEUED` jobs can transition to any state
- `PRINTING` jobs must be paused or completed before cancellation
- `COMPLETED` jobs cannot change status (terminal state)
- `CANCELLED` jobs automatically archived

**Queue Management**:
- Queue positions automatically managed within printer groups
- Moving job to different printer assigns new queue position
- Queue positions are 0-indexed integers

### Settings Validation Rules

**Payment Terms**:
- At least one payment term must be defined
- Payment term codes must be unique
- Default payment term must reference an existing term
- Days must be non-negative integers

**Operational Settings**:
- Overdue days must be non-negative
- Archive days must be non-negative (0 = immediate archiving)
- Max active jobs per printer must be ≥ 1
- Tax rate must be 0-100%

**Calculator Configuration**:
- Hourly rate must be non-negative
- Setup fee must be non-negative
- Quality/infill multipliers must be ≥ 0.1
- Minimum price (if set) must be non-negative

### Data Integrity Rules

**Referential Integrity**:
- Invoices must reference valid clients
- Jobs must reference valid invoices and clients
- Invoice items can optionally reference product templates
- Payments must reference valid invoices

**Audit Trail**:
- All significant actions logged to `ActivityLog`
- Deletion operations logged before entity removal
- Status changes tracked with timestamps and reasons
- User actions attributable through activity metadata

**Concurrency Handling**:
- Balance calculations performed in database transactions
- Queue position updates use transaction isolation
- Payment processing prevents double-payment through unique processor IDs

---

## Error Handling and Edge Cases

### Payment Processing Edge Cases

**Duplicate Payment Prevention**:
- Stripe payments identified by `processorId`
- Duplicate processor IDs rejected silently
- Manual payments validated for amount reasonableness

**Rounding and Precision**:
- All calculations use high-precision decimal arithmetic
- Final storage converts to string representation
- Display formatting handles decimal conversion safely

**Balance Reconciliation**:
- Balance calculations always enforce non-negative values
- Overpayments result in zero balance (credit not tracked)
- Payment removal recalculates balance from scratch

### Job Queue Edge Cases

**Printer Status Changes**:
- Jobs automatically validated when printer status changes
- Running jobs can continue on printers going offline
- New assignments blocked to offline/maintenance printers

**Queue Position Conflicts**:
- Position conflicts resolved by appending to queue end
- Bulk reordering operations use transaction isolation
- Missing positions filled automatically during cleanup

### Data Migration and Versioning

**Schema Evolution**:
- Nullable fields support legacy data without defaults
- JSON fields provide flexible configuration extension
- Enum additions handled through database migrations

**Backward Compatibility**:
- Payment term resolution gracefully handles missing configurations
- Calculator config uses safe defaults for missing properties
- Activity log metadata supports arbitrary structure evolution