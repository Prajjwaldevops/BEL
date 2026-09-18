import { NextRequest, NextResponse } from 'next/server';
import { getGasPriceTrend } from '@/lib/gas-service';

/**
 * GET /api/gas/trend
 * Get historical gas price trend
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const network = searchParams.get('network') || 'ethereum';
    const hours = parseInt(searchParams.get('hours') || '24');
    
    const trend = await getGasPriceTrend(network, hours);
    
    return NextResponse.json({
      success: true,
      trend,
      network,
      hours,
      data_points: trend.length,
    });
  } catch (error: any) {
    console.error('Error fetching gas price trend:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch gas price trend' },
      { status: 500 }
    );
  }
}
