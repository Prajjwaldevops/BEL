import { NextRequest, NextResponse } from 'next/server';
import { createGasEstimate } from '@/lib/gas-service';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/gas/estimate
 * Create gas cost estimate for an operation
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
    const { network, operationType, estimatedGas } = body;
    
    if (!network || !operationType || !estimatedGas) {
      return NextResponse.json(
        { error: 'Missing required fields: network, operationType, estimatedGas' },
        { status: 400 }
      );
    }
    
    const estimate = await createGasEstimate(
      network,
      operationType,
      estimatedGas,
      user.id
    );
    
    return NextResponse.json({
      success: true,
      estimate,
    });
  } catch (error: any) {
    console.error('Error creating gas estimate:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create gas estimate' },
      { status: 500 }
    );
  }
}
