import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';

/**
 * Next.js Middleware for route-level authentication
 * Runs on ALL routes before the page is rendered
 * 
 * This is the FIRST line of defense - it prevents unauthorized access
 * at the edge before any page code executes.
 */

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',              // Landing page
  '/login',         // Login page
  '/register',      // Registration page (invite token validated server-side)
  '/verify',        // Public verification portal
  '/unauthorized',  // Access denied page
  '/api/auth/nonce',       // Wallet nonce generation
  '/api/auth/login',       // Login endpoint
  '/api/auth/register',    // Registration endpoint
  '/api/auth/verify',      // Auth verification
  '/api/verify/asset',     // Public asset verification
  '/api/verify/document',  // Public document verification
  '/api/verify/transaction', // Public transaction verification
  '/api/verify/credential',  // Public credential verification
  '/api/health',           // Health check endpoint
];

// Route patterns that require authentication
const PROTECTED_PATTERNS = [
  '/dashboard',     // All dashboard routes
  '/api/access',    // Access control APIs
  '/api/approvals', // Approval workflow APIs
  '/api/audit',     // Audit APIs
  '/api/credentials', // Credential management
  '/api/did',       // DID resolution
  '/api/gas',       // Gas management
  '/api/incidents', // Incident management
  '/api/invite-tokens', // Invite token management
  '/api/rate-limit', // Rate limit management
  '/api/scheduler', // Scheduler management
  '/api/security-posture', // Security APIs
  '/api/security',  // Security analysis
  '/api/stats',     // Statistics
  '/api/upload',    // Upload endpoints
];

/**
 * Check if a route is public (doesn't require authentication)
 */
function isPublicRoute(pathname: string): boolean {
  // Exact match for public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return true;
  }
  
  // Static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('/favicon.ico') ||
    pathname.includes('.') // Files with extensions (images, etc.)
  ) {
    return true;
  }
  
  return false;
}

/**
 * Check if a route requires authentication
 */
function requiresAuth(pathname: string): boolean {
  // Check if route matches any protected pattern
  return PROTECTED_PATTERNS.some(pattern => pathname.startsWith(pattern));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }
  
  // Check if route requires authentication
  if (!requiresAuth(pathname)) {
    // Route not in protected patterns - default to allowing
    // (This allows extensibility for new public routes)
    return NextResponse.next();
  }
  
  // Route requires authentication - verify user session
  try {
    const supabase = createClient(request);
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      // No valid session - redirect to login
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname); // Save intended destination
      return NextResponse.redirect(url);
    }
    
    // User is authenticated - check if they have an active profile with roles
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        id,
        user_roles!inner (
          role_name,
          is_active,
          expires_at
        )
      `)
      .eq('user_id', user.id)
      .single();
    
    if (!profile) {
      // User exists but no profile - redirect to complete registration
      const url = request.nextUrl.clone();
      url.pathname = '/register';
      url.searchParams.set('complete', 'true');
      return NextResponse.redirect(url);
    }
    
    // Check if user has at least one active role
    const hasActiveRole = profile.user_roles.some((ur: any) => 
      ur.is_active && 
      (!ur.expires_at || new Date(ur.expires_at) > new Date())
    );
    
    if (!hasActiveRole) {
      // User has no active roles - redirect to unauthorized
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      url.searchParams.set('reason', 'no_active_roles');
      return NextResponse.redirect(url);
    }
    
    // User is authenticated and has active roles - allow access
    // Note: Page-level RBAC will handle specific role requirements
    return NextResponse.next();
    
  } catch (error) {
    console.error('Middleware auth error:', error);
    
    // On error, redirect to login for safety
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('error', 'auth_check_failed');
    return NextResponse.redirect(url);
  }
}

/**
 * Configure which routes this middleware should run on
 * 
 * This matcher ensures middleware runs on:
 * - All routes except static files
 * - All API routes
 * - All dashboard routes
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
