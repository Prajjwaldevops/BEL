/**
 * API Route: Check Rate Limit Status
 * GET /api/rate-limit/check
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP, getUserAgent } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username') || undefined;
  const email = searchParams.get('email') || undefined;
  
  const ipAddress = await getClientIP();
  
  try {
    const result = await checkRateLimit({
      username,
      email,
      ipAddress,
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error checking rate limit:', error);
    return NextResponse.json(
      { error: 'Failed to check rate limit', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email } = body;
    
    const ipAddress = await getClientIP();
    
    const result = await checkRateLimit({
      username,
      email,
      ipAddress,
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error checking rate limit:', error);
    return NextResponse.json(
      { error: 'Failed to check rate limit', message: error.message },
      { status: 500 }
    );
  }
}
