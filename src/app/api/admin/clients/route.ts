import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/session";
import { getServiceSupabase } from "@/server/supabase/service-client";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("clients")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      throw Object.assign(new Error(`Failed to load clients: ${error.message}`), { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    const e = error as Error & { status?: number };
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: e?.status ?? 400 });
  }
}
