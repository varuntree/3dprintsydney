/**
 * Messages Service
 * Handles all database operations for user messages
 */

import { getServiceSupabase } from "@/server/supabase/service-client";
import { AppError, NotFoundError, BadRequestError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type {
  MessageDTO,
  MessageFilters,
} from "@/lib/types/messages";
import type { LegacyUser } from "@/lib/types/user";

// Database row type
type MessageRow = {
  id: number;
  user_id: number;
  invoice_id: number | null;
  sender: "ADMIN" | "CLIENT";
  content: string;
  created_at: string;
};

type NotificationRow = MessageRow & {
  users?: {
    email?: string | null;
    clients?: {
      name?: string | null;
      company?: string | null;
    } | null;
  } | null;
};

function isNotificationRow(value: unknown): value is NotificationRow {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "number" &&
    typeof row.user_id === "number" &&
    (row.sender === "ADMIN" || row.sender === "CLIENT") &&
    typeof row.content === "string" &&
    typeof row.created_at === "string"
  );
}

export type MessageNotificationDTO = {
  id: number;
  userId: number;
  invoiceId: number | null;
  sender: "ADMIN" | "CLIENT";
  content: string;
  createdAt: string;
  userEmail: string | null;
  userName: string | null;
  conversationLastSeenAt: string | null;
};

export type NotificationListResult = {
  notifications: MessageNotificationDTO[];
  lastSeenAt: string | null;
};

export type ConversationSummary = {
  userId: number;
  email: string;
  role: string;
  clientId: number | null;
  createdAt: string;
  lastMessageId: number | null;
  lastMessageAt: string | null;
  lastMessageSender: "ADMIN" | "CLIENT" | null;
  lastMessagePreview: string | null;
  totalMessages: number;
  hasUnread: boolean;
};

/**
 * Map database row to DTO
 */
function mapMessageToDTO(row: MessageRow): MessageDTO {
  return {
    id: row.id,
    userId: row.user_id,
    invoiceId: row.invoice_id,
    sender: row.sender,
    content: row.content,
    createdAt: row.created_at,
  };
}

/**
 * List messages for a specific user
 * @param userId - The user ID to get messages for
 * @param options - Optional filters (invoiceId, limit, offset, order)
 */
export async function listUserMessages(
  userId: number,
  options?: MessageFilters,
): Promise<MessageDTO[]> {
  const supabase = getServiceSupabase();

  const limit =
    options?.limit && Number.isFinite(options.limit) && options.limit > 0
      ? options.limit
      : 50;
  const offset =
    options?.offset && Number.isFinite(options.offset) && options.offset >= 0
      ? options.offset
      : 0;
  const order = options?.order ?? "asc";

  let query = supabase
    .from("user_messages")
    .select("id, user_id, invoice_id, sender, content, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: order === "asc" });

  // Filter by invoice if provided
  if (options?.invoiceId && Number.isFinite(options.invoiceId)) {
    query = query.eq("invoice_id", options.invoiceId);
  }

  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    throw new AppError(
      `Failed to list messages: ${error.message}`,
      "MESSAGE_ERROR",
      500,
    );
  }

  return (data ?? []).map(mapMessageToDTO);
}

/**
 * Create a new message
 * @param userId - The user who owns the message
 * @param content - Message content (max 5000 chars)
 * @param sender - Who sent the message (ADMIN or CLIENT)
 * @param invoiceId - Optional invoice ID this message relates to
 */
export async function createMessage(
  userId: number,
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
      user_id: userId,
      invoice_id: invoiceId && Number.isFinite(invoiceId) ? invoiceId : null,
      sender,
      content: content.slice(0, 5000), // Truncate to 5000 chars
    })
    .select("id, user_id, invoice_id, sender, content, created_at")
    .single();

  if (error || !data) {
    throw new AppError(
      error?.message ?? "Failed to create message",
      "MESSAGE_CREATE_ERROR",
      500,
    );
  }

  logger.info({
    scope: "messages.create",
    message: "Message created",
    data: { messageId: data.id, userId, invoiceId },
  });

  return mapMessageToDTO(data);
}

