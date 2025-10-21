import type { LegacyUser } from '@/lib/types/user';

/**
 * Determine message sender type based on user role
 *
 * Use this instead of inline role checks when determining sender type for messages.
 *
 * @param user - Authenticated user
 * @returns "ADMIN" if user is admin, "CLIENT" otherwise
 *
 * @example
 * const user = await requireAuth(req);
 * const sender = getSenderType(user);
 * await createMessage({ sender, content, ... });
 */
export function getSenderType(user: LegacyUser): 'ADMIN' | 'CLIENT' {
  return user.role === 'ADMIN' ? 'ADMIN' : 'CLIENT';
}
