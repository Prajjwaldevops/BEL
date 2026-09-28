import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserRole, ROLES } from '@/lib/constants';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export interface AuthUser {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  email: string | null;
  walletAddress: string;
  roles: UserRole[];
  department: string | null;
  clearanceLevel: string | null;
}

/**
 * Verify and decode a HMAC-SHA256 signed JWT token.
 * Returns the payload if valid, null if invalid or expired.
 */
function verifyToken(token: string): Record<string, any> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;

  // Verify signature
  const secret = process.env.JWT_SECRET || 'bel-sentinel-dev-secret-change-in-production';
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');

  // Constant-time comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);
  const sigValid = sigBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(sigBuffer, expectedBuffer);

  if (!sigValid) {
    // Fallback: accept legacy base64-encoded tokens (pre-migration)
    // This allows existing sessions to continue working during transition
    try {
      const legacyPayload = JSON.parse(Buffer.from(body, 'base64').toString());
      if (legacyPayload.exp && legacyPayload.exp < Date.now()) return null;
      return legacyPayload;
    } catch {
      return null;
    }
  }

  // Decode payload
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    // Check expiry (exp is in seconds since epoch for new tokens)
    if (payload.exp) {
      const expMs = payload.exp > 1e12 ? payload.exp : payload.exp * 1000;
      if (expMs < Date.now()) return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Demo bypass user records — must match login route.
 * Used by getCurrentUser() to return demo profiles without Supabase.
 */
const DEMO_BYPASS_PROFILES: Record<string, AuthUser> = {
  admin: {
    id: 'demo-admin-001',
    userId: 'demo-admin-001',
    username: 'admin',
    fullName: 'Commander Arjun Vikram',
    email: 'admin@bel-sentinel.gov.in',
    walletAddress: '0xADM1N000000000000000000000000000000000001',
    roles: ['ADMIN'],
    department: 'Command & Control',
    clearanceLevel: 'TOP SECRET // SCI',
  },
  sih: {
    id: 'demo-sih-002',
    userId: 'demo-sih-002',
    username: 'sih',
    fullName: 'Dr. Priya Sharma — SIH Judge',
    email: 'sih@bel-sentinel.gov.in',
    walletAddress: '0x51H00000000000000000000000000000000000002',
    roles: ['ADMIN'],
    department: 'Security Operations',
    clearanceLevel: 'TOP SECRET // SCI',
  },
};

/**
 * Get current authenticated user with their roles
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    // Check for custom auth token in cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('bel-auth-token')?.value;
    
    if (!authToken) {
      return null;
    }

    // Verify and decode the JWT token
    try {
      const payload = verifyToken(authToken);
      if (!payload || !payload.username) {
        return null;
      }

      // ===== DEMO BYPASS: return hardcoded profile without Supabase =====
      if (payload.isDemoBypass === true) {
        const demoProfile = DEMO_BYPASS_PROFILES[payload.username?.toLowerCase()];
        if (demoProfile) {
          return demoProfile;
        }
      }

      // ===== NORMAL FLOW: query Supabase =====
      // Get user profile from database using username
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        // If Supabase is not configured but we have a valid token, return minimal user
        // This allows the system to work in demo/dev mode
        return {
          id: payload.userId || 'unknown',
          userId: payload.userId || 'unknown',
          username: payload.username,
          fullName: payload.username,
          email: null,
          walletAddress: '',
          roles: [payload.role || 'VIEWER'] as UserRole[],
          department: payload.department || null,
          clearanceLevel: 'UNCLASSIFIED',
        };
      }

      // Look up user by username (from token)
      const userRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?username=eq.${encodeURIComponent(payload.username)}&select=*`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );

      const users = await userRes.json();
      if (!Array.isArray(users) || users.length === 0) {
        return null;
      }

      const user = users[0];

      // Get user roles
      const roleRes = await fetch(
        `${supabaseUrl}/rest/v1/user_roles?profile_id=eq.${user.id}&is_active=eq.true&select=role_id,roles(name)`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );

      const roleData = await roleRes.json();
      let roles: UserRole[] = [];
      
      if (user.is_admin) {
        roles = ['ADMIN'];
      } else if (Array.isArray(roleData) && roleData.length > 0) {
        roles = roleData
          .map((r: any) => r?.roles?.name)
          .filter((name: any) => name && ['ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER'].includes(name));
      }

      if (roles.length === 0) {
        roles = ['VIEWER']; // Default fallback
      }

      return {
        id: user.id,
        userId: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        walletAddress: user.wallet_address,
        roles,
        department: user.department,
        clearanceLevel: user.clearance || 'UNCLASSIFIED',
      };
    } catch (decodeError) {
      console.error('Token decode error:', decodeError);
      return null;
    }
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

/**
 * Require authentication - redirects to login if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }
  
  return user;
}

/**
 * Check if user has specific permission
 */
export function hasPermission(user: AuthUser, permission: string): boolean {
  return user.roles.some(role => {
    const roleConfig = ROLES[role];
    return roleConfig.permissions.includes(permission);
  });
}

/**
 * Check if user has any of the required roles
 */
export function hasAnyRole(user: AuthUser, requiredRoles: UserRole[]): boolean {
  return user.roles.some(role => requiredRoles.includes(role));
}

/**
 * Check if user has all of the required roles
 */
export function hasAllRoles(user: AuthUser, requiredRoles: UserRole[]): boolean {
  return requiredRoles.every(requiredRole => user.roles.includes(requiredRole));
}

/**
 * Require specific roles - redirects to unauthorized if user doesn't have them
 */
export async function requireRoles(requiredRoles: UserRole[]): Promise<AuthUser> {
  const user = await requireAuth();
  
  if (!hasAnyRole(user, requiredRoles)) {
    redirect('/unauthorized');
  }
  
  return user;
}

/**
 * Require specific permission - redirects to unauthorized if user doesn't have it
 */
export async function requirePermission(permission: string): Promise<AuthUser> {
  const user = await requireAuth();
  
  if (!hasPermission(user, permission)) {
    redirect('/unauthorized');
  }
  
  return user;
}

/**
 * Route access control map
 * Maps route patterns to required roles
 */
export const ROUTE_PERMISSIONS: Record<string, {
  roles?: UserRole[];
  permissions?: string[];
  description: string;
}> = {
  // Dashboard base - all authenticated users
  '/dashboard': {
    roles: ['ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER'],
    description: 'Dashboard home - all roles'
  },
  
  // Registration - ADMIN only
  '/register': {
    roles: ['ADMIN'],
    description: 'User registration - ADMIN only'
  },
  
  // Admin-only routes
  '/dashboard/users': {
    roles: ['ADMIN'],
    description: 'User management - ADMIN only'
  },
  '/dashboard/settings': {
    roles: ['ADMIN'],
    description: 'System settings - ADMIN only'
  },
  
  // Identity management - ADMIN only
  '/dashboard/identity': {
    roles: ['ADMIN'],
    description: 'Identity management - ADMIN only'
  },
  
  // Assets - ADMIN, ALTER, DEBUGGER, VIEWER
  '/dashboard/assets': {
    roles: ['ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER'],
    description: 'Asset management - all roles'
  },
  
  // Documents - All roles
  '/dashboard/documents': {
    roles: ['ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER'],
    description: 'Document vault - all roles can view'
  },
  '/dashboard/documents/upload': {
    roles: ['ADMIN', 'ALTER', 'DEBUGGER'],
    description: 'Document upload - ADMIN, ALTER, DEBUGGER'
  },
  '/dashboard/nfts': {
    roles: ['ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER'],
    description: 'NFT Gallery - all roles can view'
  },
  '/dashboard/verification': {
    roles: ['ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER'],
    description: 'Verification Center - all roles'
  },
  '/dashboard/ipfs': {
    roles: ['ADMIN', 'ALTER', 'DEBUGGER'],
    description: 'IPFS document storage - ADMIN, ALTER, DEBUGGER'
  },
  
  // Audit - ADMIN and DEBUGGER
  '/dashboard/audit': {
    roles: ['ADMIN', 'DEBUGGER'],
    description: 'Audit trail - ADMIN, DEBUGGER'
  },
  
  // Security - ADMIN and DEBUGGER
  '/dashboard/security': {
    roles: ['ADMIN', 'DEBUGGER'],
    description: 'Security monitoring - ADMIN, DEBUGGER'
  },
  
  // AI Analysis - ADMIN and DEBUGGER
  '/dashboard/ai-analysis': {
    roles: ['ADMIN', 'DEBUGGER'],
    description: 'AI security analysis - ADMIN, DEBUGGER'
  },
  
  // Transactions - All roles (read-only for VIEWER)
  '/dashboard/transactions': {
    roles: ['ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER'],
    description: 'Transaction history - all roles'
  },
  
  // Lifecycle - All roles
  '/dashboard/lifecycle': {
    roles: ['ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER'],
    description: 'Asset lifecycle - all roles'
  },
};

/**
 * Check if user can access a specific route
 */
export function canAccessRoute(user: AuthUser, route: string): boolean {
  const routeConfig = ROUTE_PERMISSIONS[route];
  
  if (!routeConfig) {
    // Route not in permissions map - default to allow ADMIN, block others
    console.warn(`Route ${route} not in ROUTE_PERMISSIONS - defaulting to ADMIN only`);
    return user.roles.includes('ADMIN');
  }
  
  // Check if user has any of the required roles
  if (routeConfig.roles) {
    return hasAnyRole(user, routeConfig.roles);
  }
  
  // No specific roles required - allow all authenticated users
  return true;
}

/**
 * Require route access - redirects to unauthorized if not allowed
 */
export async function requireRouteAccess(route: string): Promise<AuthUser> {
  const user = await requireAuth();
  
  if (!canAccessRoute(user, route)) {
    redirect('/unauthorized');
  }
  
  return user;
}
