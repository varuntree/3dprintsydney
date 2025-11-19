import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/api-helpers";
import { okAuth, handleErrorAuth } from "@/server/api/respond";
import { archiveReadNotifications } from "@/server/services/notifications";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const user = await requireAuth(request);
        await archiveReadNotifications(user.id);
        return okAuth(request, { success: true });
    } catch (error) {
        return handleErrorAuth(request, error, "notifications.clear-read");
    }
}
