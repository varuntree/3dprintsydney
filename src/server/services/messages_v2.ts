import { getServiceSupabase } from "@/server/supabase/service-client";
import { AppError, NotFoundError, BadRequestError } from "@/lib/errors";
import type { LegacyUser } from "@/lib/types/user";

export type MessageDTO = {
  id: number;
  userId: number;
  invoiceId: number | null;
  sender: "ADMIN" | "CLIENT";
  content: string;
  createdAt: string;
};

export type Cursor = { createdAt: string; id: number } | null;

function mapRow(row: any): MessageDTO {
  return {
    id: row.id,
    userId: row.user_id,
    invoiceId: row.invoice_id,
    sender: row.sender,
    content: row.content,
    createdAt: row.created_at,
  };
}

export async function fetchThread(
  targetUserId: number,
  opts: { limit?: number; cursor?: Cursor; invoiceId?: number | null } = {},
): Promise<{ messages: MessageDTO[]; nextCursor: Cursor }> {
  const supabase = getServiceSupabase();
  const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 100) : 40;

  let query = supabase
    .from("user_messages")
    .select("id, user_id, invoice_id, sender, content, created_at")
    .eq("user_id", targetUserId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (opts.invoiceId) {
    query = query.eq("invoice_id", opts.invoiceId);
  }

  if (opts.cursor) {
    query = query.lt("created_at", opts.cursor.createdAt).lt("id", opts.cursor.id);
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError(error.message, "MESSAGE_LOAD_ERROR", 500);
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const messages = slice.map(mapRow);
  const tail = messages[messages.length - 1] || null;
  const nextCursor = hasMore && tail ? { createdAt: tail.createdAt, id: tail.id } : null;
  return { messages, nextCursor };
}

export async function sendMessageV2(
  actor: LegacyUser,
  targetUserId: number,
  content: string,
  sender: "ADMIN" | "CLIENT",
  invoiceId?: number | null,
): Promise<MessageDTO> {
  if (!content || typeof content !== "string") {
    throw new BadRequestError("Invalid message content");
  }
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("user_messages")
    .insert({
      user_id: targetUserId,
      invoice_id: invoiceId ?? null,
      sender,
      content: content.slice(0, 5000),
    })
    .select("id, user_id, invoice_id, sender, content, created_at")
    .single();

  if (error || !data) {
    throw new AppError(error?.message ?? "Failed to create message", "MESSAGE_CREATE_ERROR", 500);
  }

  return mapRow(data);
}

export async function markSeenV2(
  viewerId: number,
  conversationUserId: number | null,
  lastSeenAt: string,
) {
  const supabase = getServiceSupabase();
  const payload = {
    user_id: viewerId,
    conversation_user_id: conversationUserId,
    last_seen_at: lastSeenAt,
  };
  const { error } = await supabase
    .from("conversation_last_seen")
    .upsert(payload, { onConflict: "user_id,conversation_user_id" });
  if (error) {
    throw new AppError(error.message, "MESSAGE_SEEN_ERROR", 500);
  }
}

export type ConversationSummary = {
  userId: number;
  email: string;
  lastMessage: MessageDTO | null;
  totalMessages: number;
  hasUnread: boolean;
};

export async function listAdminConversationsV2(
  admin: LegacyUser,
  opts: { search?: string | null; limit?: number; cursor?: Cursor } = {},
): Promise<{ conversations: ConversationSummary[]; nextCursor: Cursor }> {
  const supabase = getServiceSupabase();
  const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 100) : 40;

  let query = supabase
    .from("users")
    .select(`
      id,
      email,
      user_messages(count),
      latest:user_messages(id, created_at, sender, content)
    `)
    .eq("role", "CLIENT")
    .order("created_at", { foreignTable: "latest", ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (opts.search) {
    query = query.ilike("email", `%${opts.search}%`);
  }

  if (opts.cursor) {
    query = query.lt("created_at", opts.cursor.createdAt).lt("id", opts.cursor.id);
  }

  const [{ data, error }, seenResult] = await Promise.all([
    query,
    supabase
      .from("conversation_last_seen")
      .select("conversation_user_id, last_seen_at")
      .eq("user_id", admin.id),
  ]);

  if (error) {
    throw new AppError(error.message, "MESSAGE_ROSTER_ERROR", 500);
  }

  const seenMap = new Map<number, string | null>();
  if (Array.isArray(seenResult.data)) {
    seenResult.data.forEach((row: any) => {
      if (typeof row?.conversation_user_id === "number") {
        seenMap.set(row.conversation_user_id, row.last_seen_at ?? null);
      }
    });
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;

  const conversations: ConversationSummary[] = slice.map((row: any) => {
    const latest = Array.isArray(row.latest) ? row.latest[0] : null;
    const last = latest
      ? mapRow({ ...latest, user_id: row.id, invoice_id: null })
      : null;
    const total = Array.isArray(row.user_messages) && row.user_messages[0]?.count
      ? Number(row.user_messages[0].count)
      : 0;
    const lastSeen = seenMap.get(row.id) ?? null;
    const hasUnread = last && last.createdAt && (!lastSeen || new Date(last.createdAt) > new Date(lastSeen));
    return {
      userId: row.id,
      email: row.email,
      lastMessage: last,
      totalMessages: total,
      hasUnread,
    };
  });

  const tail = conversations[conversations.length - 1] || null;
  const nextCursor = hasMore && tail?.lastMessage
    ? { createdAt: tail.lastMessage.createdAt, id: tail.lastMessage.id }
    : null;

  return { conversations, nextCursor };
}
