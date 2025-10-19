import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/server/auth/session";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";
import { logger } from "@/lib/logger";

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
      return NextResponse.json({ error: "New password must be different" }, { status: 400 });
    }

    const service = getServiceSupabase();
    const { data: profile, error: profileError } = await service
      .from("users")
      .select("email")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw Object.assign(new Error(`Failed to load user profile: ${profileError.message}`), { status: 500 });
    }
    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const authClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: { persistSession: false },
    });

    const { data: authData, error: signInError } = await authClient.auth.signInWithPassword({
      email: profile.email,
      password: currentPassword,
    });
    if (signInError || !authData.session) {
      return NextResponse.json({ error: "Incorrect current password" }, { status: 401 });
    }

    const { error: updateError } = await authClient.auth.updateUser({ password: newPassword });
    if (updateError) {
      throw Object.assign(new Error(updateError.message ?? "Failed to update password"), { status: 500 });
    }

    await authClient.auth.signOut();
    logger.info({ scope: "auth.change_password", data: { userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues.map((issue) => issue.message).join(", ") }, { status: 400 });
    }
    const e = error as Error & { status?: number };
    const status = e?.status ?? 500;
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status });
  }
}
