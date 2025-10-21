import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/session";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { fail } from "@/server/api/respond";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await context.params;
    const userId = Number(id);
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    const offset = Number(searchParams.get("offset") ?? "0");
    const order = (searchParams.get("order") as "asc" | "desc" | null) ?? "asc";
    const take = Number.isFinite(limit) && limit > 0 ? limit : 50;
    const skip = Number.isFinite(offset) && offset >= 0 ? offset : 0;
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("user_messages")
      .select("id, user_id, invoice_id, sender, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: order === "asc" })
      .range(skip, skip + take - 1);
    if (error) {
      throw Object.assign(new Error(`Failed to load messages: ${error.message}`), { status: 500 });
    }
    return NextResponse.json({
      data: (data ?? []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        invoiceId: row.invoice_id,
        sender: row.sender,
        content: row.content,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'admin.users.messages', error: error as Error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await context.params;
    const userId = Number(id);
    const { content } = await req.json();
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("user_messages")
      .insert({
        user_id: userId,
        invoice_id: null,
        sender: "ADMIN",
        content: content.slice(0, 5000),
      })
      .select("id, user_id, invoice_id, sender, content, created_at")
      .single();
    if (error || !data) {
      throw Object.assign(new Error(error?.message ?? "Failed to create message"), { status: 500 });
    }
    return NextResponse.json({
      data: {
        id: data.id,
        userId: data.user_id,
        invoiceId: data.invoice_id,
        sender: data.sender,
        content: data.content,
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message, error.status, error.details as Record<string, unknown> | undefined);
    }
    logger.error({ scope: 'admin.users.messages', error: error as Error });
    return fail('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
