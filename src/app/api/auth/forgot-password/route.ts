import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { getAppUrl, getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: { persistSession: false },
    });

    const redirectTo = `${getAppUrl()}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      throw Object.assign(new Error(error.message ?? "Failed to send reset email"), { status: error.status ?? 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    const e = error as Error & { status?: number };
    const status = e?.status ?? 500;
    return NextResponse.json({ error: e?.message ?? "Failed to send reset email" }, { status });
  }
}
