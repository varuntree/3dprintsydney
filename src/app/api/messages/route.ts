import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { requireInvoiceAccess } from "@/server/auth/permissions";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { fail } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    const offset = Number(searchParams.get("offset") ?? "0");
    const order = (searchParams.get("order") as "asc" | "desc" | null) ?? "asc";
    const invoiceIdRaw = searchParams.get("invoiceId");
    const invoiceId = invoiceIdRaw ? Number(invoiceIdRaw) : null;
    const take = Number.isFinite(limit) && limit > 0 ? limit : 50;
    const skip = Number.isFinite(offset) && offset >= 0 ? offset : 0;
    const invoiceFilter = invoiceId && Number.isFinite(invoiceId) ? Number(invoiceId) : null;
    const supabase = getServiceSupabase();
    let query = supabase
      .from("user_messages")
      .select("id, user_id, invoice_id, sender, content, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: order === "asc" });
    if (invoiceFilter !== null) {
      query = query.eq("invoice_id", invoiceFilter);
    }
    const { data, error } = await query.range(skip, skip + take - 1);
    if (error) {
      throw new AppError(error.message, 'MESSAGE_ERROR', 500);
    }
    const messages = (data ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      invoiceId: row.invoice_id,
      sender: row.sender,
      content: row.content,
      createdAt: row.created_at,
    }));
    return NextResponse.json({ data: messages });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'messages.get', error: error as Error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const content = body?.content;
    const invoiceId = body?.invoiceId ? Number(body.invoiceId) : null;
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }
    if (invoiceId && Number.isFinite(invoiceId)) {
      // Ensure the sender has access to this invoice
      await requireInvoiceAccess(req, Number(invoiceId));
    }
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("user_messages")
      .insert({
        user_id: user.id,
        invoice_id: invoiceId && Number.isFinite(invoiceId) ? Number(invoiceId) : null,
        sender: user.role === "ADMIN" ? "ADMIN" : "CLIENT",
        content: content.slice(0, 5000),
      })
      .select("id, user_id, invoice_id, sender, content, created_at")
      .single();
    if (error || !data) {
      throw new AppError(error?.message ?? "Failed", 'MESSAGE_ERROR', 500);
    }
    return NextResponse.json({ data: {
      id: data.id,
      userId: data.user_id,
      invoiceId: data.invoice_id,
      sender: data.sender,
      content: data.content,
      createdAt: data.created_at,
    }});
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'messages.post', error: error as Error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
