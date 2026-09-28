import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserRole, ROLES } from '@/lib/constants';
import { cookies } from 'next/headers';

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
 * Get current authenticated user with their roles
 * Returns null if not authenticated
 * 
 * ⚠️ TEMPORARY: Uses custom token from login API
 * TODO: Migrate to proper Supabase Auth after creating auth.users entries
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    // Check for custom auth token in cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('bel-auth-token')?.value;
    
    if (!authToken) {
      return null;
    }

    // Decode the custom JWT token (format: header.payload.signature)
    try {
      const parts = authToken.split('.');
      if (parts.length !== 3) {
        return null;
      }
      
      const payload = JSON.parse(atob(parts[1]));
      
      // Check if token is expired
      if (payload.exp && payload.exp < Date.now()) {
        return null;
      }

      // Get user profile from database using username
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        return null;
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
  
  // Documents - ADMIN, ALTER, DEBUGGER
  '/dashboard/documents': {
    roles: ['ADMIN', 'VIEWER', 'ALTER', 'DEBUGGER'],
    description: 'Document management - all roles can view'
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
