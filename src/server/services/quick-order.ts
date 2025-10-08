import { prisma } from "@/server/db/client";
import { getSettings } from "@/server/services/settings";
import type { SettingsInput } from "@/lib/schemas/settings";
import { logger } from "@/lib/logger";

export type QuickOrderItemInput = {
  fileId?: string; // temp file id for checkout attach
  filename: string;
  materialId: number;
  materialName?: string;
  layerHeight: number; // mm
  infill: number; // percent
  quantity: number;
  metrics: { grams: number; timeSec: number; fallback?: boolean };
};

export type QuickOrderShippingQuote = {
  code: string;
  label: string;
  baseAmount: number;
  amount: number;
  remoteSurcharge?: number;
  remoteApplied: boolean;
};

export type QuickOrderPrice = {
  items: {
    filename: string;
    unitPrice: number;
    quantity: number;
    total: number;
    breakdown: Record<string, number>;
  }[];
  subtotal: number;
  shipping: QuickOrderShippingQuote;
  taxRate?: number;
};

let cachedSettings: Awaited<ReturnType<typeof getSettings>> | null = null;
let cachedSettingsAt = 0;
const SETTINGS_TTL_MS = 60_000;

type ShippingLocation = {
  state?: string | null;
  postcode?: string | null;
};

function resolveShippingRegion(
  settings: SettingsInput,
  location: ShippingLocation,
): QuickOrderShippingQuote {
  const regions = settings.shippingRegions ?? [];
  const fallback = regions.find((region) => region.code === settings.defaultShippingRegion) ?? regions[0];

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
      (region.postcodePrefixes ?? []).some((prefix) => targetPostcode.startsWith(prefix)),
    );
    if (postcodeMatch) {
      candidates = [postcodeMatch];
    }
  }

  const selected = candidates[0] ?? fallback;
  const baseAmount = Number(selected.baseAmount ?? 0);
  const remoteSurcharge =
    targetPostcode && (selected.postcodePrefixes ?? []).some((prefix) => targetPostcode.startsWith(prefix))
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

export async function priceQuickOrder(
  items: QuickOrderItemInput[],
  location: ShippingLocation = {},
): Promise<QuickOrderPrice> {
  const now = Date.now();
  if (!cachedSettings || now - cachedSettingsAt > SETTINGS_TTL_MS) {
    cachedSettings = await getSettings();
    cachedSettingsAt = now;
  }
  const settings = cachedSettings;
  if (!settings) {
    throw new Error("Settings not configured");
  }
  const materialIds = Array.from(new Set(items.map((i) => i.materialId)));
  const materials = await prisma.material.findMany({ where: { id: { in: materialIds } } });
  const materialMap = new Map(materials.map((m) => [m.id, Number(m.costPerGram)]));
  const hourlyRate = settings.calculatorConfig.hourlyRate ?? 45;
  const setupFee = settings.calculatorConfig.setupFee ?? 20;
  const minimumPrice = settings.calculatorConfig.minimumPrice ?? 35;

  let subtotal = 0;
  const priced = items.map((it) => {
    const costPerGram = materialMap.get(it.materialId) ?? 0.05;
    const grams = Math.max(0, it.metrics.grams);
    const hours = Math.max(0, it.metrics.timeSec) / 3600;
    const materialCost = grams * costPerGram;
    const timeCost = hours * hourlyRate;
    const base = materialCost + timeCost + setupFee;
    const unitPrice = Math.max(minimumPrice, Math.round(base * 100) / 100);
    const total = Math.round(unitPrice * it.quantity * 100) / 100;
    subtotal += total;
    return {
      filename: it.filename,
      unitPrice,
      quantity: it.quantity,
      total,
      breakdown: { grams, hours, materialCost, timeCost, setupFee },
    };
  });

  const shipping = resolveShippingRegion(settings, location);

  return {
    items: priced,
    subtotal: Math.round(subtotal * 100) / 100,
    shipping,
    taxRate: settings.taxRate,
  };
}
