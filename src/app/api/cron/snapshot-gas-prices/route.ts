import { NextRequest, NextResponse } from 'next/server';
import { fetchCurrentGasPrices, recordGasSnapshot } from '@/lib/gas-service';

/**
 * Cron job to capture gas price snapshots
 * Runs every 5 minutes
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const networks = ['ethereum', 'polygon', 'base'];
    const results = [];
    
    for (const network of networks) {
      try {
        // Fetch current gas prices
        const gasPrices = await fetchCurrentGasPrices(network);
        
        // TODO: Fetch token price from CoinGecko or similar API
        // For now, using mock prices
        const tokenPrices: Record<string, number> = {
          ethereum: 2500,
          polygon: 0.85,
          base: 2500,
        };
        
        // Record snapshot
        const snapshotId = await recordGasSnapshot(
          network,
          gasPrices,
          tokenPrices[network]
        );
        
        results.push({
          network,
          snapshot_id: snapshotId,
          gas_prices: gasPrices,
        });
      } catch (error: any) {
        console.error(`Error recording snapshot for ${network}:`, error);
        results.push({
          network,
          error: error.message,
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Gas price snapshots recorded',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in gas snapshot cron:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record gas snapshots' },
      { status: 500 }
    );
  }
}
