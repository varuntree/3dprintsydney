
import "dotenv/config";
import { sendMessageV2 } from "./src/server/services/messages_v2";
import { getNotifications } from "./src/server/services/notifications";
import { getServiceSupabase } from "./src/server/supabase/service-client";

async function main() {
    const supabase = getServiceSupabase();

    // 1. Get a Client user and an Admin user
    const { data: clients } = await supabase.from("users").select("*").eq("role", "CLIENT").limit(1);
    const { data: admins } = await supabase.from("users").select("*").eq("role", "ADMIN").limit(1);

    if (!clients?.length || !admins?.length) {
        console.log("Need both a CLIENT and an ADMIN user to test routing.");
        return;
    }

    const client = clients[0];
    const admin = admins[0];

    console.log(`Testing with Client: ${client.id} (${client.email}) and Admin: ${admin.id} (${admin.email})`);

    // Test 1: Client sends message -> Admin should get notification
    console.log("\n--- Test 1: Client -> Admin ---");
    const initialAdminNotifs = await getNotifications(admin.id, 1);
    const lastAdminNotifTime = initialAdminNotifs.items[0]?.createdAt;

    await sendMessageV2(client, admin.id, "Test message from Client to Admin " + Date.now(), "CLIENT", null);

    // Wait a bit for async notification creation (it's awaited in sendMessageV2 but good to be sure)
    const newAdminNotifs = await getNotifications(admin.id, 1);
    const newAdminNotif = newAdminNotifs.items[0];

    if (newAdminNotif && (!lastAdminNotifTime || new Date(newAdminNotif.createdAt) > new Date(lastAdminNotifTime))) {
        console.log("SUCCESS: Admin received notification.");
        console.log("Notification:", newAdminNotif.title, "-", newAdminNotif.content);
    } else {
        console.error("FAILURE: Admin did NOT receive notification.");
    }

    // Test 2: Admin sends message -> Client should get notification
    console.log("\n--- Test 2: Admin -> Client ---");
    const initialClientNotifs = await getNotifications(client.id, 1);
    const lastClientNotifTime = initialClientNotifs.items[0]?.createdAt;

    await sendMessageV2(admin, client.id, "Test message from Admin to Client " + Date.now(), "ADMIN", null);

    const newClientNotifs = await getNotifications(client.id, 1);
    const newClientNotif = newClientNotifs.items[0];

    if (newClientNotif && (!lastClientNotifTime || new Date(newClientNotif.createdAt) > new Date(lastClientNotifTime))) {
        console.log("SUCCESS: Client received notification.");
        console.log("Notification:", newClientNotif.title, "-", newClientNotif.content);
    } else {
        console.error("FAILURE: Client did NOT receive notification.");
    }
}

main().catch(console.error);
