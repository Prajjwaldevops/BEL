import { NextRequest, NextResponse } from 'next/server';
import { getCredentialSchemas } from '@/lib/vc-service';

export async function GET(request: NextRequest) {
  try {
    const schemas = await getCredentialSchemas();
    return NextResponse.json({ success: true, schemas, count: schemas.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
