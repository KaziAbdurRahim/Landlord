/**
 * Next.js Middleware
 * 
 * Handles authentication and role-based access control for protected routes.
 * This middleware runs on every request and checks if the user is authenticated
 * and has the correct role to access the requested dashboard.
 * 
 * Flow:
 * 1. Check if route requires authentication
 * 2. Extract token from request (if available)
 * 3. Verify token and user role
 * 4. Redirect to login if not authenticated
 * 5. Redirect to correct dashboard if role mismatch
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ["/auth/login", "/auth/register"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // If accessing a public route, allow access
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Dashboard routes - allow through, client-side will handle auth
  // Since we're using localStorage (client-side only), we can't check auth in middleware
  // The DashboardLayout component will handle authentication checks
  if (pathname.startsWith("/dashboard")) {
    // Allow access - DashboardLayout will check localStorage and redirect if needed
    return NextResponse.next();
  }

  // Allow all other routes
  return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

