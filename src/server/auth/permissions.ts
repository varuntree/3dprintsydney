import type { NextRequest } from "next/server";
import { getUserFromRequest } from "@/server/auth/session";
import { getServiceSupabase } from "@/server/supabase/service-client";

export async function requireInvoiceAccess(req: NextRequest, invoiceId: number) {
  const user = await getUserFromRequest(req);
  if (!user) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  if (user.role === "ADMIN") return { user } as const;
  const supabase = getServiceSupabase();
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("client_id")
    .eq("id", invoiceId)
    .maybeSingle();
  if (error) {
    throw Object.assign(new Error(`Failed to load invoice: ${error.message}`), { status: 500 });
  }
  if (!invoice) throw Object.assign(new Error("Not found"), { status: 404 });
  if (user.clientId && invoice.client_id === user.clientId) return { user } as const;
  throw Object.assign(new Error("Forbidden"), { status: 403 });
}

export async function requireAttachmentAccess(req: NextRequest, attachmentId: number) {
  const supabase = getServiceSupabase();
  const { data: attachment, error } = await supabase
    .from("attachments")
    .select("invoice_id")
    .eq("id", attachmentId)
    .maybeSingle();
  if (error) {
    throw Object.assign(new Error(`Failed to load attachment: ${error.message}`), { status: 500 });
  }
  if (!attachment) throw Object.assign(new Error("Not found"), { status: 404 });
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
    throw Object.assign(new Error(`Failed to load payment: ${error.message}`), { status: 500 });
  }
  if (!payment) throw Object.assign(new Error("Not found"), { status: 404 });
  return requireInvoiceAccess(req, payment.invoice_id);
}
