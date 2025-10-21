import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { fail } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!user.clientId) throw Object.assign(new Error("No client"), { status: 400 });

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    const offset = Number(searchParams.get("offset") ?? "0");
    const take = Number.isFinite(limit) && limit > 0 ? limit : 50;
    const skip = Number.isFinite(offset) && offset >= 0 ? offset : 0;

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("invoices")
      .select("id, number, status, total, issue_date, balance_due, stripe_checkout_url")
      .eq("client_id", user.clientId)
      .order("issue_date", { ascending: false })
      .range(skip, skip + take - 1);

    if (error) {
      throw Object.assign(new Error(`Failed to load invoices: ${error.message}`), { status: 500 });
    }

    return NextResponse.json({
      data: (data ?? []).map((row) => ({
        id: row.id,
        number: row.number,
        status: row.status,
        total: decimalToNumber(row.total),
        issueDate: row.issue_date,
        balanceDue: decimalToNumber(row.balance_due),
        stripeCheckoutUrl: row.stripe_checkout_url,
      })),
    });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'client.invoices', error: error as Error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
