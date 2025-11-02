import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, type Session } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";
import { getServiceSupabase } from "@/server/supabase/service-client";
import type { LegacyUser } from "@/lib/types/user";
import { resolveStudentDiscount } from "@/lib/student-discount";
import { logger } from "@/lib/logger";
import { UnauthorizedError, AppError } from "@/lib/errors";
import { buildAuthCookieOptions, type CookieOptions } from "@/lib/utils/auth-cookies";

const ACCESS_COOKIE = "sb:token";
const REFRESH_COOKIE = "sb:refresh-token";

const pendingSessions = new WeakMap<NextRequest, Session>();

function storePendingSession(req: NextRequest, session: Session | null) {
  if (!session) return;
  pendingSessions.set(req, session);
}

type CookieStore = {
  set(name: string, value: string, options?: CookieOptions): void;
  get(name: string): { value: string } | undefined;
};

function applySessionCookies(target: CookieStore, session: Session) {
  try {
    target.set(ACCESS_COOKIE, session.access_token, buildAuthCookieOptions(session.expires_at ?? undefined));
    if (session.refresh_token) {
      target.set(REFRESH_COOKIE, session.refresh_token, buildAuthCookieOptions());
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Cookies can only be modified")) {
      return;
    }
    logger.warn({
      scope: "auth.session",
      message: "Unable to apply session cookies in current context",
      error,
    });
  }
}

function clearSessionCookies(target: CookieStore) {
  const expired = buildAuthCookieOptions();
  expired.expires = new Date(0);
  try {
    target.set(ACCESS_COOKIE, "", expired);
    target.set(REFRESH_COOKIE, "", expired);
  } catch (error) {
    logger.warn({
      scope: "auth.session",
      message: "Unable to clear session cookies in current context",
      error,
    });
  }
}

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
    .select("id, email, role, client_id, clients(email)")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw new AppError(`Failed to load user profile: ${error.message}`, 'USER_PROFILE_ERROR', 500);
  }
  if (!data) return null;

  const discountSource = data.client_id ? (data.clients as { email?: string } | null) : null;
  const discount = resolveStudentDiscount(discountSource?.email ?? data.email ?? null);

  return {
    id: data.id,
    email: data.email,
    role: data.role,
    clientId: data.client_id,
    name: null,
    phone: null,
    studentDiscountEligible: discount.eligible,
    studentDiscountRate: discount.rate,
  };
}

async function getAuthUserFromTokens(accessToken?: string, refreshToken?: string) {
  if (!accessToken && !refreshToken) {
    return { user: null, session: null as Session | null };
  }

  const supabase = createAuthClient();

  if (accessToken) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);
    if (!error && user) {
      return { user, session: null as Session | null };
    }
    if (error) {
      logger.warn({ scope: "auth.session", message: "Failed to fetch auth user", error });
    }
  }

  if (!refreshToken) {
    return { user: null, session: null as Session | null };
  }

  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (refreshError || !refreshData?.session) {
    if (refreshError) {
      logger.warn({ scope: "auth.session", message: "Failed to refresh session", error: refreshError });
    }
    return { user: null, session: null as Session | null };
  }

  const refreshedUser = refreshData.session.user ?? refreshData.user ?? null;
  return { user: refreshedUser, session: refreshData.session };
}

/**
 * Get authenticated user from NextRequest (internal helper)
 *
 * **Internal use only** - Prefer using helpers from @/server/auth/api-helpers instead.
 * This is a low-level function that extracts and validates the user from request cookies.
 *
 * @internal
 * @param req - Next.js request object
 * @returns User if authenticated, null otherwise
 */
export async function getUserFromRequest(req: NextRequest): Promise<LegacyUser | null> {
  const cookieStore = req.cookies as CookieStore;
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  const { user: authUser, session } = await getAuthUserFromTokens(accessToken, refreshToken);

  if (!authUser) {
    if (accessToken || refreshToken) {
      clearSessionCookies(cookieStore);
    }
    pendingSessions.delete(req);
    return null;
  }

  if (session) {
    applySessionCookies(cookieStore, session);
    storePendingSession(req, session);
  }

  return loadLegacyUser(authUser.id);
}

/**
 * Require authenticated user from NextRequest (internal helper)
 *
 * **Internal use only** - Prefer using requireAuth from @/server/auth/api-helpers instead.
 * This is a low-level function that throws UnauthorizedError if not authenticated.
 *
 * @internal
 * @param req - Next.js request object
 * @returns Authenticated user
 * @throws UnauthorizedError if not authenticated (401)
 */
export async function requireUser(req: NextRequest): Promise<LegacyUser> {
  const user = await getUserFromRequest(req);
  if (!user) throw new UnauthorizedError();
  return user;
}

/**
 * Get authenticated user from cookies (Server Component helper)
 *
 * **Internal use only** - Prefer using helpers from @/lib/auth-utils for Server Components.
 * This is a low-level function that extracts user from cookies in Server Components.
 *
 * @internal
 * @returns User if authenticated, null otherwise
 */
export async function getUserFromCookies(): Promise<LegacyUser | null> {
  const cookieStore = (await cookies()) as CookieStore;
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  const { user: authUser, session } = await getAuthUserFromTokens(accessToken, refreshToken);

  if (!authUser) {
    if (accessToken || refreshToken) {
      clearSessionCookies(cookieStore);
    }
    return null;
  }

  if (session) {
    applySessionCookies(cookieStore, session);
  }

  return loadLegacyUser(authUser.id);
}

export function attachSessionCookies(
  req: NextRequest,
  response: NextResponse,
): NextResponse {
  const session = pendingSessions.get(req);
  if (!session) {
    return response;
  }
  pendingSessions.delete(req);
  response.cookies.set(
    ACCESS_COOKIE,
    session.access_token,
    buildAuthCookieOptions(session.expires_at ?? undefined),
  );
  if (session.refresh_token) {
    response.cookies.set(
      REFRESH_COOKIE,
      session.refresh_token,
      buildAuthCookieOptions(),
    );
  }
  return response;
}
