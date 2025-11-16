import { NextRequest } from "next/server";
import { ZodError, z } from "zod";
import { requireAdmin } from "@/server/auth/api-helpers";
import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import { listAdminConversationsV2, Cursor } from "@/server/services/messages_v2";

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursorId: z.coerce.number().int().positive().optional(),
  cursorAt: z.string().optional(),
  search: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) throw parsed.error;
    const { limit, cursorAt, cursorId, search } = parsed.data;
    const cursor: Cursor = cursorAt && cursorId ? { createdAt: cursorAt, id: cursorId } : null;
    const result = await listAdminConversationsV2(admin, { limit, cursor, search });
    return okAuth(req, result);
  } catch (error) {
    if (error instanceof ZodError) {
      return failAuth(req, "VALIDATION_ERROR", "Invalid parameters", 422, { issues: error.issues });
    }
    return handleErrorAuth(req, error, "admin.conversations.v2.get");
  }
}
