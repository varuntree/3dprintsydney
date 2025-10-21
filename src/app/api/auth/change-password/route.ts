import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/auth/api-helpers";
import { handlePasswordChange } from "@/server/services/auth";
import { ok, fail, handleError } from "@/server/api/respond";

const schema = z.object({
  currentPassword: z.string().min(8, "Password must be at least 8 characters"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { currentPassword, newPassword } = schema.parse(body);

    // Handle complete password change workflow
    await handlePasswordChange(user.id, currentPassword, newPassword);

    return ok({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("VALIDATION_ERROR", error.issues.map((issue) => issue.message).join(", "), 422);
    }
    return handleError(error, 'auth.change-password');
  }
}
