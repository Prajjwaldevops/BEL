/**
 * POST /api/scheduler/trigger
 * Manually trigger a scheduled task (for testing/admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { triggerTask } from '@/lib/scheduler';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { task } = body;

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task name required' },
        { status: 400 }
      );
    }

    const result = await triggerTask(task);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to trigger task:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to trigger task'
      },
      { status: 500 }
    );
  }
}
