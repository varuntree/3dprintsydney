import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { priceQuickOrder } from "@/server/services/quick-order";

export async function POST(req: NextRequest) {
  try {
    await requireUser(req);
    const body = await req.json();
    const items = body?.items ?? [];
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items" }, { status: 400 });
    }
    const priced = await priceQuickOrder(items);
    return NextResponse.json({ data: priced });
  } catch (error) {
    const e = error as Error & { status?: number };
    return NextResponse.json({ error: e?.message ?? "Pricing failed" }, { status: e?.status ?? 400 });
  }
}
