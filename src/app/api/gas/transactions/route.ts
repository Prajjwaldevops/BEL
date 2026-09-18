import { NextRequest, NextResponse } from 'next/server';
import { getTransactionHistory, recordTransactionGas } from '@/lib/gas-service';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/gas/transactions
 * Get transaction gas cost history
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
    const network = searchParams.get('network') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const transactions = await getTransactionHistory(network, limit);
    
    return NextResponse.json({
      success: true,
      transactions,
      count: transactions.length,
    });
  } catch (error: any) {
    console.error('Error fetching transaction history:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transaction history' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gas/transactions
 * Record a transaction gas cost
 */
export async function POST(request: NextRequest) {
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
    
    const body = await request.json();
    const {
      txHash,
      network,
      transactionType,
      walletAddress,
      gasLimit,
      gasUsed,
      gasPrice,
      status,
    } = body;
    
    if (!txHash || !network || !transactionType || !walletAddress || !gasLimit || !gasUsed || !gasPrice) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const txId = await recordTransactionGas({
      txHash,
      network,
      transactionType,
      initiatedBy: user.id,
      walletAddress,
      gasLimit,
      gasUsed,
      gasPrice,
      status,
    });
    
    return NextResponse.json({
      success: true,
      transaction_id: txId,
    });
  } catch (error: any) {
    console.error('Error recording transaction gas:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record transaction gas' },
      { status: 500 }
    );
  }
}
