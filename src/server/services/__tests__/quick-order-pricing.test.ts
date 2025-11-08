import { describe, expect, it, beforeEach, vi } from "vitest";

import { priceQuickOrder, type QuickOrderItemInput } from "@/server/services/quick-order";

vi.mock("@/server/services/settings", () => ({
  getSettings: vi.fn(async () => ({
    calculatorConfig: {
      hourlyRate: 50,
      setupFee: 10,
      minimumPrice: 20,
    },
    shippingRegions: [
      { code: "sydney", label: "Sydney Metro", amount: 15, baseAmount: 15, remoteApplied: false },
    ],
    defaultShippingRegion: "sydney",
    taxRate: 0.1,
  })),
}));

const materialsTable = new Map<number, number>([
  [1, 0.5],
  [2, 1.0],
]);

vi.mock("@/server/supabase/service-client", () => ({
  getServiceSupabase: () => ({
    from: () => ({
      select: () => ({
        in: async () => ({
          data: Array.from(materialsTable.entries()).map(([id, cost]) => ({ id, cost_per_gram: cost })),
          error: null,
        }),
      }),
    }),
  }),
}));

describe("priceQuickOrder", () => {
  let baseItem: QuickOrderItemInput;

  beforeEach(() => {
    baseItem = {
      fileId: "1/fixture",
      filename: "fixture.stl",
      materialId: 1,
      supportMaterialId: 2,
      materialName: "PLA",
      layerHeight: 0.2,
      infill: 20,
      quantity: 1,
      metrics: { grams: 50, supportGrams: 10, timeSec: 3600 },
      supports: { enabled: true, pattern: "normal", angle: 45 },
    };
  });

  it("charges model and support material separately", async () => {
    const price = await priceQuickOrder([baseItem], {});
    const breakdown = price.items[0].breakdown;
    expect(breakdown.materialCost).toBeCloseTo(50 * 0.5 + 10 * 1.0, 5);
    expect(breakdown.supportWeight).toBeCloseTo(10, 5);
    expect(price.items[0].unitPrice).toBeGreaterThan(breakdown.materialCost ?? 0);
  });

  it("falls back to model material cost when no support grams", async () => {
    const price = await priceQuickOrder([
      {
        ...baseItem,
        metrics: { grams: 25, supportGrams: 0, timeSec: 1200 },
      },
    ], {});
    const breakdown = price.items[0].breakdown;
    expect(breakdown.supportWeight).toBeCloseTo(0, 5);
    expect(breakdown.materialCost).toBeCloseTo(25 * 0.5, 5);
  });
});
