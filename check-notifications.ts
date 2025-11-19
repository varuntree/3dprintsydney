
import "dotenv/config";
import { createNotification, getNotifications, markAsRead } from "./src/server/services/notifications";
import { getServiceSupabase } from "./src/server/supabase/service-client";

async function main() {
    const supabase = getServiceSupabase();

    // 1. Get a user (or create one if needed, but better to use existing)
    const { data: users } = await supabase.from("users").select("id").limit(1);
    if (!users || users.length === 0) {
        console.log("No users found");
        return;
    }
    const userId = users[0].id;
    console.log(`Using user ID: ${userId}`);

    // 2. Create a notification
    console.log("Creating notification...");
    const notification = await createNotification(
        userId,
        "SYSTEM",
        "Test Notification",
        "This is a test",
        null
    );

    if (!notification) {
        console.error("Failed to create notification");
        return;
    }
    console.log(`Created notification ID: ${notification.id}`);

    // 3. Fetch notifications
    console.log("Fetching notifications...");
    const { items } = await getNotifications(userId);
    const found = items.find(n => n.id === notification.id);
    if (!found) {
        console.error("Notification not found in list");
        return;
    }
    console.log("Notification found:", found);

    // 4. Mark as read
    console.log("Marking as read...");
    await markAsRead(userId, [notification.id]);

    // 5. Verify
    console.log("Verifying...");
    const { items: itemsAfter } = await getNotifications(userId);
    const foundAfter = itemsAfter.find(n => n.id === notification.id);

    if (foundAfter?.readAt) {
        console.log("SUCCESS: Notification marked as read at", foundAfter.readAt);
    } else {
        console.error("FAILURE: Notification still unread");
        console.log("Notification state:", foundAfter);
    }
}

main().catch(console.error);
