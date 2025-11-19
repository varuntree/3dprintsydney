
import "dotenv/config";
import { fetchThread, sendMessageV2 } from "./src/server/services/messages_v2";
import { getServiceSupabase } from "./src/server/supabase/service-client";

async function main() {
    const supabase = getServiceSupabase();

    // 1. Get a user
    const { data: users } = await supabase.from("users").select("*").limit(1);
    if (!users || users.length === 0) {
        console.log("No users found");
        return;
    }
    const user = users[0];
    console.log(`Using user ID: ${user.id}`);

    // 2. Get current latest message timestamp
    console.log("Fetching initial thread...");
    const initial = await fetchThread(user.id, { limit: 1 });
    const latest = initial.messages[0]?.createdAt;
    console.log("Latest message at:", latest);

    // 3. Send a new message
    console.log("Sending new message...");
    const msg = await sendMessageV2(
        user,
        user.id,
        "Test message for polling optimization " + Date.now(),
        "ADMIN", // Sending as ADMIN to user
        null
    );
    console.log("Sent message:", msg.id, "at", msg.createdAt);

    // 4. Poll with 'after' parameter
    if (!latest) {
        console.log("No previous messages, skipping 'after' test (or treating as fetch all)");
    } else {
        console.log(`Polling for messages after ${latest}...`);
        const polled = await fetchThread(user.id, { after: latest });

        const found = polled.messages.find(m => m.id === msg.id);
        if (found) {
            console.log("SUCCESS: Found new message using 'after' parameter");
            console.log("Polled messages count:", polled.messages.length);
        } else {
            console.error("FAILURE: Did not find new message using 'after' parameter");
            console.log("Polled messages:", polled.messages);
        }
    }
}

main().catch(console.error);
