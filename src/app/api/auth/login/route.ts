import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { loginSchema } from "@/lib/schemas/auth";
import { verifyPassword } from "@/server/auth/password";
import { createSession, setSessionCookie } from "@/server/auth/session";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const { token, expiresAt } = await createSession(user.id);
    const res = NextResponse.json({ data: { id: user.id, email: user.email, role: user.role, clientId: user.clientId } });
    res.cookies.set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    });
    return res;
  } catch (error: any) {
    const status = error?.status ?? 400;
    return NextResponse.json({ error: error?.message ?? "Invalid request" }, { status });
  }
}
