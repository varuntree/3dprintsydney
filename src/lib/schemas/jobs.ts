import { z } from "zod";

export const jobPriorityValues = ["NORMAL", "FAST_TRACK", "URGENT"] as const;
export const jobStatusValues = [
  "QUEUED",
  "PRE_PROCESSING",
  "IN_QUEUE",
  "PRINTING",
  "PAUSED",
  "PRINTING_COMPLETE",
  "POST_PROCESSING",
  "PACKAGING",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
] as const;

export const jobUpdateSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  priority: z.enum(jobPriorityValues),
  printerId: z.number().int().positive().optional().nullable(),
  estimatedHours: z
    .number()
    .min(0, "Estimated hours cannot be negative")
    .max(1000, "Keep estimates under 1000 hours")
    .optional()
    .nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type JobUpdateInput = z.infer<typeof jobUpdateSchema>;

export const jobStatusSchema = z.object({
  status: z.enum(jobStatusValues),
  note: z.string().max(2000).optional().nullable(),
});

export type JobStatusInput = z.infer<typeof jobStatusSchema>;

export const jobReorderEntrySchema = z.object({
  id: z.number().int().positive(),
  queuePosition: z.number().int().min(0),
  printerId: z.number().int().positive().nullable(),
});

export const jobReorderSchema = z.array(jobReorderEntrySchema).min(1);
