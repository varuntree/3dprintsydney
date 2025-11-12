# Plan: Australia Post Integration

## Plan Description
Integrate Australia Post API for real-time shipping rate and ETA calculations based on destination postcode and parcel parameters. Excludes label printing (future scope). Provides transparent shipping costs upfront to reduce manual quoting.

## User Story
As a client
I want to see accurate shipping costs and delivery times based on my postcode
So that I can make informed decisions about delivery options without waiting for manual quotes

## Problem Statement
Current shipping calculation is basic:
- Manual region lookup in settings (Sydney Metro, Regional, Remote)
- No real-time rates from carriers
- No delivery time estimates
- Alan has Australia Post business account but not integrated

## Solution Statement
Integrate Australia Post Shipping & Tracking API:
1. **Rate calculation**: Use postcode + parcel dims/weight to fetch rates
2. **Service options**: Express vs Standard vs Parcel Post
3. **ETA display**: Show expected delivery date
4. **Fallback**: Use existing settings-based calculation if API fails
5. **Cache**: Cache results by postcode for 24h to reduce API calls

## Pattern Analysis
- Existing Stripe integration provides blueprint (`/src/server/services/stripe.ts`)
- Signature verification pattern from Stripe/Resend webhooks
- Lazy-loaded, cached client instances
- Environment-based configuration (`/src/lib/env.ts`)

## Dependencies

### External Dependencies
- Australia Post Developer account (API key/secret)
- `npm install @auspost/api` or use fetch directly
- AUSPOST_API_KEY env var

## Relevant Files

**To Update:**
- `/src/lib/env.ts` - Add AUSPOST_API_KEY, AUSPOST_API_SECRET
- `/src/lib/schemas/quick-order.ts` - Add service level selection
- `/src/server/services/quick-order.ts` - Integrate rate calculation
- `/src/components/settings/settings-form.tsx` - Add AusPost credentials section

**New Files:**
- `/src/server/integrations/auspost.ts` - AusPost API client
- `/src/lib/types/shipping.ts` - Shipping service types
- `/src/hooks/use-shipping-rates.ts` - Hook for rate fetching
- `/src/components/quick-order/shipping-option-select.tsx` - Service selection UI

## Acceptance Criteria
- [ ] API credentials configurable in settings
- [ ] Real-time rates fetched when postcode entered
- [ ] Multiple service options shown (Express, Standard, Parcel Post)
- [ ] Each option shows price + ETA (e.g., "3-5 business days")
- [ ] Selected option updates total price
- [ ] Fallback to settings-based calculation if API fails
- [ ] Results cached for 24h per postcode
- [ ] Loading states during API calls

## Step by Step Tasks

### 1. Setup Australia Post API Client

- Create `/src/server/integrations/auspost.ts`:
  ```typescript
  interface AusPostRateRequest {
    from_postcode: string;
    to_postcode: string;
    length: number; // cm
    width: number;  // cm
    height: number; // cm
    weight: number; // kg
  }

  interface AusPostRateResponse {
    services: {
      code: string;
      name: string;
      price: number;
      delivery_time: string;
    }[];
  }

  export async function getAusPostRates(params: AusPostRateRequest): Promise<AusPostRateResponse> {
    const apiKey = getAusPostApiKey();
    const apiSecret = getAusPostApiSecret();

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    const response = await fetch('https://digitalapi.auspost.com.au/postage/parcel/domestic/calculate', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`AusPost API error: ${response.statusText}`);
    }

    return response.json();
  }
  ```

### 2. Add Environment Variables

- Update `/src/lib/env.ts`:
  ```typescript
  export function getAusPostApiKey(): string {
    return process.env.AUSPOST_API_KEY || '';
  }

  export function getAusPostApiSecret(): string {
    return process.env.AUSPOST_API_SECRET || '';
  }
  ```

- Update `.env.local.example`

### 3. Enhance Quick Order Shipping Calculation

- Update `/src/server/services/quick-order.ts`:
  ```typescript
  export async function calculateShippingWithAusPost(params) {
    // Try AusPost API first
    try {
      const rates = await getAusPostRates({
        from_postcode: businessPostcode,
        to_postcode: params.deliveryPostcode,
        length: params.boxLength,
        width: params.boxWidth,
        height: params.boxHeight,
        weight: params.totalWeight,
      });

      return {
        source: 'auspost',
        options: rates.services.map(s => ({
          code: s.code,
          label: s.name,
          price: s.price,
          eta: s.delivery_time,
        })),
      };
    } catch (error) {
      logger.warn({scope: 'shipping.auspost', message: 'API failed, using fallback', error});

      // Fallback to settings-based calculation
      return {
        source: 'fallback',
        options: [await resolveShippingRegion(state, postcode)],
      };
    }
  }
  ```

### 4. Create Shipping Option Selection UI

- Create `/src/components/quick-order/shipping-option-select.tsx`:
  ```tsx
  export function ShippingOptionSelect({options, selected, onSelect}) {
    return (
      <RadioGroup value={selected} onValueChange={onSelect}>
        {options.map(opt => (
          <div key={opt.code} className="flex items-center space-x-2">
            <RadioGroupItem value={opt.code} id={opt.code} />
            <Label htmlFor={opt.code} className="flex justify-between flex-1">
              <span>{opt.label}</span>
              <span>${opt.price} • {opt.eta}</span>
            </Label>
          </div>
        ))}
      </RadioGroup>
    );
  }
  ```

### 5. Integrate into Price Step

- Update `/src/app/(client)/quick-order/page.tsx` price step
- Fetch shipping options when postcode entered
- Display `<ShippingOptionSelect />` component
- Update total when selection changes

### 6. Add Rate Caching

- Use React Query with 24h staleTime
- Cache key: `['shipping-rates', postcode, weight]`

### 7. Add Settings UI for Credentials

- Update `/src/components/settings/settings-form.tsx`
- Add section: "Australia Post Integration"
- Fields: API Key, API Secret (password input)
- Test connection button

### 8. Run Validation Commands

```bash
npm run build
npm run dev

# Test Rate Calculation
# Enter postcode "2000" (Sydney)
# EXPECTED: Shows Express ($15.50, 1-2 days), Standard ($12.00, 3-5 days)

# Test Fallback
# Disable API key
# EXPECTED: Falls back to settings-based calculation, shows warning

# Test Caching
# Enter same postcode twice
# EXPECTED: Second request instant (from cache)
```

# Implementation log: specs/fixes/integrations/integrations_implementation.log

## Definition of Done
- [x] All acceptance criteria met
- [x] Validation commands pass
- [x] Fallback works if API unavailable
