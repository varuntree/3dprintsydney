import { z } from "zod";

export const jobCreationPolicyValues = ["ON_PAYMENT", "ON_INVOICE"] as const;
export type JobCreationPolicyValue = (typeof jobCreationPolicyValues)[number];

export const shippingOptionSchema = z.object({
  code: z.string().min(1, "Code is required"),
  label: z.string().min(1, "Label is required"),
  amount: z.number().min(0, "Amount must be positive"),
});

export const calculatorConfigSchema = z.object({
  hourlyRate: z.number().min(0).default(0),
  setupFee: z.number().min(0).default(0),
  minimumPrice: z.number().min(0).optional(),
  qualityMultipliers: z
    .record(z.string(), z.number().min(0.1))
    .default(() => ({ standard: 1 })),
  infillMultipliers: z
    .record(z.string(), z.number().min(0.1))
    .default(() => ({ medium: 1 })),
});

export const settingsInputSchema = z.object({
  businessName: z.string().min(1),
  businessEmail: z.string().email().optional().or(z.literal("")),
  businessPhone: z.string().optional().or(z.literal("")),
  businessAddress: z.string().optional().or(z.literal("")),
  abn: z.string().optional().or(z.literal("")),
  taxRate: z.number().nonnegative().max(100).optional(),
  numberingQuotePrefix: z.string().min(1),
  numberingInvoicePrefix: z.string().min(1),
  defaultPaymentTerms: z.string().min(1),
  bankDetails: z.string().optional().or(z.literal("")),
  jobCreationPolicy: z.enum(jobCreationPolicyValues),
  shippingOptions: z.array(shippingOptionSchema).default(() => []),
  calculatorConfig: calculatorConfigSchema.default(() => ({
    hourlyRate: 0,
    setupFee: 0,
    minimumPrice: 0,
    qualityMultipliers: { standard: 1 },
    infillMultipliers: { medium: 1 },
  })),
  defaultCurrency: z.string().min(3).max(3).default("AUD"),
  stripeSecretKey: z.string().optional().or(z.literal("")),
  stripePublishableKey: z.string().optional().or(z.literal("")),
  stripeWebhookSecret: z.string().optional().or(z.literal("")),
  // Operational automation toggles
  autoDetachJobOnComplete: z.boolean().default(true),
  autoArchiveCompletedJobsAfterDays: z.number().int().min(0).default(7),
  preventAssignToOffline: z.boolean().default(true),
  preventAssignToMaintenance: z.boolean().default(true),
  maxActivePrintingPerPrinter: z.number().int().min(1).default(1),
  overdueDays: z.number().int().min(0).default(0),
  reminderCadenceDays: z.number().int().min(1).default(7),
  enableEmailSend: z.boolean().default(false),
});

export type SettingsInput = z.infer<typeof settingsInputSchema>;
