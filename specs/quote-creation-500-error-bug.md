# Bug: Quote Creation Returns 500 Internal Server Error

## Bug Description
Quote creation fails with 500 Internal Server Error when submitting a valid quote form. The form includes client selection, two line items, standard quote details (issue date, expiry date), and correctly filled data. After clicking "Create quote", the server returns 500 error, form resets to default state, and generic error notification is shown.

## Problem Statement
The quote creation endpoint POST /api/quotes returns 500 error instead of successfully creating a quote with valid data. The error occurs when creating a quote for client ID 10 (TEST_Corporation_1762947789511) with two line items: "3D Printing - Test Part" (qty 5 @ $25) and "Material - PLA" (qty 1 @ $30). The frontend form submission contains proper QuoteInput data that passes schema validation, but the backend service throws an unhandled error during database insertion.

## Solution Statement
Identify and fix the root cause of the 500 error in the quote creation flow. The issue likely stems from: (1) missing or incorrect database schema fields, (2) incorrect data transformation in the service layer, (3) constraint violations during quote_items insertion, or (4) calculator_breakdown JSON serialization issues. Fix involves ensuring all required fields are properly mapped, nullable fields are handled correctly, and calculator_breakdown is properly structured for database storage.

## Steps to Reproduce
1. Login as admin at /login
2. Create test client (TEST_Corporation_1762947789511, ID: 10)
3. Navigate to /quotes/new
4. Select client: TEST_Corporation_1762947789511 (ID: 10)
5. Fill quote form:
   - Issue date: 2025-11-12
   - Expiry date: 2025-11-26
   - Line item 1: name="3D Printing - Test Part", description="Test 3D printed component", qty=5, unit="unit", price=$25
   - Line item 2: name="Material - PLA", description="PLA filament material", qty=1, unit="kg", price=$30
6. Click "Create quote" button
7. Observe: 500 Internal Server Error, form resets, error notification shown

## Root Cause Analysis
Based on code analysis:

1. **QuoteEditor Component** (quote-editor.tsx):
   - Line 289-300: Form payload transformation converts `productTemplateId` from `null` to `undefined`
   - Line 291: `productTemplateId: line.productTemplateId ?? undefined`
   - This is correct as backend expects `number | undefined`

2. **Quote Service** (quotes.ts):
   - Line 450-478: `itemPayload` construction for quote_items insertion
   - Line 451-454: `calculator_breakdown` includes `lineType` field plus any existing breakdown
   - Line 455-463: For MODELLING lines, adds `modelling` object to breakdown
   - **ISSUE**: Line 476 sets `calculator_breakdown: breakdown` for ALL lines, but breakdown contains `lineType` field
   - **POTENTIAL ISSUE**: When `line.lineType` is "PRINT" and no calculator was used, breakdown becomes `{ lineType: "PRINT" }` instead of the original `line.calculatorBreakdown`

3. **Database Schema Issue**:
   - The code constructs `calculator_breakdown` for PRINT lines that never used calculator
   - For manual entry lines, `calculatorBreakdown` should be `undefined` or `null`, not `{ lineType: "PRINT" }`
   - Database might reject this structure or fail JSON validation

4. **updateQuote vs createQuote Discrepancy**:
   - Line 578 in `updateQuote`: `calculator_breakdown: line.calculatorBreakdown ?? null`
   - Line 476 in `createQuote`: Uses constructed `breakdown` object
   - **INCONSISTENCY**: updateQuote preserves original breakdown, createQuote constructs new one

## Relevant Files
Use these files to fix the bug:

- **/Users/varunprasad/code/prjs/3dprintsydney/src/server/services/quotes.ts** (PRIMARY)
  - Line 450-478: Fix calculator_breakdown construction in createQuote
  - Line 451-454: Ensure breakdown structure matches database expectations
  - Line 455-463: Verify modelling object structure is correct
  - Make createQuote consistent with updateQuote (line 566-578)

- **/Users/varunprasad/code/prjs/3dprintsydney/src/lib/schemas/quotes.ts**
  - Verify quoteLineSchema allows calculator_breakdown to be optional
  - Ensure lineType is properly validated

