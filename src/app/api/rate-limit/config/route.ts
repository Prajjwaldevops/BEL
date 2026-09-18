/**
 * API Route: Rate Limit Configuration
 * GET/POST /api/rate-limit/config
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRateLimitConfig, updateRateLimitConfig } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const config = await getRateLimitConfig();
    
    if (!config) {
      return NextResponse.json(
        { error: 'No active configuration found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Error fetching rate limit config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration', message: error.message },
      { status: 500 }
    );
  }
}

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
        { error: 'Forbidden', message: 'Only admins can update configuration' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    // Validate configuration
    if (body.maxAttemptsTier1 && body.maxAttemptsTier1 < 1) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'maxAttemptsTier1 must be at least 1' },
        { status: 400 }
      );
    }
    
    if (body.maxAttemptsTier2 && body.maxAttemptsTier2 <= (body.maxAttemptsTier1 || 1)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'maxAttemptsTier2 must be greater than maxAttemptsTier1' },
        { status: 400 }
      );
    }
    
    if (body.maxAttemptsTier3 && body.maxAttemptsTier3 <= (body.maxAttemptsTier2 || 1)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'maxAttemptsTier3 must be greater than maxAttemptsTier2' },
        { status: 400 }
      );
    }
    
    const config = await updateRateLimitConfig(body);
    
    if (!config) {
      return NextResponse.json(
        { error: 'Failed to update configuration' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      config,
      message: 'Configuration updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating rate limit config:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration', message: error.message },
      { status: 500 }
    );
  }
}
