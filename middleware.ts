import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/server/db/client';

const SESSION_COOKIE = 'session';

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/signup'];

/**
 * Validates session token and returns user data
 * Returns null if session is invalid or expired
 */
async function getUserFromToken(token: string) {
  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            email: true,
            clientId: true
          }
        }
      },
    });

    if (!session) return null;

    // Check expiration
    if (session.expiresAt.getTime() < Date.now()) {
      // Clean up expired session
      await prisma.session.delete({ where: { id: session.id } });
      return null;
    }

    return session.user;
  } catch (error) {
    console.error('[Middleware] Session validation failed:', error);
    return null;
  }
}

/**
 * Next.js middleware for route protection and role-based routing
 * Runs before every request to validate authentication and authorization
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes (login, signup)
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get session token from cookies
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  // No token = redirect to login with callback URL
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Validate session and get user
  const user = await getUserFromToken(token);

  // Invalid/expired session = redirect to login
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Determine if this is a client route
  // Client routes: /client/* and /quick-order
  const isClientRoute = pathname.startsWith('/client') || pathname.startsWith('/quick-order');

  // CLIENT users can ONLY access client routes
  if (user.role === 'CLIENT' && !isClientRoute) {
    return NextResponse.redirect(new URL('/client', request.url));
  }

  // ADMIN users can access everything (both admin and client routes)
  // No additional restrictions needed

  // Redirect authenticated users away from login/signup
  if (pathname === '/login' || pathname === '/signup') {
    const homeUrl = user.role === 'ADMIN' ? '/' : '/client';
    return NextResponse.redirect(new URL(homeUrl, request.url));
  }

  // All checks passed - allow request
  return NextResponse.next();
}

/**
 * Matcher configuration - defines which routes use middleware
 * Excludes: API routes, static files, Next.js internals, public assets
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes - have their own auth)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public files (*.png, *.jpg, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
};