/**
 * Get messages for a specific invoice
 * Retrieves messages for the client user associated with the invoice
 * @param invoiceId - The invoice ID
 * @param options - Optional filters (limit, offset, order)
 */
export async function getInvoiceMessages(
  invoiceId: number,
  options?: Omit<MessageFilters, "invoiceId">,
): Promise<MessageDTO[]> {
  const supabase = getServiceSupabase();

  // First, get the invoice to find the client_id
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("client_id")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invoiceError) {
    throw new AppError(
      `Failed to fetch invoice: ${invoiceError.message}`,
      "MESSAGE_LOAD_ERROR",
      500,
    );
  }

  if (!invoice) {
    throw new NotFoundError("Invoice", invoiceId);
  }

  // Find the client user for this invoice
  const { data: clientUser, error: clientUserError } = await supabase
    .from("users")
    .select("id")
    .eq("client_id", invoice.client_id)
    .eq("role", "CLIENT")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (clientUserError) {
    throw new AppError(
      `Failed to fetch client user: ${clientUserError.message}`,
      "MESSAGE_LOAD_ERROR",
      500,
    );
  }

  if (!clientUser) {
    throw new BadRequestError("No client user found for this invoice");
  }

  // Now get messages for this user
  const limit =
    options?.limit && Number.isFinite(options.limit) && options.limit > 0
      ? options.limit
      : 50;
  const offset =
    options?.offset && Number.isFinite(options.offset) && options.offset >= 0
      ? options.offset
      : 0;
  const order = options?.order ?? "asc";

  const { data: rows, error: messagesError } = await supabase
    .from("user_messages")
    .select("id, user_id, invoice_id, sender, content, created_at")
    .eq("user_id", clientUser.id)
    .order("created_at", { ascending: order === "asc" })
    .range(offset, offset + limit - 1);

  if (messagesError) {
    throw new AppError(
      `Failed to fetch messages: ${messagesError.message}`,
      "MESSAGE_LOAD_ERROR",
      500,
    );
  }

  return (rows ?? []).map(mapMessageToDTO);
}

function mapNotificationRow(row: NotificationRow): MessageNotificationDTO {
  let clientName: string | null = null;
  const clientRecord = row.users?.clients ?? null;

  if (clientRecord && typeof clientRecord === "object") {
    const possibleName = (clientRecord as { name?: unknown }).name;
    const possibleCompany = (clientRecord as { company?: unknown }).company;

    if (typeof possibleName === "string" && possibleName.trim().length > 0) {
      clientName = possibleName;
    } else if (
      typeof possibleCompany === "string" &&
      possibleCompany.trim().length > 0
    ) {
      clientName = possibleCompany;
    }
  }

  const userEmail =
    typeof row.users?.email === "string" ? row.users?.email : null;

  return {
    id: row.id,
    userId: row.user_id,
    invoiceId: row.invoice_id,
    sender: row.sender,
    content: row.content,
    createdAt: row.created_at,
    userEmail,
    userName: clientName,
    conversationLastSeenAt: null,
  };
}

