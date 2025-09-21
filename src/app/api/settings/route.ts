import { ZodError } from "zod";
import { ok, fail, handleError } from "@/server/api/respond";
import { getSettings, updateSettings } from "@/server/services/settings";

export async function GET() {
  try {
    const settings = await getSettings();
    return ok(settings);
  } catch (error) {
    return handleError(error, "settings.fetch");
  }
}

export async function PUT(request: Request) {
  try {
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
