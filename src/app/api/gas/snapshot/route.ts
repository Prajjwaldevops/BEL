import { NextRequest, NextResponse } from 'next/server';
import { fetchCurrentGasPrices, recordGasSnapshot, getLatestGasSnapshot } from '@/lib/gas-service';

/**
 * GET /api/gas/snapshot
 * Get latest gas price snapshot
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const network = searchParams.get('network') || 'ethereum';
    
    const snapshot = await getLatestGasSnapshot(network);
    
    if (!snapshot) {
      return NextResponse.json(
        { error: 'No gas price data available' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(snapshot);
  } catch (error: any) {
    console.error('Error fetching gas snapshot:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch gas snapshot' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gas/snapshot
 * Create new gas price snapshot
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { network = 'ethereum', tokenUsdPrice } = body;
    
    // Fetch current gas prices from blockchain
    const gasPrices = await fetchCurrentGasPrices(network);
    
    // Record snapshot
    const snapshotId = await recordGasSnapshot(network, gasPrices, tokenUsdPrice);
    
    return NextResponse.json({
      success: true,
      snapshot_id: snapshotId,
      gas_prices: gasPrices,
    });
  } catch (error: any) {
    console.error('Error creating gas snapshot:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create gas snapshot' },
      { status: 500 }
    );
  }
}
