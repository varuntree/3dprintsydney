import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";
import { getServiceSupabase } from "@/server/supabase/service-client";
import type { LegacyUser } from "@/lib/types/user";
import { logger } from "@/lib/logger";
import { UnauthorizedError, ForbiddenError, AppError } from "@/lib/errors";

const ACCESS_COOKIE = "sb:token";

function createAuthClient() {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
    },
  });
}

async function loadLegacyUser(authUserId: string): Promise<LegacyUser | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, role, client_id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw new AppError(`Failed to load user profile: ${error.message}`, 'USER_PROFILE_ERROR', 500);
  }
  if (!data) return null;

  return {
    id: data.id,
    email: data.email,
    role: data.role,
    clientId: data.client_id,
    name: null,
    phone: null,
  };
}

async function getAuthUserFromToken(token: string | undefined) {
  if (!token) return null;
  const supabase = createAuthClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error) {
    logger.warn({ scope: "auth.session", message: "Failed to fetch auth user", error });
    return null;
  }
  return user;
}

export async function getUserFromRequest(req: NextRequest): Promise<LegacyUser | null> {
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  const authUser = await getAuthUserFromToken(token);
  if (!authUser) return null;
  return loadLegacyUser(authUser.id);
}

export async function requireUser(req: NextRequest): Promise<LegacyUser> {
  const user = await getUserFromRequest(req);
  if (!user) throw new UnauthorizedError();
  return user;
}


export async function getUserFromCookies(): Promise<LegacyUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  const authUser = await getAuthUserFromToken(token);
  if (!authUser) return null;
  return loadLegacyUser(authUser.id);
}
