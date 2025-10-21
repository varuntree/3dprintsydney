import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/session";
import { getServiceSupabase } from "@/server/supabase/service-client";
import { logger } from "@/lib/logger";
import { ok, fail, handleError } from "@/server/api/respond";
import { AppError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const supabase = getServiceSupabase();
    const { data: users, error } = await supabase
      .from("users")
      .select("id, email, role, client_id, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      throw new AppError(`Failed to load users: ${error.message}`, 'USER_LOAD_ERROR', 500);
    }

    const userIds = (users ?? []).map((user) => user.id);
    const messageCounts = new Map<number, number>();
    await Promise.all(
      userIds.map(async (id) => {
        const { count, error: countError } = await supabase
          .from("user_messages")
          .select("id", { count: "exact", head: true })
          .eq("user_id", id);
        if (countError) {
          throw new AppError(`Failed to count messages for user ${id}: ${countError.message}`, 'USER_LOAD_ERROR', 500);
        }
        messageCounts.set(id, count ?? 0);
      }),
    );

    return ok((users ?? []).map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      clientId: u.client_id,
      createdAt: u.created_at,
      messageCount: messageCounts.get(u.id) ?? 0,
    })));
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

    const supabase = getServiceSupabase();

    const { data: existingUser, error: existsError } = await supabase
      .from("users")
      .select("id")
      .eq("email", payload.email)
      .maybeSingle();
    if (existsError) {
      throw new AppError(`Failed to check user: ${existsError.message}`, 'USER_CREATE_ERROR', 500);
    }
    if (existingUser) {
      return fail("USER_EXISTS", "User already exists", 409);
    }

    if (payload.role === "CLIENT" && !payload.clientId) {
      return fail("VALIDATION_ERROR", "clientId required for client role", 422);
    }

    if (payload.clientId) {
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id")
        .eq("id", payload.clientId)
        .maybeSingle();
      if (clientError) {
        throw new AppError(`Failed to verify client: ${clientError.message}`, 'USER_CREATE_ERROR', 500);
      }
      if (!client) {
        return fail("CLIENT_NOT_FOUND", "Client not found", 404);
      }
    }

    const temporaryPassword = randomBytes(12).toString("base64url").slice(0, 16);

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: payload.email,
      password: temporaryPassword,
      email_confirm: true,
    });
    if (authError || !authUser.user) {
      throw new AppError(authError?.message ?? "Failed to create auth user", 'USER_CREATE_ERROR', 500);
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .insert({
        auth_user_id: authUser.user.id,
        email: payload.email,
        role: payload.role,
        client_id: payload.role === "CLIENT" ? payload.clientId ?? null : null,
      })
      .select("id, email, role, client_id, created_at")
      .single();

    if (profileError || !profile) {
      await supabase.auth.admin.deleteUser(authUser.user.id).catch((error) => {
        logger.warn({ scope: "admin.users.invite", message: "Rollback auth user failed", error });
      });
      throw new AppError(profileError?.message ?? "Failed to create user profile", 'USER_CREATE_ERROR', 500);
    }

    return ok(
      {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        clientId: profile.client_id,
        createdAt: profile.created_at,
        temporaryPassword,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error, 'admin.users.post');
  }
}
