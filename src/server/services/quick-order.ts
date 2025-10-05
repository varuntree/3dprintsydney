import { prisma } from "@/server/db/client";
import { getSettings } from "@/server/services/settings";

export type QuickOrderItemInput = {
  fileId?: string; // temp file id for checkout attach
  filename: string;
  materialId: number;
  layerHeight: number; // mm
  infill: number; // percent
  quantity: number;
  metrics: { grams: number; timeSec: number; fallback?: boolean };
};

export type QuickOrderPrice = {
  items: { filename: string; unitPrice: number; quantity: number; total: number; breakdown: Record<string, number> }[];
  subtotal: number;
  shippingOptions: { code: string; label: string; amount: number }[];
  taxRate?: number;
};

let cachedSettings: Awaited<ReturnType<typeof getSettings>> | null = null;
let cachedSettingsAt = 0;
const SETTINGS_TTL_MS = 60_000;

export async function priceQuickOrder(items: QuickOrderItemInput[]): Promise<QuickOrderPrice> {
  const now = Date.now();
  if (!cachedSettings || now - cachedSettingsAt > SETTINGS_TTL_MS) {
    cachedSettings = await getSettings();
    cachedSettingsAt = now;
  }
  const settings = cachedSettings!;
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

  return {
    items: priced,
    subtotal: Math.round(subtotal * 100) / 100,
    shippingOptions: settings.shippingOptions ?? [],
    taxRate: settings.taxRate,
  };
}
