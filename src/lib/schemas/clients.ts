import { z } from "zod";

export const clientInputSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional().or(z.literal("")),
  abn: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  paymentTerms: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  tags: z.array(z.string()).optional().default([]),
});

export type ClientInput = z.infer<typeof clientInputSchema>;

export const clientNoteSchema = z.object({
  body: z.string().min(1),
});

export type ClientNoteInput = z.infer<typeof clientNoteSchema>;
