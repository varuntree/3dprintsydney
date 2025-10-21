import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { signupSchema } from "@/lib/schemas/auth";
import { signupClient } from "@/server/services/auth";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";
import { fail, handleError } from "@/server/api/respond";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = signupSchema.parse(body);

    // Create user (handles all database operations)
    const result = await signupClient(email, password);

    // Create auth session
    const authClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: { persistSession: false },
    });

    const { data: sessionData, error: signInError } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !sessionData.session) {
      return fail('SIGNUP_ERROR', signInError?.message ?? 'Failed to sign in', 500);
    }

    // Create response with session cookies
    const response = NextResponse.json({
      data: {
        id: result.userId,
        email: result.email,
        role: result.role,
        clientId: result.clientId,
      },
    });

    const expires = sessionData.session.expires_at
      ? new Date(sessionData.session.expires_at * 1000)
      : undefined;

    response.cookies.set("sb:token", sessionData.session.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires,
    });

    if (sessionData.session.refresh_token) {
      response.cookies.set("sb:refresh-token", sessionData.session.refresh_token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }

    return response;
  } catch (error) {
    return handleError(error, 'auth.signup');
  }
}
