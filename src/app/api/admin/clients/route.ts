import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/session";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { AppError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("clients")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      throw new AppError(`Failed to load clients: ${error.message}`, 'CLIENT_LOAD_ERROR', 500);
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    const e = error as Error & { status?: number };
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: e?.status ?? 400 });
  }
}
