import { z } from "zod";

export const userInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "CLIENT"]).default("CLIENT"),
  clientId: z.number().optional(),
});

export type UserInviteInput = z.infer<typeof userInviteSchema>;
