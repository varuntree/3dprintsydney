import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireAuth } from "@/server/auth/api-helpers";
import { requireInvoiceAccess } from "@/server/auth/permissions";
import { listUserMessages, createMessage } from "@/server/services/messages";
import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import { parsePaginationParams } from "@/lib/utils/api-params";
import { getSenderType } from "@/lib/utils/auth-helpers";
import { messageInputSchema } from "@/lib/schemas/messages";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);

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

    return okAuth(request, messages);
  } catch (error) {
    return handleErrorAuth(request, error, "messages.get");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const validated = messageInputSchema.parse(body);

    if (validated.invoiceId && Number.isFinite(validated.invoiceId)) {
      await requireInvoiceAccess(request, validated.invoiceId);
    }

    const sender = getSenderType(user);
    const message = await createMessage(
      user.id,
      validated.content,
      sender,
      validated.invoiceId ?? null,
    );

    return okAuth(request, message);
  } catch (error) {
    if (error instanceof ZodError) {
      return failAuth(request, "VALIDATION_ERROR", "Invalid message payload", 422, {
        issues: error.issues,
      });
    }
    return handleErrorAuth(request, error, "messages.post");
  }
}
