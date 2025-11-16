import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/api-helpers";
import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import {
  listNotificationsForUser,
  updateMessageLastSeenAt,
  markConversationSeen,
  markAllConversationsSeen,
} from "@/server/services/messages";

function parseLimit(searchParams: URLSearchParams): number {
  const value = Number(searchParams.get("limit") ?? "15");
  if (!Number.isFinite(value) || value <= 0) {
    return 15;
  }
  return Math.min(Math.trunc(value), 50);
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams);
    
    // Allow filtering out messages from currently open conversation
    const excludeUserIdRaw = searchParams.get("excludeUserId");
    const excludeConversationUserId = excludeUserIdRaw ? Number(excludeUserIdRaw) : null;

    const { notifications, lastSeenAt } = await listNotificationsForUser(user, { 
      limit,
      excludeConversationUserId: excludeConversationUserId && Number.isFinite(excludeConversationUserId) 
        ? excludeConversationUserId 
        : null,
    });

    return okAuth(request, { items: notifications, lastSeenAt });
  } catch (error) {
    return handleErrorAuth(request, error, "notifications.get");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = (await request.json().catch(() => ({}))) as {
      lastSeenAt?: unknown;
      conversationUserId?: unknown;
    } | undefined;
    const candidate = typeof body?.lastSeenAt === "string" ? body.lastSeenAt : null;
    const conversationUserIdRaw = body?.conversationUserId;
    const conversationUserId =
      typeof conversationUserIdRaw === "number"
        ? conversationUserIdRaw
        : typeof conversationUserIdRaw === "string"
          ? Number(conversationUserIdRaw)
          : null;

    const date = candidate ? new Date(candidate) : new Date();
    if (Number.isNaN(date.getTime())) {
      return failAuth(request, "VALIDATION_ERROR", "Invalid lastSeenAt timestamp", 422);
    }

    const iso = date.toISOString();
    if (conversationUserId && Number.isFinite(conversationUserId)) {
      await markConversationSeen(user.id, conversationUserId, iso);
      return okAuth(request, {
        lastSeenAt: iso,
        conversationUserId,
      });
    }

    // Mark all notifications as read: update both global AND all conversation timestamps
    // This ensures notifications don't reappear after reload on non-messages pages
    await updateMessageLastSeenAt(user.id, iso);
    await markAllConversationsSeen(user.id, iso);
    return okAuth(request, { lastSeenAt: iso });
  } catch (error) {
    return handleErrorAuth(request, error, "notifications.patch");
  }
}
