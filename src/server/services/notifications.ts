import { getServiceSupabase } from "@/server/supabase/service-client";

export type NotificationType = "MESSAGE" | "JOB_STATUS" | "SYSTEM";

export async function createNotification(
    userId: number,
    type: NotificationType,
    title: string,
    content: string | null,
    link: string | null,
    metadata: Record<string, any> | null = null
) {
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
        .from("notifications")
        .insert({
            user_id: userId,
            type,
            title,
            content,
            link,
            metadata,
        })
        .select()
        .single();

    if (error) {
        console.error("Failed to create notification:", error);
        // Don't throw, just log error to avoid blocking main flow
        return null;
    }

    return data;
}

export async function getNotifications(userId: number, limit = 20, offset = 0, after?: string) {
    const supabase = getServiceSupabase();

    let query = supabase
        .from("notifications")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        // Filter out archived notifications. 
        // Note: Supabase/Postgres JSONB operator ->> returns text.
        // We check if metadata->>'archived' is NOT 'true'.
        // However, if metadata is null, or key doesn't exist, it's not 'true'.
        // .not("metadata->>archived", "eq", "true") // This syntax might depend on library version
        // Let's use a filter that works for nulls too.
        // Fix: We need to explicitly handle the case where the key doesn't exist (is.null)
        // .or("metadata.is.null,metadata->>archived.is.null,metadata->>archived.neq.true")
        .or("metadata.is.null,metadata->>archived.is.null,metadata->>archived.neq.true")
        .order("created_at", { ascending: false });

    if (after) {
        query = query.gt("created_at", after);
    } else {
        query = query.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await query;

    if (error) {
        throw error;
    }

    const mappedItems = data.map((item) => ({
        id: item.id,
        userId: item.user_id,
        type: item.type,
        title: item.title,
        content: item.content,
        link: item.link,
        readAt: item.read_at,
        createdAt: item.created_at,
        metadata: item.metadata,
    }));

    return { items: mappedItems, total: count };
}

export async function markAsRead(userId: number, notificationIds: number[]) {
    const supabase = getServiceSupabase();

    const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .in("id", notificationIds);

    if (error) {
        throw error;
    }
}

export async function markAllAsRead(userId: number) {
    const supabase = getServiceSupabase();

    console.log(`[Notifications] Marking all as read for user ${userId}`);
    const { data, error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("read_at", null)
        .select("id");

    if (error) {
        console.error(`[Notifications] Failed to mark as read for user ${userId}:`, error);
        throw error;
    }
    console.log(`[Notifications] Marked ${data?.length ?? 0} notifications as read for user ${userId}`);
    console.log(`[Notifications] Marked ${data?.length ?? 0} notifications as read for user ${userId}`);
}

export async function archiveReadNotifications(userId: number) {
    const supabase = getServiceSupabase();

    // We need to update metadata for all read notifications.
    // Since we can't easily "merge" jsonb in a single update without a function or complex query in simple client,
    // and assuming metadata isn't heavily used yet, we can try a simpler approach.
    // However, to be safe, we should probably fetch read notifications and update them, 
    // OR use a raw query if we want to be efficient.
    // But for now, let's assume we can just set a flag.
    // Wait, if we just update metadata, we might overwrite other metadata.
    // Postgres `||` operator concatenates jsonb.
    // Supabase `.update({ metadata: ... })` overwrites.

    // Let's fetch read notifications first to be safe, or just overwrite if we know we only use it for this.
    // Current usage: metadata is optional.
    // Let's try to do it safely: fetch IDs of read notifications that aren't archived.

    const { data: notifications } = await supabase
        .from("notifications")
        .select("id, metadata")
        .eq("user_id", userId)
        .not("read_at", "is", null)
        .or("metadata.is.null,metadata->>archived.neq.true");

    if (!notifications || notifications.length === 0) return;

    // Now update them.
    // Since we want to update multiple rows with potentially different metadata (if we were merging),
    // we would need a complex query.
    // But here we just want to set archived=true for ALL of them.
    // We can do a bulk update if we don't care about preserving other metadata, OR if we know how to merge.
    // Supabase/Postgres `update` with jsonb will overwrite the column.
    // To merge, we'd need a function or raw SQL.
    // However, for this specific case, let's iterate and update individually to be safe and simple,
    // or use a raw query if performance matters. Given the likely low volume of "clear read", iteration is fine.
    // Actually, let's use Promise.all for parallel updates.

    await Promise.all(notifications.map(n => {
        const newMetadata = { ...(n.metadata as object), archived: "true" };
        return supabase
            .from("notifications")
            .update({ metadata: newMetadata })
            .eq("id", n.id);
    }));
}
