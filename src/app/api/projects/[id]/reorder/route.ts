import { NextRequest } from "next/server";
import { requireClientWithId } from "@/server/auth/api-helpers";
import { okAuth, handleErrorAuth } from "@/server/api/respond";
import { reorderProject } from "@/server/services/project-reorder";
import { AppError } from "@/lib/errors";

async function parseId(paramsPromise: Promise<{ id: string }>) {
  const { id: raw } = await paramsPromise;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new AppError("Invalid project id", "INVALID_ID", 400);
  }
  return parsed;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireClientWithId(request);
    const projectId = await parseId(context.params);
    const quote = await reorderProject(projectId, user.clientId);
    return okAuth(request, {
      quoteId: quote.id,
      message: "Project reordered successfully",
    });
  } catch (error) {
    return handleErrorAuth(request, error, "projects.reorder");
  }
}
