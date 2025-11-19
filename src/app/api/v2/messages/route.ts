import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/api-helpers";
import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import { fetchThread, sendMessageV2, Cursor } from "@/server/services/messages_v2";
import { getSenderType } from "@/lib/utils/auth-helpers";
import { ZodError, z } from "zod";

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursorId: z.coerce.number().int().positive().optional(),
  cursorAt: z.string().optional(),
  invoiceId: z.coerce.number().int().positive().optional(),
  after: z.string().optional(),
});

const bodySchema = z.object({
  content: z.string().min(1),
  invoiceId: z.number().int().positive().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) {
      throw parsed.error;
    }
    const { limit, cursorAt, cursorId, invoiceId, after } = parsed.data;
    const cursor: Cursor = cursorAt && cursorId ? { createdAt: cursorAt, id: cursorId } : null;
    const result = await fetchThread(user.id, { limit, cursor, invoiceId, after });
    return okAuth(req, result);
  } catch (error) {
    if (error instanceof ZodError) {
      return failAuth(req, "VALIDATION_ERROR", "Invalid parameters", 422, { issues: error.issues });
    }
    return handleErrorAuth(req, error, "messages.v2.get");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const parsed = bodySchema.parse(body);
    const sender = getSenderType(user);
    const message = await sendMessageV2(user, user.id, parsed.content, sender, parsed.invoiceId ?? null);
    return okAuth(req, message);
  } catch (error) {
    if (error instanceof ZodError) {
      return failAuth(req, "VALIDATION_ERROR", "Invalid payload", 422, { issues: error.issues });
    }
    return handleErrorAuth(req, error, "messages.v2.post");
  }
}
