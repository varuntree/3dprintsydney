import { z } from "zod";

export const jobCreationPolicyValues = ["ON_PAYMENT", "ON_INVOICE"] as const;
export type JobCreationPolicyValue = (typeof jobCreationPolicyValues)[number];

export const shippingRegionSchema = z.object({
  code: z.string().min(1, "Code is required"),
  label: z.string().min(1, "Label is required"),
  states: z
    .array(z.string().min(1, "State/Territory is required"))
    .min(1, "Provide at least one state or territory"),
  baseAmount: z.number().min(0, "Amount must be positive"),
  remoteSurcharge: z.number().min(0).optional(),
  postcodePrefixes: z.array(z.string().min(1)).optional(),
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

export const paymentTermSchema = z.object({
  code: z.string().min(1, "Code is required"),
  label: z.string().min(1, "Label is required"),
  days: z.number().int().min(0, "Days must be zero or positive"),
});

export const DEFAULT_PAYMENT_TERMS = [
  { code: "COD", label: "COD", days: 0 },
  { code: "7_days", label: "7 days", days: 7 },
  { code: "14_days", label: "14 days", days: 14 },
  { code: "30_days", label: "30 days", days: 30 },
] as const;

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
  shippingRegions: z
    .array(shippingRegionSchema)
    .default(() => [
      {
        code: "sydney_metro",
        label: "Sydney Metro",
        states: ["NSW"],
        baseAmount: 12.5,
        remoteSurcharge: 0,
      },
      {
        code: "regional",
        label: "Regional Australia",
        states: ["NSW", "VIC", "QLD", "SA", "WA", "NT", "TAS", "ACT"],
        baseAmount: 25,
        remoteSurcharge: 0,
      },
      {
        code: "remote",
        label: "Remote & Islands",
        states: ["TAS", "WA", "NT"],
        baseAmount: 45,
        remoteSurcharge: 15,
      },
    ]),
  defaultShippingRegion: z.string().min(1),
  paymentTerms: z
    .array(paymentTermSchema)
    .default(() => DEFAULT_PAYMENT_TERMS.map((term) => ({ ...term }))),
  calculatorConfig: calculatorConfigSchema.default(() => ({
    hourlyRate: 0,
    setupFee: 0,
    minimumPrice: 0,
    qualityMultipliers: { standard: 1 },
    infillMultipliers: { medium: 1 },
  })),
  defaultCurrency: z.string().min(3).max(3).default("AUD"),
  // Operational automation toggles
  autoDetachJobOnComplete: z.boolean().default(true),
  autoArchiveCompletedJobsAfterDays: z.number().int().min(0).default(7),
  preventAssignToOffline: z.boolean().default(true),
  preventAssignToMaintenance: z.boolean().default(true),
  maxActivePrintingPerPrinter: z.number().int().min(1).default(1),
  overdueDays: z.number().int().min(0).default(0),
  reminderCadenceDays: z.number().int().min(1).default(7),
  enableEmailSend: z.boolean().default(false),
}).superRefine((data, ctx) => {
  const codes = new Set<string>();
  data.paymentTerms.forEach((term, index) => {
    const normalized = term.code.trim();
    if (codes.has(normalized)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paymentTerms", index, "code"],
        message: "Codes must be unique",
      });
    }
    codes.add(normalized);
  });

  if (data.paymentTerms.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["paymentTerms"],
      message: "At least one payment term is required",
    });
  }

  const defaultTerm = data.paymentTerms.find(
    (term) => term.code === data.defaultPaymentTerms,
  );

  if (!defaultTerm) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["defaultPaymentTerms"],
      message: "Default must reference a defined payment term",
    });
  }

  const regionCodes = new Set<string>();
  data.shippingRegions.forEach((region, index) => {
    const normalized = region.code.trim();
    if (regionCodes.has(normalized)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["shippingRegions", index, "code"],
        message: "Codes must be unique",
      });
    }
    regionCodes.add(normalized);
  });

  if (data.shippingRegions.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["shippingRegions"],
      message: "At least one shipping region is required",
    });
  }

  const defaultRegionExists = data.shippingRegions.some(
    (region) => region.code === data.defaultShippingRegion,
  );

  if (!defaultRegionExists) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["defaultShippingRegion"],
      message: "Default must reference a defined shipping region",
    });
  }
});

export type SettingsInput = z.infer<typeof settingsInputSchema>;
