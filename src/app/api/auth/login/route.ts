import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loginSchema } from "@/lib/schemas/auth";
import { getUserByAuthId } from "@/server/services/auth";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";
import { fail, handleError } from "@/server/api/respond";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const authClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user || !authData.session) {
      return fail("INVALID_CREDENTIALS", "Invalid credentials", 401);
    }

    // Get user profile from database
    const profile = await getUserByAuthId(authData.user.id);

    const response = NextResponse.json({
      data: {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        clientId: profile.clientId,
      },
    });

    const expires = authData.session.expires_at
      ? new Date(authData.session.expires_at * 1000)
      : undefined;

    response.cookies.set("sb:token", authData.session.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires,
    });

    if (authData.session.refresh_token) {
      response.cookies.set("sb:refresh-token", authData.session.refresh_token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }

    return response;
  } catch (error) {
    return handleError(error, 'auth.login');
  }
}
