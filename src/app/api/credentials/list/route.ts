import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const holderDID = searchParams.get('holder');
    const issuerDID = searchParams.get('issuer');
    const type = searchParams.get('type');

    const supabase = await createClient();

    let query = supabase
      .from('verifiable_credentials')
      .select('*')
      .order('created_at', { ascending: false });

    if (holderDID) {
      query = query.eq('holder_did', holderDID);
    }

    if (issuerDID) {
      query = query.eq('issuer_did', issuerDID);
    }

    if (type) {
      query = query.contains('types', [type]);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch credentials' },
        { status: 500 }
      );
    }

    // Filter out expired credentials
    const now = new Date();
    const validCredentials = data?.filter(cred => {
      if (!cred.expiration_date) return true;
      return new Date(cred.expiration_date) > now;
    }) || [];

    return NextResponse.json({
      credentials: validCredentials.map(cred => ({
        id: cred.id,
        type: cred.types,
        issuer: cred.issuer_did,
        holder: cred.holder_did,
        issuanceDate: cred.issuance_date,
        expirationDate: cred.expiration_date,
        revoked: cred.revoked,
        credential: cred.credential_data
      })),
      total: validCredentials.length
    });

  } catch (error) {
    console.error('List credentials error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
