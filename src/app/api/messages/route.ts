import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { requireUser } from "@/server/auth/session";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const messages = await prisma.userMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ data: messages });
  } catch (error: any) {
    const status = error?.status ?? 400;
    return NextResponse.json({ error: error?.message ?? "Failed" }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const { content } = await req.json();
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }
    const msg = await prisma.userMessage.create({
      data: { userId: user.id, sender: "CLIENT", content: content.slice(0, 5000) },
    });
    return NextResponse.json({ data: msg });
  } catch (error: any) {
    const status = error?.status ?? 400;
    return NextResponse.json({ error: error?.message ?? "Failed" }, { status });
  }
}
