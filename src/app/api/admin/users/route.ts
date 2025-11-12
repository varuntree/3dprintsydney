import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/api-helpers";
import { listUsers, createAdminUser } from "@/server/services/users";
import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import { userInviteSchema } from "@/lib/schemas/users";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const users = await listUsers();
    return okAuth(request, users);
  } catch (error) {
    return handleErrorAuth(request, error, 'admin.users.get');
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const payload = userInviteSchema.parse(await request.json());

    if (payload.role === "CLIENT" && !payload.clientId) {
      return failAuth(request, "VALIDATION_ERROR", "clientId required for client role", 422);
    }

    const user = await createAdminUser({
      email: payload.email,
      role: payload.role,
      clientId: payload.clientId,
    });

    return okAuth(request, user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failAuth(request, "VALIDATION_ERROR", "Invalid request data", 422, { issues: error.issues });
    }
    return handleErrorAuth(request, error, 'admin.users.post');
  }
}
