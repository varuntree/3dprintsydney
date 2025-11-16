import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/api-helpers";
import { requireInvoiceAccess } from "@/server/auth/permissions";
import { fetchThread, sendMessageV2 } from "@/server/services/messages_v2";
import { getInvoice } from "@/server/services/invoices";
import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import { BadRequestError } from "@/lib/errors";
import { parsePaginationParams, parseNumericId } from "@/lib/utils/api-params";
import { getSenderType } from "@/lib/utils/auth-helpers";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  try {
    return parseNumericId(raw);
  } catch {
    throw new BadRequestError("Invalid invoice id");
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const invoiceId = await parseId(context.params);
    await requireInvoiceAccess(request, invoiceId);

    const { searchParams } = new URL(request.url);
    const { limit } = parsePaginationParams(searchParams);

    const invoice = await getInvoice(invoiceId);
    const targetUserId = invoice.client.id;

    const { messages } = await fetchThread(targetUserId, {
      limit,
      invoiceId,
    });

    // Return simplified format (without userId)
    return okAuth(request, messages.map(msg => ({
      id: msg.id,
      sender: msg.sender,
      content: msg.content,
      createdAt: msg.createdAt,
    })));
  } catch (error) {
    return handleErrorAuth(request, error, 'invoices.messages');
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    const invoiceId = await parseId(context.params);
    await requireInvoiceAccess(request, invoiceId);

    const invoice = await getInvoice(invoiceId);
    const targetUserId = invoice.client.id;

    const body = await request.json();
    const content = (body?.content ?? "").trim();

    if (!content) {
      return failAuth(request, "VALIDATION_ERROR", "Invalid content", 422);
    }

    const sender = getSenderType(user);
    const message = await sendMessageV2(user, targetUserId, content, sender, invoiceId);

    // Return simplified format (without userId)
    return okAuth(request, {
      id: message.id,
      sender: message.sender,
      content: message.content,
      createdAt: message.createdAt,
    });
  } catch (error) {
    return handleErrorAuth(request, error, 'invoices.messages');
  }
}
