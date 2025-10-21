import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { signupSchema } from "@/lib/schemas/auth";
import { handleSignup } from "@/server/services/auth";
import { buildAuthCookieOptions } from "@/lib/utils/auth-cookies";
import { handleError, fail, ok } from "@/server/api/respond";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = signupSchema.parse(body);

    // Handle complete signup workflow
    const { session, profile } = await handleSignup(email, password);

    // Create response with user data
    const response = ok({
      id: profile.id,
      email: profile.email,
      role: profile.role,
      clientId: profile.clientId,
    });

    // Set authentication cookies
    response.cookies.set(
      "sb:token",
      session.accessToken,
      buildAuthCookieOptions(session.expiresAt ?? undefined)
    );

    if (session.refreshToken) {
      response.cookies.set(
        "sb:refresh-token",
        session.refreshToken,
        buildAuthCookieOptions()
      );
    }

    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid signup payload", 422, {
        issues: error.issues,
      });
    }
    return handleError(error, 'auth.signup');
  }
}
