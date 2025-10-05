import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { requireUser } from "@/server/auth/session";
import { requireInvoiceAccess } from "@/server/auth/permissions";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    const offset = Number(searchParams.get("offset") ?? "0");
    const order = (searchParams.get("order") as "asc" | "desc" | null) ?? "asc";
    const invoiceIdRaw = searchParams.get("invoiceId");
    const invoiceId = invoiceIdRaw ? Number(invoiceIdRaw) : null;
    const take = Number.isFinite(limit) && limit > 0 ? limit : 50;
    const skip = Number.isFinite(offset) && offset >= 0 ? offset : 0;
    const where = invoiceId && Number.isFinite(invoiceId)
      ? { userId: user.id, invoiceId: Number(invoiceId) }
      : { userId: user.id };
    const messages = await prisma.userMessage.findMany({
      where,
      orderBy: { createdAt: order },
      take,
      skip,
    });
    return NextResponse.json({ data: messages });
  } catch (error) {
    const e = error as Error & { status?: number };
    const status = e?.status ?? 400;
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const content = body?.content;
    const invoiceId = body?.invoiceId ? Number(body.invoiceId) : null;
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }
    if (invoiceId && Number.isFinite(invoiceId)) {
      // Ensure the sender has access to this invoice
      await requireInvoiceAccess(req, Number(invoiceId));
    }
    const msg = await prisma.userMessage.create({
      data: {
        userId: user.id,
        invoiceId: invoiceId && Number.isFinite(invoiceId) ? Number(invoiceId) : null,
        sender: user.role === 'ADMIN' ? 'ADMIN' : 'CLIENT',
        content: content.slice(0, 5000),
      },
    });
    return NextResponse.json({ data: msg });
  } catch (error) {
    const e = error as Error & { status?: number };
    const status = e?.status ?? 400;
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status });
  }
}
