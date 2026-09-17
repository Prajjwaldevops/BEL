import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, resourceId, resourceType, userId, userRole } = body;

    if (!action || !userId) {
      return NextResponse.json({ error: 'Action and userId are required' }, { status: 400 });
    }

    const gasFeeEth = 0.00001;
    const gasFeeWei = 10000000000000; // 0.00001 ETH in wei

    // In production: Call AuditRegistry.recordLog() on-chain with gas fee
    // const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    // const wallet = new ethers.Wallet(userPrivateKey, provider);
    // const auditContract = new ethers.Contract(AUDIT_REGISTRY_ADDRESS, AuditRegistryABI, wallet);
    // const tx = await auditContract.recordLog(action, resourceId, detailsHash, { value: ethers.parseEther('0.00001') });

    // Mock transaction hash
    const hex = '0123456789abcdef';
    let txHash = '0x';
    for (let i = 0; i < 64; i++) {
      txHash += hex.charAt(Math.floor(Math.random() * 16));
    }

    // Save to Supabase audit_logs
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        // Log audit entry
        await fetch(`${supabaseUrl}/rest/v1/audit_logs`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            actor_id: userId !== 'admin-001' ? userId : null,
            actor_role: userRole || 'VIEWER',
            action,
            resource_id: resourceId || null,
            resource_type: resourceType || null,
            result: 'SUCCESS',
            details: `Action: ${action} on ${resourceType}:${resourceId}`,
            tx_hash: txHash,
            gas_fee_wei: gasFeeWei,
            gas_fee_eth: gasFeeEth,
          }),
        });

        // Log gas fee
        if (userId !== 'admin-001') {
          await fetch(`${supabaseUrl}/rest/v1/activity_gas_fees`, {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              profile_id: userId,
              action,
              resource_id: resourceId || null,
              resource_type: resourceType || null,
              gas_fee_wei: gasFeeWei,
              gas_fee_eth: gasFeeEth,
              tx_hash: txHash,
            }),
          });
        }
      } catch (dbError) {
        console.error('Audit log DB save error:', dbError);
      }
    }

    return NextResponse.json({
      logged: true,
      txHash,
      gasFeeEth,
      gasFeeWei,
      action,
      resourceId,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to log action' }, { status: 500 });
  }
}
