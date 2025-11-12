import { NextRequest } from "next/server";
import { requireAdmin } from "@/server/auth/api-helpers";
import { deleteUserAndData } from "@/server/services/users";
import { okAuth, handleErrorAuth } from "@/server/api/respond";

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const userId = Number(id);
    await deleteUserAndData(userId);
    return okAuth(request, { success: true });
  } catch (error) {
    return handleErrorAuth(request, error, 'admin.users.delete');
  }
}
