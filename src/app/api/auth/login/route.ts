import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loginSchema } from "@/lib/schemas/auth";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";
import { fail } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

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
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const service = getServiceSupabase();
    const { data: profile, error: profileError } = await service
      .from("users")
      .select("id, email, role, client_id")
      .eq("auth_user_id", authData.user.id)
      .maybeSingle();

    if (profileError) {
      throw Object.assign(new Error(`Failed to load profile: ${profileError.message}`), {
        status: 500,
      });
    }
    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const response = NextResponse.json({
      data: {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        clientId: profile.client_id,
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
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'auth.login', error: error as Error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
