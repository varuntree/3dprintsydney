# Calculations & Pricing — Alignment With Old App

We will reproduce the old pricing behaviour within the current framework and components.

## Line Item Calculator (Calculated Templates)

Inputs
- Hours (`hours`)
- Weight in grams (`grams`)
- Material (from Materials catalog → `costPerGram`)
- Quality (mapped to multiplier)
- Infill (mapped to multiplier)

Formula
- Labor: `hours × hourlyRate × qualityMultiplier × infillMultiplier`
- Material: `grams × material.costPerGram`
- Setup Fee: `setupFee` if `hours < setupThreshold` (threshold can be encoded as any nonzero `setupFee` policy; old rule used `time < 2.5`)
- Base: `(Labor + SetupFee + Material)`
- Minimum Price: `total = max(Base, minimumPrice)`

Notes
- The current new app already implements a close variant: see `src/components/quotes/quote-editor.tsx` CalculatorDialog and `src/lib/schemas/settings.ts` (calculatorConfig) plus Materials.
- To more closely match the old app, we will:
  - Ensure the `qualityMultiplier` presets reflect Ellen’s expectations.
  - Permit infill to be represented either as a percentage-derived multiplier or from a discrete map in Settings.
  - Always persist `calculatorBreakdown` on the line: `{ hours, grams, quality, infill, labor, material, setup }`.

### Quality Multiplier Mapping

Keep current Settings `qualityMultipliers` but set sensible defaults (seeded) that mirror the old perception of “extra fine/fine/standard/draft/extra draft”. This can be purely label-based as done today (no layer height field needed), because the owner’s need is primarily that “quality increases price by a multiplier.”

### Infill Multiplier Options

Two supported paths without changing stack:
1) Settings-driven discrete multipliers (current behaviour). Example:
   - `{ low: 0.9, medium: 1.0, high: 1.2 }`
2) Percentage-derived formula (legacy style) if the selected infill value is a percentage number (0–100):
   - `infillMultiplier = 0.3 + (percent / 100) * 0.8`  // results in [0.3 … 1.1]

Implementation detail: CalculatorDialog will interpret its `infill` value. If it parses as a number within [0,100], use the formula; otherwise, treat it as a key into `settings.calculatorConfig.infillMultipliers`.

### Discounts

Line Discount (per item)
- `lineTotal = quantity × unitPrice`
- If discount applied:
  - Percentage: `lineTotal -= lineTotal × (line.discount / 100)`
  - Fixed: `lineTotal -= discount`
- Clamp at `>= 0`.

Document Discount (global)
- `subtotal = Σ(lineTotals)`
- Apply global discount similarly (percent or fixed) to produce `subtotalAfterDiscount`.

Shipping & Tax
- `taxAmount = subtotalAfterDiscount × (taxRate / 100)`
- `total = subtotalAfterDiscount + shippingCost + taxAmount`

All of the above is already implemented in `src/lib/calculations.ts` and the form editors; we will keep this library as the single source of truth.

## Materials

- Use existing Materials catalog (`costPerGram`).
- Calculator must surface “Material” for calculated templates; if a template has a fixed materialId, default to it but allow override when needed (as per owner’s workflow).

## Persistence

- Persist breakdown per line (existing field `calculatorBreakdown`).
- Persist the chosen material (by keeping the template link and/or recording in `calculatorBreakdown`).

## Acceptance Criteria
- For a given set of inputs (hours, grams, material, quality, infill), the new CalculatorDialog returns the same (or acceptably equivalent) total as the legacy app for typical presets.
- Line/global discounts, shipping and tax produce totals identical to `src/lib/calculations.ts` both in the UI and on the server during create/update.

