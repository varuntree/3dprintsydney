import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/session";
import { deleteUserAndData } from "@/server/services/users";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const userId = Number(params.id);
    await deleteUserAndData(userId);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const status = error?.status ?? 400;
    return NextResponse.json({ error: error?.message ?? "Failed" }, { status });
  }
}
