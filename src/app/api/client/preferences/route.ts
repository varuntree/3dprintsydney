import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireClientWithIdAPI } from "@/server/auth/api-helpers";
import {
  getClientNotificationPreference,
  updateClientNotificationPreference,
} from "@/server/services/clients";

const preferenceSchema = z.object({
  notifyOnJobStatus: z.boolean(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireClientWithIdAPI(req);
    const notifyOnJobStatus = await getClientNotificationPreference(user.clientId);
    return NextResponse.json({ data: { notifyOnJobStatus } });
  } catch (error) {
    const e = error as Error & { status?: number };
    return NextResponse.json(
      { error: e?.message ?? "Failed to load preferences" },
      { status: e?.status ?? 400 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireClientWithIdAPI(req);
    const payload = await req.json();
    const parsed = preferenceSchema.parse(payload);
    const notifyOnJobStatus = await updateClientNotificationPreference(
      user.clientId,
      parsed.notifyOnJobStatus,
    );
    return NextResponse.json({ data: { notifyOnJobStatus } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid preferences payload", issues: error.issues },
        { status: 422 },
      );
    }
    const e = error as Error & { status?: number };
    return NextResponse.json(
      { error: e?.message ?? "Failed to update preferences" },
      { status: e?.status ?? 400 },
    );
  }
}
