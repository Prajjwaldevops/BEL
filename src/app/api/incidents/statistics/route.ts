/**
 * API Route: Get Incident Statistics
 * GET /api/incidents/statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIncidentStatistics } from '@/lib/incident-service';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    
    const statistics = await getIncidentStatistics({
      startDate,
      endDate,
    });
    
    return NextResponse.json(statistics);
  } catch (error: any) {
    console.error('Error fetching incident statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics', message: error.message },
      { status: 500 }
    );
  }
}
