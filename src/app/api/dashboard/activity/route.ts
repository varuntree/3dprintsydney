import { ok, handleError } from "@/server/api/respond";
import { getRecentActivity } from "@/server/services/dashboard";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "12");
    const offset = Number(searchParams.get("offset") ?? "0");

    const result = await getRecentActivity({ limit, offset });
    return ok(result);
  } catch (error) {
    return handleError(error, "dashboard.activity");
  }
}
