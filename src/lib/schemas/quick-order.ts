import { z } from "zod";

const orientationSnapshotSchema = z.object({
  quaternion: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  position: z.tuple([z.number(), z.number(), z.number()]),
  autoOriented: z.boolean().optional(),
  supportVolume: z.number().nonnegative().optional(),
  supportWeight: z.number().nonnegative().optional(),
});

const supportsSchema = z.object({
  enabled: z.boolean(),
  pattern: z.enum(["normal", "tree"]),
  angle: z.number().min(0).max(90),
  style: z.enum(["grid", "organic"]).optional(),
  interfaceLayers: z.number().int().min(0).optional(),
  acceptedFallback: z.boolean().optional(),
});

const metricsSchema = z.object({
  grams: z.number().nonnegative(),
  supportGrams: z.number().nonnegative().optional(),
  timeSec: z.number().nonnegative(),
  fallback: z.boolean().optional(),
  error: z.string().optional(),
});

const quickOrderItemSchema = z.object({
  fileId: z.string().min(1),
  filename: z.string().min(1),
  materialId: z.number().int().nonnegative(),
  materialName: z.string().optional(),
  layerHeight: z.number().positive(),
  infill: z.number().min(0).max(100),
  quantity: z.number().int().min(1),
  orientation: orientationSnapshotSchema.optional(),
  supports: supportsSchema.optional(),
  metrics: metricsSchema,
});

const locationSchema = z.object({
  state: z.string().optional(),
  postcode: z.string().optional(),
});

const addressSchema = z.object({
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().optional(),
});

export const quickOrderPriceSchema = z.object({
  items: z.array(quickOrderItemSchema).min(1, "At least one item required"),
  location: locationSchema.optional(),
});

export const quickOrderCheckoutSchema = quickOrderPriceSchema.extend({
  address: addressSchema.optional(),
  creditRequestedAmount: z.number().nonnegative().optional(),
  paymentPreference: z.string().optional(),
});

const supportsSliceSchema = z.object({
  enabled: z.boolean().default(true),
  pattern: z.enum(["normal", "tree"]).default("normal"),
  angle: z.number().min(0).max(90).default(45),
});

const sliceFileSchema = z.object({
  id: z.string().min(1),
  layerHeight: z.number().positive().optional(),
  infill: z.number().min(0).max(100).optional(),
  supports: supportsSliceSchema.optional(),
});

export const quickOrderSliceSchema = z.object({
  file: sliceFileSchema,
});

export type QuickOrderItemInput = z.infer<typeof quickOrderItemSchema>;
export type QuickOrderPriceInput = z.infer<typeof quickOrderPriceSchema>;
export type QuickOrderCheckoutInput = z.infer<typeof quickOrderCheckoutSchema>;
export type QuickOrderSliceInput = z.infer<typeof quickOrderSliceSchema>;
