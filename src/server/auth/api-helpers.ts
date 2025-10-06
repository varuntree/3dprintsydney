import type { NextRequest } from "next/server";
import { requireUser } from "@/server/auth/session";
import type { User } from "@prisma/client";

/**
 * API Route helper: Require authenticated user of any role
 * Throws 401 if not authenticated
 */
export async function requireAuthAPI(req: NextRequest): Promise<User> {
  return await requireUser(req);
}

/**
 * API Route helper: Require ADMIN role
 * Throws 401 if not authenticated, 403 if not admin
 */
export async function requireAdminAPI(req: NextRequest): Promise<User> {
  const user = await requireUser(req);
  if (user.role !== "ADMIN") {
    throw Object.assign(new Error("Forbidden: Admin access required"), { status: 403 });
  }
  return user;
}

/**
 * API Route helper: Require CLIENT role
 * Throws 401 if not authenticated, 403 if not client
 */
export async function requireClientAPI(req: NextRequest): Promise<User> {
  const user = await requireUser(req);
  if (user.role !== "CLIENT") {
    throw Object.assign(new Error("Forbidden: Client access required"), { status: 403 });
  }
  return user;
}

/**
 * API Route helper: Require CLIENT role with clientId
 * Throws 401 if not authenticated, 403 if not client or missing clientId
 */
export async function requireClientWithIdAPI(req: NextRequest): Promise<User & { clientId: number }> {
  const user = await requireClientAPI(req);
  if (!user.clientId) {
    throw Object.assign(new Error("Forbidden: Client ID not found"), { status: 403 });
  }
  return user as User & { clientId: number };
}

/**
 * API Route helper: Get user info or return null (optional auth)
 * Useful for endpoints that support both authenticated and public access
 */
export async function getOptionalUserAPI(req: NextRequest): Promise<User | null> {
  try {
    return await requireUser(req);
  } catch {
    return null;
  }
}
