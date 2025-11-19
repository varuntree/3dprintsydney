
import "dotenv/config";
import { createNotification, getNotifications } from "./src/server/services/notifications";
import { getServiceSupabase } from "./src/server/supabase/service-client";

async function main() {
    const supabase = getServiceSupabase();
    const { data: users } = await supabase.from("users").select("*").limit(1);
    if (!users?.length) return;
    const user = users[0];

    console.log(`Debugging for user: ${user.id}`);

    // 1. Create a fresh notification
    console.log("Creating test notification...");
    const notif = await createNotification(user.id, "SYSTEM", "Debug Test", "Can you see me?", null);
    if (!notif) {
        console.error("Failed to create notification!");
        return;
    }
    console.log("Created notification:", notif.id);

    // 2. Fetch directly via Supabase (bypass service) to confirm it exists
    const { data: raw } = await supabase.from("notifications").select("*").eq("id", notif.id).single();
    console.log("Raw DB fetch:", raw ? "Found" : "Not Found");
    if (raw) {
        console.log("Raw Metadata:", raw.metadata);
    }

    // 3. Fetch via getNotifications service (test filtering)
    console.log("Fetching via service...");
    const list = await getNotifications(user.id, 20);
    const found = list.items.find(i => i.id === notif.id);

    if (found) {
        console.log("SUCCESS: Notification found via service.");
    } else {
        console.error("FAILURE: Notification NOT found via service.");
        console.log("List items count:", list.items.length);
        // console.log("List items:", list.items);
    }
}

main().catch(console.error);
