import { redirect } from "next/navigation";
import { getUserFromCookies } from "@/server/auth/session";
import type { LegacyUser } from "@/lib/types/user";

/**
 * Require authenticated user for Server Component (any role)
 *
 * Use this ONLY in Server Components (page.tsx, layout.tsx).
 * For API routes, use requireAuth from @/server/auth/api-helpers instead.
 *
 * This function redirects to /login if not authenticated (does NOT throw errors).
 *
 * @param callbackUrl - Optional URL to redirect back to after login
 * @returns Authenticated user
 * @redirects /login if not authenticated
 *
 * @example
 * // In a page.tsx
 * export default async function AccountPage() {
 *   const user = await requireAuth();
 *   // user is guaranteed to exist here
 *   return <div>Welcome, {user.email}</div>;
 * }
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
 * Require admin role for Server Component
 *
 * Use this ONLY in Server Components (page.tsx, layout.tsx) that require admin access.
 * For API routes, use requireAdmin from @/server/auth/api-helpers instead.
 *
 * This function redirects non-admin users to /client dashboard.
 *
 * @returns Admin user
 * @redirects /login if not authenticated, /client if not admin
 *
 * @example
 * // In an admin layout.tsx
 * export default async function AdminLayout({ children }) {
 *   const admin = await requireAdmin();
 *   // Only admins reach this code
 *   return <AdminShell user={admin}>{children}</AdminShell>;
 * }
 */
export async function requireAdmin(): Promise<LegacyUser> {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    redirect("/client");
  }
  return user;
}

/**
 * Require client role for Server Component
 *
 * Use this ONLY in Server Components (page.tsx, layout.tsx) that require client access.
 * For API routes, use requireClient from @/server/auth/api-helpers instead.
 *
 * This function redirects non-client users to / (admin dashboard).
 *
 * @returns Client user
 * @redirects /login if not authenticated, / if not a client
 *
 * @example
 * // In a client layout.tsx
 * export default async function ClientLayout({ children }) {
 *   const client = await requireClient();
 *   // Only clients reach this code
 *   return <ClientShell user={client}>{children}</ClientShell>;
 * }
 */
export async function requireClient(): Promise<LegacyUser> {
  const user = await requireAuth();
  if (user.role !== "CLIENT") {
    redirect("/");
  }
  return user;
}

/**
 * Require client role with clientId for Server Component
 *
 * Use this ONLY in Server Components that require a client with clientId.
 * For API routes, use requireClientWithId from @/server/auth/api-helpers instead.
 *
 * This ensures the user is a client AND has a clientId set.
 *
 * @returns Client user with clientId guaranteed to exist
 * @throws Error if client is missing clientId (should never happen)
 * @redirects /login if not authenticated, / if not a client
 *
 * @example
 * // In a client-specific page
 * export default async function MyOrdersPage() {
 *   const client = await requireClientWithId();
 *   // client.clientId is guaranteed to be a number
 *   const orders = await getOrdersByClient(client.clientId);
 *   return <OrderList orders={orders} />;
 * }
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
 * Get authenticated user for Server Component (optional auth)
 *
 * Use this ONLY in Server Components that support both authenticated and unauthenticated access.
 * Returns null if not authenticated instead of redirecting.
 *
 * @returns User if authenticated, null otherwise
 *
 * @example
 * // In a public page that customizes for logged-in users
 * export default async function HomePage() {
 *   const user = await getOptionalUser();
 *   if (user) {
 *     return <PersonalizedHome user={user} />;
 *   }
 *   return <PublicHome />;
 * }
 */
export async function getOptionalUser(): Promise<LegacyUser | null> {
  return await getUserFromCookies();
}
