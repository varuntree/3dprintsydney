import type { NextRequest } from "next/server";
import { requireUser } from "@/server/auth/session";
import type { LegacyUser } from "@/lib/types/user";
import { ForbiddenError } from "@/lib/errors";

/**
 * Require authenticated user for API route (any role)
 *
 * Use this in API routes that require authentication but don't care about role.
 * For Server Components (page.tsx, layout.tsx), use the version from @/lib/auth-utils instead.
 *
 * @param req - Next.js request object
 * @returns Authenticated user
 * @throws UnauthorizedError if not authenticated (401)
 *
 * @example
 * export async function GET(req: NextRequest) {
 *   const user = await requireAuth(req);
 *   // user is guaranteed to exist here
 *   return success({ userId: user.id });
 * }
 */
export async function requireAuth(req: NextRequest): Promise<LegacyUser> {
  return await requireUser(req);
}

/**
 * Require admin role for API route
 *
 * Use this in API routes that require admin access only.
 * For Server Components (page.tsx, layout.tsx), use the version from @/lib/auth-utils instead.
 *
 * @param req - Next.js request object
 * @returns Admin user
 * @throws UnauthorizedError if not authenticated (401)
 * @throws ForbiddenError if user is not admin (403)
 *
 * @example
 * export async function DELETE(req: NextRequest) {
 *   const admin = await requireAdmin(req);
 *   // Only admins reach this code
 *   await deleteResource();
 *   return success(null, 204);
 * }
 */
export async function requireAdmin(req: NextRequest): Promise<LegacyUser> {
  const user = await requireUser(req);
  if (user.role !== "ADMIN") {
    throw new ForbiddenError("Admin access required");
  }
  return user;
}

/**
 * Require client role for API route
 *
 * Use this in API routes that require client access only.
 * For Server Components (page.tsx, layout.tsx), use the version from @/lib/auth-utils instead.
 *
 * @param req - Next.js request object
 * @returns Client user
 * @throws UnauthorizedError if not authenticated (401)
 * @throws ForbiddenError if user is not a client (403)
 *
 * @example
 * export async function GET(req: NextRequest) {
 *   const client = await requireClient(req);
 *   // Only clients reach this code
 *   const data = await getClientData(client.id);
 *   return success(data);
 * }
 */
export async function requireClient(req: NextRequest): Promise<LegacyUser> {
  const user = await requireUser(req);
  if (user.role !== "CLIENT") {
    throw new ForbiddenError("Client access required");
  }
  return user;
}

/**
 * Require client role with clientId for API route
 *
 * Use this in API routes that require a client user with an associated clientId.
 * This ensures the user is a client AND has a clientId set.
 *
 * @param req - Next.js request object
 * @returns Client user with clientId guaranteed to exist
 * @throws UnauthorizedError if not authenticated (401)
 * @throws ForbiddenError if not a client or missing clientId (403)
 *
 * @example
 * export async function GET(req: NextRequest) {
 *   const client = await requireClientWithId(req);
 *   // client.clientId is guaranteed to be a number
 *   const invoices = await getInvoicesByClient(client.clientId);
 *   return success(invoices);
 * }
 */
export async function requireClientWithId(req: NextRequest): Promise<LegacyUser & { clientId: number }> {
  const user = await requireClient(req);
  if (!user.clientId) {
    throw new ForbiddenError("Client ID not found");
  }
  return user as LegacyUser & { clientId: number };
}

/**
 * Get authenticated user for API route (optional auth)
 *
 * Use this in API routes that support both authenticated and public access.
 * Returns null if not authenticated instead of throwing an error.
 *
 * @param req - Next.js request object
 * @returns User if authenticated, null otherwise
 *
 * @example
 * export async function GET(req: NextRequest) {
 *   const user = await getAuthUser(req);
 *   if (user) {
 *     // Personalized response for authenticated users
 *     return success({ data: getPersonalizedData(user) });
 *   }
 *   // Public response for unauthenticated users
 *   return success({ data: getPublicData() });
 * }
 */
export async function getAuthUser(req: NextRequest): Promise<LegacyUser | null> {
  try {
    return await requireUser(req);
  } catch {
    return null;
  }
}

