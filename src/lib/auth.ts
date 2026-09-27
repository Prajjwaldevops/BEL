import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserRole, ROLES } from '@/lib/constants';

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
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createClient();
    
    // Check Supabase auth session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return null;
    }

    // Get profile with roles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        user_id,
        username,
        full_name,
        email,
        wallet_address,
        department,
        clearance_level,
        user_roles!inner (
          role_name,
          is_active,
          expires_at
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return null;
    }

    // Extract active roles
    const roles = profile.user_roles
      .filter((ur: any) => 
        ur.is_active && 
        (!ur.expires_at || new Date(ur.expires_at) > new Date())
      )
      .map((ur: any) => ur.role_name as UserRole);

    if (roles.length === 0) {
      return null; // No active roles
    }

    return {
      id: profile.id,
      userId: profile.user_id,
      username: profile.username,
      fullName: profile.full_name,
      email: profile.email,
      walletAddress: profile.wallet_address,
      roles,
      department: profile.department,
      clearanceLevel: profile.clearance_level,
    };
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
    permissions: ['identity:manage'],
    description: 'User registration - ADMIN only'
  },
  
  // Admin-only routes
  '/dashboard/users': {
    roles: ['ADMIN'],
    permissions: ['identity:manage'],
    description: 'User management - ADMIN only'
  },
  '/dashboard/settings': {
    roles: ['ADMIN'],
    permissions: ['system:admin'],
    description: 'System settings - ADMIN only'
  },
  
  // Identity management - ADMIN only
  '/dashboard/identity': {
    roles: ['ADMIN'],
    permissions: ['identity:manage'],
    description: 'Identity management - ADMIN only'
  },
  
  // Assets - ADMIN, ALTER, DEBUGGER
  '/dashboard/assets': {
    roles: ['ADMIN', 'ALTER', 'DEBUGGER'],
    permissions: ['asset:view_department', 'asset:view_all'],
    description: 'Asset management - ADMIN, ALTER, DEBUGGER'
  },
  
  // Documents - All except VIEWER
  '/dashboard/documents': {
    roles: ['ADMIN', 'ALTER', 'DEBUGGER'],
    permissions: ['document:upload'],
    description: 'Document management - ADMIN, ALTER, DEBUGGER'
  },
  '/dashboard/ipfs': {
    roles: ['ADMIN', 'ALTER', 'DEBUGGER'],
    permissions: ['document:upload'],
    description: 'IPFS document storage - ADMIN, ALTER, DEBUGGER'
  },
  
  // Audit - ADMIN and DEBUGGER
  '/dashboard/audit': {
    roles: ['ADMIN', 'DEBUGGER'],
    permissions: ['audit:read', 'audit:view_all'],
    description: 'Audit trail - ADMIN, DEBUGGER'
  },
  
  // Security - ADMIN and DEBUGGER
  '/dashboard/security': {
    roles: ['ADMIN', 'DEBUGGER'],
    permissions: ['security:view'],
    description: 'Security monitoring - ADMIN, DEBUGGER'
  },
  
  // AI Analysis - ADMIN and DEBUGGER
  '/dashboard/ai-analysis': {
    roles: ['ADMIN', 'DEBUGGER'],
    permissions: ['ai_analysis:view'],
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
    // Route not in permissions map - default to ADMIN only for safety
    return user.roles.includes('ADMIN');
  }
  
  // Check roles
  if (routeConfig.roles && !hasAnyRole(user, routeConfig.roles)) {
    return false;
  }
  
  // Check permissions
  if (routeConfig.permissions) {
    const hasRequiredPermission = routeConfig.permissions.some(perm => 
      hasPermission(user, perm)
    );
    if (!hasRequiredPermission) {
      return false;
    }
  }
  
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
