import { z } from "zod";

const abnPattern = /^\d{11}$/;

const abnSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return "";
    }
    return value.replace(/[^0-9]/g, "");
  },
  z
    .string()
    .refine((value) => value.length === 0 || abnPattern.test(value), {
      message: "ABN must be 11 digits",
    })
    .or(z.literal("")),
);

export const clientInputSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional().or(z.literal("")),
  abn: abnSchema,
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  paymentTerms: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  tags: z.array(z.string()).optional().default([]),
  notifyOnJobStatus: z.boolean().optional().default(false),
});

export type ClientInput = z.infer<typeof clientInputSchema>;

export const clientNoteSchema = z.object({
  body: z.string().min(1),
});

export const clientPreferenceSchema = z.object({
  notifyOnJobStatus: z.boolean(),
});

export const creditAdjustmentSchema = z.object({
  amount: z.number().positive().min(0.01, 'Amount must be at least $0.01'),
  reason: z.enum(['initial_credit', 'adjustment', 'promotion', 'refund']).optional(),
  notes: z.string().max(500).optional(),
});

export type ClientNoteInput = z.infer<typeof clientNoteSchema>;
export type ClientPreferenceInput = z.infer<typeof clientPreferenceSchema>;
export type CreditAdjustmentInput = z.infer<typeof creditAdjustmentSchema>;
