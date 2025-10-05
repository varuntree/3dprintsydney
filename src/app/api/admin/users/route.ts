import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { requireAdmin } from "@/server/auth/session";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { messages: true, sessions: true } } },
    });
    return NextResponse.json({
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        clientId: u.clientId,
        createdAt: u.createdAt,
        messageCount: u._count.messages,
      })),
    });
  } catch (error) {
    const e = error as Error & { status?: number };
    const status = e?.status ?? 400;
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status });
  }
}
