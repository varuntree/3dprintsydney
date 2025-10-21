import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireAuth } from "@/server/auth/api-helpers";
import { handlePasswordChange } from "@/server/services/auth";
import { ok, fail, handleError } from "@/server/api/respond";
import { changePasswordSchema } from "@/lib/schemas/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { currentPassword, newPassword } = changePasswordSchema.parse(body);

    // Handle complete password change workflow
    await handlePasswordChange(user.id, currentPassword, newPassword);

    return ok({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid password change payload", 422, {
        issues: error.issues,
      });
    }
    return handleError(error, 'auth.change-password');
  }
}
