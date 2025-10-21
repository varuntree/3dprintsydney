import { NextRequest, NextResponse } from "next/server";
import { requireAdminAPI } from "@/server/auth/api-helpers";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { ok, fail } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

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
      throw new AppError(`Failed to load activity: ${error.message}`, 'ACTIVITY_LOAD_ERROR', 500);
    }
    const rows = (data ?? []).map((row) => ({
      id: row.id,
      action: row.action,
      message: row.message,
      createdAt: row.created_at,
    }));
    return ok(rows);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'invoices.activity', error: error as Error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
