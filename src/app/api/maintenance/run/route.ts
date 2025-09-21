import { ok, handleError } from "@/server/api/respond";
import { runDailyMaintenance } from "@/server/services/maintenance";

export async function POST() {
  try {
    await runDailyMaintenance();
    return ok({ success: true });
  } catch (error) {
    return handleError(error, "maintenance.run");
  }
}

