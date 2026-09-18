import { NextRequest, NextResponse } from 'next/server';
import { getOptimizationRecommendations, updateRecommendationStatus } from '@/lib/gas-service';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/gas/recommendations
 * Get gas optimization recommendations
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
    const status = searchParams.get('status') as any;
    
    const recommendations = await getOptimizationRecommendations(status);
    
    return NextResponse.json({
      success: true,
      recommendations,
      count: recommendations.length,
    });
  } catch (error: any) {
    console.error('Error fetching recommendations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/gas/recommendations
 * Update recommendation status
 */
export async function PATCH(request: NextRequest) {
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
    const { recommendationId, status, assignedTo } = body;
    
    if (!recommendationId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: recommendationId, status' },
        { status: 400 }
      );
    }
    
    await updateRecommendationStatus(recommendationId, status, assignedTo);
    
    return NextResponse.json({
      success: true,
      message: 'Recommendation updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating recommendation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update recommendation' },
      { status: 500 }
    );
  }
}
