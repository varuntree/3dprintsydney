import { NextResponse } from "next/server";
	export async function POST() {
  try {
    const response = NextResponse.json({ ok: true });
    response.cookies.set("sb:token", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    });
    response.cookies.set("sb:refresh-token", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message ?? "Failed to logout" }, { status: 400 });
  }
}
