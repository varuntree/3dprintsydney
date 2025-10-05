import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/server/db/client";
import { SESSION_COOKIE } from "@/server/auth/session";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (token) await prisma.session.deleteMany({ where: { token } });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    });
    return res;
  } catch (_error) {
    return NextResponse.json({ error: "Failed to logout" }, { status: 400 });
  }
}
