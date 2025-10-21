import { z } from "zod";

// Quick order item schema (shared across multiple endpoints)
const quickOrderItemSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  material: z.string().min(1),
  quantity: z.number().int().min(1),
  color: z.string().optional(),
  infill: z.number().min(0).max(100).optional(),
  layerHeight: z.number().positive().optional(),
});

// Location schema for pricing
const locationSchema = z.object({
  state: z.string().optional(),
  postcode: z.string().optional(),
});

// Address schema for checkout
const addressSchema = z.object({
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().optional(),
});

// Supports configuration for slicing
const supportsSchema = z.object({
  enabled: z.boolean().default(true),
  pattern: z.enum(["normal", "tree"]).default("normal"),
  angle: z.number().min(0).max(90).default(45),
});

// File object for slicing
const sliceFileSchema = z.object({
  id: z.string().min(1),
  layerHeight: z.number().positive().optional(),
  infill: z.number().min(0).max(100).optional(),
  supports: supportsSchema.optional(),
});

// Price endpoint schema
export const quickOrderPriceSchema = z.object({
  items: z.array(quickOrderItemSchema).min(1, "At least one item required"),
  location: locationSchema.optional(),
});

// Checkout endpoint schema
export const quickOrderCheckoutSchema = z.object({
  items: z.array(quickOrderItemSchema).min(1, "At least one item required"),
  address: addressSchema.optional(),
});

// Slice endpoint schema
export const quickOrderSliceSchema = z.object({
  file: sliceFileSchema,
});

// Orient endpoint - FormData based, validated manually in route
// Upload endpoint - FormData based, uses validateOrderFile utility

export type QuickOrderPriceInput = z.infer<typeof quickOrderPriceSchema>;
export type QuickOrderCheckoutInput = z.infer<typeof quickOrderCheckoutSchema>;
export type QuickOrderSliceInput = z.infer<typeof quickOrderSliceSchema>;
