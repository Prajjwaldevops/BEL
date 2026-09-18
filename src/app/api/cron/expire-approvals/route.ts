/**
 * Cron Job: Expire Old Approval Requests
 * Runs every hour to expire pending approvals past their expiry time
 * Route: /api/cron/expire-approvals
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const supabase = createClient();
    
    // Call expire function
    const { data, error } = await supabase.rpc('expire_old_approvals');
    
    if (error) {
      console.error('Error expiring approvals:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }
    
    const expiredCount = data || 0;
    
    console.log(`Expire approvals job: Expired ${expiredCount} pending approvals`);
    
    return NextResponse.json({
      success: true,
      expiredCount,
      message: `Expired ${expiredCount} pending approvals`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Expire approvals job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
