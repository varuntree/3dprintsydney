import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { signupSchema } from "@/lib/schemas/auth";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { getSupabaseAnonKey, getSupabaseUrl, getSupabaseServiceRoleKey } from "@/lib/env";
import { logger } from "@/lib/logger";
import { fail } from "@/server/api/respond";
import { AppError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = signupSchema.parse(body);

    const service = getServiceSupabase();

    // Debug: Check if service client is initialized correctly
    console.log('[SIGNUP DEBUG] Service client initialized:', !!service);
    console.log('[SIGNUP DEBUG] URL:', getSupabaseUrl());
    console.log('[SIGNUP DEBUG] Service key exists:', !!getSupabaseServiceRoleKey());
    console.log('[SIGNUP DEBUG] Service key length:', getSupabaseServiceRoleKey()?.length || 0);
    const { data: exists, error: existsError } = await service
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existsError) {
      throw new AppError(`Failed to check user: ${existsError.message}`, 'SIGNUP_ERROR', 500);
    }
    if (exists) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    const { data: authUser, error: authError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authUser.user) {
      throw new AppError(authError?.message ?? "Failed to create auth user", 'USER_CREATE_ERROR', 500);
    }

    const authUserId = authUser.user.id;

    const { data: client, error: clientError } = await service
      .from("clients")
      .insert({
        name: email.split("@")[0],
        email,
      })
      .select("id")
      .single();

    if (clientError || !client) {
      await service.auth.admin.deleteUser(authUserId).catch(() => undefined);
      throw new AppError(clientError?.message ?? "Failed to create client", 'SIGNUP_ERROR', 500);
    }

    const { data: profile, error: profileError } = await service
      .from("users")
      .insert({
        auth_user_id: authUserId,
        email,
        role: "CLIENT",
        client_id: client.id,
      })
      .select("id, email, role, client_id")
      .single();

    if (profileError || !profile) {
      const { error: cleanupClientError } = await service.from("clients").delete().eq("id", client.id);
      if (cleanupClientError) {
        logger.warn({ scope: "auth.signup", message: "Failed to cleanup client during rollback", error: cleanupClientError });
      }
      await service.auth.admin.deleteUser(authUserId).catch(() => undefined);
      throw new AppError(profileError?.message ?? "Failed to create user", 'USER_CREATE_ERROR', 500);
    }

    const authClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: { persistSession: false },
    });
    const { data: sessionData, error: signInError } = await authClient.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError || !sessionData.session) {
      throw new AppError(signInError?.message ?? "Failed to sign in", 'SIGNUP_ERROR', 500);
    }

    const response = NextResponse.json({
      data: {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        clientId: profile.client_id,
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
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'auth.signup', error: error as Error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
