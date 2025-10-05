import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { signupSchema } from "@/lib/schemas/auth";
import { hashPassword } from "@/server/auth/password";
import { createSession, setSessionCookie } from "@/server/auth/session";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = signupSchema.parse(body);

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    const passwordHash = hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          name: email.split("@")[0],
          email,
        },
      });
      return tx.user.create({
        data: { email, passwordHash, role: "CLIENT", clientId: client.id },
      });
    });

    const { token, expiresAt } = await createSession(user.id);
    const res = NextResponse.json({
      data: { id: user.id, email: user.email, role: user.role, clientId: user.clientId },
    });
    res.cookies.set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    });
    return res;
  } catch (error) {
    const e = error as Error & { status?: number };
    const status = e?.status ?? 400;
    return NextResponse.json({ error: e?.message ?? "Invalid request" }, { status });
  }
}
