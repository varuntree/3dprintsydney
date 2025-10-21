import type { NextRequest } from "next/server";
import { requireUser } from "@/server/auth/session";
import type { LegacyUser } from "@/lib/types/user";
import { ForbiddenError } from "@/lib/errors";

/**
 * API Route helper: Require authenticated user of any role
 * Throws 401 if not authenticated
 */
export async function requireAuth(req: NextRequest): Promise<LegacyUser> {
  return await requireUser(req);
}

/**
 * API Route helper: Require ADMIN role
 * Throws 401 if not authenticated, 403 if not admin
 */
export async function requireAdmin(req: NextRequest): Promise<LegacyUser> {
  const user = await requireUser(req);
  if (user.role !== "ADMIN") {
    throw new ForbiddenError("Admin access required");
  }
  return user;
}

/**
 * API Route helper: Require CLIENT role
 * Throws 401 if not authenticated, 403 if not client
 */
export async function requireClient(req: NextRequest): Promise<LegacyUser> {
  const user = await requireUser(req);
  if (user.role !== "CLIENT") {
    throw new ForbiddenError("Client access required");
  }
  return user;
}

/**
 * API Route helper: Require CLIENT role with clientId
 * Throws 401 if not authenticated, 403 if not client or missing clientId
 */
export async function requireClientWithId(req: NextRequest): Promise<LegacyUser & { clientId: number }> {
  const user = await requireClient(req);
  if (!user.clientId) {
    throw new ForbiddenError("Client ID not found");
  }
  return user as LegacyUser & { clientId: number };
}

/**
 * API Route helper: Get user info or return null (optional auth)
 * Useful for endpoints that support both authenticated and public access
 */
export async function getAuthUser(req: NextRequest): Promise<LegacyUser | null> {
  try {
    return await requireUser(req);
  } catch {
    return null;
  }
}

