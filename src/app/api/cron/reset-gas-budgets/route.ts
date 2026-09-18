import { NextRequest, NextResponse } from 'next/server';
import { resetExpiredBudgets } from '@/lib/gas-service';

/**
 * Cron job to reset expired gas budgets
 * Runs hourly
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
    
    const resetCount = await resetExpiredBudgets();
    
    return NextResponse.json({
      success: true,
      message: `Reset ${resetCount} expired budget(s)`,
      budgets_reset: resetCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in reset budgets cron:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset budgets' },
      { status: 500 }
    );
  }
}
