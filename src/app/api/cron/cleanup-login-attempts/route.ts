/**
 * Cron Job: Cleanup Old Login Attempts
 * Runs daily to remove successful login attempts older than 90 days
 * Route: /api/cron/cleanup-login-attempts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel Cron or manual trigger with auth)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient();
    
    // Call cleanup function
    const { data, error } = await supabase.rpc('cleanup_old_login_attempts');
    
    if (error) {
      console.error('Error cleaning up login attempts:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }
    
    const deletedCount = data || 0;
    
    console.log(`Cleanup job: Deleted ${deletedCount} old login attempts`);
    
    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Cleaned up ${deletedCount} old login attempts`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Cleanup job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
