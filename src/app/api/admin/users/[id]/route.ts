import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/session";
import { deleteUserAndData } from "@/server/services/users";
import { ok, handleError } from "@/server/api/respond";

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await context.params;
    const userId = Number(id);
    await deleteUserAndData(userId);
    return ok({ success: true });
  } catch (error) {
    return handleError(error, 'admin.users.delete');
  }
}
