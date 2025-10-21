import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/api-helpers";
import { listUsers, createAdminUser } from "@/server/services/users";
import { ok, fail, handleError } from "@/server/api/respond";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const users = await listUsers();
    return ok(users);
  } catch (error) {
    return handleError(error, 'admin.users.get');
  }
}

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "CLIENT"]).default("CLIENT"),
  clientId: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const payload = inviteSchema.parse(await req.json());

    if (payload.role === "CLIENT" && !payload.clientId) {
      return fail("VALIDATION_ERROR", "clientId required for client role", 422);
    }

    const user = await createAdminUser({
      email: payload.email,
      role: payload.role,
      clientId: payload.clientId,
    });

    return ok(user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("VALIDATION_ERROR", "Invalid request data", 422, { issues: error.issues });
    }
    return handleError(error, 'admin.users.post');
  }
}
