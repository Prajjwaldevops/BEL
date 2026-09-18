/**
 * GET /api/scheduler/status
 * Get status of all scheduled tasks
 */

import { NextResponse } from 'next/server';
import { getSchedulerStatus } from '@/lib/scheduler';

export async function GET() {
  try {
    const status = getSchedulerStatus();
    
    return NextResponse.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Failed to get scheduler status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get scheduler status' 
      },
      { status: 500 }
    );
  }
}
