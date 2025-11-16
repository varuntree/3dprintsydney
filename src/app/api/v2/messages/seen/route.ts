import { NextRequest } from "next/server";
import { ZodError, z } from "zod";
import { requireAuth } from "@/server/auth/api-helpers";
import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import { markSeenV2 } from "@/server/services/messages_v2";

const schema = z.object({
  lastSeenAt: z.string(),
  conversationUserId: z.number().int().positive().nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const parsed = schema.parse(body);
    await markSeenV2(user.id, parsed.conversationUserId ?? null, parsed.lastSeenAt);
    return okAuth(req, { success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return failAuth(req, "VALIDATION_ERROR", "Invalid payload", 422, { issues: error.issues });
    }
    return handleErrorAuth(req, error, "messages.v2.seen");
  }
}
