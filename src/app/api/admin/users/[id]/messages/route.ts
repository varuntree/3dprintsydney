import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { requireAdmin } from "@/server/auth/session";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await context.params;
    const userId = Number(id);
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    const offset = Number(searchParams.get("offset") ?? "0");
    const order = (searchParams.get("order") as "asc" | "desc" | null) ?? "asc";
    const take = Number.isFinite(limit) && limit > 0 ? limit : 50;
    const skip = Number.isFinite(offset) && offset >= 0 ? offset : 0;
    const messages = await prisma.userMessage.findMany({
      where: { userId },
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

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await context.params;
    const userId = Number(id);
    const { content } = await req.json();
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }
    const msg = await prisma.userMessage.create({
      data: { userId, sender: "ADMIN", content: content.slice(0, 5000) },
    });
    return NextResponse.json({ data: msg });
  } catch (error) {
    const e = error as Error & { status?: number };
    const status = e?.status ?? 400;
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status });
  }
}
