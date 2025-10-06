import { ZodError } from "zod";
import { ok, fail, handleError } from "@/server/api/respond";
import { getSettings, updateSettings } from "@/server/services/settings";
import { requireAdmin } from "@/server/auth/session";
import type { NextRequest } from "next/server";

/**
 * GET /api/settings
 * ADMIN ONLY - Application settings contain sensitive configuration
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const settings = await getSettings();
    return ok(settings);
  } catch (error) {
    return handleError(error, "settings.fetch");
  }
}

/**
 * PUT /api/settings
 * ADMIN ONLY - Only admins can modify application settings
 */
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request);
    const payload = await request.json();
    const settings = await updateSettings(payload);
    return ok(settings);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", "Invalid settings payload", 422, {
        issues: error.issues,
      });
    }
    return handleError(error, "settings.update");
  }
}
