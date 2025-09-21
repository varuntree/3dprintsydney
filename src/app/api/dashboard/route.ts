import { ok, handleError } from "@/server/api/respond";
import { getDashboardSnapshot } from "@/server/services/dashboard";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") ?? undefined; // today|7d|30d|ytd
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    const actLimit = Number(searchParams.get("actLimit") ?? "12");
    const actOffset = Number(searchParams.get("actOffset") ?? "0");
    const snapshot = await getDashboardSnapshot({ range, from, to, activityLimit: actLimit, activityOffset: actOffset });
    return ok(snapshot);
  } catch (error) {
    return handleError(error, "dashboard.snapshot");
  }
}
