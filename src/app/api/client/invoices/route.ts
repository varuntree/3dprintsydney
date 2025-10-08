import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { requireUser } from "@/server/auth/session";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!user.clientId) throw Object.assign(new Error("No client"), { status: 400 });
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    const offset = Number(searchParams.get("offset") ?? "0");
    const take = Number.isFinite(limit) && limit > 0 ? limit : 50;
    const skip = Number.isFinite(offset) && offset >= 0 ? offset : 0;
    const invoices = await prisma.invoice.findMany({
      where: { clientId: user.clientId },
      orderBy: { issueDate: "desc" },
      take,
      skip,
      select: {
        id: true,
        number: true,
        status: true,
        total: true,
        issueDate: true,
        balanceDue: true,
        stripeCheckoutUrl: true,
      },
    });
    return NextResponse.json({
      data: invoices.map((i) => ({
        id: i.id,
        number: i.number,
        status: i.status,
        total: Number(i.total),
        issueDate: i.issueDate,
        balanceDue: Number(i.balanceDue),
        stripeCheckoutUrl: i.stripeCheckoutUrl,
      })),
    });
  } catch (error) {
    const e = error as Error & { status?: number };
    const status = e?.status ?? 400;
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status });
  }
}
