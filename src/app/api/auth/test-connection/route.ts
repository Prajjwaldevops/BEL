import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        error: 'Missing environment variables',
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
      }, { status: 500 });
    }

    // Test connection to profiles table
    const response = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=username&limit=1`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ 
        error: 'Supabase connection failed',
        status: response.status,
        message: error
      }, { status: 500 });
    }

    const data = await response.json();

    return NextResponse.json({ 
      success: true,
      message: 'Supabase connection working',
      supabaseUrl,
      profilesCount: Array.isArray(data) ? data.length : 0
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Connection test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
