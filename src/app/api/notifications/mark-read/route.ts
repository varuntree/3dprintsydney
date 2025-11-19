import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/api-helpers";
import { okAuth, handleErrorAuth } from "@/server/api/respond";
import { markAsRead, markAllAsRead } from "@/server/services/notifications";
import { z } from "zod";

export const dynamic = "force-dynamic";

const markReadSchema = z.object({
    ids: z.array(z.union([z.number(), z.string().transform((val) => parseInt(val, 10))])).optional(),
    all: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
    try {
        const user = await requireAuth(request);
        const body = await request.json();

        console.log(`[Notifications] Mark read request for user ${user.id}:`, body);

        const { ids, all } = markReadSchema.parse(body);

        if (all) {
            await markAllAsRead(user.id);
        } else if (ids && ids.length > 0) {
            await markAsRead(user.id, ids);
        }

        return okAuth(request, { success: true });
    } catch (error) {
        console.error("[Notifications] Mark read failed:", error);
        return handleErrorAuth(request, error, "notifications.mark-read");
    }
}
