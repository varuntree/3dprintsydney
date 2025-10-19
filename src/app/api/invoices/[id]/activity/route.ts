import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/server/auth/api-helpers";
import { getServiceSupabase } from "@/server/supabase/service-client";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid invoice id");
  }
  return id;
}

/**
 * GET /api/invoices/[id]/activity
 *
 * ADMIN ONLY - Activity logs contain sensitive information about
 * internal operations and should never be exposed to clients
 */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const invoiceId = await parseId(context.params);
    // SECURITY: Only admins can view activity logs
    await requireAdminAPI(req);

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    const offset = Number(searchParams.get("offset") ?? "0");
    const take = Number.isFinite(limit) && limit > 0 ? limit : 50;
    const skip = Number.isFinite(offset) && offset >= 0 ? offset : 0;
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("activity_logs")
      .select("id, action, message, created_at")
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: false })
      .range(skip, skip + take - 1);
    if (error) {
      throw Object.assign(new Error(`Failed to load activity: ${error.message}`), { status: 500 });
    }
    const rows = (data ?? []).map((row) => ({
      id: row.id,
      action: row.action,
      message: row.message,
      createdAt: row.created_at,
    }));
    return NextResponse.json({ data: rows });
  } catch (error) {
    const e = error as Error & { status?: number };
    const status = e?.status ?? 400;
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status });
  }
}
