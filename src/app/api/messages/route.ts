import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireAuth } from "@/server/auth/api-helpers";
import { requireInvoiceAccess } from "@/server/auth/permissions";
import { listUserMessages, createMessage } from "@/server/services/messages";
import { ok, fail, handleError } from "@/server/api/respond";
import { parsePaginationParams } from "@/lib/utils/api-params";
import { getSenderType } from "@/lib/utils/auth-helpers";
import { messageInputSchema } from "@/lib/schemas/messages";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);

    const { limit, offset } = parsePaginationParams(searchParams);
    const order = (searchParams.get("order") as "asc" | "desc" | null) ?? "asc";
    const invoiceIdRaw = searchParams.get("invoiceId");
    const invoiceId = invoiceIdRaw ? Number(invoiceIdRaw) : undefined;

    const messages = await listUserMessages(user.id, {
      limit,
      offset,
      order,
      invoiceId,
    });

    return ok(messages);
  } catch (error) {
    return handleError(error, 'messages.get');
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const validated = messageInputSchema.parse(body);

    // Ensure the sender has access to this invoice if provided
    if (validated.invoiceId && Number.isFinite(validated.invoiceId)) {
      await requireInvoiceAccess(req, validated.invoiceId);
    }

    const sender = getSenderType(user);
    const message = await createMessage(
      user.id,
      validated.content,
      sender,
      validated.invoiceId ?? null
    );

    return ok(message);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid message payload", 422, {
        issues: error.issues,
      });
    }
    return handleError(error, 'messages.post');
  }
}
