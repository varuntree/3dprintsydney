import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { requireUser } from "@/server/auth/session";
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
    const order = (searchParams.get("order") as "asc" | "desc" | null) ?? "asc";
    const take = Number.isFinite(limit) && limit > 0 ? limit : 50;
    const skip = Number.isFinite(offset) && offset >= 0 ? offset : 0;
    const messages = await prisma.userMessage.findMany({
      where: { invoiceId },
      orderBy: { createdAt: order },
      take,
      skip,
      select: { id: true, sender: true, content: true, createdAt: true },
    });
    return NextResponse.json({ data: messages });
  } catch (error) {
    const e = error as Error & { status?: number };
    const status = e?.status ?? 400;
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    const invoiceId = await parseId(context.params);
    await requireInvoiceAccess(req, invoiceId);
    const body = await req.json();
    const content = (body?.content ?? "").trim();
    if (!content) {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }
    // Resolve target userId for message row
    let targetUserId: number | null = null;
    if (user.role === "CLIENT") {
      targetUserId = user.id;
    } else {
      // ADMIN: attach to a client user associated with this invoice's client
      const inv = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { clientId: true } });
      if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      const clientUser = await prisma.user.findFirst({ where: { clientId: inv.clientId }, orderBy: { createdAt: "asc" } });
      if (!clientUser) return NextResponse.json({ error: "No client user for this invoice" }, { status: 400 });
      targetUserId = clientUser.id;
    }

    const msg = await prisma.userMessage.create({
      data: {
        userId: targetUserId!,
        invoiceId,
        sender: user.role,
        content: content.slice(0, 5000),
      },
      select: { id: true, sender: true, content: true, createdAt: true },
    });
    return NextResponse.json({ data: msg });
  } catch (error) {
    const e = error as Error & { status?: number };
    const status = e?.status ?? 400;
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status });
  }
}

