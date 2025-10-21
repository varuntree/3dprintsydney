import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/session";
import { requireInvoiceAccess } from "@/server/auth/permissions";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { fail } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid invoice id");
  }
  return id;
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const invoiceId = await parseId(context.params);
    await requireInvoiceAccess(req, invoiceId);

    const supabase = getServiceSupabase();
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("client_id")
      .eq("id", invoiceId)
      .maybeSingle();
    if (invoiceError) {
      throw Object.assign(new Error(`Failed to fetch invoice: ${invoiceError.message}`), { status: 500 });
    }
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const { data: clientUser, error: clientUserError } = await supabase
      .from("users")
      .select("id")
      .eq("client_id", invoice.client_id)
      .eq("role", "CLIENT")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (clientUserError) {
      throw Object.assign(new Error(`Failed to fetch client user: ${clientUserError.message}`), { status: 500 });
    }
    if (!clientUser) {
      return NextResponse.json({ error: "No client user" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    const offset = Number(searchParams.get("offset") ?? "0");
    const order = (searchParams.get("order") as "asc" | "desc" | null) ?? "asc";
    const take = Number.isFinite(limit) && limit > 0 ? limit : 50;
    const skip = Number.isFinite(offset) && offset >= 0 ? offset : 0;

    const { data: rows, error: messagesError } = await supabase
      .from("user_messages")
      .select("id, sender, content, created_at")
      .eq("user_id", clientUser.id)
      .order("created_at", { ascending: order === "asc" })
      .range(skip, skip + take - 1);
    if (messagesError) {
      throw Object.assign(new Error(`Failed to fetch messages: ${messagesError.message}`), { status: 500 });
    }
    const messages = (rows ?? []).map((row) => ({
      id: row.id,
      sender: row.sender,
      content: row.content,
      createdAt: row.created_at,
    }));
    return NextResponse.json({ data: messages });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'invoices.messages', error: error as Error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
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
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }
    const supabase = getServiceSupabase();
    let targetUserId: number | null = null;
    if (user.role === "CLIENT") {
      targetUserId = user.id;
    } else {
      const { data: inv, error: invError } = await supabase
        .from("invoices")
        .select("client_id")
        .eq("id", invoiceId)
        .maybeSingle();
      if (invError) {
        throw Object.assign(new Error(`Failed to fetch invoice: ${invError.message}`), { status: 500 });
      }
      if (!inv) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }
      const { data: clientUser, error: clientUserError } = await supabase
        .from("users")
        .select("id")
        .eq("client_id", inv.client_id)
        .eq("role", "CLIENT")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (clientUserError) {
        throw Object.assign(new Error(`Failed to fetch client user: ${clientUserError.message}`), { status: 500 });
      }
      if (!clientUser) {
        return NextResponse.json({ error: "No client user for this invoice" }, { status: 400 });
      }
      targetUserId = clientUser.id;
    }

    const { data, error } = await supabase
      .from("user_messages")
      .insert({
        user_id: targetUserId!,
        invoice_id: invoiceId,
        sender: user.role,
        content: content.slice(0, 5000),
      })
      .select("id, sender, content, created_at")
      .single();

    if (error || !data) {
      throw Object.assign(new Error(error?.message ?? "Failed to create message"), { status: 500 });
    }

    return NextResponse.json({
      data: {
        id: data.id,
        sender: data.sender,
        content: data.content,
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'invoices.messages', error: error as Error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
