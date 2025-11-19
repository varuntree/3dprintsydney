
import "dotenv/config";
import { createNotification, getNotifications } from "./src/server/services/notifications";
import { getServiceSupabase } from "./src/server/supabase/service-client";

async function main() {
    const supabase = getServiceSupabase();
    const { data: users } = await supabase.from("users").select("*").limit(1);
    if (!users?.length) return;
    const user = users[0];

    console.log(`Testing metadata filter for user: ${user.id}`);

    // 1. Create notification with NULL metadata
    const notifNull = await createNotification(user.id, "SYSTEM", "Null Metadata", "Should be visible", null);

    // 2. Create notification with EMPTY metadata
    const notifEmpty = await createNotification(user.id, "SYSTEM", "Empty Metadata", "Should be visible", null, {});

    // 3. Create notification with OTHER metadata
    const notifOther = await createNotification(user.id, "SYSTEM", "Other Metadata", "Should be visible", null, { foo: "bar" });

    // 4. Create notification with ARCHIVED metadata
    const notifArchived = await createNotification(user.id, "SYSTEM", "Archived", "Should NOT be visible", null, { archived: "true" });

    console.log("Created notifications:", {
        null: notifNull?.id,
        empty: notifEmpty?.id,
        other: notifOther?.id,
        archived: notifArchived?.id
    });

    // 5. Fetch
    const list = await getNotifications(user.id, 50);
    const ids = new Set(list.items.map(i => i.id));

    console.log("Visibility Results:");
    console.log("Null Metadata:", ids.has(notifNull!.id) ? "VISIBLE" : "HIDDEN (FAIL)");
    console.log("Empty Metadata:", ids.has(notifEmpty!.id) ? "VISIBLE" : "HIDDEN (FAIL)");
    console.log("Other Metadata:", ids.has(notifOther!.id) ? "VISIBLE" : "HIDDEN (FAIL)");
    console.log("Archived:", ids.has(notifArchived!.id) ? "VISIBLE (FAIL)" : "HIDDEN");

}

main().catch(console.error);
