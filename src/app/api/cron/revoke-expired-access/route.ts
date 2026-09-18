/**
 * Cron Job: Revoke Expired Access
 * Runs every 15 minutes to auto-revoke expired access grants
 * Route: /api/cron/revoke-expired-access
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkExpiredAccess } from '@/lib/timebound-access-service';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await checkExpiredAccess();
    
    if (!result.success) {
      console.error('Error revoking expired access:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }
    
    console.log(
      `Revoke expired access job: ${result.expiredRoles} roles, ${result.expiredPermissions} permissions, ${result.expiredDelegations} delegations expired`
    );
    
    return NextResponse.json({
      success: true,
      expiredRoles: result.expiredRoles,
      expiredPermissions: result.expiredPermissions,
      expiredDelegations: result.expiredDelegations,
      message: `Expired ${result.expiredRoles + result.expiredPermissions + result.expiredDelegations} access grants`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Revoke expired access job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
