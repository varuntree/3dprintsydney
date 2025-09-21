import { z } from "zod";

export const pricingTypeValues = ["FIXED", "CALCULATED"] as const;
export type PricingTypeValue = (typeof pricingTypeValues)[number];

export const materialInputSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional().or(z.literal("")),
  category: z.string().optional().or(z.literal("")),
  costPerGram: z.number().min(0),
  notes: z.string().optional().or(z.literal("")),
});

export type MaterialInput = z.infer<typeof materialInputSchema>;

export const productCalculatorSchema = z.object({
  baseHours: z.number().min(0).default(1),
  materialGrams: z.number().min(0).default(0),
  quality: z.string().default("standard"),
  infill: z.string().default("medium"),
});

export const productTemplateInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().or(z.literal("")),
  unit: z.string().min(1).default("unit"),
  pricingType: z.enum(pricingTypeValues),
  basePrice: z.number().min(0).optional(),
  calculatorConfig: productCalculatorSchema.optional(),
  materialId: z.number().optional().nullable(),
});

export type ProductTemplateInput = z.infer<typeof productTemplateInputSchema>;

export const printerStatusValues = [
  "ACTIVE",
  "MAINTENANCE",
  "OFFLINE",
] as const;
export type PrinterStatusValue = (typeof printerStatusValues)[number];

export const printerInputSchema = z.object({
  name: z.string().min(1),
  model: z.string().optional().or(z.literal("")),
  buildVolume: z.string().optional().or(z.literal("")),
  status: z.enum(printerStatusValues).default("ACTIVE"),
  notes: z.string().optional().or(z.literal("")),
});

export type PrinterInput = z.infer<typeof printerInputSchema>;
