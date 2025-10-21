import { NextRequest } from "next/server";
import { requireUser } from "@/server/auth/session";
import { requireInvoiceAccess } from "@/server/auth/permissions";
import { getInvoiceMessages, createInvoiceMessage } from "@/server/services/messages";
import { ok, fail, handleError } from "@/server/api/respond";
import { BadRequestError } from "@/lib/errors";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new BadRequestError("Invalid invoice id");
  }
  return id;
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const invoiceId = await parseId(context.params);
    await requireInvoiceAccess(req, invoiceId);

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    const offset = Number(searchParams.get("offset") ?? "0");
    const order = (searchParams.get("order") as "asc" | "desc" | null) ?? "asc";

    const messages = await getInvoiceMessages(invoiceId, {
      limit,
      offset,
      order,
    });

    // Return simplified format (without userId)
    return ok(messages.map(msg => ({
      id: msg.id,
      sender: msg.sender,
      content: msg.content,
      createdAt: msg.createdAt,
    })));
  } catch (error) {
    return handleError(error, 'invoices.messages');
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    const invoiceId = await parseId(context.params);
    await requireInvoiceAccess(req, invoiceId);

    const body = await req.json();
    const content = (body?.content ?? "").trim();

    if (!content) {
      return fail("VALIDATION_ERROR", "Invalid content", 422);
    }

    const sender = user.role === "ADMIN" ? "ADMIN" : "CLIENT";
    const message = await createInvoiceMessage(invoiceId, content, sender);

    // Return simplified format (without userId)
    return ok({
      id: message.id,
      sender: message.sender,
      content: message.content,
      createdAt: message.createdAt,
    });
  } catch (error) {
    return handleError(error, 'invoices.messages');
  }
}