- **/Users/varunprasad/code/prjs/3dprintsydney/src/app/api/quotes/route.ts**
  - Add better error logging to capture actual database error
  - Improve error response to show validation issues

## Step by Step Tasks

### Step 1: Add Error Logging to API Route
- Open /Users/varunprasad/code/prjs/3dprintsydney/src/app/api/quotes/route.ts
- Modify POST handler error handling to log full error details before responding
- Add console.error or logger.error to capture database errors
- This will help identify exact error message from database

### Step 2: Fix calculator_breakdown Construction in createQuote
- Open /Users/varunprasad/code/prjs/3dprintsydney/src/server/services/quotes.ts
- Locate createQuote function (line 405-507)
- Modify itemPayload construction (line 450-478) to match updateQuote pattern
- Change line 476: Replace constructed breakdown with original line.calculatorBreakdown
- Only add lineType to breakdown if breakdown actually exists from calculator
- For MODELLING lines, merge modelling object into existing breakdown or create new one
- Ensure calculator_breakdown is null for lines without calculator data

### Step 3: Ensure Consistency Between createQuote and updateQuote
- Compare itemPayload construction in createQuote (450-478) vs updateQuote (566-578)
- Make createQuote use same pattern: `calculator_breakdown: line.calculatorBreakdown ?? null`
- Only construct breakdown object when line actually used calculator or is MODELLING type
- Preserve original calculatorBreakdown from frontend for lines that used calculator

### Step 4: Test Quote Creation with Various Line Types
- Test quote with manual entry PRINT line (no calculator)
- Test quote with calculator-based PRINT line (has breakdown)
- Test quote with MODELLING line
- Test quote with mixed line types
- Verify calculator_breakdown is null for manual lines, populated for calculator lines

## Validation Commands
Execute every command to validate the bug is fixed.

```bash
# Start development server
cd /Users/varunprasad/code/prjs/3dprintsydney && npm run dev

# In separate terminal, test quote creation API
curl -X POST http://localhost:3000/api/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": 10,
    "issueDate": "2025-11-12",
    "expiryDate": "2025-11-26",
    "discountType": "NONE",
    "discountValue": 0,
    "shippingCost": 0,
    "shippingLabel": "",
    "notes": "",
    "terms": "",
    "taxRate": 10,
    "lines": [
      {
        "name": "3D Printing - Test Part",
        "description": "Test 3D printed component",
        "quantity": 5,
        "unit": "unit",
        "unitPrice": 25,
        "discountType": "NONE",
        "discountValue": 0,
        "productTemplateId": null,
        "lineType": "PRINT",
        "modellingBrief": "",
        "modellingComplexity": "SIMPLE",
        "modellingRevisionCount": 0,
        "modellingHourlyRate": 0,
        "modellingEstimatedHours": 0,
        "orderIndex": 0
      },
      {
        "name": "Material - PLA",
        "description": "PLA filament material",
        "quantity": 1,
        "unit": "kg",
        "unitPrice": 30,
        "discountType": "NONE",
        "discountValue": 0,
        "productTemplateId": null,
        "lineType": "PRINT",
        "modellingBrief": "",
        "modellingComplexity": "SIMPLE",
        "modellingRevisionCount": 0,
        "modellingHourlyRate": 0,
        "modellingEstimatedHours": 0,
        "orderIndex": 1
      }
    ]
  }'

# Verify quote was created successfully (should return 201 with quote data, not 500)

# Test via UI
# 1. Navigate to http://localhost:3000/quotes/new
# 2. Select client TEST_Corporation_1762947789511
# 3. Fill form with test data from steps to reproduce
# 4. Click "Create quote"
# 5. Should redirect to quote detail page, not show error
```

## Notes
- The root cause is likely the calculator_breakdown field construction
- createQuote constructs `{ lineType: "PRINT" }` for all lines, even manual ones
- updateQuote uses `line.calculatorBreakdown ?? null` which is correct
- Database might have constraint or JSON validation rejecting empty breakdown objects
- Frontend sends calculatorBreakdown as undefined for manual lines
- Backend should preserve this as null in database, not construct new object
- Fix requires making createQuote match updateQuote's breakdown handling pattern
