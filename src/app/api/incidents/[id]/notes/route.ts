/**
 * API Route: Add Incident Note
 * POST /api/incidents/[id]/notes
 */

import { NextRequest, NextResponse } from 'next/server';
import { addIncidentNote } from '@/lib/incident-service';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const body = await request.json();
    const { noteType, content, isInternal } = body;
    
    if (!content) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'content is required' },
        { status: 400 }
      );
    }
    
    const incidentId = params.id;
    
    const result = await addIncidentNote({
      incidentId,
      authorId: user.id,
      noteType: noteType || 'GENERAL',
      content,
      isInternal: isInternal || false,
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to add note', message: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      noteId: result.noteId,
      message: 'Note added successfully',
    });
  } catch (error: any) {
    console.error('Error adding incident note:', error);
    return NextResponse.json(
      { error: 'Failed to add note', message: error.message },
      { status: 500 }
    );
  }
}
