import { NextRequest, NextResponse } from 'next/server';
import { getActiveBudgets, createGasBudget } from '@/lib/gas-service';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/gas/budgets
 * Get active gas budgets
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
    
    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    
    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const network = searchParams.get('network') || undefined;
    
    const budgets = await getActiveBudgets(network);
    
    return NextResponse.json({
      success: true,
      budgets,
      count: budgets.length,
    });
  } catch (error: any) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch budgets' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gas/budgets
 * Create a new gas budget
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
    
    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    
    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const {
      budgetName,
      network,
      budgetPeriod,
      budgetLimitUsd,
      alertThreshold,
      notificationEmails,
    } = body;
    
    if (!budgetName || !network || !budgetPeriod || !budgetLimitUsd) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const budgetId = await createGasBudget({
      budgetName,
      network,
      budgetPeriod,
      budgetLimitUsd,
      alertThreshold,
      createdBy: user.id,
      notificationEmails,
    });
    
    return NextResponse.json({
      success: true,
      budget_id: budgetId,
    });
  } catch (error: any) {
    console.error('Error creating budget:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create budget' },
      { status: 500 }
    );
  }
}
