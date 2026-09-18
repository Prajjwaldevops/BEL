import { NextRequest, NextResponse } from 'next/server';
import { getGasAnalytics } from '@/lib/gas-service';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/gas/analytics
 * Get gas cost analytics for a network
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const network = searchParams.get('network') || 'ethereum';
    const days = parseInt(searchParams.get('days') || '30');
    
    const analytics = await getGasAnalytics(network, days);
    
    return NextResponse.json({
      success: true,
      analytics,
      network,
      period_days: days,
    });
  } catch (error: any) {
    console.error('Error fetching gas analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch gas analytics' },
      { status: 500 }
    );
  }
}
