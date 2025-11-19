
import "dotenv/config";
import { createNotification, getNotifications, markAsRead, archiveReadNotifications } from "./src/server/services/notifications";
import { getServiceSupabase } from "./src/server/supabase/service-client";

async function main() {
    const supabase = getServiceSupabase();
    const { data: users } = await supabase.from("users").select("*").limit(1);
    if (!users?.length) return;
    const user = users[0];

    console.log(`Testing persistence for user: ${user.id}`);

    // 1. Create a notification
    const notif = await createNotification(user.id, "SYSTEM", "Persistence Test", "Should be archived", null);
    if (!notif) {
        console.error("Failed to create notification");
        return;
    }
    console.log("Created notification:", notif.id);

    // 2. Verify it appears
    let list = await getNotifications(user.id, 20);
    if (!list.items.find(i => i.id === notif.id)) {
        console.error("Notification not found after creation");
        return;
    }
    console.log("Notification found in list.");

    // 3. Mark as read
    await markAsRead(user.id, [notif.id]);
    console.log("Marked as read.");

    // 4. Archive read notifications (simulate "Clear Read")
    await archiveReadNotifications(user.id);
    console.log("Archived read notifications.");

    // 5. Verify it is GONE from the list
    list = await getNotifications(user.id, 20);
    if (list.items.find(i => i.id === notif.id)) {
        console.error("FAILURE: Notification STILL found in list after archiving.");
        // Check metadata
        const { data: check } = await supabase.from("notifications").select("metadata").eq("id", notif.id).single();
        console.log("Metadata:", check?.metadata);
    } else {
        console.log("SUCCESS: Notification is gone from the list.");
    }
}

main().catch(console.error);
