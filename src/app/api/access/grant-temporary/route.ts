/**
 * API Route: Grant Temporary Access
 * POST /api/access/grant-temporary
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  grantTemporaryRole,
  grantTemporaryPermission,
  GrantType,
} from '@/lib/timebound-access-service';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in' },
        { status: 401 }
      );
    }
    
    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only admins can grant temporary access' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { type, targetId, grantType, expiresInHours, reason } = body;
    
    if (!type || !targetId || !grantType || !expiresInHours) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'type, targetId, grantType, and expiresInHours are required' },
        { status: 400 }
      );
    }
    
    let result;
    
    if (type === 'ROLE') {
      result = await grantTemporaryRole({
        profileId: targetId,
        roleName: grantType,
        expiresInHours,
        grantedBy: user.id,
        reason: reason || 'Temporary access granted',
      });
    } else if (type === 'ASSET_PERMISSION') {
      const { assetId, profileId, permissionType } = body;
      
      if (!assetId || !profileId || !permissionType) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'assetId, profileId, and permissionType are required for asset permissions' },
          { status: 400 }
        );
      }
      
      result = await grantTemporaryPermission({
        assetId,
        profileId,
        permissionType,
        expiresInHours,
        grantedBy: user.id,
        reason: reason || 'Temporary permission granted',
      });
    } else {
      return NextResponse.json(
        { error: 'Bad Request', message: 'type must be ROLE or ASSET_PERMISSION' },
        { status: 400 }
      );
    }
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to grant access', message: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      grantId: result.grantId,
      message: 'Temporary access granted successfully',
    });
  } catch (error: any) {
    console.error('Error granting temporary access:', error);
    return NextResponse.json(
      { error: 'Failed to grant access', message: error.message },
      { status: 500 }
    );
  }
}
