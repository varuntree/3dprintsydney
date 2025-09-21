import { z } from "zod";

export const discountTypeValues = ["NONE", "PERCENT", "FIXED"] as const;
export type DiscountTypeValue = (typeof discountTypeValues)[number];

export const quoteLineSchema = z.object({
  id: z.number().optional(),
  productTemplateId: z.number().optional().nullable(),
  name: z.string().min(1),
  description: z.string().optional().or(z.literal("")),
  quantity: z.number().min(0.01),
  unit: z.string().optional().or(z.literal("")),
  unitPrice: z.number().min(0),
  discountType: z.enum(discountTypeValues).default("NONE"),
  discountValue: z.number().min(0).optional().default(0),
  orderIndex: z.number().optional(),
  calculatorBreakdown: z.record(z.string(), z.unknown()).optional(),
});

export type QuoteLineInput = z.infer<typeof quoteLineSchema>;

export const quoteInputSchema = z.object({
  clientId: z.number(),
  issueDate: z.string().optional(),
  expiryDate: z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => (value === null || value === "" ? undefined : value)),
  taxRate: z.number().min(0).max(100).optional(),
  discountType: z.enum(discountTypeValues).default("NONE"),
  discountValue: z.number().min(0).optional().default(0),
  shippingCost: z.number().min(0).optional().default(0),
  shippingLabel: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  terms: z.string().optional().or(z.literal("")),
  lines: z.array(quoteLineSchema).min(1),
});

export type QuoteInput = z.infer<typeof quoteInputSchema>;

export const quoteStatusSchema = z.object({
  status: z.enum(["DRAFT", "PENDING", "ACCEPTED", "DECLINED", "CONVERTED"]),
});
