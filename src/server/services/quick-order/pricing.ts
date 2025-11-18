import { getSettings } from "@/server/services/settings";
import type { SettingsInput } from "@/lib/schemas/settings";
import { logger } from "@/lib/logger";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { AppError, BadRequestError } from '@/lib/errors';
import { calculateDocumentTotals, type DiscountType } from '@/lib/calculations';
import type { QuickOrderItemInput, QuickOrderPrice, QuickOrderShippingQuote, ShippingLocation } from "./types";

let cachedSettings: Awaited<ReturnType<typeof getSettings>> | null = null;
let cachedSettingsAt = 0;
const SETTINGS_TTL_MS = 60_000;

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function resolveShippingRegion(
  settings: SettingsInput,
  location: ShippingLocation,
): QuickOrderShippingQuote {
  const regions = settings.shippingRegions ?? [];
  const fallback =
    regions.find((region) => region.code === settings.defaultShippingRegion) ??
    regions[0];

  if (!fallback) {
    return {
      code: "none",
      label: "Shipping",
      baseAmount: 0,
      amount: 0,
      remoteApplied: false,
    };
  }

  const targetState = (location.state ?? "").trim().toUpperCase();
  const targetPostcode = (location.postcode ?? "").trim();

  let candidates = regions.filter((region) =>
    region.states?.some((state) => state.trim().toUpperCase() === targetState),
  );

  if (candidates.length === 0) {
    const quote = {
      code: fallback.code,
      label: fallback.label,
      baseAmount: fallback.baseAmount ?? 0,
      amount: fallback.baseAmount ?? 0,
      remoteSurcharge: fallback.remoteSurcharge,
      remoteApplied: false,
    };
    if (!targetState) {
      logger.info({
        scope: "quick-order.shipping",
        message: "No state provided; using default shipping region",
        data: { code: quote.code },
      });
    } else {
      logger.info({
        scope: "quick-order.shipping",
        message: "State not matched; using default shipping region",
        data: { state: targetState, code: quote.code },
      });
    }
    return quote;
  }

  if (targetPostcode) {
    const postcodeMatch = candidates.find((region) =>
      (region.postcodePrefixes ?? []).some((prefix) =>
        targetPostcode.startsWith(prefix),
      ),
    );
    if (postcodeMatch) {
      candidates = [postcodeMatch];
    }
  }

  const selected = candidates[0] ?? fallback;
  const baseAmount = Number(selected.baseAmount ?? 0);
  const remoteSurcharge =
    targetPostcode && (selected.postcodePrefixes ?? []).some((prefix) =>
      targetPostcode.startsWith(prefix),
    )
      ? Number(selected.remoteSurcharge ?? 0)
      : 0;
  const amount = Math.round((baseAmount + remoteSurcharge) * 100) / 100;

  return {
    code: selected.code,
    label: selected.label,
    baseAmount,
    amount,
    remoteSurcharge: remoteSurcharge > 0 ? remoteSurcharge : undefined,
    remoteApplied: remoteSurcharge > 0,
  };
}

/**
 * Calculate pricing for quick order items including materials, time, shipping, and tax
 * @param items - Array of items to price with metrics and material info
 * @param location - Shipping location for region-based shipping calculation
 * @returns Detailed pricing breakdown with item totals, subtotal, and shipping
 * @throws BadRequestError if settings not configured
 * @throws AppError if materials cannot be loaded
 */
export async function priceQuickOrder(
  items: QuickOrderItemInput[],
  location: ShippingLocation = {},
  options: { discountType?: DiscountType; discountValue?: number } = {},
): Promise<QuickOrderPrice> {
  const now = Date.now();
  if (!cachedSettings || now - cachedSettingsAt > SETTINGS_TTL_MS) {
    cachedSettings = await getSettings();
    cachedSettingsAt = now;
  }
  const settings = cachedSettings;
  if (!settings) {
    throw new BadRequestError("Settings not configured");
  }

  const materialIds = Array.from(new Set(items.map((i) => i.materialId)));
  const supabase = getServiceSupabase();
  const { data: materials, error } = await supabase
    .from("materials")
    .select("id, cost_per_gram")
    .in("id", materialIds);

  if (error) {
    throw new AppError(`Failed to load materials: ${error.message}`, 'MATERIALS_LOAD_ERROR', 500);
  }

  const materialMap = new Map<number, number>(
    (materials ?? []).map((m) => [m.id, Number(m.cost_per_gram ?? 0)]),
  );

  const hourlyRate = settings.calculatorConfig.hourlyRate ?? 45;
  const setupFee = settings.calculatorConfig.setupFee ?? 20;
  const minimumPrice = settings.calculatorConfig.minimumPrice ?? 35;

  const priced = items.map((it) => {
    const costPerGram = materialMap.get(it.materialId) ?? 0.05;
    const grams = Math.max(0, it.metrics.grams);
    const supportGrams = Math.max(0, it.metrics.supportGrams ?? 0);
    const supportMaterialCostPerGram =
      it.supportMaterialId && it.supportMaterialId !== it.materialId
        ? materialMap.get(it.supportMaterialId) ?? costPerGram
        : costPerGram;
    const hours = Math.max(0, it.metrics.timeSec) / 3600;
    const modelMaterialCost = grams * costPerGram;
    const supportMaterialCost = supportGrams * supportMaterialCostPerGram;
    const materialCost = modelMaterialCost + supportMaterialCost;
    const timeCost = hours * hourlyRate;
    const base = materialCost + timeCost + setupFee;
    const unitPrice = Math.max(minimumPrice, Math.round(base * 100) / 100);
    const total = Math.round(unitPrice * it.quantity * 100) / 100;
    return {
      filename: it.filename,
      unitPrice,
      quantity: it.quantity,
      total,
      breakdown: {
        modelWeight: grams,
        supportWeight: supportGrams,
        grams,
        supportGrams,
        hours,
        modelMaterialCost,
        supportMaterialCost,
        materialCost,
        timeCost,
        setupFee,
      },
    };
  });

  const shipping = resolveShippingRegion(settings, location);
  let discountType: DiscountType = options.discountType ?? 'NONE';
  let discountValue = options.discountValue ?? 0;

  if (discountType === 'PERCENT') {
    discountValue = Math.max(0, discountValue);
    if (discountValue <= 0) {
      discountType = 'NONE';
      discountValue = 0;
    }
  } else if (discountType === 'FIXED') {
    discountValue = Math.max(0, discountValue);
    if (discountValue <= 0) {
      discountType = 'NONE';
      discountValue = 0;
    }
  } else {
    discountType = 'NONE';
    discountValue = 0;
  }

  const docTotals = calculateDocumentTotals({
    lines: priced.map((line) => ({ total: line.total })),
    discountType,
    discountValue,
    shippingCost: shipping.amount,
    taxRate: settings.taxRate ?? 0,
  });

  const originalSubtotal = roundCurrency(docTotals.subtotal);
  const discountedSubtotal = roundCurrency(docTotals.discounted);
  const discountAmount = roundCurrency(docTotals.subtotal - docTotals.discounted);
  const taxAmount = roundCurrency(docTotals.tax);
  const total = roundCurrency(docTotals.total);

  return {
    items: priced,
    originalSubtotal,
    discountType,
    discountValue,
    discountAmount,
    subtotal: discountedSubtotal,
    shipping,
    taxRate: settings.taxRate,
    taxAmount,
    total,
  };
}
