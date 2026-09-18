/**
 * API Route: Get Login Attempts
 * GET /api/rate-limit/attempts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLoginAttempts } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
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
    
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username') || undefined;
    const email = searchParams.get('email') || undefined;
    const ipAddress = searchParams.get('ip_address') || undefined;
    const limit = searchParams.get('limit') ? 
      parseInt(searchParams.get('limit')!, 10) : 
      50;
    
    // Check if user is admin or requesting their own data
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', user.id)
      .single();
    
    const isAdmin = profile && ['admin', 'super_admin'].includes(profile.role);
    const isOwnData = email === profile?.email;
    
    if (!isAdmin && !isOwnData) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You can only view your own login attempts' },
        { status: 403 }
      );
    }
    
    const attempts = await getLoginAttempts({
      username: isAdmin ? username : undefined,
      email: isOwnData ? email : undefined,
      ipAddress: isAdmin ? ipAddress : undefined,
      limit,
    });
    
    return NextResponse.json({
      attempts,
      count: attempts.length,
    });
  } catch (error: any) {
    console.error('Error fetching login attempts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch login attempts', message: error.message },
      { status: 500 }
    );
  }
}
