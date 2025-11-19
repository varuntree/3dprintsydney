import { NextRequest } from "next/server";
import { ZodError, z } from "zod";
import { requireAdmin } from "@/server/auth/api-helpers";
import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import { fetchThread, sendMessageV2, Cursor } from "@/server/services/messages_v2";

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursorId: z.coerce.number().int().positive().optional(),
  cursorAt: z.string().optional(),
  after: z.string().optional(),
});

const bodySchema = z.object({
  content: z.string().min(1),
});

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await context.params;
    const targetUserId = Number(id);
    const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) throw parsed.error;
    const { limit, cursorAt, cursorId, after } = parsed.data;
    const cursor: Cursor = cursorAt && cursorId ? { createdAt: cursorAt, id: cursorId } : null;
    const result = await fetchThread(targetUserId, { limit, cursor, after });
    return okAuth(req, result);
  } catch (error) {
    if (error instanceof ZodError) {
      return failAuth(req, "VALIDATION_ERROR", "Invalid parameters", 422, { issues: error.issues });
    }
    return handleErrorAuth(req, error, "admin.messages.v2.get");
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await context.params;
    const targetUserId = Number(id);
    const body = await req.json();
    const parsed = bodySchema.parse(body);
    const message = await sendMessageV2(admin, targetUserId, parsed.content, "ADMIN", null);
    return okAuth(req, message);
  } catch (error) {
    if (error instanceof ZodError) {
      return failAuth(req, "VALIDATION_ERROR", "Invalid payload", 422, { issues: error.issues });
    }
    return handleErrorAuth(req, error, "admin.messages.v2.post");
  }
}
