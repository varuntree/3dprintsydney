import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/session";
import { deleteUserAndData } from "@/server/services/users";

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await context.params;
    const userId = Number(id);
    await deleteUserAndData(userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const e = error as Error & { status?: number };
    const status = e?.status ?? 400;
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status });
  }
}
