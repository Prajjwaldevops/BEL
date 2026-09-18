import { NextRequest, NextResponse } from 'next/server';
import { getLatestPostureMetrics, getPostureTrend, updatePostureMetrics } from '@/lib/security-posture-service';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '1');
    
    if (days === 1) {
      const metrics = await getLatestPostureMetrics();
      return NextResponse.json({ success: true, metrics });
    } else {
      const trend = await getPostureTrend(days);
      return NextResponse.json({ success: true, trend, count: trend.length });
    }
  } catch (error: any) {
    console.error('Error fetching posture metrics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const metricId = await updatePostureMetrics();
    
    return NextResponse.json({ success: true, metric_id: metricId });
  } catch (error: any) {
    console.error('Error updating posture metrics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
