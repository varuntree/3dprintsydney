import { NextRequest, NextResponse } from "next/server";
import { requireClientWithIdAPI } from "@/server/auth/api-helpers";
import { listJobsForClient } from "@/server/services/jobs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireClientWithIdAPI(req);
    const jobs = await listJobsForClient(user.clientId);
    return NextResponse.json({ data: jobs });
  } catch (error) {
    const e = error as Error & { status?: number };
    return NextResponse.json(
      { error: e?.message ?? "Failed to load jobs" },
      { status: e?.status ?? 400 },
    );
  }
}
