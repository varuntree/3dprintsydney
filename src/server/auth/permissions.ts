import type { NextRequest } from "next/server";
import { getUserFromRequest } from "@/server/auth/session";
import { prisma } from "@/server/db/client";

export async function requireInvoiceAccess(req: NextRequest, invoiceId: number) {
  const user = await getUserFromRequest(req);
  if (!user) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  if (user.role === "ADMIN") return { user } as const;
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { clientId: true },
  });
  if (!inv) throw Object.assign(new Error("Not found"), { status: 404 });
  if (user.clientId && inv.clientId === user.clientId) return { user } as const;
  throw Object.assign(new Error("Forbidden"), { status: 403 });
}

export async function requireAttachmentAccess(req: NextRequest, attachmentId: number) {
  const att = await prisma.attachment.findUnique({ where: { id: attachmentId }, select: { invoiceId: true } });
  if (!att) throw Object.assign(new Error("Not found"), { status: 404 });
  return requireInvoiceAccess(req, att.invoiceId);
}

export async function requirePaymentAccess(req: NextRequest, paymentId: number) {
  const pay = await prisma.payment.findUnique({ where: { id: paymentId }, select: { invoiceId: true } });
  if (!pay) throw Object.assign(new Error("Not found"), { status: 404 });
  return requireInvoiceAccess(req, pay.invoiceId);
}

