import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/auth/session";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: { id: user.id, email: user.email, role: user.role, clientId: user.clientId } });
}