export async function listNotificationsForUser(
  user: LegacyUser,
  options?: { limit?: number; excludeConversationUserId?: number | null },
): Promise<NotificationListResult> {
  const supabase = getServiceSupabase();

  const limit =
    options?.limit && Number.isFinite(options.limit) && options.limit > 0
      ? Math.min(options.limit, 50)
      : 15;

  const { data: seenRow, error: seenError } = await supabase
    .from("users")
    .select("message_last_seen_at")
    .eq("id", user.id)
    .maybeSingle();

  let lastSeenAt: string | null = null;
  if (seenError) {
    const message = seenError.message ?? "";
    if (message.toLowerCase().includes("message_last_seen_at")) {
      logger.warn({
        scope: "messages.notifications",
        message:
          "message_last_seen_at column missing; treating notifications as unseen",
      });
    } else {
      throw new AppError(
        `Failed to load notification state: ${seenError.message}`,
        "MESSAGE_ERROR",
        500,
      );
    }
  } else {
    lastSeenAt =
      (seenRow as { message_last_seen_at?: string | null } | null)
        ?.message_last_seen_at ?? null;
  }

  const baseSelect =
    user.role === "ADMIN"
      ? "id, user_id, invoice_id, sender, content, created_at, users:users(email, clients:clients(name, company))"
      : "id, user_id, invoice_id, sender, content, created_at";

  let query = supabase
    .from("user_messages")
    .select(baseSelect)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (user.role === "ADMIN") {
    query = query.eq("sender", "CLIENT");
    // Exclude messages from currently open conversation
    if (options?.excludeConversationUserId && Number.isFinite(options.excludeConversationUserId)) {
      query = query.neq("user_id", options.excludeConversationUserId);
    }
  } else {
    query = query.eq("user_id", user.id).eq("sender", "ADMIN");
  }

  const { data, error } = await query;

  if (error) {
    throw new AppError(
      `Failed to load notifications: ${error.message}`,
      "MESSAGE_ERROR",
      500,
    );
  }

  const rows: NotificationRow[] = [];
  if (Array.isArray(data)) {
    for (const item of data) {
      if (isNotificationRow(item)) {
        rows.push(item);
      }
    }
  }

  let conversationSeenMap = new Map<number, string | null>();
  if (user.role === "ADMIN") {
    const { data: conversationSeen, error: conversationSeenError } = await supabase
      .from("conversation_last_seen")
      .select("conversation_user_id, last_seen_at")
      .eq("user_id", user.id);

    if (conversationSeenError) {
      const message = conversationSeenError.message ?? "";
      if (message.toLowerCase().includes("conversation_last_seen")) {
        logger.warn({
          scope: "messages.notifications",
          message: "conversation_last_seen table missing; falling back to global seen state",
        });
      } else {
        throw new AppError(
          `Failed to load conversation seen state: ${message}`,
          "MESSAGE_ERROR",
          500,
        );
      }
    } else if (Array.isArray(conversationSeen)) {
      conversationSeenMap = new Map(
        conversationSeen
          .filter((entry): entry is { conversation_user_id: number; last_seen_at: string | null } =>
            entry !== null && typeof entry === "object" && typeof entry.conversation_user_id === "number",
          )
          .map((entry) => [entry.conversation_user_id, entry.last_seen_at ?? null]),
      );
    }
  }

  const globalLastSeenTime =
    lastSeenAt && Number.isFinite(Date.parse(lastSeenAt))
      ? Date.parse(lastSeenAt)
      : null;

  const notifications = rows
    .map((row) => {
      const dto = mapNotificationRow(row);
      if (user.role === "ADMIN") {
        dto.conversationLastSeenAt = conversationSeenMap.get(dto.userId) ?? null;
      }

      const createdTime = Date.parse(dto.createdAt);
      if (Number.isNaN(createdTime)) {
        return { dto, unseen: false };
      }

      let baseline: number | null = globalLastSeenTime;

      if (user.role === "ADMIN") {
        const conversationSeen = dto.conversationLastSeenAt
          ? Date.parse(dto.conversationLastSeenAt)
          : null;
        if (conversationSeen !== null && !Number.isNaN(conversationSeen)) {
          baseline = conversationSeen;
        }
      }

      const unseen =
        baseline === null || Number.isNaN(baseline) || createdTime > baseline;

      return { dto, unseen };
    })
    .filter((entry) => entry.unseen)
    .map((entry) => entry.dto);

  return {
    notifications,
    lastSeenAt,
  };
}

type LatestMessageRow = {
  id: number;
  created_at: string;
  sender: "ADMIN" | "CLIENT";
  content: string | null;
};

type ConversationRosterRow = {
  id: number;
  email: string;
  role: string;
  client_id: number | null;
  created_at: string;
  messages_count?: Array<{ count?: number | null }> | null;
  latest_message?: LatestMessageRow[] | null;
};

type ConversationLastSeenRow = {
  conversation_user_id: number;
  last_seen_at: string | null;
};

