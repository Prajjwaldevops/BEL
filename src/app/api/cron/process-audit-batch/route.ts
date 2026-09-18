import { NextRequest, NextResponse } from 'next/server'
import {
  getPendingEvents,
  createAuditBatch,
  anchorBatchToDatabase,
  updateBatchWithTx,
  shouldTriggerBatch,
  getBatchConfig,
} from '@/lib/audit-batching'

/**
 * GET /api/cron/process-audit-batch
 * 
 * Cron job to process pending audit events into batches
 * and anchor Merkle roots on-chain
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-audit-batch",
 *     "schedule": "every 15 minutes"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if batch should be triggered
    const triggerCheck = await shouldTriggerBatch()

    if (!triggerCheck.shouldTrigger) {
      return NextResponse.json({
        success: true,
        message: 'No batch processing needed',
        reason: triggerCheck.reason,
        pendingCount: triggerCheck.pendingCount,
        timestamp: new Date().toISOString(),
      })
    }

    // Get batch configuration
    const config = await getBatchConfig()

    // Fetch pending events
    const { events, error: fetchError } = await getPendingEvents(config.batchSize)

    if (fetchError || !events || events.length === 0) {
      return NextResponse.json(
        { error: fetchError || 'No events to batch' },
        { status: 400 }
      )
    }

    // Create batch and compute Merkle root
    const { batch, error: batchError } = await createAuditBatch(events)

    if (batchError || !batch) {
      return NextResponse.json(
        { error: batchError || 'Failed to create batch' },
        { status: 500 }
      )
    }

    // Anchor batch to database
    const { batch: anchoredBatch, error: anchorError } = await anchorBatchToDatabase(
      events,
      batch.merkle_root,
      batch.tree,
      batch.proofs,
      undefined // System-triggered, no specific user
    )

    if (anchorError || !anchoredBatch) {
      return NextResponse.json(
        { error: anchorError || 'Failed to anchor batch' },
        { status: 500 }
      )
    }

    // TODO: Submit Merkle root to blockchain
    // This would be done via admin wallet + AuditRegistry.recordBatchRoot()
    // For now, batch is anchored in database only
    
    // Simulate blockchain anchoring (replace with actual contract call)
    const simulatedTxHash = '0x' + Buffer.from(batch.merkle_root.slice(2), 'hex')
      .toString('hex')
      .slice(0, 64)
    
    await updateBatchWithTx(
      anchoredBatch.id,
      simulatedTxHash,
      undefined, // block number would come from tx receipt
      undefined  // gas used would come from tx receipt
    )

    return NextResponse.json({
      success: true,
      batch: {
        id: anchoredBatch.id,
        merkle_root: batch.merkle_root,
        event_count: events.length,
        tx_hash: simulatedTxHash,
      },
      message: `Batched ${events.length} audit events`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in process audit batch cron:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
