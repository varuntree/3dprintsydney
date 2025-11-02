/**
 * Messages Service
 * Handles all database operations for user messages
 */

import { getServiceSupabase } from "@/server/supabase/service-client";
import { AppError, NotFoundError, BadRequestError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { MessageDTO, MessageFilters } from "@/lib/types/messages";
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

export type MessageNotificationDTO = {
  id: number;
  userId: number;
  invoiceId: number | null;
  sender: "ADMIN" | "CLIENT";
  content: string;
  createdAt: string;
  userEmail: string | null;
  userName: string | null;
};

export type NotificationListResult = {
  notifications: MessageNotificationDTO[];
  lastSeenAt: string | null;
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
  };
}

export async function listNotificationsForUser(
  user: LegacyUser,
  options?: { limit?: number },
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

  const rows = (data ?? []) as NotificationRow[];

  return {
    notifications: rows.map(mapNotificationRow),
    lastSeenAt,
  };
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
