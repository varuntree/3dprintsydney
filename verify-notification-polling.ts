
import "dotenv/config";
import { getNotifications, createNotification } from "./src/server/services/notifications";
import { getServiceSupabase } from "./src/server/supabase/service-client";

async function main() {
    const supabase = getServiceSupabase();
    const { data: users } = await supabase.from("users").select("*").limit(1);
    if (!users?.length) return;
    const user = users[0];

    console.log(`Testing polling for user: ${user.id}`);

    // 1. Get current latest notification
    const initial = await getNotifications(user.id, 1);
    const latest = initial.items[0]?.createdAt;
    console.log("Latest notification at:", latest);

    if (!latest) {
        console.log("No notifications found, creating one to start...");
        await createNotification(user.id, "SYSTEM", "Initial Test", "Content", null);
        // re-fetch
        const recheck = await getNotifications(user.id, 1);
        const newLatest = recheck.items[0]?.createdAt;
        if (!newLatest) {
            console.error("Failed to create initial notification");
            return;
        }
        console.log("Created initial notification at:", newLatest);
        // Recursive call or just proceed? Let's proceed with newLatest
    }

    // 2. Create a new notification (simulate incoming)
    console.log("Creating new notification...");
    await createNotification(user.id, "SYSTEM", "Polling Test", "Should appear with 'after' param", null);

    // 3. Poll with 'after' parameter
    console.log(`Polling for notifications after ${latest}...`);
    // We need to wait a split second to ensure timestamp difference if it was super fast? 
    // Postgres resolution is microsecond, so should be fine.

    const polled = await getNotifications(user.id, 20, 0, latest);

    if (polled.items.length > 0) {
        console.log("SUCCESS: Found new notification using 'after' parameter");
        console.log("Polled items count:", polled.items.length);
        console.log("Item:", polled.items[0].title);
    } else {
        console.error("FAILURE: Did not find new notification using 'after' parameter");
    }
}

main().catch(console.error);
