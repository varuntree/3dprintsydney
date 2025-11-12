import { z } from "zod";
import { discountTypeValues } from "@/lib/schemas/quotes";
import {
  invoiceLineTypes,
  modellingComplexityValues,
} from "@/lib/types/modelling";

export const invoiceLineSchema = z
  .object({
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
    lineType: z.enum(invoiceLineTypes).default("PRINT"),
    modellingBrief: z.string().optional().or(z.literal("")),
    modellingComplexity: z.enum(modellingComplexityValues).optional(),
    modellingRevisionCount: z.number().int().min(0).optional(),
    modellingHourlyRate: z.number().min(0).optional(),
    modellingEstimatedHours: z.number().min(0).optional(),
  })
  .superRefine((line, ctx) => {
    if (line.lineType === "MODELLING") {
      if (!line.modellingBrief?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provide a modelling brief" });
      }
      if (!line.modellingComplexity) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select a complexity" });
      }
      if ((line.modellingRevisionCount ?? 0) < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Revision count cannot be negative",
        });
      }
      if ((line.modellingHourlyRate ?? 0) <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Hourly rate must be greater than zero",
        });
      }
      if ((line.modellingEstimatedHours ?? 0) <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Estimated hours must be greater than zero",
        });
      }
    }
  });

export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;

export const invoiceInputSchema = z.object({
  clientId: z.number(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional().or(z.literal("")),
  taxRate: z.number().min(0).max(100).optional(),
  discountType: z.enum(discountTypeValues).default("NONE"),
  discountValue: z.number().min(0).optional().default(0),
  shippingCost: z.number().min(0).optional().default(0),
  shippingLabel: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  terms: z.string().optional().or(z.literal("")),
  poNumber: z
    .string()
    .max(120, "PO number is too long")
    .optional()
    .or(z.literal("")),
  paymentPreference: z.string().optional().or(z.literal("")),
  creditRequestedAmount: z.number().min(0).optional().default(0),
  deliveryQuoteSnapshot: z.unknown().optional(),
  lines: z.array(invoiceLineSchema).min(1),
});

export type InvoiceInput = z.infer<typeof invoiceInputSchema>;

export const paymentInputSchema = z.object({
  amount: z.number().min(0.01),
  method: z.enum(["STRIPE", "BANK_TRANSFER", "CASH", "OTHER"]).default("OTHER"),
  reference: z.string().optional().or(z.literal("")),
  processor: z.string().optional().or(z.literal("")),
  processorId: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  paidAt: z.string().optional(),
});

// Invoice action schemas
export const invoiceVoidSchema = z.object({
  reason: z.string().optional(),
});

export const invoiceWriteOffSchema = z.object({
  reason: z.string().optional(),
});

export const invoiceRevertSchema = z.object({});

export type PaymentInput = z.infer<typeof paymentInputSchema>;
export type InvoiceVoidInput = z.infer<typeof invoiceVoidSchema>;
export type InvoiceWriteOffInput = z.infer<typeof invoiceWriteOffSchema>;
