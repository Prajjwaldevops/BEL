/**
 * BEL SENTINEL — Document Details + List API
 * 
 * GET /api/documents — List documents with pagination/filtering
 * GET /api/documents?id=xxx — Get single document details
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const status = searchParams.get('status');
    const mintStatus = searchParams.get('mint_status');
    const classification = searchParams.get('classification');
    const search = searchParams.get('search');
    const offset = (page - 1) * limit;

    // Single document fetch
    if (id) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/documents?id=eq.${id}&select=*`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );
      const docs = await res.json();
      if (!Array.isArray(docs) || docs.length === 0) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      return NextResponse.json(docs[0]);
    }

    // Build query
    let query = `${supabaseUrl}/rest/v1/documents?select=*,profiles!documents_uploaded_by_fkey(username,full_name,wallet_address)&order=created_at.desc&offset=${offset}&limit=${limit}`;

    if (status) query += `&status=eq.${status}`;
    if (mintStatus) query += `&mint_status=eq.${mintStatus}`;
    if (classification) query += `&classification=eq.${classification}`;
    if (search) query += `&name=ilike.*${encodeURIComponent(search)}*`;

    // Non-admin users only see their own documents
    if (!user.roles.includes('ADMIN') && !user.roles.includes('DEBUGGER')) {
      query += `&uploaded_by=eq.${user.id}`;
    }

    const res = await fetch(query, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'count=exact',
      },
    });

    const contentRange = res.headers.get('content-range');
    const total = contentRange ? parseInt(contentRange.split('/')[1] || '0', 10) : 0;
    const docs = await res.json();

    return NextResponse.json({
      documents: Array.isArray(docs) ? docs : [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Documents API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
