import { ZodError } from "zod";
import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import { getSettings, updateSettings } from "@/server/services/settings";
import { requireAdmin } from "@/server/auth/api-helpers";
import { settingsInputSchema } from "@/lib/schemas/settings";
import type { NextRequest } from "next/server";

/**
 * GET /api/settings
 * ADMIN ONLY - Application settings contain sensitive configuration
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const settings = await getSettings();
    return okAuth(req, settings);
  } catch (error) {
    return handleErrorAuth(req, error, "settings.fetch");
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
    const validated = settingsInputSchema.parse(payload); // Validate at boundary
    const settings = await updateSettings(validated);
    return okAuth(req, settings);
  } catch (error) {
    if (error instanceof ZodError) {
      return failAuth(req, "VALIDATION_ERROR", "Invalid settings payload", 422, {
        issues: error.issues,
      });
    }
    return handleErrorAuth(req, error, "settings.update");
  }
}