export async function listAdminConversationSummaries(
  admin: LegacyUser,
  options?: { limit?: number; search?: string | null },
): Promise<ConversationSummary[]> {
  const supabase = getServiceSupabase();

  const limit = options?.limit && Number.isFinite(options.limit)
    ? Math.min(Math.trunc(options.limit), 200)
    : 100;

  let query = supabase
    .from("users")
    .select(
      `id,
       email,
       role,
       client_id,
       created_at,
       messages_count:user_messages(count),
       latest_message:user_messages(
         id,
         created_at,
         sender,
         content
       )`,
    )
    .eq("role", "CLIENT")
    .limit(limit)
    .order("created_at", { foreignTable: "latest_message", ascending: false })
    .order("created_at", { ascending: false });

  if (options?.search) {
    query = query.ilike("email", `%${options.search}%`);
  }

  query = query.limit(1, { foreignTable: "latest_message" });

  const [{ data, error }, lastSeenResult] = await Promise.all([
    query,
    supabase
      .from("conversation_last_seen")
      .select("conversation_user_id, last_seen_at")
      .eq("user_id", admin.id),
  ]);

  if (error) {
    throw new AppError(
      `Failed to load conversation roster: ${error.message}`,
      "MESSAGE_ERROR",
      500,
    );
  }

  if (lastSeenResult.error) {
    const message = lastSeenResult.error.message ?? "";
    if (message.toLowerCase().includes("conversation_last_seen")) {
      logger.warn({
        scope: "messages.conversation",
        message:
          "conversation_last_seen table missing; continuing without granular seen state",
      });
    } else {
      throw new AppError(
        `Failed to load conversation seen state: ${message}`,
        "MESSAGE_ERROR",
        500,
      );
    }
  }

  const lastSeenRows = (lastSeenResult.data ?? []) as ConversationLastSeenRow[];
  const lastSeenMap = new Map<number, string | null>();
  for (const row of lastSeenRows) {
    if (typeof row.conversation_user_id === "number") {
      lastSeenMap.set(row.conversation_user_id, row.last_seen_at ?? null);
    }
  }

  const normalized = (data ?? []) as ConversationRosterRow[];

  const summaries = normalized.map<ConversationSummary>((row) => {
    const latest = Array.isArray(row.latest_message)
      ? row.latest_message[0] ?? null
      : null;

    const totalMessages = Array.isArray(row.messages_count)
      ? row.messages_count.reduce((acc, item) => {
          const value = Number((item ?? {}).count ?? 0);
          return acc + (Number.isFinite(value) ? value : 0);
        }, 0)
      : 0;

    const lastMessageAt = latest?.created_at ?? null;
    const lastMessageSender = latest?.sender ?? null;
    const preview = latest?.content ?? null;

    const lastSeen = lastSeenMap.get(row.id ?? -1) ?? null;

    let hasUnread = false;
    if (lastMessageAt && lastMessageSender === "CLIENT") {
      if (!lastSeen) {
        hasUnread = true;
      } else {
        const lastSeenTime = Date.parse(lastSeen);
        const lastMessageTime = Date.parse(lastMessageAt);
        if (
          Number.isFinite(lastMessageTime) &&
          (!Number.isFinite(lastSeenTime) || lastMessageTime > lastSeenTime)
        ) {
          hasUnread = true;
        }
      }
    }

    return {
      userId: row.id,
      email: row.email,
      role: row.role,
      clientId: row.client_id ?? null,
      createdAt: row.created_at,
      lastMessageId: latest?.id ?? null,
      lastMessageAt,
      lastMessageSender,
      lastMessagePreview: preview,
      totalMessages,
      hasUnread,
    };
  });

  // Sort by most recent message, falling back to user creation date
  const sorted = summaries.sort((a, b) => {
    const aTime = a.lastMessageAt ? Date.parse(a.lastMessageAt) : NaN;
    const bTime = b.lastMessageAt ? Date.parse(b.lastMessageAt) : NaN;

    if (Number.isFinite(aTime) && Number.isFinite(bTime)) {
      return bTime - aTime;
    }
    if (Number.isFinite(aTime)) return -1;
    if (Number.isFinite(bTime)) return 1;

    const aCreated = Date.parse(a.createdAt);
    const bCreated = Date.parse(b.createdAt);
    if (Number.isFinite(aCreated) && Number.isFinite(bCreated)) {
      return bCreated - aCreated;
    }
    return 0;
  });

  return sorted;
}

