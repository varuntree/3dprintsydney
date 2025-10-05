import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { requireAdmin } from "@/server/auth/session";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const userId = Number(params.id);
    const messages = await prisma.userMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ data: messages });
  } catch (error: any) {
    const status = error?.status ?? 400;
    return NextResponse.json({ error: error?.message ?? "Failed" }, { status });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const userId = Number(params.id);
    const { content } = await req.json();
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }
    const msg = await prisma.userMessage.create({
      data: { userId, sender: "ADMIN", content: content.slice(0, 5000) },
    });
    return NextResponse.json({ data: msg });
  } catch (error: any) {
    const status = error?.status ?? 400;
    return NextResponse.json({ error: error?.message ?? "Failed" }, { status });
  }
}
