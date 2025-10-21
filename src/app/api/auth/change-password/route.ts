import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/server/auth/session";
import { getUserEmail } from "@/server/services/auth";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";
import { logger } from "@/lib/logger";
import { ok, fail, handleError } from "@/server/api/respond";
import { AppError } from "@/lib/errors";

const schema = z.object({
  currentPassword: z.string().min(8, "Password must be at least 8 characters"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { currentPassword, newPassword } = schema.parse(body);

    if (currentPassword === newPassword) {
      return fail("INVALID_PASSWORD", "New password must be different", 400);
    }

    // Get user email for authentication
    const email = await getUserEmail(user.id);

    const authClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: { persistSession: false },
    });

    const { data: authData, error: signInError } = await authClient.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (signInError || !authData.session) {
      return fail("INCORRECT_PASSWORD", "Incorrect current password", 401);
    }

    const { error: updateError } = await authClient.auth.updateUser({ password: newPassword });

    if (updateError) {
      throw new AppError(updateError.message ?? "Failed to update password", 'PASSWORD_CHANGE_ERROR', 500);
    }

    await authClient.auth.signOut();
    logger.info({ scope: "auth.change_password", data: { userId: user.id } });

    return ok({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("VALIDATION_ERROR", error.issues.map((issue) => issue.message).join(", "), 422);
    }
    return handleError(error, 'auth.change-password');
  }
}
