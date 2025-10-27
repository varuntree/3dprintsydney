import { z } from "zod";

export const signupSchema = z
  .object({
    email: z.string().email().max(200),
    password: z.string().min(4).max(128),
    confirm: z.string().min(4).max(128),
    firstName: z.string().min(1, "First name is required").max(100),
    lastName: z.string().min(1, "Last name is required").max(100),
    phone: z.string().min(1, "Phone number is required").max(20),
    isBusinessAccount: z.boolean(),
    businessName: z.string().max(200).optional(),
    position: z.string().max(100).optional(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  })
  .refine(
    (v) => {
      if (v.isBusinessAccount) {
        return !!v.businessName && v.businessName.length > 0;
      }
      return true;
    },
    {
      message: "Business name is required when registering as a business",
      path: ["businessName"],
    }
  )
  .refine(
    (v) => {
      if (v.isBusinessAccount) {
        return !!v.position && v.position.length > 0;
      }
      return true;
    },
    {
      message: "Position is required when registering as a business",
      path: ["position"],
    }
  );

export const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8, "Password must be at least 8 characters"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
