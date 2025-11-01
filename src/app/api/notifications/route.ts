import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/api-helpers";
import { ok, fail, handleError } from "@/server/api/respond";
import { listNotificationsForUser, updateMessageLastSeenAt } from "@/server/services/messages";

function parseLimit(searchParams: URLSearchParams): number {
  const value = Number(searchParams.get("limit") ?? "15");
  if (!Number.isFinite(value) || value <= 0) {
    return 15;
  }
  return Math.min(Math.trunc(value), 50);
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const limit = parseLimit(searchParams);

    const { notifications, lastSeenAt } = await listNotificationsForUser(user, { limit });

    return ok({ items: notifications, lastSeenAt });
  } catch (error) {
    return handleError(error, "notifications.get");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = (await req.json().catch(() => ({}))) as { lastSeenAt?: unknown } | undefined;
    const candidate = typeof body?.lastSeenAt === "string" ? body.lastSeenAt : null;

    const date = candidate ? new Date(candidate) : new Date();
    if (Number.isNaN(date.getTime())) {
      return fail("VALIDATION_ERROR", "Invalid lastSeenAt timestamp", 422);
    }

    const iso = date.toISOString();
    await updateMessageLastSeenAt(user.id, iso);

    return ok({ lastSeenAt: iso });
  } catch (error) {
    return handleError(error, "notifications.patch");
  }
}
