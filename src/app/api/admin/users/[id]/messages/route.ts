import { NextRequest } from "next/server";
import { requireAdmin } from "@/server/auth/session";
import { listUserMessages, createMessage } from "@/server/services/messages";
import { ok, fail, handleError } from "@/server/api/respond";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await context.params;
    const userId = Number(id);

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    const offset = Number(searchParams.get("offset") ?? "0");
    const order = (searchParams.get("order") as "asc" | "desc" | null) ?? "asc";

    const messages = await listUserMessages(userId, {
      limit,
      offset,
      order,
    });

    return ok(messages);
  } catch (error) {
    return handleError(error, 'admin.users.messages');
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await context.params;
    const userId = Number(id);

    const { content } = await req.json();

    if (!content || typeof content !== "string") {
      return fail("VALIDATION_ERROR", "Invalid content", 422);
    }

    const message = await createMessage(userId, content, "ADMIN", null);

    return ok(message);
  } catch (error) {
    return handleError(error, 'admin.users.messages');
  }
}
