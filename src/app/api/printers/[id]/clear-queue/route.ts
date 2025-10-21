import { ok, fail, handleError } from "@/server/api/respond";
import { requireAdmin } from "@/server/auth/api-helpers";
import { clearPrinterQueue } from "@/server/services/jobs";
import type { NextRequest } from "next/server";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) throw new Error("Invalid printer id");
  return id;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  await requireAdmin(request);
  try {
    const id = await parseId(context.params);
    await clearPrinterQueue(id);
    return ok({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Invalid printer id")) {
      return fail("INVALID_ID", error.message, 400);
    }
    return handleError(error, "printers.clear_queue");
  }
}
