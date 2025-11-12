import { NextRequest } from "next/server";
import { requireAdmin } from "@/server/auth/api-helpers";
import { listUserMessages, createMessage } from "@/server/services/messages";
import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const userId = Number(id);

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    const offset = Number(searchParams.get("offset") ?? "0");
    const order = (searchParams.get("order") as "asc" | "desc" | null) ?? "asc";

    const messages = await listUserMessages(userId, {
      limit,
      offset,
      order,
    });

    return okAuth(request, messages);
  } catch (error) {
    return handleErrorAuth(request, error, 'admin.users.messages');
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const userId = Number(id);

    const { content } = await request.json();

    if (!content || typeof content !== "string") {
      return failAuth(request, "VALIDATION_ERROR", "Invalid content", 422);
    }

    const message = await createMessage(userId, content, "ADMIN", null);

    return okAuth(request, message);
  } catch (error) {
    return handleErrorAuth(request, error, 'admin.users.messages');
  }
}
