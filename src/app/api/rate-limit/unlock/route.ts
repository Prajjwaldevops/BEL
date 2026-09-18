/**
 * API Route: Admin Unlock Account
 * POST /api/rate-limit/unlock
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminUnlockAccount, getClientIP } from '@/lib/rate-limit';
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
        { error: 'Forbidden', message: 'Only admins can unlock accounts' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { username, reason } = body;
    
    if (!username || !reason) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'username and reason are required' },
        { status: 400 }
      );
    }
    
    const ipAddress = await getClientIP();
    
    const result = await adminUnlockAccount({
      username,
      unlockedBy: user.id,
      reason,
      ipAddress,
    });
    
    return NextResponse.json({
      success: result,
      message: 'Account unlocked successfully',
    });
  } catch (error: any) {
    console.error('Error unlocking account:', error);
    return NextResponse.json(
      { error: 'Failed to unlock account', message: error.message },
      { status: 500 }
    );
  }
}
