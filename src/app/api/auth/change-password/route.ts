import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireAuth } from "@/server/auth/api-helpers";
import { handlePasswordChange } from "@/server/services/auth";
import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import { changePasswordSchema } from "@/lib/schemas/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { currentPassword, newPassword } = changePasswordSchema.parse(body);

    // Handle complete password change workflow
    await handlePasswordChange(user.id, currentPassword, newPassword);

    return okAuth(request, { success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return failAuth(request, "VALIDATION_ERROR", "Invalid password change payload", 422, {
        issues: error.issues,
      });
    }
    return handleErrorAuth(request, error, 'auth.change-password');
  }
}
