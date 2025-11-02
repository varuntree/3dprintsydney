import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/api-helpers";
import { listUsers, createAdminUser } from "@/server/services/users";
import { okAuth, failAuth, handleErrorAuth } from "@/server/api/respond";
import { userInviteSchema } from "@/lib/schemas/users";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const users = await listUsers();
    return okAuth(req, users);
  } catch (error) {
    return handleErrorAuth(req, error, 'admin.users.get');
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const payload = userInviteSchema.parse(await req.json());

    if (payload.role === "CLIENT" && !payload.clientId) {
      return failAuth(req, "VALIDATION_ERROR", "clientId required for client role", 422);
    }

    const user = await createAdminUser({
      email: payload.email,
      role: payload.role,
      clientId: payload.clientId,
    });

    return okAuth(req, user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failAuth(req, "VALIDATION_ERROR", "Invalid request data", 422, { issues: error.issues });
    }
    return handleErrorAuth(req, error, 'admin.users.post');
  }
}
