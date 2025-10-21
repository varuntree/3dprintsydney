import type { NextRequest } from "next/server";
import { getUserFromRequest } from "@/server/auth/session";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { UnauthorizedError, ForbiddenError, NotFoundError, AppError } from "@/lib/errors";

/**
 * Require access to a specific invoice (admin or invoice owner)
 *
 * Use this in API routes that operate on invoices. Checks that the user is either
 * an admin OR the client who owns the invoice.
 *
 * @param req - Next.js request object
 * @param invoiceId - Invoice ID to check access for
 * @returns Object containing the authenticated user
 * @throws UnauthorizedError if not authenticated (401)
 * @throws NotFoundError if invoice doesn't exist (404)
 * @throws ForbiddenError if not admin and not invoice owner (403)
 *
 * @example
 * export async function GET(req: NextRequest, { params }: Context) {
 *   const { id } = await params;
 *   await requireInvoiceAccess(req, Number(id));
 *   // User has access to this invoice
 *   const invoice = await getInvoice(Number(id));
 *   return success(invoice);
 * }
 */
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

/**
 * Require access to a specific attachment (admin or attachment owner via invoice)
 *
 * Use this in API routes that operate on attachments. Checks access by verifying
 * access to the parent invoice.
 *
 * @param req - Next.js request object
 * @param attachmentId - Attachment ID to check access for
 * @returns Object containing the authenticated user
 * @throws UnauthorizedError if not authenticated (401)
 * @throws NotFoundError if attachment or parent invoice doesn't exist (404)
 * @throws ForbiddenError if not admin and not invoice owner (403)
 *
 * @example
 * export async function DELETE(req: NextRequest, { params }: Context) {
 *   const { id } = await params;
 *   await requireAttachmentAccess(req, Number(id));
 *   // User has access to this attachment
 *   await deleteAttachment(Number(id));
 *   return success(null, 204);
 * }
 */
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

/**
 * Require access to a specific payment (admin or payment owner via invoice)
 *
 * Use this in API routes that operate on payments. Checks access by verifying
 * access to the parent invoice.
 *
 * @param req - Next.js request object
 * @param paymentId - Payment ID to check access for
 * @returns Object containing the authenticated user
 * @throws UnauthorizedError if not authenticated (401)
 * @throws NotFoundError if payment or parent invoice doesn't exist (404)
 * @throws ForbiddenError if not admin and not invoice owner (403)
 *
 * @example
 * export async function GET(req: NextRequest, { params }: Context) {
 *   const { id } = await params;
 *   await requirePaymentAccess(req, Number(id));
 *   // User has access to this payment
 *   const payment = await getPayment(Number(id));
 *   return success(payment);
 * }
 */
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
