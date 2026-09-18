import { NextRequest, NextResponse } from 'next/server';
import { updatePostureMetrics } from '@/lib/security-posture-service';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const metricId = await updatePostureMetrics();
    
    return NextResponse.json({
      success: true,
      message: 'Security posture metrics updated',
      metric_id: metricId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in security posture cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
