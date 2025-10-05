import { z } from "zod";

export const signupSchema = z
  .object({
    email: z.string().email().max(200),
    password: z.string().min(4).max(128),
    confirm: z.string().min(4).max(128),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
