import { NextRequest } from "next/server";
import { requireAdmin } from "@/server/auth/api-helpers";
import { listAdminConversationSummaries } from "@/server/services/messages";
import { okAuth, handleErrorAuth } from "@/server/api/respond";

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const { searchParams } = new URL(request.url);

    const limitParam = searchParams.get("limit");
    const search = searchParams.get("search");

    const limit = limitParam ? Number(limitParam) : undefined;

    const conversations = await listAdminConversationSummaries(admin, {
      limit,
      search: search ?? null,
    });

    return okAuth(request, { conversations });
  } catch (error) {
    return handleErrorAuth(request, error, "admin.messages.conversations.get");
  }
}
