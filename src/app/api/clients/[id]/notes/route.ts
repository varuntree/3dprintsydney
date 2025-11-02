import { ZodError } from "zod";
import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import { addClientNote } from "@/server/services/clients";
import { clientNoteSchema } from "@/lib/schemas/clients";
import { requireAdmin } from "@/server/auth/api-helpers";
import type { NextRequest } from "next/server";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid client id");
  }
  return id;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  await requireAdmin(request);
  try {
    const id = await parseId(context.params);
    const body = await request.json();
    const validated = clientNoteSchema.parse(body);
    const note = await addClientNote(id, validated);
    return okAuth(req, note, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return failAuth(req, "VALIDATION_ERROR", "Invalid note payload", 422, {
        issues: error.issues,
      });
    }
    if (error instanceof Error && error.message === "Invalid client id") {
      return failAuth(req, "INVALID_ID", error.message, 400);
    }
    return handleErrorAuth(req, error, "clients.addNote");
  }
}
