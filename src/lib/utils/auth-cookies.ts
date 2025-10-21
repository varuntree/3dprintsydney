/**
 * Auth Cookie Utilities
 * Helper functions for managing authentication cookies
 */

/**
 * Cookie options for auth tokens
 */
export type CookieOptions = {
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  secure: boolean;
  path: string;
  expires?: Date;
};

/**
 * Calculate cookie expiration date from Unix timestamp
 * @param expiresAt - Unix timestamp (seconds since epoch)
 * @returns Date object for cookie expiration
 */
export function calculateCookieExpiration(expiresAt: number): Date {
  return new Date(expiresAt * 1000);
}

/**
 * Build cookie options for auth tokens
 * @param expiresAt - Optional Unix timestamp for cookie expiration
 * @returns Cookie options object
 */
export function buildAuthCookieOptions(expiresAt?: number): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt ? calculateCookieExpiration(expiresAt) : undefined,
  };
}
