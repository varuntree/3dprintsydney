import { NextResponse, NextRequest } from "next/server";
import { loginSchema } from "@/lib/schemas/auth";
import { handleLogin } from "@/server/services/auth";
import { buildAuthCookieOptions } from "@/lib/utils/auth-cookies";
import { handleError } from "@/server/api/respond";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    // Handle complete login workflow
    const { session, profile } = await handleLogin(email, password);

    // Create response with user data
    const response = NextResponse.json({
      data: {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        clientId: profile.clientId,
      },
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
    return handleError(error, 'auth.login');
  }
}
