import { NextRequest } from "next/server";
import { requireUser } from "@/server/auth/session";
import { requireInvoiceAccess } from "@/server/auth/permissions";
import { listUserMessages, createMessage } from "@/server/services/messages";
import { ok, fail, handleError } from "@/server/api/respond";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const { searchParams } = new URL(req.url);

    const limit = Number(searchParams.get("limit") ?? "50");
    const offset = Number(searchParams.get("offset") ?? "0");
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
    const user = await requireUser(req);
    const body = await req.json();
    const content = body?.content;
    const invoiceId = body?.invoiceId ? Number(body.invoiceId) : null;

    if (!content || typeof content !== "string") {
      return fail("VALIDATION_ERROR", "Invalid content", 422);
    }

    // Ensure the sender has access to this invoice if provided
    if (invoiceId && Number.isFinite(invoiceId)) {
      await requireInvoiceAccess(req, Number(invoiceId));
    }

    const sender = user.role === "ADMIN" ? "ADMIN" : "CLIENT";
    const message = await createMessage(user.id, content, sender, invoiceId);

    return ok(message);
  } catch (error) {
    return handleError(error, 'messages.post');
  }
}
