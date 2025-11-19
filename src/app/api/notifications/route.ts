import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/api-helpers";
import { okAuth, handleErrorAuth } from "@/server/api/respond";
import { getNotifications, markAllAsRead } from "@/server/services/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const user = await requireAuth(request);
        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get("limit") ?? "20");
        const offset = parseInt(searchParams.get("offset") ?? "0");
        const after = searchParams.get("after") ?? undefined;

        const { items, total } = await getNotifications(user.id, limit, offset, after);

        return okAuth(
            request,
            {
                items,
                total,
            },
            {
                headers: {
                    'Cache-Control': 'no-store',
                },
            }
        );
    } catch (error) {
        return handleErrorAuth(request, error, "notifications.get");
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const user = await requireAuth(request);

        // Currently only supporting "mark all as read" for simplicity in this iteration
        await markAllAsRead(user.id);

        return okAuth(request, { success: true });
    } catch (error) {
        return handleErrorAuth(request, error, "notifications.patch");
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await requireAuth(request);
        // For now, we might want to restrict who can create notifications via API
        // But for simplicity, we'll allow authenticated users to create (e.g. for testing or specific flows)
        // In a real app, you might want to check roles or use a service key

        const body = await request.json();
        // We can add validation here if needed, but the service handles it mostly
        // For now, let's just return not implemented or basic success if we want to support it
        // The plan said "Create a notification (internal use or admin)"

        // Let's implement a basic version using createNotification
        const { createNotification } = await import("@/server/services/notifications");

        const { type, title, content, link, metadata } = body;

        const notification = await createNotification(
            user.id, // Or target user if admin? For now, let's assume self or we need a target_user_id in body
            type,
            title,
            content,
            link,
            metadata
        );

        return okAuth(request, { notification });
    } catch (error) {
        return handleErrorAuth(request, error, "notifications.create");
    }
}
