import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/session";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { ok, handleError } from "@/server/api/respond";
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

    return ok(data ?? []);
  } catch (error) {
    return handleError(error, 'admin.clients.get');
  }
}
