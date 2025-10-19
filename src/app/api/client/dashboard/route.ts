import { NextRequest, NextResponse } from "next/server";
import { InvoiceStatus } from "@/lib/constants/enums";
import { requireClientWithIdAPI } from "@/server/auth/api-helpers";
import { getServiceSupabase } from "@/server/supabase/service-client";

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
    const user = await requireClientWithIdAPI(req);

    const supabase = getServiceSupabase();

    const [totalRes, pendingRes, paidRes, paidInvoicesRes] = await Promise.all([
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("client_id", user.clientId),
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("client_id", user.clientId)
        .eq("status", InvoiceStatus.PENDING),
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("client_id", user.clientId)
        .eq("status", InvoiceStatus.PAID),
      supabase
        .from("invoices")
        .select("total")
        .eq("client_id", user.clientId)
        .eq("status", InvoiceStatus.PAID),
    ]);

    if (totalRes.error) {
      throw Object.assign(new Error(`Failed to count invoices: ${totalRes.error.message}`), { status: 500 });
    }
    if (pendingRes.error) {
      throw Object.assign(new Error(`Failed to count pending invoices: ${pendingRes.error.message}`), { status: 500 });
    }
    if (paidRes.error) {
      throw Object.assign(new Error(`Failed to count paid invoices: ${paidRes.error.message}`), { status: 500 });
    }
    if (paidInvoicesRes.error) {
      throw Object.assign(new Error(`Failed to fetch paid invoices: ${paidInvoicesRes.error.message}`), { status: 500 });
    }

    const totalOrders = totalRes.count ?? 0;
    const pendingOrders = pendingRes.count ?? 0;
    const paidOrders = paidRes.count ?? 0;
    const totalSpent = (paidInvoicesRes.data ?? []).reduce(
      (sum, row) => sum + decimalToNumber((row as { total: unknown }).total),
      0,
    );

    return NextResponse.json({
      data: {
        totalOrders,
        pendingCount: pendingOrders,
        paidCount: paidOrders,
        totalSpent,
      },
    });
  } catch (error) {
    const e = error as Error & { status?: number };
    return NextResponse.json(
      { error: e?.message ?? "Failed to fetch dashboard stats" },
      { status: e?.status ?? 400 }
    );
  }
}
