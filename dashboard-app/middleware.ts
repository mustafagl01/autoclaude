/**
 * Next.js Middleware
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * Protects dashboard routes by verifying authentication status.
 * Redirects unauthenticated users to the login page.
 *
 * Middleware runs before requests complete and can modify responses.
 * This middleware uses NextAuth.js to validate sessions.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 * @see https://next-auth.js.org/configuration/nextjs#middleware
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Extended session type with database user ID
 * Matches the AuthSession interface defined in the NextAuth route
 */
interface AuthSession {
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
  expires: string;
}

// ============================================================================
// Middleware Configuration
// ============================================================================

/**
 * Routes that require authentication
 * Any route starting with these paths will be protected
 */
const PROTECTED_ROUTES = ['/dashboard'];

/**
 * Routes that should always be accessible (public routes)
 * Users won't be redirected away from these routes
 */
const PUBLIC_ROUTES = ['/', '/login', '/api/auth'];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a path matches a protected route pattern
 *
 * @param pathname - The URL pathname to check
 * @returns true if the path should be protected
 *
 * @example
 * isProtectedRoute('/dashboard') // true
 * isProtectedRoute('/dashboard/calls') // true
 * isProtectedRoute('/login') // false
 * isProtectedRoute('/api/retell/calls') // false
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if a path is a public route that doesn't need authentication
 *
 * @param pathname - The URL pathname to check
 * @returns true if the path is public
 *
 * @example
 * isPublicRoute('/') // true
 * isPublicRoute('/login') // true
 * isPublicRoute('/dashboard') // false
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

// ============================================================================
// Middleware Handler
// ============================================================================

/**
 * Next.js middleware function
 *
 * This function runs on every request before it reaches the route handler.
 * It checks if the user is authenticated and redirects unauthenticated users
 * away from protected routes.
 *
 * Authentication flow:
 * 1. Extract session token from request cookies
 * 2. Validate session with NextAuth
 * 3. If authenticated and accessing protected route → allow
 * 4. If authenticated and accessing login page → redirect to dashboard
 * 5. If unauthenticated and accessing protected route → redirect to login
 * 6. If unauthenticated and accessing public route → allow
 *
 * @param request - Next.js Request object
 * @returns Next.js Response (either original or redirect)
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Same secret as NextAuth route (fallback so Edge and API sign/decode the same JWT)
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'mgl-fallback-secret-12345';
  // In production (HTTPS) NextAuth uses __Secure-authjs.session-token; getToken must look for it
  const secureCookie = request.nextUrl.protocol === 'https:';

  // Allow public routes to pass through
  if (isPublicRoute(pathname)) {
    // If user is already authenticated and on login page, redirect to dashboard
    if (pathname === '/login') {
      try {
        const token = await getToken({
          req: request,
          secret,
          secureCookie,
        });

        if (token) {
          const url = request.nextUrl.clone();
          url.pathname = '/dashboard';
          return NextResponse.redirect(url);
        }
      } catch {
        // If token validation fails, continue to login page
      }
    }

    return NextResponse.next();
  }

  // Check if the route is protected
  if (isProtectedRoute(pathname)) {
    try {
      const token = await getToken({
        req: request,
        secret,
        secureCookie,
      });

      if (!token) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(url);
      }

      return NextResponse.next();
    } catch {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
  }

  // Allow all other routes to pass through
  return NextResponse.next();
}

// ============================================================================
// Middleware Configuration
// ============================================================================

/**
 * Configure which routes the middleware should run on
 *
 * This matcher determines which paths trigger the middleware.
 * We exclude static files, images, and API routes that don't need auth.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
 */
export const config = {
  /**
   * Matcher for routes to protect
   *
   * Patterns:
   * - /dashboard: Protect all dashboard routes
   * - /((?!api|_next/static|_next/image|favicon.ico).)*: Match all routes except exclusions
   *
   * Exclusions:
   * - api/auth: NextAuth API routes (public)
   * - _next/static: Next.js static files
   * - _next/image: Next.js image optimization
   * - favicon.ico: Favicon
   * - Public assets: Images, fonts, etc.
   */
  matcher: [
    /*
     * Match all pathnames except for:
     * - api/auth: NextAuth authentication endpoints
     * - _next/static: Static files
     * - _next/image: Image optimization files
     * - favicon.ico: Favicon file
     * - Public folder: Public assets (images, fonts, etc.)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
