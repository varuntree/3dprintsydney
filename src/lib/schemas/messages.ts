import { z } from "zod";

export const messageInputSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(5000, "Message too long"),
  invoiceId: z.number().int().positive().optional().nullable(),
});

export type MessageInput = z.infer<typeof messageInputSchema>;
