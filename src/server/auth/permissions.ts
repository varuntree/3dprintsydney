import type { NextRequest } from "next/server";
import { getUserFromRequest } from "@/server/auth/session";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { UnauthorizedError, ForbiddenError, NotFoundError, AppError } from "@/lib/errors";

export async function requireInvoiceAccess(req: NextRequest, invoiceId: number) {
  const user = await getUserFromRequest(req);
  if (!user) throw new UnauthorizedError();
  if (user.role === "ADMIN") return { user } as const;
  const supabase = getServiceSupabase();
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("client_id")
    .eq("id", invoiceId)
    .maybeSingle();
  if (error) {
    throw new AppError(`Failed to load invoice: ${error.message}`, 'INVOICE_LOAD_ERROR', 500);
  }
  if (!invoice) throw new NotFoundError("Invoice", invoiceId);
  if (user.clientId && invoice.client_id === user.clientId) return { user } as const;
  throw new ForbiddenError();
}

export async function requireAttachmentAccess(req: NextRequest, attachmentId: number) {
  const supabase = getServiceSupabase();
  const { data: attachment, error } = await supabase
    .from("attachments")
    .select("invoice_id")
    .eq("id", attachmentId)
    .maybeSingle();
  if (error) {
    throw new AppError(`Failed to load attachment: ${error.message}`, 'ATTACHMENT_LOAD_ERROR', 500);
  }
  if (!attachment) throw new NotFoundError("Attachment", attachmentId);
  return requireInvoiceAccess(req, attachment.invoice_id);
}

export async function requirePaymentAccess(req: NextRequest, paymentId: number) {
  const supabase = getServiceSupabase();
  const { data: payment, error } = await supabase
    .from("payments")
    .select("invoice_id")
    .eq("id", paymentId)
    .maybeSingle();
  if (error) {
    throw new AppError(`Failed to load payment: ${error.message}`, 'PAYMENT_LOAD_ERROR', 500);
  }
  if (!payment) throw new NotFoundError("Payment", paymentId);
  return requireInvoiceAccess(req, payment.invoice_id);
}
