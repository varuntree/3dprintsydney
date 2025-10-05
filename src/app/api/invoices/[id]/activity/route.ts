import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { requireInvoiceAccess } from "@/server/auth/permissions";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid invoice id");
  }
  return id;
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const invoiceId = await parseId(context.params);
    await requireInvoiceAccess(req, invoiceId);
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    const offset = Number(searchParams.get("offset") ?? "0");
    const take = Number.isFinite(limit) && limit > 0 ? limit : 50;
    const skip = Number.isFinite(offset) && offset >= 0 ? offset : 0;
    const rows = await prisma.activityLog.findMany({
      where: { invoiceId },
      orderBy: { createdAt: "desc" },
      take, skip,
      select: { id: true, action: true, message: true, createdAt: true },
    });
    return NextResponse.json({ data: rows });
  } catch (error) {
    const e = error as Error & { status?: number };
    const status = e?.status ?? 400;
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status });
  }
}