export async function updateMessageLastSeenAt(
  userId: number,
  timestampIso: string,
): Promise<void> {
  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from("users")
    .update({ message_last_seen_at: timestampIso })
    .eq("id", userId);

  if (error) {
    const message = error.message ?? "";
    if (message.toLowerCase().includes("message_last_seen_at")) {
      logger.warn({
        scope: "messages.notifications",
        message:
          "Unable to update notification state; message_last_seen_at column missing",
      });
      return;
    }
    throw new AppError(
      `Failed to update notification state: ${error.message}`,
      "MESSAGE_ERROR",
      500,
    );
  }
}

/**
 * Mark a specific conversation as seen up to a timestamp
 * This provides granular per-conversation tracking
 * @param userId - The user viewing the conversation
 * @param conversationUserId - The other user in the conversation
 * @param timestampIso - ISO timestamp of the last seen message
 * @param messageId - Optional ID of the last seen message
 */
export async function markConversationSeen(
  userId: number,
  conversationUserId: number,
  timestampIso: string,
  messageId?: number | null,
): Promise<void> {
  const supabase = getServiceSupabase();
  
  const { error } = await supabase
    .from("conversation_last_seen")
    .upsert({
      user_id: userId,
      conversation_user_id: conversationUserId,
      last_seen_at: timestampIso,
      last_seen_message_id: messageId ?? null,
    }, {
      onConflict: "user_id,conversation_user_id",
    });

  if (error) {
    const message = error.message ?? "";
    // If table doesn't exist yet (migration not run), fail silently
    if (message.toLowerCase().includes("conversation_last_seen") && 
        message.toLowerCase().includes("does not exist")) {
      logger.warn({
        scope: "messages.conversation",
        message: "conversation_last_seen table not found; skipping granular tracking",
      });
      return;
    }
    throw new AppError(
      `Failed to mark conversation as seen: ${error.message}`,
      "MESSAGE_ERROR",
      500,
    );
  }

  logger.info({
    scope: "messages.conversation",
    message: "Conversation marked as seen",
    data: { userId, conversationUserId, timestamp: timestampIso },
  });
}

/**
 * Create a message for a specific invoice
 * Creates a message for the client user associated with the invoice
 * @param invoiceId - The invoice ID
 * @param content - Message content
 * @param sender - Who sent the message (ADMIN or CLIENT)
 */
export async function createInvoiceMessage(
  invoiceId: number,
  content: string,
  sender: "ADMIN" | "CLIENT",
): Promise<MessageDTO> {
  if (!content || typeof content !== "string") {
    throw new BadRequestError("Invalid message content");
  }

  const supabase = getServiceSupabase();

  // Get the invoice to find the client_id
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("client_id")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invoiceError) {
    throw new AppError(
      `Failed to fetch invoice: ${invoiceError.message}`,
      "MESSAGE_CREATE_ERROR",
      500,
    );
  }

  if (!invoice) {
    throw new NotFoundError("Invoice", invoiceId);
  }

  // Find the client user for this invoice
  const { data: clientUser, error: clientUserError } = await supabase
    .from("users")
    .select("id")
    .eq("client_id", invoice.client_id)
    .eq("role", "CLIENT")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (clientUserError) {
    throw new AppError(
      `Failed to fetch client user: ${clientUserError.message}`,
      "MESSAGE_CREATE_ERROR",
      500,
    );
  }

  if (!clientUser) {
    throw new BadRequestError("No client user found for this invoice");
  }

  // Create the message
  const { data, error } = await supabase
    .from("user_messages")
    .insert({
      user_id: clientUser.id,
      invoice_id: invoiceId,
      sender,
      content: content.slice(0, 5000),
    })
    .select("id, user_id, invoice_id, sender, content, created_at")
    .single();

  if (error || !data) {
    throw new AppError(
      error?.message ?? "Failed to create message",
      "MESSAGE_CREATE_ERROR",
      500,
    );
  }

  logger.info({
    scope: "messages.create",
    message: "Invoice message created",
    data: { messageId: data.id, invoiceId },
  });

  return mapMessageToDTO(data);
}
