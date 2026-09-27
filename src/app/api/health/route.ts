import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const startTime = Date.now();

export async function GET() {
  const timestamp = new Date().toISOString();
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  // Check database connection
  let databaseStatus = 'unknown';
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const { error } = await supabase.from('users').select('count').limit(1).single();
      databaseStatus = error ? 'disconnected' : 'connected';
    } else {
      databaseStatus = 'not_configured';
    }
  } catch {
    databaseStatus = 'error';
  }

  // Check blockchain connection
  let blockchainStatus = 'unknown';
  try {
    if (process.env.NEXT_PUBLIC_RPC_URL) {
      const response = await fetch(process.env.NEXT_PUBLIC_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1,
        }),
      });
      blockchainStatus = response.ok ? 'connected' : 'disconnected';
    } else {
      blockchainStatus = 'not_configured';
    }
  } catch {
    blockchainStatus = 'error';
  }

  const status = databaseStatus === 'connected' && blockchainStatus === 'connected' ? 'ok' : 'degraded';
  const statusCode = status === 'ok' ? 200 : 503;

  return NextResponse.json(
    {
      status,
      service: 'BEL Platform API',
      version: '1.0.0',
      timestamp,
      uptime,
      database: databaseStatus,
      blockchain: blockchainStatus,
      environment: process.env.NODE_ENV || 'development',
    },
    { status: statusCode }
  );
}
