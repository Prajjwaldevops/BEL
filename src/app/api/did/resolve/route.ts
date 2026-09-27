import { NextRequest, NextResponse } from 'next/server';
import { resolveDID } from '@/lib/did-resolver';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const did = searchParams.get('did');

    if (!did) {
      return NextResponse.json(
        { error: 'DID parameter is required' },
        { status: 400 }
      );
    }

    // Validate DID format
    if (!did.startsWith('did:')) {
      return NextResponse.json(
        { error: 'Invalid DID format. Must start with "did:"' },
        { status: 400 }
      );
    }

    const didDocument = await resolveDID(did);

    if (!didDocument) {
      return NextResponse.json(
        { error: 'DID not found or resolution failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      didDocument,
      resolvedAt: new Date().toISOString(),
      method: did.split(':')[1]
    });

  } catch (error) {
    console.error('DID resolution error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Resolution failed'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { did } = await request.json();

    if (!did) {
      return NextResponse.json(
        { error: 'DID is required in request body' },
        { status: 400 }
      );
    }

    const didDocument = await resolveDID(did);

    if (!didDocument) {
      return NextResponse.json(
        { error: 'DID resolution failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      didDocument,
      resolvedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('DID resolution error:', error);
    return NextResponse.json(
      { error: 'Resolution failed' },
      { status: 500 }
    );
  }
}
