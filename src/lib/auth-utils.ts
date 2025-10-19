import { redirect } from "next/navigation";
import { getUserFromCookies } from "@/server/auth/session";
import type { LegacyUser } from "@/lib/types/user";

/**
 * Server Component helper: Get authenticated user or redirect to login
 * @param callbackUrl - Optional URL to redirect back to after login
 */
export async function requireAuth(callbackUrl?: string): Promise<LegacyUser> {
  const user = await getUserFromCookies();
  if (!user) {
    const loginUrl = callbackUrl
      ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/login";
    redirect(loginUrl);
  }
  return user;
}

/**
 * Server Component helper: Get admin user or redirect to client dashboard
 * Use this in admin-only pages for additional safety
 */
export async function requireAdmin(): Promise<LegacyUser> {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    redirect("/client");
  }
  return user;
}

/**
 * Server Component helper: Get client user or redirect to admin dashboard
 * Use this in client-only pages for additional safety
 */
export async function requireClient(): Promise<LegacyUser> {
  const user = await requireAuth();
  if (user.role !== "CLIENT") {
    redirect("/");
  }
  return user;
}

/**
 * Server Component helper: Get client user with clientId or redirect
 * Use this when you need to ensure the user has a clientId set
 */
export async function requireClientWithId(): Promise<LegacyUser & { clientId: number }> {
  const user = await requireClient();
  if (!user.clientId) {
    // This should never happen for properly set up CLIENT users
    throw new Error("Client user missing clientId");
  }
  return user as LegacyUser & { clientId: number };
}

/**
 * Server Component helper: Get current user without redirecting
 * Returns null if not authenticated - useful for optional auth
 */
export async function getOptionalUser(): Promise<LegacyUser | null> {
  return await getUserFromCookies();
}
